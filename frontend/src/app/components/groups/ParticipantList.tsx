"use client";

import React, { useState } from 'react';
import {
  ClipboardDocumentIcon,
  ArrowPathIcon,
  ShieldCheckIcon,
  UserIcon,
  AcademicCapIcon,
  TrashIcon
} from '@heroicons/react/24/outline';

interface GroupMember {
  user_id: number;
  first_name: string;
  last_name: string;
  email: string;
  role: string;
  joined_at: string;
}

interface ParticipantListProps {
  groupId: number;
  members: GroupMember[];
  currentUserId: number;
  currentUserRole: string;
  inviteCode: string;
  onRoleUpdate: (userId: number, newRole: string) => Promise<void>;
  onRemoveMember: (userId: number) => Promise<void>;
  onRegenerateInvite: () => Promise<void>;
  isLoading?: boolean;
}

const ParticipantList: React.FC<ParticipantListProps> = ({
  groupId,
  members,
  currentUserId,
  currentUserRole,
  inviteCode,
  onRoleUpdate,
  onRemoveMember,
  onRegenerateInvite,
  isLoading = false
}) => {
  const [updatingRoles, setUpdatingRoles] = useState<Set<number>>(new Set());
  const [removingMembers, setRemovingMembers] = useState<Set<number>>(new Set());
  const [regeneratingInvite, setRegeneratingInvite] = useState(false);

  const isAdmin = currentUserRole === 'admin';
  const canManageMembers = isAdmin;

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'admin':
        return <ShieldCheckIcon className="h-4 w-4 text-red-500" />;
      case 'mentor':
        return <AcademicCapIcon className="h-4 w-4 text-blue-500" />;
      case 'member':
        return <UserIcon className="h-4 w-4 text-green-500" />;
      default:
        return <UserIcon className="h-4 w-4 text-gray-500" />;
    }
  };

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'admin':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'mentor':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'member':
        return 'bg-green-100 text-green-800 border-green-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const handleRoleChange = async (userId: number, newRole: string) => {
    if (userId === currentUserId) return; // Can't change own role
    
    setUpdatingRoles(prev => new Set(prev).add(userId));
    try {
      await onRoleUpdate(userId, newRole);
    } catch (error) {
      console.error('Failed to update role:', error);
    } finally {
      setUpdatingRoles(prev => {
        const newSet = new Set(prev);
        newSet.delete(userId);
        return newSet;
      });
    }
  };

  const handleRemoveMember = async (userId: number) => {
    if (userId === currentUserId) return; // Can't remove self
    
    const member = members.find(m => m.user_id === userId);
    if (!member) return;

    if (!confirm(`Are you sure you want to remove ${member.first_name} ${member.last_name} from the group?`)) {
      return;
    }

    setRemovingMembers(prev => new Set(prev).add(userId));
    try {
      await onRemoveMember(userId);
    } catch (error) {
      console.error('Failed to remove member:', error);
    } finally {
      setRemovingMembers(prev => {
        const newSet = new Set(prev);
        newSet.delete(userId);
        return newSet;
      });
    }
  };

  const handleRegenerateInvite = async () => {
    if (!confirm('Are you sure you want to regenerate the invite code? The current code will become invalid.')) {
      return;
    }

    setRegeneratingInvite(true);
    try {
      await onRegenerateInvite();
    } catch (error) {
      console.error('Failed to regenerate invite code:', error);
    } finally {
      setRegeneratingInvite(false);
    }
  };

  const copyInviteCode = () => {
    navigator.clipboard.writeText(inviteCode);
    // You could add a toast notification here
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  return (
    <div className="space-y-6">
      {/* Invite Code Section */}
      {isAdmin && (
        <div className="bg-gray-800 border border-gray-700 rounded-lg p-4">
          <h3 className="text-lg font-semibold text-white mb-3">Invite Code</h3>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <code className="text-lg font-mono text-blue-400 bg-gray-900 px-3 py-2 rounded border">
                {inviteCode}
              </code>
              <button
                onClick={copyInviteCode}
                className="flex items-center space-x-1 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded transition-colors"
              >
                <ClipboardDocumentIcon className="h-4 w-4" />
                <span>Copy</span>
              </button>
            </div>
            <button
              onClick={handleRegenerateInvite}
              disabled={regeneratingInvite}
              className="flex items-center space-x-1 px-3 py-2 bg-yellow-600 hover:bg-yellow-700 disabled:bg-yellow-800 text-white text-sm rounded transition-colors"
            >
              <ArrowPathIcon className={`h-4 w-4 ${regeneratingInvite ? 'animate-spin' : ''}`} />
              <span>Regenerate</span>
            </button>
          </div>
          <p className="text-xs text-gray-400 mt-2">
            Share this code with people you want to invite to the group
          </p>
        </div>
      )}

      {/* Members List */}
      <div className="bg-gray-800 border border-gray-700 rounded-lg">
        <div className="p-4 border-b border-gray-700">
          <h3 className="text-lg font-semibold text-white">
            Members ({members.length})
          </h3>
        </div>
        
        <div className="divide-y divide-gray-700">
          {members.map((member) => (
            <div key={member.user_id} className="p-4 flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-blue-600 rounded-full flex items-center justify-center">
                  <span className="text-white font-medium text-sm">
                    {member.first_name.charAt(0)}{member.last_name.charAt(0)}
                  </span>
                </div>
                <div>
                  <div className="flex items-center space-x-2">
                    <h4 className="text-white font-medium">
                      {member.first_name} {member.last_name}
                    </h4>
                    {member.user_id === currentUserId && (
                      <span className="text-xs text-blue-400">(You)</span>
                    )}
                  </div>
                  <p className="text-gray-400 text-sm">{member.email}</p>
                  <p className="text-gray-500 text-xs">
                    Joined {formatDate(member.joined_at)}
                  </p>
                </div>
              </div>

              <div className="flex items-center space-x-3">
                {/* Role Display/Selector */}
                <div className="flex items-center space-x-2">
                  {getRoleIcon(member.role)}
                  {canManageMembers && member.user_id !== currentUserId ? (
                    <select
                      value={member.role}
                      onChange={(e) => handleRoleChange(member.user_id, e.target.value)}
                      disabled={updatingRoles.has(member.user_id)}
                      className="bg-gray-700 text-white text-sm border border-gray-600 rounded px-2 py-1 focus:outline-none focus:border-blue-500"
                    >
                      <option value="member">Member</option>
                      <option value="mentor">Mentor</option>
                      <option value="admin">Admin</option>
                    </select>
                  ) : (
                    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border ${getRoleBadgeColor(member.role)}`}>
                      {member.role}
                    </span>
                  )}
                </div>

                {/* Remove Member Button */}
                {canManageMembers && member.user_id !== currentUserId && (
                  <button
                    onClick={() => handleRemoveMember(member.user_id)}
                    disabled={removingMembers.has(member.user_id)}
                    className="p-1 text-red-400 hover:text-red-300 hover:bg-red-900/20 rounded transition-colors disabled:opacity-50"
                    title="Remove member"
                  >
                    <TrashIcon className="h-4 w-4" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default ParticipantList;