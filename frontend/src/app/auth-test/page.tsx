"use client";

import React, { useState, useEffect } from 'react';
import { authService } from '../services/authService';
import { debugAuth } from '../services/authDebug';

const AuthTestPage: React.FC = () => {
  const [authInfo, setAuthInfo] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const testAuth = async () => {
    setLoading(true);
    try {
      console.log('Starting auth debug...');
      const debugInfo = await debugAuth();
      console.log('Debug info:', debugInfo);
      setAuthInfo(debugInfo);
    } catch (error: any) {
      console.error('Auth test failed:', error);
      setAuthInfo({ error: error?.message || 'Unknown error' });
    } finally {
      setLoading(false);
    }
  };

  const testAPI = async () => {
    try {
      const expressUrl = process.env.NEXT_PUBLIC_EXPRESS_DB_URL || 'http://localhost:3001';
      const response = await fetch(`${expressUrl}/api/groups/user/1`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('access_token')}`,
          'Content-Type': 'application/json'
        }
      });
      
      console.log('API Response status:', response.status);
      
      if (!response.ok) {
        const errorData = await response.text();
        console.log('API Error:', errorData);
      } else {
        const data = await response.json();
        console.log('API Success:', data);
      }
    } catch (error) {
      console.error('API Test failed:', error);
    }
  };

  const checkLocalStorage = () => {
    const accessToken = localStorage.getItem('access_token');
    const refreshToken = localStorage.getItem('refresh_token');
    
    console.log('Access Token:', accessToken ? accessToken.substring(0, 20) + '...' : 'Missing');
    console.log('Refresh Token:', refreshToken ? refreshToken.substring(0, 20) + '...' : 'Missing');
  };

  return (
    <div className="min-h-screen bg-gray-950 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-white mb-8">Authentication Test</h1>
        
        <div className="space-y-4">
          <button
            onClick={testAuth}
            disabled={loading}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? 'Testing...' : 'Test Authentication'}
          </button>
          
          <button
            onClick={testAPI}
            className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 ml-4"
          >
            Test API Call
          </button>
          
          <button
            onClick={checkLocalStorage}
            className="px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700 ml-4"
          >
            Check Local Storage
          </button>
        </div>
        
        {authInfo && (
          <div className="mt-8 p-4 bg-gray-800 rounded-lg">
            <h2 className="text-xl font-semibold text-white mb-4">Auth Info:</h2>
            <pre className="text-gray-300 text-sm whitespace-pre-wrap">
              {JSON.stringify(authInfo, null, 2)}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
};

export default AuthTestPage;