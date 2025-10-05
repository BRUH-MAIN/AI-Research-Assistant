'use client';

import { useApi, useMutation } from './useApi';
import { 
  userService, 
  groupService, 
  sessionService, 
  messageService, 
  paperService, 
  feedbackService, 
  aiMetadataService,
  profileService
} from '../services';
import type {
  User,
  CreateUserRequest,
  UpdateUserRequest,
  Group,
  CreateGroupRequest,
  UpdateGroupRequest,
  Session,
  CreateSessionRequest,
  UpdateSessionRequest,
  ChatMessage,
  CreateMessageRequest,
  UpdateMessageRequest,
  Paper,
  CreatePaperRequest,
  UpdatePaperRequest,
  PaperSearchParams,
  Feedback,
  CreateFeedbackRequest,
  UpdateFeedbackRequest,
  AiMetadata,
  CreateAiMetadataRequest,
  UpdateAiMetadataRequest,
  UserProfile,
  ProfileUpdateData,
} from '../types/types';

// User hooks
export const useUsers = () => useApi(() => userService.getUsers());
export const useUser = (userId: number) => useApi(() => userService.getUser(userId), [userId]);
export const useCreateUser = () => useMutation((data: CreateUserRequest) => userService.createUser(data));
export const useUpdateUser = () => useMutation(({ userId, data }: { userId: number; data: UpdateUserRequest }) => 
  userService.updateUser(userId, data)
);
export const useDeleteUser = () => useMutation((userId: number) => userService.deleteUser(userId));
export const useActivateUser = () => useMutation((userId: number) => userService.activateUser(userId));
export const useDeactivateUser = () => useMutation((userId: number) => userService.deactivateUser(userId));

// Group hooks
export const useGroups = () => useApi(() => groupService.getGroups());
export const useGroup = (groupId: number) => useApi(() => groupService.getGroup(groupId), [groupId]);
export const useGroupMembers = (groupId: number) => useApi(() => groupService.getGroupMembers(groupId), [groupId]);
export const useCreateGroup = () => useMutation((data: CreateGroupRequest) => groupService.createGroup(data));
export const useUpdateGroup = () => useMutation(({ groupId, data }: { groupId: number; data: UpdateGroupRequest }) => 
  groupService.updateGroup(groupId, data)
);
export const useDeleteGroup = () => useMutation((groupId: number) => groupService.deleteGroup(groupId));
export const useAddGroupMember = () => useMutation(({ groupId, userId }: { groupId: number; userId: number }) => 
  groupService.addGroupMember(groupId, userId)
);
export const useRemoveGroupMember = () => useMutation(({ groupId, userId }: { groupId: number; userId: number }) => 
  groupService.removeGroupMember(groupId, userId)
);

// Session hooks
export const useSessions = () => useApi(() => sessionService.getSessions());
export const useSession = (sessionId: number) => useApi(() => sessionService.getSession(sessionId), [sessionId]);
export const useCreateSession = () => useMutation((data: CreateSessionRequest) => sessionService.createSession(data));
export const useUpdateSession = () => useMutation(({ sessionId, data }: { sessionId: number; data: UpdateSessionRequest }) => 
  sessionService.updateSession(sessionId, data)
);
export const useDeleteSession = () => useMutation((sessionId: number) => sessionService.deleteSession(sessionId));
export const useJoinSession = () => useMutation((sessionId: number) => sessionService.joinSession(sessionId));
export const useLeaveSession = () => useMutation((sessionId: number) => sessionService.leaveSession(sessionId));
export const useSessionParticipants = (sessionId: number) => useApi(() => sessionService.getSessionParticipants(sessionId), [sessionId]);
export const useCloseSession = () => useMutation((sessionId: number) => sessionService.closeSession(sessionId));
export const useSessionWithParticipants = (sessionId: number) => useApi(() => sessionService.getSessionWithParticipants(sessionId), [sessionId]);

// Message hooks
export const useMessages = (filters?: { session_id?: number; user_id?: number; message_type?: 'user' | 'ai' | 'system' }) => 
  useApi(() => messageService.getMessages(filters), [filters]);
export const useMessage = (messageId: number) => useApi(() => messageService.getMessage(messageId), [messageId]);
export const useSessionMessages = (sessionId: number) => useApi(() => messageService.getSessionMessages(sessionId), [sessionId]);
export const useCreateMessage = () => useMutation((data: CreateMessageRequest) => messageService.createMessage(data));
export const useCreateSessionMessage = () => useMutation(({ sessionId, data }: { sessionId: number; data: Omit<CreateMessageRequest, 'session_id'> }) => 
  messageService.createSessionMessage(sessionId, data)
);
export const useUpdateMessage = () => useMutation(({ messageId, data }: { messageId: number; data: UpdateMessageRequest }) => 
  messageService.updateMessage(messageId, data)
);
export const useDeleteMessage = () => useMutation((messageId: number) => messageService.deleteMessage(messageId));

// Paper hooks
export const usePapers = () => useApi(() => paperService.getPapers());
export const usePaper = (paperId: number) => useApi(() => paperService.getPaper(paperId), [paperId]);
export const useSessionPapers = (sessionId: number) => useApi(() => paperService.getSessionPapers(sessionId), [sessionId]);
export const usePaperTags = (paperId: number) => useApi(() => paperService.getPaperTags(paperId), [paperId]);
export const useSearchPapers = (searchParams: PaperSearchParams) => 
  useApi(() => paperService.searchPapers(searchParams), [searchParams.query, searchParams.limit]);
export const useCreatePaper = () => useMutation((data: CreatePaperRequest) => paperService.createPaper(data));
export const useUpdatePaper = () => useMutation(({ paperId, data }: { paperId: number; data: UpdatePaperRequest }) => 
  paperService.updatePaper(paperId, data)
);
export const useDeletePaper = () => useMutation((paperId: number) => paperService.deletePaper(paperId));
export const useAddPaperTags = () => useMutation(({ paperId, tags }: { paperId: number; tags: string[] }) => 
  paperService.addPaperTags(paperId, { tags })
);
export const useRemovePaperTag = () => useMutation(({ paperId, tag }: { paperId: number; tag: string }) => 
  paperService.removePaperTag(paperId, tag)
);
export const useLinkPaperToSession = () => useMutation(({ sessionId, paperId }: { sessionId: number; paperId: number }) => 
  paperService.linkPaperToSession(sessionId, paperId)
);
export const useRemovePaperFromSession = () => useMutation(({ sessionId, paperId }: { sessionId: number; paperId: number }) => 
  paperService.removePaperFromSession(sessionId, paperId)
);

// Feedback hooks
export const useSessionFeedback = (sessionId: number) => useApi(() => feedbackService.getSessionFeedback(sessionId), [sessionId]);
export const useFeedback = (feedbackId: number) => useApi(() => feedbackService.getFeedback(feedbackId), [feedbackId]);
export const useUserFeedback = (userId: number) => useApi(() => feedbackService.getUserFeedback(userId), [userId]);
export const useCreateSessionFeedback = () => useMutation(({ sessionId, data }: { sessionId: number; data: CreateFeedbackRequest }) => 
  feedbackService.createSessionFeedback(sessionId, data)
);
export const useUpdateFeedback = () => useMutation(({ feedbackId, data }: { feedbackId: number; data: UpdateFeedbackRequest }) => 
  feedbackService.updateFeedback(feedbackId, data)
);
export const useDeleteFeedback = () => useMutation((feedbackId: number) => feedbackService.deleteFeedback(feedbackId));

// AI Metadata hooks
export const useMessageAiMetadata = (messageId: number) => useApi(() => aiMetadataService.getMessageAiMetadata(messageId), [messageId]);
export const usePaperAiMetadata = (paperId: number) => useApi(() => aiMetadataService.getPaperAiMetadata(paperId), [paperId]);
export const useSessionAiMetadata = (sessionId: number) => useApi(() => aiMetadataService.getSessionAiMetadata(sessionId), [sessionId]);
export const useAiMetadata = (metadataId: number) => useApi(() => aiMetadataService.getAiMetadata(metadataId), [metadataId]);
export const useCreateMessageAiMetadata = () => useMutation(({ messageId, data }: { messageId: number; data: CreateAiMetadataRequest }) => 
  aiMetadataService.createMessageAiMetadata(messageId, data)
);
export const useUpdateAiMetadata = () => useMutation(({ metadataId, data }: { metadataId: number; data: UpdateAiMetadataRequest }) => 
  aiMetadataService.updateAiMetadata(metadataId, data)
);
export const useDeleteAiMetadata = () => useMutation((metadataId: number) => aiMetadataService.deleteAiMetadata(metadataId));

// Profile hooks
export const useProfile = () => useApi(() => profileService.getProfile());
export const useUpdateProfile = () => useMutation((data: ProfileUpdateData) => profileService.updateProfile(data));
export const useSyncProfile = () => useMutation(() => profileService.syncProfile());
export const useAuthStatus = () => useApi(() => profileService.getAuthStatus());
export const useHealthCheck = () => useApi(() => profileService.healthCheck());