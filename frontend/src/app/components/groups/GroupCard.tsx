"use client";

import React from 'react';
import Link from 'next/link';
import {
  UserGroupIcon,
  LockClosedIcon,
  GlobeAltIcon,
  CalendarIcon,
  UsersIcon,
  EyeIcon
} from '@heroicons/react/24/outline';
import type { Group } from '../../types/types';

interface GroupCardProps {
  group: Group;
  showActions?: boolean;
  onLeave?: (groupId: number) => void;
  onView?: (groupId: number) => void;
}

const GroupCard: React.FC<GroupCardProps> = ({ 
  group, 
  showActions = true, 
  onLeave, 
  onView 
}) => {
  const groupId = group.group_id || group.id;
  const memberCount = group.member_count || 0;
  const isPublic = group.is_public || false;
  const inviteCode = group.invite_code || '';

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const getRoleBadgeColor = (role?: string) => {
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

  return (
    <div className="bg-gray-800 border border-gray-700 rounded-lg p-6 hover:border-gray-600 transition-colors">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          {/* Group Header */}
          <div className="flex items-center space-x-3 mb-2">
            <div className="p-2 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg">
              <UserGroupIcon className="h-5 w-5 text-white" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-white">{group.name}</h3>
              <div className="flex items-center space-x-2">
                {isPublic ? (
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
                {group.user_role && (
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${getRoleBadgeColor(group.user_role)}`}>
                    {group.user_role}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Description */}
          {group.description && (
            <p className="text-gray-300 text-sm mb-3 line-clamp-2">
              {group.description}
            </p>
          )}

          {/* Group Stats */}
          <div className="flex items-center space-x-4 text-sm text-gray-400 mb-4">
            <div className="flex items-center space-x-1">
              <UsersIcon className="h-4 w-4" />
              <span>{memberCount} {memberCount === 1 ? 'member' : 'members'}</span>
            </div>
            <div className="flex items-center space-x-1">
              <CalendarIcon className="h-4 w-4" />
              <span>Created {formatDate(group.created_at)}</span>
            </div>
          </div>

          {/* Creator Info */}
          {group.creator_name && (
            <p className="text-xs text-gray-500">
              Created by {group.creator_name}
            </p>
          )}
        </div>

        {/* Actions */}
        {showActions && (
          <div className="flex flex-col space-y-2 ml-4">
            <button
              onClick={() => onView?.(groupId)}
              className="flex items-center space-x-1 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded-md transition-colors"
            >
              <EyeIcon className="h-4 w-4" />
              <span>View</span>
            </button>
            
            {group.user_role !== 'admin' && (
              <button
                onClick={() => onLeave?.(groupId)}
                className="flex items-center space-x-1 px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white text-sm rounded-md transition-colors"
              >
                <span>Leave</span>
              </button>
            )}
          </div>
        )}
      </div>

      {/* Invite Code (for admins/mentors) */}
      {(group.user_role === 'admin' || group.user_role === 'mentor') && inviteCode && (
        <div className="mt-4 pt-4 border-t border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-400 mb-1">Invite Code</p>
              <code className="text-sm font-mono text-blue-400 bg-gray-900 px-2 py-1 rounded">
                {inviteCode}
              </code>
            </div>
            <button
              onClick={() => navigator.clipboard.writeText(inviteCode)}
              className="text-xs text-blue-400 hover:text-blue-300 transition-colors"
            >
              Copy
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default GroupCard;