"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeftIcon,
  MagnifyingGlassIcon,
  UserGroupIcon,
  LockClosedIcon,
  GlobeAltIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline';
import { createClient } from '@supabase/supabase-js';
import { groupService } from '../../services/groupService';
import { authService } from '../../services/authService';
import type { Group } from '../../types/types';

// Supabase Configuration
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

interface User {
  id: string;
  email?: string;
  user_metadata?: {
    full_name?: string;
    name?: string;
  };
}

const JoinGroupPage: React.FC = () => {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [inviteCode, setInviteCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [validating, setValidating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [previewGroup, setPreviewGroup] = useState<Group | null>(null);
  const [currentUserId, setCurrentUserId] = useState<number | null>(null);

  // Check authentication
  useEffect(() => {
    const checkAuth = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/login');
        return;
      }
      setUser(user);
      // Get internal user ID from auth service
      const internalUserId = authService.getCurrentInternalUserId();
      setCurrentUserId(internalUserId);
    };

    checkAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (!session?.user) {
          router.push('/login');
        } else {
          setUser(session.user);
          // Get internal user ID from auth service
          const internalUserId = authService.getCurrentInternalUserId();
          setCurrentUserId(internalUserId);
        }
      }
    );

    return () => subscription.unsubscribe();
  }, [router]);

  // Validate invite code as user types (with debounce)
  useEffect(() => {
    const validateCode = async () => {
      if (!inviteCode || inviteCode.length !== 8) {
        setPreviewGroup(null);
        return;
      }

      setValidating(true);
      setError(null);

      try {
        const group = await groupService.getGroupByInviteCode(inviteCode.toUpperCase());
        setPreviewGroup(group);
      } catch (error: any) {
        setPreviewGroup(null);
        if (error.message !== 'Invalid invite code') {
          setError('Failed to validate invite code');
        }
      } finally {
        setValidating(false);
      }
    };

    const debounceTimer = setTimeout(validateCode, 500);
    return () => clearTimeout(debounceTimer);
  }, [inviteCode]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 8);
    setInviteCode(value);
    setError(null);
    setSuccess(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user || !currentUserId) {
      setError('You must be logged in to join a group');
      return;
    }
    
    if (!inviteCode || inviteCode.length !== 8) {
      setError('Please enter a valid 8-character invite code');
      return;
    }

    if (!previewGroup) {
      setError('Invalid invite code');
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const result = await groupService.joinGroupByInviteCode(inviteCode, currentUserId);
      
      setSuccess(`Successfully joined "${result.group_name}"!`);
      
      // Redirect to the group page after a short delay
      setTimeout(() => {
        router.push(`/groups/${result.group_id}`);
      }, 2000);
    } catch (error: any) {
      console.error('Failed to join group:', error);
      setError(error.message || 'Failed to join group. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const formatInviteCode = (code: string) => {
    return code.replace(/(.{4})/g, '$1 ').trim();
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-400">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-950 py-8">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <Link
            href="/groups"
            className="flex items-center space-x-2 text-gray-400 hover:text-white transition-colors mb-4"
          >
            <ArrowLeftIcon className="h-5 w-5" />
            <span>Back to Groups</span>
          </Link>
          
          <div className="flex items-center space-x-3">
            <div className="p-3 bg-gradient-to-br from-green-500 to-blue-600 rounded-lg">
              <MagnifyingGlassIcon className="h-8 w-8 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-white">Join a Group</h1>
              <p className="text-gray-400">Enter an invite code to join an existing research group</p>
            </div>
          </div>
        </div>

        {/* Form */}
        <div className="bg-gray-800 border border-gray-700 rounded-lg p-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Invite Code Input */}
            <div>
              <label htmlFor="inviteCode" className="block text-sm font-medium text-gray-300 mb-2">
                Invite Code
              </label>
              <div className="relative">
                <input
                  type="text"
                  id="inviteCode"
                  value={formatInviteCode(inviteCode)}
                  onChange={handleInputChange}
                  placeholder="ABCD 1234"
                  className="w-full px-4 py-3 bg-gray-700 border border-gray-600 text-white text-center text-lg font-mono tracking-wider rounded-lg focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                  maxLength={9} // 8 chars + 1 space
                />
                {validating && (
                  <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                    <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                  </div>
                )}
              </div>
              <p className="text-xs text-gray-400 mt-1">
                Enter the 8-character code shared by the group admin
              </p>
            </div>

            {/* Group Preview */}
            {previewGroup && (
              <div className="bg-gray-700 border border-gray-600 rounded-lg p-4">
                <h3 className="text-lg font-semibold text-white mb-2">Group Preview</h3>
                <div className="flex items-start space-x-3">
                  <div className="p-2 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg">
                    <UserGroupIcon className="h-5 w-5 text-white" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-1">
                      <h4 className="text-white font-medium">{previewGroup.name}</h4>
                      {previewGroup.is_public ? (
                        <div className="flex items-center space-x-1 text-xs text-green-400">
                          <GlobeAltIcon className="h-3 w-3" />
                          <span>Public</span>
                        </div>
                      ) : (
                        <div className="flex items-center space-x-1 text-xs text-yellow-400">
                          <LockClosedIcon className="h-3 w-3" />
                          <span>Private</span>
                        </div>
                      )}
                    </div>
                    {previewGroup.description && (
                      <p className="text-gray-300 text-sm mb-2">{previewGroup.description}</p>
                    )}
                    <div className="flex items-center space-x-4 text-xs text-gray-400">
                      <span>{previewGroup.member_count || 0} members</span>
                      {previewGroup.creator_name && (
                        <span>Created by {previewGroup.creator_name}</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Success Message */}
            {success && (
              <div className="bg-green-900/20 border border-green-700 rounded-lg p-4">
                <div className="flex items-center space-x-2">
                  <CheckCircleIcon className="h-5 w-5 text-green-400" />
                  <p className="text-green-400 font-medium">{success}</p>
                </div>
                <p className="text-green-300 text-sm mt-1">Redirecting to the group...</p>
              </div>
            )}

            {/* Error Message */}
            {error && (
              <div className="bg-red-900/20 border border-red-700 rounded-lg p-4">
                <div className="flex items-center space-x-2">
                  <ExclamationTriangleIcon className="h-5 w-5 text-red-400" />
                  <p className="text-red-400">{error}</p>
                </div>
              </div>
            )}

            {/* Submit Button */}
            <div className="flex justify-end space-x-3 pt-4">
              <Link
                href="/groups"
                className="px-6 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
              >
                Cancel
              </Link>
              <button
                type="submit"
                disabled={loading || !previewGroup || inviteCode.length !== 8}
                className="px-6 py-2 bg-green-600 hover:bg-green-700 disabled:bg-green-800 disabled:cursor-not-allowed text-white rounded-lg transition-colors flex items-center space-x-2"
              >
                {loading && (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                )}
                <span>{loading ? 'Joining...' : 'Join Group'}</span>
              </button>
            </div>
          </form>
        </div>

        {/* Help Section */}
        <div className="mt-8 bg-gray-800 border border-gray-700 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-white mb-4">Need Help?</h3>
          <div className="space-y-3 text-sm text-gray-300">
            <div>
              <p className="font-medium text-gray-200">Don't have an invite code?</p>
              <p>Ask a group admin or mentor to share their group's invite code with you.</p>
            </div>
            <div>
              <p className="font-medium text-gray-200">Invalid code?</p>
              <p>Make sure you've entered all 8 characters correctly. Codes are case-insensitive.</p>
            </div>
            <div>
              <p className="font-medium text-gray-200">Want to create your own group?</p>
              <Link href="/groups/create" className="text-blue-400 hover:text-blue-300 transition-colors">
                Create a new group instead
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default JoinGroupPage;