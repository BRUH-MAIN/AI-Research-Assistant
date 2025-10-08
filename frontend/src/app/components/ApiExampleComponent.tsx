'use client';

import React, { useState } from 'react';
import {
  useUsers,
  useCreateUser,
  useSessions,
  useCreateSession,
  useSessionMessages,
  useCreateSessionMessage,
  usePapers,
  useSearchPapers,
} from '../hooks';
import type { CreateUserRequest, CreateSessionRequest, CreateMessageRequest } from '../types/types';

/**
 * Example component demonstrating how to use the API services
 * This shows patterns for:
 * - Fetching data with loading/error states
 * - Creating new entities
 * - Using search functionality
 * - Handling mutations
 */
export default function ApiExampleComponent() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSessionId, setSelectedSessionId] = useState<number | null>(null);

  // Fetch data hooks
  const { data: users, loading: usersLoading, error: usersError, refetch: refetchUsers } = useUsers();
  const { data: sessions, loading: sessionsLoading, error: sessionsError } = useSessions();
  const { data: papers, loading: papersLoading, error: papersError } = usePapers();
  
  // Search papers hook (only when searchQuery has content)
  const searchParams = { query: searchQuery, limit: 10 };
  const { data: searchResults, loading: searchLoading } = useSearchPapers(searchParams);

  // Session messages (only fetch when a session is selected)
  const { data: messages, loading: messagesLoading } = useSessionMessages(selectedSessionId || 1);

  // Mutation hooks
  const { mutate: createUser, loading: createUserLoading } = useCreateUser();
  const { mutate: createSession, loading: createSessionLoading } = useCreateSession();
  const { mutate: createMessage, loading: createMessageLoading } = useCreateSessionMessage();

  // Example handlers
  const handleCreateUser = async () => {
    const userData: CreateUserRequest = {
      username: 'newuser',
      email: 'newuser@example.com',
      full_name: 'New User',
    };
    
    const result = await createUser(userData);
    if (result) {
      console.log('User created:', result);
      refetchUsers(); // Refresh the users list
    }
  };

  const handleCreateSession = async () => {
    if (!users || users.length === 0) return;
    
    const sessionData: CreateSessionRequest = {
      title: 'New Research Session',
      description: 'A session for discussing AI research',
      created_by: users[0].id,
      status: 'active',
    };
    
    const result = await createSession(sessionData);
    if (result) {
      console.log('Session created:', result);
      setSelectedSessionId(result.id);
    }
  };

  const handleSendMessage = async () => {
    if (!selectedSessionId || !users || users.length === 0) return;
    
    const messageData: Omit<CreateMessageRequest, 'session_id'> = {
      user_id: users[0].id,
      content: 'Hello, this is a test message!',
      message_type: 'user',
    };
    
    const result = await createMessage({ sessionId: selectedSessionId, data: messageData });
    if (result) {
      console.log('Message sent:', result);
    }
  };

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-8">
      <h1 className="text-3xl font-bold">API Services Example</h1>
      
      {/* Users Section */}
      <section className="border rounded-lg p-4">
        <h2 className="text-xl font-semibold mb-4">Users</h2>
        {usersLoading && <p>Loading users...</p>}
        {usersError && <p className="text-red-500">Error: {usersError}</p>}
        {users && (
          <div>
            <p>Found {users.length} users</p>
            <ul className="list-disc list-inside mt-2">
              {users.slice(0, 5).map((user) => (
                <li key={user.id}>
                  {user.full_name || user.username} ({user.email})
                </li>
              ))}
            </ul>
            <button
              onClick={handleCreateUser}
              disabled={createUserLoading}
              className="mt-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
            >
              {createUserLoading ? 'Creating...' : 'Create Test User'}
            </button>
          </div>
        )}
      </section>

      {/* Sessions Section */}
      <section className="border rounded-lg p-4">
        <h2 className="text-xl font-semibold mb-4">Sessions</h2>
        {sessionsLoading && <p>Loading sessions...</p>}
        {sessionsError && <p className="text-red-500">Error: {sessionsError}</p>}
        {sessions && (
          <div>
            <p>Found {sessions.length} sessions</p>
            <ul className="list-disc list-inside mt-2">
              {sessions.slice(0, 5).map((session) => (
                <li key={session.id}>
                  <button
                    onClick={() => setSelectedSessionId(session.id)}
                    className="text-blue-500 hover:underline"
                  >
                    {session.title}
                  </button>
                  {session.description && (
                    <span className="text-gray-600 ml-2">- {session.description}</span>
                  )}
                </li>
              ))}
            </ul>
            <button
              onClick={handleCreateSession}
              disabled={createSessionLoading}
              className="mt-4 px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 disabled:opacity-50"
            >
              {createSessionLoading ? 'Creating...' : 'Create Test Session'}
            </button>
          </div>
        )}
      </section>

      {/* Selected Session Messages */}
      {selectedSessionId && (
        <section className="border rounded-lg p-4">
          <h2 className="text-xl font-semibold mb-4">
            Messages for Session {selectedSessionId}
          </h2>
          {messagesLoading && <p>Loading messages...</p>}
          {messages && (
            <div>
              <p>Found {messages.length} messages</p>
              <ul className="list-disc list-inside mt-2">
                {messages.slice(0, 10).map((message) => (
                  <li key={message.id}>
                    <span className="font-medium">{message.message_type}:</span> {message.content}
                  </li>
                ))}
              </ul>
              <button
                onClick={handleSendMessage}
                disabled={createMessageLoading}
                className="mt-4 px-4 py-2 bg-purple-500 text-white rounded hover:bg-purple-600 disabled:opacity-50"
              >
                {createMessageLoading ? 'Sending...' : 'Send Test Message'}
              </button>
            </div>
          )}
        </section>
      )}

      {/* Papers Search */}
      <section className="border rounded-lg p-4">
        <h2 className="text-xl font-semibold mb-4">Papers Search</h2>
        <div className="mb-4">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search papers by title, abstract, or authors..."
            className="w-full px-3 py-2 border rounded-lg"
          />
        </div>
        
        {papersLoading && <p>Loading all papers...</p>}
        {papersError && <p className="text-red-500">Error: {papersError}</p>}
        
        {searchQuery.length > 2 && (
          <div className="mb-4">
            <h3 className="font-medium">Search Results:</h3>
            {searchLoading && <p>Searching...</p>}
            {searchResults && (
              <ul className="list-disc list-inside mt-2">
                {searchResults.map((paper) => (
                  <li key={paper.id}>
                    <strong>{paper.title}</strong>
                    {paper.authors && <span className="text-gray-600"> by {paper.authors}</span>}
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
        
        {papers && (
          <div>
            <h3 className="font-medium">All Papers ({papers.length}):</h3>
            <ul className="list-disc list-inside mt-2">
              {papers.slice(0, 5).map((paper) => (
                <li key={paper.id}>
                  <strong>{paper.title}</strong>
                  {paper.authors && <span className="text-gray-600"> by {paper.authors}</span>}
                </li>
              ))}
            </ul>
          </div>
        )}
      </section>
    </div>
  );
}