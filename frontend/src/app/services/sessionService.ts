import { apiClient } from './api';
import type { 
  Session, 
  CreateSessionRequest, 
  UpdateSessionRequest,
  SessionParticipant,
  SessionWithParticipants
} from '../types/types';

export class SessionService {
  // Get all sessions
  async getSessions(): Promise<Session[]> {
    return apiClient.get<Session[]>('/sessions/');
  }

  // Create a new session
  async createSession(sessionData: CreateSessionRequest): Promise<Session> {
    return apiClient.post<Session>('/sessions/', sessionData);
  }

  // Get a specific session by ID
  async getSession(sessionId: number): Promise<Session> {
    return apiClient.get<Session>(`/sessions/${sessionId}`);
  }

  // Update a specific session
  async updateSession(sessionId: number, sessionData: UpdateSessionRequest): Promise<Session> {
    return apiClient.put<Session>(`/sessions/${sessionId}`, sessionData);
  }

  // Delete a specific session
  async deleteSession(sessionId: number): Promise<void> {
    return apiClient.delete<void>(`/sessions/${sessionId}`);
  }

  // Join a session
  async joinSession(sessionId: number): Promise<void> {
    return apiClient.post<void>(`/sessions/${sessionId}/join`);
  }

  // Leave a session
  async leaveSession(sessionId: number): Promise<void> {
    return apiClient.delete<void>(`/sessions/${sessionId}/leave`);
  }

  // Get session participants
  async getSessionParticipants(sessionId: number): Promise<SessionParticipant[]> {
    return apiClient.get<SessionParticipant[]>(`/sessions/${sessionId}/participants`);
  }

  // Close a session
  async closeSession(sessionId: number): Promise<Session> {
    return apiClient.post<Session>(`/sessions/${sessionId}/close`);
  }

  // Get session with participants (convenience method)
  async getSessionWithParticipants(sessionId: number): Promise<SessionWithParticipants> {
    const [session, participants] = await Promise.all([
      this.getSession(sessionId),
      this.getSessionParticipants(sessionId)
    ]);

    return {
      ...session,
      participants
    };
  }
}

// Create singleton instance
export const sessionService = new SessionService();