import React from 'react';
import type { OnlineUser } from '../../types/groupChat';
import { 
  UserIcon,
  ClockIcon 
} from '@heroicons/react/24/outline';

interface OnlineUsersListProps {
  users: OnlineUser[];
  currentUserId: number;
}

const OnlineUsersList: React.FC<OnlineUsersListProps> = ({ users, currentUserId }) => {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'online':
        return 'bg-green-500';
      case 'away':
        return 'bg-yellow-500';
      case 'offline':
        return 'bg-gray-500';
      default:
        return 'bg-gray-500';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'online':
        return 'Online';
      case 'away':
        return 'Away';
      case 'offline':
        return 'Offline';
      default:
        return 'Unknown';
    }
  };

  const formatLastSeen = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffMins < 1440) return `${Math.floor(diffMins / 60)}h ago`;
    return date.toLocaleDateString();
  };

  const onlineUsers = users.filter(user => user.status === 'online');
  const awayUsers = users.filter(user => user.status === 'away');

  return (
    <div className="h-full bg-gray-800">
      {/* Header */}
      <div className="border-b border-gray-700 px-4 py-3">
        <h3 className="text-lg font-semibold text-white flex items-center space-x-2">
          <UserIcon className="h-5 w-5" />
          <span>Participants ({users.length})</span>
        </h3>
      </div>

      {/* Users list */}
      <div className="overflow-y-auto">
        {/* Online users */}
        {onlineUsers.length > 0 && (
          <div className="px-4 py-3">
            <h4 className="text-sm font-medium text-green-400 mb-3 flex items-center space-x-2">
              <div className="h-2 w-2 rounded-full bg-green-500"></div>
              <span>Online ({onlineUsers.length})</span>
            </h4>
            <div className="space-y-2">
              {onlineUsers.map((user) => (
                <div
                  key={user.user_id}
                  className={`flex items-center space-x-3 rounded-lg px-3 py-2 transition-colors hover:bg-gray-700 ${
                    user.user_id === currentUserId ? 'bg-blue-500/20 border border-blue-500/30' : ''
                  }`}
                >
                  {/* Avatar placeholder */}
                  <div className="relative">
                    <div className="h-8 w-8 rounded-full bg-gray-600 flex items-center justify-center">
                      <span className="text-sm font-medium text-white">
                        {user.username.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <div className={`absolute -bottom-1 -right-1 h-3 w-3 rounded-full border-2 border-gray-800 ${getStatusColor(user.status)}`}></div>
                  </div>

                  {/* User info */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-white truncate">
                      {user.username}
                      {user.user_id === currentUserId && (
                        <span className="ml-1 text-blue-400">(You)</span>
                      )}
                    </p>
                    <p className="text-xs text-green-400">
                      {getStatusText(user.status)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Away users */}
        {awayUsers.length > 0 && (
          <div className="border-t border-gray-700 px-4 py-3">
            <h4 className="text-sm font-medium text-yellow-400 mb-3 flex items-center space-x-2">
              <div className="h-2 w-2 rounded-full bg-yellow-500"></div>
              <span>Away ({awayUsers.length})</span>
            </h4>
            <div className="space-y-2">
              {awayUsers.map((user) => (
                <div
                  key={user.user_id}
                  className={`flex items-center space-x-3 rounded-lg px-3 py-2 transition-colors hover:bg-gray-700 ${
                    user.user_id === currentUserId ? 'bg-blue-500/20 border border-blue-500/30' : ''
                  }`}
                >
                  {/* Avatar placeholder */}
                  <div className="relative">
                    <div className="h-8 w-8 rounded-full bg-gray-600 flex items-center justify-center">
                      <span className="text-sm font-medium text-white">
                        {user.username.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <div className={`absolute -bottom-1 -right-1 h-3 w-3 rounded-full border-2 border-gray-800 ${getStatusColor(user.status)}`}></div>
                  </div>

                  {/* User info */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-white truncate">
                      {user.username}
                      {user.user_id === currentUserId && (
                        <span className="ml-1 text-blue-400">(You)</span>
                      )}
                    </p>
                    <div className="flex items-center space-x-1 text-xs text-yellow-400">
                      <ClockIcon className="h-3 w-3" />
                      <span>{formatLastSeen(user.last_seen)}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* No users message */}
        {users.length === 0 && (
          <div className="px-4 py-8 text-center text-gray-400">
            <UserIcon className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p className="text-sm">No participants yet</p>
          </div>
        )}
      </div>

      {/* Footer with AI permission indicator */}
      <div className="border-t border-gray-700 px-4 py-3 mt-auto">
        <div className="text-xs text-gray-400">
          <p className="mb-1">💡 <strong>AI Commands:</strong></p>
          <p>• @ai [question] - Ask AI</p>
          <p>• /ai [question] - Ask AI</p>
          <p className="mt-2 text-yellow-400">
            Only admins, mentors, and session creators can invoke AI
          </p>
        </div>
      </div>
    </div>
  );
};

export default OnlineUsersList;
