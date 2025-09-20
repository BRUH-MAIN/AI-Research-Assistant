'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  PlayIcon,
  StopIcon,
  UserGroupIcon,
  ChatBubbleLeftRightIcon,
  PlusIcon,
  XMarkIcon,
  EyeIcon,
  ClockIcon
} from '@heroicons/react/24/outline';
import { SessionWithParticipants, Session, SessionParticipant } from '../../types/types';
import { sessionService } from '../../services/sessionService';

interface SessionMenuProps {
  groupId: number;
  sessions: Session[];
  currentUserId: number;
  currentUserRole: string;
  onSessionCreate?: () => void;
  onSessionUpdate?: () => void;
}

interface SessionItemProps {
  session: Session;
  currentUserId: number;
  currentUserRole: string;
  onJoin: (sessionId: number) => void;
  onLeave: (sessionId: number) => void;
  onClose: (sessionId: number) => void;
  onViewChat: (sessionId: number) => void;
  participants: SessionParticipant[];
  isCurrentUserJoined: boolean;
  canClose: boolean;
}

const SessionItem: React.FC<SessionItemProps> = ({
  session,
  currentUserId,
  currentUserRole,
  onJoin,
  onLeave,
  onClose,
  onViewChat,
  participants,
  isCurrentUserJoined,
  canClose
}) => {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-500';
      case 'completed':
        return 'bg-gray-500';
      case 'offline':
      default:
        return 'bg-yellow-500';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'active':
        return 'Active';
      case 'completed':
        return 'Closed';
      case 'offline':
      default:
        return 'Waiting';
    }
  };

  const getAvailabilityStatus = (availability: string) => {
    switch (availability) {
      case 'available':
        return { color: 'bg-green-500', text: 'Online', textColor: 'text-green-400' };
      case 'busy':
        return { color: 'bg-yellow-500', text: 'Busy', textColor: 'text-yellow-400' };
      case 'offline':
      default:
        return { color: 'bg-gray-500', text: 'Offline', textColor: 'text-gray-400' };
    }
  };

  const getDisplayName = (firstName: string | null, lastName: string | null, email: string) => {
    const fullName = [firstName, lastName].filter(Boolean).join(' ');
    return fullName || email;
  };

  const onlineParticipants = participants.filter(p => p.user.availability === 'available');
  const offlineParticipants = participants.filter(p => p.user.availability !== 'available');

  return (
    <div className="bg-gray-800 border border-gray-700 rounded-lg p-4">
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          <div className="flex items-center space-x-2 mb-1">
            <h3 className="text-lg font-semibold text-white">{session.title}</h3>
            <div className={`w-2 h-2 rounded-full ${getStatusColor(session.status)}`}></div>
            <span className="text-sm text-gray-400">{getStatusText(session.status)}</span>
          </div>
          {session.description && (
            <p className="text-sm text-gray-400 mb-2">{session.description}</p>
          )}
          <div className="flex items-center space-x-4 text-xs text-gray-500">
            <span className="flex items-center space-x-1">
              <UserGroupIcon className="h-4 w-4" />
              <span>{participants.length} participants</span>
            </span>
            <span className="flex items-center space-x-1">
              <ClockIcon className="h-4 w-4" />
              <span>Created {new Date(session.created_at).toLocaleDateString()}</span>
            </span>
          </div>
        </div>

        <div className="flex items-center space-x-2 ml-4">
          {session.status !== 'completed' && (
            <>
              {!isCurrentUserJoined ? (
                <button
                  onClick={() => onJoin(session.id)}
                  className="flex items-center space-x-1 px-3 py-1 bg-green-600 hover:bg-green-700 text-white text-sm rounded-lg transition-colors"
                >
                  <PlayIcon className="h-4 w-4" />
                  <span>Join</span>
                </button>
              ) : (
                <button
                  onClick={() => onLeave(session.id)}
                  className="flex items-center space-x-1 px-3 py-1 bg-red-600 hover:bg-red-700 text-white text-sm rounded-lg transition-colors"
                >
                  <StopIcon className="h-4 w-4" />
                  <span>Leave</span>
                </button>
              )}
            </>
          )}

          <button
            onClick={() => onViewChat(session.id)}
            className="flex items-center space-x-1 px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded-lg transition-colors"
          >
            <ChatBubbleLeftRightIcon className="h-4 w-4" />
            <span>Chat</span>
          </button>

          {canClose && session.status !== 'completed' && (
            <button
              onClick={() => onClose(session.id)}
              className="flex items-center space-x-1 px-3 py-1 bg-red-700 hover:bg-red-800 text-white text-sm rounded-lg transition-colors"
            >
              <XMarkIcon className="h-4 w-4" />
              <span>Close</span>
            </button>
          )}
        </div>
      </div>

      {participants.length > 0 && (
        <div className="border-t border-gray-700 pt-3">
          <div className="mb-2">
            <h4 className="text-sm font-medium text-gray-300 mb-2">Participants</h4>
            
            {/* Online Participants */}
            {onlineParticipants.length > 0 && (
              <div className="mb-3">
                <p className="text-xs text-green-400 mb-1">Online ({onlineParticipants.length})</p>
                <div className="space-y-1">
                  {onlineParticipants.map((participant) => (
                    <div key={participant.user_id} className="flex items-center space-x-2">
                      <div className={`w-2 h-2 rounded-full ${getAvailabilityStatus(participant.user.availability).color}`}></div>
                      <span className="text-sm text-white">
                        {getDisplayName(participant.user.first_name, participant.user.last_name, participant.user.email)}
                      </span>
                      {participant.user_id === currentUserId && (
                        <span className="text-xs text-blue-400">(You)</span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Offline Participants */}
            {offlineParticipants.length > 0 && (
              <div>
                <p className="text-xs text-gray-400 mb-1">Offline ({offlineParticipants.length})</p>
                <div className="space-y-1">
                  {offlineParticipants.map((participant) => (
                    <div key={participant.user_id} className="flex items-center space-x-2">
                      <div className={`w-2 h-2 rounded-full ${getAvailabilityStatus(participant.user.availability).color}`}></div>
                      <span className="text-sm text-gray-400">
                        {getDisplayName(participant.user.first_name, participant.user.last_name, participant.user.email)}
                      </span>
                      {participant.user_id === currentUserId && (
                        <span className="text-xs text-blue-400">(You)</span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

const SessionMenu: React.FC<SessionMenuProps> = ({
  groupId,
  sessions,
  currentUserId,
  currentUserRole,
  onSessionCreate,
  onSessionUpdate
}) => {
  const router = useRouter();
  const [sessionsWithParticipants, setSessionsWithParticipants] = useState<{ [key: number]: SessionParticipant[] }>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load participants for all sessions
  useEffect(() => {
    const loadParticipants = async () => {
      setLoading(true);
      try {
        const participantPromises = sessions.map(session =>
          sessionService.getSessionParticipants(session.id)
            .then(participants => ({ sessionId: session.id, participants }))
        );

        const results = await Promise.all(participantPromises);
        const participantsMap = results.reduce((acc, { sessionId, participants }) => {
          acc[sessionId] = participants;
          return acc;
        }, {} as { [key: number]: SessionParticipant[] });

        setSessionsWithParticipants(participantsMap);
      } catch (err) {
        console.error('Error loading participants:', err);
        setError('Failed to load session participants');
      } finally {
        setLoading(false);
      }
    };

    if (sessions.length > 0) {
      loadParticipants();
    }
  }, [sessions]);

  const handleJoinSession = async (sessionId: number) => {
    try {
      await sessionService.joinSession(sessionId);
      // Reload participants for this session
      const participants = await sessionService.getSessionParticipants(sessionId);
      setSessionsWithParticipants(prev => ({ ...prev, [sessionId]: participants }));
      onSessionUpdate?.();
    } catch (err) {
      console.error('Error joining session:', err);
      setError('Failed to join session');
    }
  };

  const handleLeaveSession = async (sessionId: number) => {
    try {
      await sessionService.leaveSession(sessionId);
      // Reload participants for this session
      const participants = await sessionService.getSessionParticipants(sessionId);
      setSessionsWithParticipants(prev => ({ ...prev, [sessionId]: participants }));
      onSessionUpdate?.();
    } catch (err) {
      console.error('Error leaving session:', err);
      setError('Failed to leave session');
    }
  };

  const handleCloseSession = async (sessionId: number) => {
    if (!confirm('Are you sure you want to close this session? All participants will be removed and the chat will become read-only.')) {
      return;
    }

    try {
      await sessionService.closeSession(sessionId);
      // Reload participants for this session
      const participants = await sessionService.getSessionParticipants(sessionId);
      setSessionsWithParticipants(prev => ({ ...prev, [sessionId]: participants }));
      onSessionUpdate?.();
    } catch (err) {
      console.error('Error closing session:', err);
      setError('Failed to close session');
    }
  };

  const handleViewChat = (sessionId: number) => {
    router.push(`/chat?session=${sessionId}&group=${groupId}`);
  };

  const activeSessions = sessions.filter(s => s.status === 'active');
  const waitingSessions = sessions.filter(s => s.status === 'offline');
  const completedSessions = sessions.filter(s => s.status === 'completed');

  if (loading && sessions.length > 0) {
    return (
      <div className="bg-gray-900 min-h-screen p-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
            <p className="text-gray-400">Loading sessions...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gray-900 min-h-screen p-6">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-3xl font-bold text-white">Group Sessions</h1>
          {(currentUserRole === 'admin' || currentUserRole === 'mentor') && (
            <button
              onClick={onSessionCreate}
              className="flex items-center space-x-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
            >
              <PlusIcon className="h-5 w-5" />
              <span>Create Session</span>
            </button>
          )}
        </div>

        {error && (
          <div className="bg-red-900 border border-red-700 text-red-200 px-4 py-3 rounded-lg mb-6">
            {error}
          </div>
        )}

        {sessions.length === 0 ? (
          <div className="text-center py-12">
            <UserGroupIcon className="h-16 w-16 text-gray-600 mx-auto mb-4" />
            <h3 className="text-xl font-medium text-gray-300 mb-2">No sessions yet</h3>
            <p className="text-gray-400 mb-6">Create your first research session to start collaborating</p>
            {(currentUserRole === 'admin' || currentUserRole === 'mentor') && (
              <button
                onClick={onSessionCreate}
                className="flex items-center space-x-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors mx-auto"
              >
                <PlusIcon className="h-5 w-5" />
                <span>Create First Session</span>
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-8">
            {/* Active Sessions */}
            {activeSessions.length > 0 && (
              <div>
                <h2 className="text-xl font-semibold text-white mb-4 flex items-center space-x-2">
                  <div className="w-3 h-3 rounded-full bg-green-500"></div>
                  <span>Active Sessions ({activeSessions.length})</span>
                </h2>
                <div className="grid gap-4">
                  {activeSessions.map((session) => {
                    const participants = sessionsWithParticipants[session.id] || [];
                    const isCurrentUserJoined = participants.some(p => p.user_id === currentUserId);
                    const canClose = session.created_by === currentUserId || currentUserRole === 'admin';

                    return (
                      <SessionItem
                        key={session.id}
                        session={session}
                        currentUserId={currentUserId}
                        currentUserRole={currentUserRole}
                        onJoin={handleJoinSession}
                        onLeave={handleLeaveSession}
                        onClose={handleCloseSession}
                        onViewChat={handleViewChat}
                        participants={participants}
                        isCurrentUserJoined={isCurrentUserJoined}
                        canClose={canClose}
                      />
                    );
                  })}
                </div>
              </div>
            )}

            {/* Waiting Sessions */}
            {waitingSessions.length > 0 && (
              <div>
                <h2 className="text-xl font-semibold text-white mb-4 flex items-center space-x-2">
                  <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                  <span>Waiting for Participants ({waitingSessions.length})</span>
                </h2>
                <div className="grid gap-4">
                  {waitingSessions.map((session) => {
                    const participants = sessionsWithParticipants[session.id] || [];
                    const isCurrentUserJoined = participants.some(p => p.user_id === currentUserId);
                    const canClose = session.created_by === currentUserId || currentUserRole === 'admin';

                    return (
                      <SessionItem
                        key={session.id}
                        session={session}
                        currentUserId={currentUserId}
                        currentUserRole={currentUserRole}
                        onJoin={handleJoinSession}
                        onLeave={handleLeaveSession}
                        onClose={handleCloseSession}
                        onViewChat={handleViewChat}
                        participants={participants}
                        isCurrentUserJoined={isCurrentUserJoined}
                        canClose={canClose}
                      />
                    );
                  })}
                </div>
              </div>
            )}

            {/* Completed Sessions */}
            {completedSessions.length > 0 && (
              <div>
                <h2 className="text-xl font-semibold text-white mb-4 flex items-center space-x-2">
                  <div className="w-3 h-3 rounded-full bg-gray-500"></div>
                  <span>Closed Sessions ({completedSessions.length})</span>
                </h2>
                <div className="grid gap-4">
                  {completedSessions.map((session) => {
                    const participants = sessionsWithParticipants[session.id] || [];
                    const isCurrentUserJoined = false; // No participants in completed sessions
                    const canClose = false; // Cannot close already completed sessions

                    return (
                      <SessionItem
                        key={session.id}
                        session={session}
                        currentUserId={currentUserId}
                        currentUserRole={currentUserRole}
                        onJoin={handleJoinSession}
                        onLeave={handleLeaveSession}
                        onClose={handleCloseSession}
                        onViewChat={handleViewChat}
                        participants={participants}
                        isCurrentUserJoined={isCurrentUserJoined}
                        canClose={canClose}
                      />
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default SessionMenu;