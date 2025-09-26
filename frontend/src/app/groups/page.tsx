"use client";

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  PlusIcon,
  UserGroupIcon,
  MagnifyingGlassIcon,
  FunnelIcon
} from '@heroicons/react/24/outline';
import GroupCard from '../components/groups/GroupCard';
import { groupService } from '../services/groupService';
import { authService } from '../services/authService';
import type { Group } from '../types/types';
import type { User } from '../services/authService';

const GroupsPage: React.FC = () => {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [groups, setGroups] = useState<Group[]>([]);
  const [filteredGroups, setFilteredGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [error, setError] = useState<string | null>(null);
  const [currentUserId, setCurrentUserId] = useState<number | null>(null);
  const previousUserIdRef = useRef<number | null>(null);

  // Function to clear all group-related state
  const clearGroupState = () => {
    setGroups([]);
    setFilteredGroups([]);
    setSearchTerm('');
    setRoleFilter('all');
    setError(null);
  };

  // Check authentication and handle user changes
  useEffect(() => {
    const checkAuth = async () => {
      // Initialize authentication
      const authData = await authService.initializeAuth();
      
      if (!authData) {
        // Clear state when no auth
        clearGroupState();
        setUser(null);
        setCurrentUserId(null);
        router.push('/login');
        return;
      }
      
      const currentUser = await authService.getCurrentUser();
      if (!currentUser) {
        // Clear state when no user
        clearGroupState();
        setUser(null);
        setCurrentUserId(null);
        router.push('/login');
        return;
      }
      
      // Get the internal user ID from auth service
      const newUserId = authService.getCurrentInternalUserId();
      
      setUser(currentUser);
      setCurrentUserId(newUserId);
    };

    checkAuth();

    const { data: { subscription } } = authService.onAuthStateChange(
      (event: string, session: any) => {
        if (!session?.user) {
          // User logged out, clear all state
          clearGroupState();
          setUser(null);
          setCurrentUserId(null);
          router.push('/login');
        } else {
          // User logged in or session renewed
          const newUserId = authService.getCurrentInternalUserId();
          
          setUser(session.user);
          setCurrentUserId(newUserId);
        }
      }
    );

    return () => subscription.unsubscribe();
  }, [router]); // Remove currentUserId from dependencies to prevent infinite loop

  // Handle user changes and clear state when needed
  useEffect(() => {
    if (currentUserId !== null && previousUserIdRef.current !== null && previousUserIdRef.current !== currentUserId) {
      console.log('Different user detected, clearing previous state');
      clearGroupState();
    }
    previousUserIdRef.current = currentUserId;
  }, [currentUserId]);

  // Load user's groups
  useEffect(() => {
    if (!user) return;
    
    // Add timeout for loading
    const loadingTimeout = setTimeout(() => {
      if (loading) {
        setError('Loading is taking longer than expected. Please refresh the page.');
        setLoading(false);
      }
    }, 10000); // 10 second timeout

    const loadGroups = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // Wait for currentUserId to be set, but with a fallback
        let userId = currentUserId;
        let retryCount = 0;
        const maxRetries = 5;
        
        while (userId === null && retryCount < maxRetries) {
          console.log(`Waiting for user ID... attempt ${retryCount + 1}`);
          await new Promise(resolve => setTimeout(resolve, 500)); // Wait 500ms
          userId = authService.getCurrentInternalUserId();
          retryCount++;
        }
        
        if (userId === null) {
          console.warn('Could not get user ID after retries, using guest access');
          userId = 0; // Use guest user ID as fallback
        }
        
        console.log(`Loading groups for user ID: ${userId}`);
        
        const userGroups = await groupService.getUserGroups(userId);
        console.log('Loaded groups:', userGroups);
        setGroups(userGroups);
        setFilteredGroups(userGroups);
        setCurrentUserId(userId);
        clearTimeout(loadingTimeout);
      } catch (error: any) {
        console.error('Failed to load groups:', error);
        clearTimeout(loadingTimeout);
        
        // Handle specific error for user not found
        if (error.message?.includes('User with ID') && error.message?.includes('not found')) {
          setError(`User not found in system. You may have limited access. (User ID: ${currentUserId || 'unknown'})`);
          // Still allow the page to load but with empty groups
          setGroups([]);
          setFilteredGroups([]);
        } else if (error.message?.includes('Network Error') || error.message?.includes('fetch')) {
          setError('Unable to connect to server. Please check your connection and try again.');
        } else {
          setError('Failed to load groups. Please try again.');
        }
      } finally {
        setLoading(false);
      }
    };

    loadGroups();
    
    return () => clearTimeout(loadingTimeout);
  }, [user]); // Remove currentUserId from dependencies to prevent infinite loop

  // Filter groups based on search and role filter
  useEffect(() => {
    let filtered = groups;

    if (searchTerm) {
      filtered = filtered.filter(group =>
        group.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        group.description?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (roleFilter !== 'all') {
      filtered = filtered.filter(group => group.user_role === roleFilter);
    }

    setFilteredGroups(filtered);
  }, [groups, searchTerm, roleFilter]);

    const handleLeaveGroup = async (groupId: number) => {
    const group = groups.find(g => (g.group_id || g.id) === groupId);
    if (!group || !currentUserId) return;

    const confirmed = confirm(`Are you sure you want to leave "${group.name}"?`);
    if (!confirmed) return;

    try {
      await groupService.leaveGroup(groupId, currentUserId);
      setGroups(groups.filter(g => (g.group_id || g.id) !== groupId));
    } catch (error) {
      console.error('Failed to leave group:', error);
      alert('Failed to leave group. Please try again.');
    }
  };

  const handleViewGroup = (groupId: number) => {
    router.push(`/groups/${groupId}`);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-400">Loading your groups...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-950 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-white mb-2">My Groups</h1>
              <p className="text-gray-400">
                Manage your research groups and collaborate with others
              </p>
            </div>
            <div className="flex space-x-3">
              <Link
                href="/groups/join"
                className="flex items-center space-x-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors"
              >
                <MagnifyingGlassIcon className="h-5 w-5" />
                <span>Join Group</span>
              </Link>
              {currentUserId !== null && currentUserId >= 2 ? (
                <Link
                  href="/groups/create"
                  className="flex items-center space-x-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                >
                  <PlusIcon className="h-5 w-5" />
                  <span>Create Group</span>
                </Link>
              ) : (
                <div className="relative group">
                  <button
                    disabled
                    className="flex items-center space-x-2 px-4 py-2 bg-gray-600 cursor-not-allowed text-gray-400 rounded-lg"
                  >
                    <PlusIcon className="h-5 w-5" />
                    <span>Create Group</span>
                  </button>
                  <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-gray-800 text-white text-sm rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                    Guest users cannot create groups
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Search and Filters */}
        <div className="mb-6 flex flex-col sm:flex-row gap-4">
          <div className="flex-1 relative">
            <MagnifyingGlassIcon className="h-5 w-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search groups..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-gray-800 border border-gray-700 text-white rounded-lg focus:outline-none focus:border-blue-500"
            />
          </div>
          <div className="flex items-center space-x-2">
            <FunnelIcon className="h-5 w-5 text-gray-400" />
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="bg-gray-800 border border-gray-700 text-white rounded-lg px-3 py-2 focus:outline-none focus:border-blue-500"
            >
              <option value="all">All Roles</option>
              <option value="admin">Admin</option>
              <option value="mentor">Mentor</option>
              <option value="member">Member</option>
            </select>
          </div>
        </div>

        {/* Error State */}
        {error && (
          <div className="mb-6 p-4 bg-red-900/20 border border-red-700 rounded-lg">
            <p className="text-red-400">{error}</p>
          </div>
        )}

        {/* Groups Grid */}
        {filteredGroups.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredGroups.map((group) => (
              <GroupCard
                key={group.group_id}
                group={group}
                onLeave={handleLeaveGroup}
                onView={handleViewGroup}
              />
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <UserGroupIcon className="h-16 w-16 text-gray-600 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-400 mb-2">
              {groups.length === 0 ? 'No groups yet' : 'No groups found'}
            </h3>
            <p className="text-gray-500 mb-6">
              {groups.length === 0 
                ? 'Create your first group or join an existing one to get started'
                : 'Try adjusting your search or filter criteria'
              }
            </p>
            {groups.length === 0 && (
              <div className="flex justify-center space-x-3">
                {currentUserId !== null && currentUserId >= 2 ? (
                  <>
                    <Link
                      href="/groups/create"
                      className="flex items-center space-x-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                    >
                      <PlusIcon className="h-5 w-5" />
                      <span>Create Your First Group</span>
                    </Link>
                    <Link
                      href="/groups/join"
                      className="flex items-center space-x-2 px-6 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors"
                    >
                      <MagnifyingGlassIcon className="h-5 w-5" />
                      <span>Join a Group</span>
                    </Link>
                  </>
                ) : (
                  <div className="text-center">
                    <Link
                      href="/groups/join"
                      className="flex items-center space-x-2 px-6 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors"
                    >
                      <MagnifyingGlassIcon className="h-5 w-5" />
                      <span>Join a Group</span>
                    </Link>
                    <p className="text-gray-500 text-sm mt-3">
                      Guest users can only join existing groups. Contact an administrator for group creation privileges.
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Stats Footer */}
        {groups.length > 0 && (
          <div className="mt-8 pt-6 border-t border-gray-800">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-center">
              <div>
                <p className="text-2xl font-bold text-blue-400">{groups.length}</p>
                <p className="text-gray-400 text-sm">Total Groups</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-green-400">
                  {groups.filter(g => g.user_role === 'admin').length}
                </p>
                <p className="text-gray-400 text-sm">Groups You Admin</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-purple-400">
                  {groups.reduce((sum, g) => sum + (g.member_count || 0), 0)}
                </p>
                <p className="text-gray-400 text-sm">Total Members</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default GroupsPage;