'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { PlusIcon, ArrowLeftIcon } from '@heroicons/react/24/outline';
import SessionMenu from '../../../components/sessions/SessionMenu';
import { Session, Group, CreateSessionRequest, GroupMember } from '../../../types/types';
import { sessionService } from '../../../services/sessionService';
import { groupService } from '../../../services/groupService';
import { useUser } from '../../../contexts';

interface CreateSessionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: { title: string; description?: string }) => void;
  loading: boolean;
}

const CreateSessionModal: React.FC<CreateSessionModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  loading
}) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({ title, description: description || undefined });
    setTitle('');
    setDescription('');
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-gray-900 rounded-lg p-6 w-full max-w-md mx-4">
        <h2 className="text-xl font-semibold text-white mb-4">Create New Session</h2>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="title" className="block text-sm font-medium text-gray-300 mb-2">
              Session Title *
            </label>
            <input
              type="text"
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Enter session title"
              required
            />
          </div>
          
          <div>
            <label htmlFor="description" className="block text-sm font-medium text-gray-300 mb-2">
              Description
            </label>
            <textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Enter session description (optional)"
            />
          </div>
          
          <div className="flex space-x-4 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 bg-gray-700 text-white rounded-md hover:bg-gray-600 transition-colors"
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50"
              disabled={loading || !title.trim()}
            >
              {loading ? 'Creating...' : 'Create Session'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

const GroupSessionsPage: React.FC = () => {
  const router = useRouter();
  const params = useParams();
  const groupId = parseInt(params.id as string);
  
  // Use global user context - this replaces all the complex authentication logic!
  const { user, internalUserId, isAuthenticated, isLoading: userLoading, error: userError } = useUser();

  const [group, setGroup] = useState<Group | null>(null);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentUserRole, setCurrentUserRole] = useState<string>('member');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createLoading, setCreateLoading] = useState(false);

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        setError(null);

        console.log('SessionsPage: Loading data for user:', {
          email: user?.email,
          internalUserId: internalUserId,
          isAuthenticated: isAuthenticated
        });

        // Load group data
        const groupData = await groupService.getGroup(groupId);
        setGroup(groupData);

        // Verify user is a member of this group
        const memberData = await groupService.getGroupMembers(groupId);
        const currentMember = memberData.find((member: GroupMember) => member.user_id === internalUserId);
        
        if (!currentMember) {
          setError('You are not a member of this group');
          return;
        }

        setCurrentUserRole(currentMember.role || 'member');

        // Load sessions for this group (filter on frontend for now)
        const allSessions = await sessionService.getSessions();
        const groupSessions = allSessions.filter(session => session.group_id === groupId);
        setSessions(groupSessions);

      } catch (err: any) {
        console.error('SessionsPage: Error loading data:', err);
        setError(err?.message || 'Failed to load data');
      } finally {
        setLoading(false);
      }
    };

    // Only load data if we have a valid user and internal user ID
    if (!userLoading && isAuthenticated && user && internalUserId !== null && internalUserId > 0) {
      loadData();
    } else if (!userLoading && !isAuthenticated) {
      router.push('/login');
    } else if (!userLoading && internalUserId === 0) {
      setError('Guest users cannot access sessions. Please contact an administrator.');
      setLoading(false);
    }
  }, [groupId, user, internalUserId, isAuthenticated, userLoading, router]);

  const handleCreateSession = async (data: { title: string; description?: string }) => {
    if (!internalUserId) return;

    try {
      setCreateLoading(true);
      
      const sessionData: CreateSessionRequest = {
        title: data.title,
        description: data.description,
        group_id: groupId,
        created_by: internalUserId,
      };

      const newSession = await sessionService.createSession(sessionData);
      setSessions(prev => [...prev, newSession]);
      setShowCreateModal(false);
    } catch (err: any) {
      console.error('Failed to create session:', err);
      setError(err?.message || 'Failed to create session');
    } finally {
      setCreateLoading(false);
    }
  };

  const handleSessionUpdate = () => {
    // Refresh sessions data when a session is updated
    const loadSessions = async () => {
      try {
        const allSessions = await sessionService.getSessions();
        const groupSessions = allSessions.filter(session => session.group_id === groupId);
        setSessions(groupSessions);
      } catch (err: any) {
        console.error('Failed to refresh sessions:', err);
      }
    };
    
    loadSessions();
  };

  // Show loading while checking authentication
  if (userLoading || loading) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-white mx-auto mb-4"></div>
          <p className="text-gray-400">Loading sessions...</p>
        </div>
      </div>
    );
  }

  // Show error if authentication failed
  if (userError || error) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="text-center text-red-400 max-w-md">
          <h2 className="text-xl font-semibold mb-2">Error</h2>
          <p>{userError || error}</p>
          {!isAuthenticated && (
            <button
              onClick={() => router.push('/login')}
              className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
            >
              Go to Login
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="min-h-screen bg-gray-950 text-white">
        {/* Header */}
        <div className="bg-gray-900 border-b border-gray-800">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-16">
              <div className="flex items-center space-x-4">
                <button
                  onClick={() => router.push(`/groups/${groupId}`)}
                  className="flex items-center space-x-2 text-gray-400 hover:text-white transition-colors"
                >
                  <ArrowLeftIcon className="h-5 w-5" />
                  <span>Back to Group</span>
                </button>
                
                <div className="border-l border-gray-700 h-6"></div>
                
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-blue-600 rounded-lg flex items-center justify-center">
                    <span className="text-white font-bold text-sm">S</span>
                  </div>
                  <div>
                    <h1 className="text-xl font-semibold">Sessions</h1>
                    {group && (
                      <p className="text-sm text-gray-400">{group.name}</p>
                    )}
                  </div>
                </div>
              </div>

              <button
                onClick={() => setShowCreateModal(true)}
                className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <PlusIcon className="h-5 w-5" />
                <span>New Session</span>
              </button>
            </div>
          </div>
        </div>

        {/* Content */}
        {internalUserId && (
          <SessionMenu
            groupId={groupId}
            sessions={sessions}
            currentUserId={internalUserId}
            currentUserRole={currentUserRole}
            onSessionCreate={() => setShowCreateModal(true)}
            onSessionUpdate={handleSessionUpdate}
          />
        )}
      </div>

      {/* Create Session Modal */}
      <CreateSessionModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSubmit={handleCreateSession}
        loading={createLoading}
      />
    </>
  );
};

export default GroupSessionsPage;