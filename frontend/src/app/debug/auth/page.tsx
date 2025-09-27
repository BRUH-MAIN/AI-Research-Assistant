"use client";

import React, { useState, useEffect } from 'react';
import { authDebugger, AuthDebugInfo } from '../../services/authDebugger';
import { authService } from '../../services/authService';

const AuthDebugPanel: React.FC = () => {
  const [debugInfo, setDebugInfo] = useState<AuthDebugInfo | null>(null);
  const [issues, setIssues] = useState<string[]>([]);
  const [fixes, setFixes] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [showReport, setShowReport] = useState(false);
  
  const runDiagnosis = async () => {
    setLoading(true);
    try {
      const info = await authDebugger.getFullDebugInfo();
      const detectedIssues = await authDebugger.diagnoseAuthIssues();
      
      setDebugInfo(info);
      setIssues(detectedIssues);
      setFixes([]);
    } catch (error) {
      console.error('Debug diagnosis failed:', error);
      setIssues([`❌ Diagnosis failed: ${String(error)}`]);
    } finally {
      setLoading(false);
    }
  };
  
  const attemptFixes = async () => {
    setLoading(true);
    try {
      const appliedFixes = await authDebugger.attemptAutoFix();
      setFixes(appliedFixes);
      
      // Re-run diagnosis after fixes
      setTimeout(() => {
        runDiagnosis();
      }, 1000);
    } catch (error) {
      console.error('Auto-fix failed:', error);
      setFixes([`❌ Auto-fix failed: ${String(error)}`]);
    } finally {
      setLoading(false);
    }
  };
  
  const refreshUserSession = async () => {
    setLoading(true);
    try {
      await authService.refreshInternalUserId();
      setTimeout(() => {
        runDiagnosis();
      }, 500);
    } catch (error) {
      console.error('Session refresh failed:', error);
    } finally {
      setLoading(false);
    }
  };
  
  const clearAllData = () => {
    if (typeof window !== 'undefined') {
      // Clear all auth-related data
      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');
      localStorage.removeItem('dev_mode');
      
      // Clear all internal user ID mappings
      Object.keys(localStorage).forEach(key => {
        if (key.startsWith('internal_user_id_')) {
          localStorage.removeItem(key);
        }
      });
      
      authDebugger.clearLogs();
      setDebugInfo(null);
      setIssues([]);
      setFixes([]);
      
      alert('All authentication data cleared. Please refresh the page and log in again.');
    }
  };
  
  useEffect(() => {
    runDiagnosis();
  }, []);
  
  const getStatusColor = (hasIssues: boolean) => {
    return hasIssues ? 'text-red-400' : 'text-green-400';
  };
  
  return (
    <div className="bg-gray-900 text-white p-6 rounded-lg max-w-4xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold">🔍 Authentication Debug Panel</h2>
        <button
          onClick={runDiagnosis}
          disabled={loading}
          className="bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded disabled:opacity-50"
        >
          {loading ? '⏳ Running...' : '🔄 Refresh Diagnosis'}
        </button>
      </div>
      
      {/* Quick Status */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-gray-800 p-4 rounded">
          <h3 className="font-semibold mb-2">Supabase Auth</h3>
          <p className={getStatusColor(!debugInfo?.supabaseUser)}>
            {debugInfo?.supabaseUser ? '✅ Authenticated' : '❌ Not Authenticated'}
          </p>
          {debugInfo?.supabaseUser && (
            <p className="text-sm text-gray-400">{debugInfo.supabaseUser.email}</p>
          )}
        </div>
        
        <div className="bg-gray-800 p-4 rounded">
          <h3 className="font-semibold mb-2">Database Record</h3>
          <p className={getStatusColor(!debugInfo?.databaseUserRecord)}>
            {debugInfo?.databaseUserRecord ? '✅ Found' : '❌ Missing'}
          </p>
          {debugInfo?.databaseUserRecord && (
            <p className="text-sm text-gray-400">ID: {debugInfo.databaseUserRecord.id}</p>
          )}
        </div>
        
        <div className="bg-gray-800 p-4 rounded">
          <h3 className="font-semibold mb-2">Internal User ID</h3>
          <p className={getStatusColor(debugInfo?.internalUserId === null || debugInfo?.internalUserId === 0)}>
            {debugInfo?.internalUserId && debugInfo.internalUserId > 0 ? 
              `✅ ${debugInfo.internalUserId}` : 
              '❌ Missing/Invalid'
            }
          </p>
        </div>
      </div>
      
      {/* Issues */}
      {issues.length > 0 && (
        <div className="mb-6">
          <h3 className="text-lg font-semibold mb-3">🚨 Detected Issues</h3>
          <div className="bg-gray-800 p-4 rounded">
            {issues.map((issue, index) => (
              <div key={index} className="mb-2 font-mono text-sm">
                {issue}
              </div>
            ))}
          </div>
        </div>
      )}
      
      {/* Action Buttons */}
      <div className="flex flex-wrap gap-3 mb-6">
        <button
          onClick={attemptFixes}
          disabled={loading || issues.length === 0}
          className="bg-green-600 hover:bg-green-700 px-4 py-2 rounded disabled:opacity-50"
        >
          🔧 Attempt Auto-Fix
        </button>
        
        <button
          onClick={refreshUserSession}
          disabled={loading}
          className="bg-yellow-600 hover:bg-yellow-700 px-4 py-2 rounded disabled:opacity-50"
        >
          🔄 Refresh Session
        </button>
        
        <button
          onClick={clearAllData}
          className="bg-red-600 hover:bg-red-700 px-4 py-2 rounded"
        >
          🗑️ Clear All Data
        </button>
        
        <button
          onClick={() => setShowReport(!showReport)}
          className="bg-purple-600 hover:bg-purple-700 px-4 py-2 rounded"
        >
          📊 {showReport ? 'Hide' : 'Show'} Debug Report
        </button>
      </div>
      
      {/* Applied Fixes */}
      {fixes.length > 0 && (
        <div className="mb-6">
          <h3 className="text-lg font-semibold mb-3">🔧 Applied Fixes</h3>
          <div className="bg-gray-800 p-4 rounded">
            {fixes.map((fix, index) => (
              <div key={index} className="mb-2 font-mono text-sm">
                {fix}
              </div>
            ))}
          </div>
        </div>
      )}
      
      {/* Debug Report */}
      {showReport && (
        <div className="mb-6">
          <h3 className="text-lg font-semibold mb-3">📊 Full Debug Report</h3>
          <div className="bg-black p-4 rounded overflow-auto max-h-96">
            <pre className="text-xs text-green-400">
              {authDebugger.generateDebugReport()}
            </pre>
          </div>
        </div>
      )}
      
      {/* Detailed Debug Info */}
      {debugInfo && (
        <details className="bg-gray-800 p-4 rounded">
          <summary className="cursor-pointer font-semibold mb-2">
            🔍 Detailed Debug Information
          </summary>
          <pre className="text-xs overflow-auto bg-black p-3 rounded">
            {JSON.stringify(debugInfo, null, 2)}
          </pre>
        </details>
      )}
    </div>
  );
};

export default AuthDebugPanel;