"use client";

import React, { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeftIcon,
  UserGroupIcon,
  Cog6ToothIcon,
  PlusIcon,
  LockClosedIcon,
  GlobeAltIcon,
  CalendarIcon,
  ChatBubbleLeftRightIcon
} from '@heroicons/react/24/outline';
import { createClient } from '@supabase/supabase-js';
import { groupService } from '../../services/groupService';
import { authService } from '../../services/authService';
import InviteCodeDisplay from '../../components/groups/InviteCodeDisplay';
import ParticipantList from '../../components/groups/ParticipantList';
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

interface GroupMember {
  user_id: number;
  first_name: string | null;
  last_name: string | null;
  email: string;
  role: string;
  joined_at: string;
  availability?: string;
}

const GroupDetailsPage: React.FC = () => {
  const router = useRouter();
  const params = useParams();
  const groupId = parseInt(params.id as string);
  
  const [user, setUser] = useState<User | null>(null);
  const [group, setGroup] = useState<Group | null>(null);
  const [members, setMembers] = useState<GroupMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'members' | 'settings'>('overview');
  const [currentUserId, setCurrentUserId] = useState<number | null>(null);

  const currentUserRole = group?.user_role || 'member';

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
        }
      }
    );

    return () => subscription.unsubscribe();
  }, [router]);

  // Load group data
  useEffect(() => {
    if (!user || !groupId) return;

    const loadGroupData = async () => {
      try {
        setLoading(true);
        setError(null);

        // Load group details
        const groupData = await groupService.getGroup(groupId);
        setGroup(groupData);

        // Load group members
        const membersData = await groupService.getGroupMembers(groupId);
        setMembers(membersData);

      } catch (error: any) {
        console.error('Failed to load group data:', error);
        setError(error.message || 'Failed to load group data');
      } finally {
        setLoading(false);
      }
    };

    loadGroupData();
  }, [user, groupId]);

  const handleRoleUpdate = async (userId: number, newRole: string) => {
    if (!currentUserId) {
      alert('User not authenticated');
      return;
    }
    
    try {
      await groupService.updateMemberRole(groupId, userId, newRole, currentUserId);
      
      // Update local state
      setMembers(prev => prev.map(member => 
        member.user_id === userId ? { ...member, role: newRole } : member
      ));
    } catch (error: any) {
      console.error('Failed to update role:', error);
      throw error;
    }
  };

  const handleRemoveMember = async (userId: number) => {
    try {
      await groupService.removeGroupMember(groupId, userId);
      
      // Update local state
      setMembers(prev => prev.filter(member => member.user_id !== userId));
    } catch (error: any) {
      console.error('Failed to remove member:', error);
      throw error;
    }
  };

  const handleRegenerateInvite = async () => {
    if (!currentUserId) {
      alert('User not authenticated');
      return;
    }
    
    try {
      const result = await groupService.regenerateInviteCode(groupId, currentUserId);
      
      // Update local state
      if (group) {
        setGroup({ ...group, invite_code: result.invite_code });
      }
    } catch (error: any) {
      console.error('Failed to regenerate invite code:', error);
      throw error;
    }
  };

  const handleLeaveGroup = async () => {
    if (!currentUserId) {
      alert('User not authenticated');
      return;
    }
    
    const confirmed = confirm(`Are you sure you want to leave "${group?.name}"?`);
    if (!confirmed) return;

    try {
      await groupService.leaveGroup(groupId, currentUserId);
      router.push('/groups');
    } catch (error: any) {
      console.error('Failed to leave group:', error);
      alert('Failed to leave group. Please try again.');
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-400">Loading group details...</p>
        </div>
      </div>
    );
  }

  if (error || !group) {
    return (
      <div className="min-h-screen bg-gray-950 py-8">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-white mb-4">Group Not Found</h1>
            <p className="text-gray-400 mb-6">{error || 'The group you\'re looking for doesn\'t exist or you don\'t have access to it.'}</p>
            <Link
              href="/groups"
              className="inline-flex items-center space-x-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
            >
              <ArrowLeftIcon className="h-5 w-5" />
              <span>Back to Groups</span>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-950 py-8">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <Link
            href="/groups"
            className="flex items-center space-x-2 text-gray-400 hover:text-white transition-colors mb-4"
          >
            <ArrowLeftIcon className="h-5 w-5" />
            <span>Back to Groups</span>
          </Link>
          
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="p-3 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg">
                <UserGroupIcon className="h-8 w-8 text-white" />
              </div>
              <div>
                <div className="flex items-center space-x-3 mb-1">
                  <h1 className="text-3xl font-bold text-white">{group.name}</h1>
                  {group.is_public ? (
                    <div className="flex items-center space-x-1 text-sm text-green-400">
                      <GlobeAltIcon className="h-4 w-4" />
                      <span>Public</span>
                    </div>
                  ) : (
                    <div className="flex items-center space-x-1 text-sm text-yellow-400">
                      <LockClosedIcon className="h-4 w-4" />
                      <span>Private</span>
                    </div>
                  )}
                </div>
                <div className="flex items-center space-x-4 text-gray-400 text-sm">
                  <span>{group.member_count || members.length} members</span>
                  <div className="flex items-center space-x-1">
                    <CalendarIcon className="h-4 w-4" />
                    <span>Created {formatDate(group.created_at)}</span>
                  </div>
                  {group.creator_name && (
                    <span>by {group.creator_name}</span>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center space-x-3">
              <button
                onClick={() => router.push(`/chat?group=${groupId}`)}
                className="flex items-center space-x-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors"
              >
                <ChatBubbleLeftRightIcon className="h-5 w-5" />
                <span>Start Chat</span>
              </button>
              
              {currentUserRole !== 'admin' && (
                <button
                  onClick={handleLeaveGroup}
                  className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
                >
                  Leave Group
                </button>
              )}
            </div>
          </div>

          {group.description && (
            <p className="text-gray-300 mt-4 max-w-4xl">{group.description}</p>
          )}
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-700 mb-6">
          <nav className="-mb-px flex space-x-8">
            {['overview', 'members', 'settings'].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab as any)}
                className={`py-2 px-1 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === tab
                    ? 'border-blue-500 text-blue-400'
                    : 'border-transparent text-gray-400 hover:text-gray-300 hover:border-gray-300'
                }`}
              >
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
              </button>
            ))}
          </nav>
        </div>

        {/* Tab Content */}
        <div className="space-y-6">
          {activeTab === 'overview' && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Main Info */}
              <div className="lg:col-span-2 space-y-6">
                <div className="bg-gray-800 border border-gray-700 rounded-lg p-6">
                  <h3 className="text-lg font-semibold text-white mb-4">Group Overview</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-gray-400">Total Members</p>
                      <p className="text-2xl font-bold text-white">{members.length}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-400">Your Role</p>
                      <p className="text-lg font-medium text-blue-400 capitalize">{currentUserRole}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-400">Group Type</p>
                      <p className="text-lg font-medium text-gray-300">
                        {group.is_public ? 'Public' : 'Private'}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-400">Active Sessions</p>
                      <p className="text-2xl font-bold text-white">0</p>
                    </div>
                  </div>
                </div>

                {/* Recent Activity */}
                <div className="bg-gray-800 border border-gray-700 rounded-lg p-6">
                  <h3 className="text-lg font-semibold text-white mb-4">Recent Activity</h3>
                  <div className="text-center py-8">
                    <p className="text-gray-400">No recent activity</p>
                    <p className="text-sm text-gray-500 mt-1">Start a chat session to begin collaborating</p>
                  </div>
                </div>
              </div>

              {/* Sidebar */}
              <div className="space-y-6">
                {/* Quick Actions */}
                <div className="bg-gray-800 border border-gray-700 rounded-lg p-6">
                  <h3 className="text-lg font-semibold text-white mb-4">Quick Actions</h3>
                  <div className="space-y-3">
                    <button
                      onClick={() => router.push(`/chat?group=${groupId}`)}
                      className="w-full flex items-center space-x-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                    >
                      <ChatBubbleLeftRightIcon className="h-5 w-5" />
                      <span>Start Research Session</span>
                    </button>
                    
                    {(currentUserRole === 'admin' || currentUserRole === 'mentor') && (
                      <button
                        onClick={() => setActiveTab('members')}
                        className="w-full flex items-center space-x-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors"
                      >
                        <PlusIcon className="h-5 w-5" />
                        <span>Manage Members</span>
                      </button>
                    )}
                  </div>
                </div>

                {/* Invite Code */}
                {(currentUserRole === 'admin' || currentUserRole === 'mentor') && group.invite_code && (
                  <InviteCodeDisplay
                    inviteCode={group.invite_code}
                    groupName={group.name}
                    showRegenerateButton={currentUserRole === 'admin'}
                    onRegenerate={currentUserRole === 'admin' ? handleRegenerateInvite : undefined}
                  />
                )}
              </div>
            </div>
          )}

          {activeTab === 'members' && currentUserId && (
            <ParticipantList
              groupId={groupId}
              members={members}
              currentUserId={currentUserId}
              currentUserRole={currentUserRole}
              inviteCode={group.invite_code || ''}
              onRoleUpdate={handleRoleUpdate}
              onRemoveMember={handleRemoveMember}
              onRegenerateInvite={handleRegenerateInvite}
            />
          )}

          {activeTab === 'settings' && (
            <div className="bg-gray-800 border border-gray-700 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-white mb-4">Group Settings</h3>
              {currentUserRole === 'admin' ? (
                <div className="space-y-6">
                  <div>
                    <h4 className="text-white font-medium mb-2">Group Information</h4>
                    <p className="text-gray-400 text-sm mb-4">Update your group's basic information</p>
                    <button className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors">
                      Edit Group Info
                    </button>
                  </div>
                  
                  <div className="pt-6 border-t border-gray-700">
                    <h4 className="text-red-400 font-medium mb-2">Danger Zone</h4>
                    <p className="text-gray-400 text-sm mb-4">
                      Permanently delete this group and all associated data
                    </p>
                    <button className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors">
                      Delete Group
                    </button>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8">
                  <Cog6ToothIcon className="h-12 w-12 text-gray-600 mx-auto mb-4" />
                  <p className="text-gray-400">Only admins can access group settings</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default GroupDetailsPage;