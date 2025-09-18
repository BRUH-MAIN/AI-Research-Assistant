import { useState, useEffect } from 'react';
import type { Message, MessageBlock } from '../types/types';
import { chatService } from '../services/chatService';

function useHandleInput() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [messageBlocks, setMessageBlocks] = useState<MessageBlock[]>([]);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState<boolean>(false);

  // Helper function to convert messages to message blocks
  const convertMessagesToBlocks = (messages: Message[]): MessageBlock[] => {
    const blocks: MessageBlock[] = [];
    for (let i = 0; i < messages.length; i += 2) {
      const userMessage = messages[i];
      const aiMessage = messages[i + 1];
      
      if (userMessage && userMessage.sender === 'user') {
        blocks.push({
          id: userMessage.id,
          userMessage: userMessage.content,
          aiResponse: aiMessage ? aiMessage.content : '',
          timestamp: new Date(),
          isLoading: false,
        });
      }
    }
    return blocks;
  };

  // Initialize session on component mount
  useEffect(() => {
    const initializeSession = async () => {
      try {
        // Check if backend is available
        const healthCheck = await chatService.healthCheck();
        setIsConnected(healthCheck);
        
        if (!healthCheck) {
          console.warn('Backend is not available. Chat functionality will be limited.');
          return;
        }

        // Create new session
        const newSessionId = await chatService.createSession();
        setSessionId(newSessionId);
        
        // Load existing chat history if any
        const history = await chatService.getSessionHistory(newSessionId);
        if (history.length > 0) {
          setMessages(history);
          // Convert to message blocks for UI
          const blocks = convertMessagesToBlocks(history);
          setMessageBlocks(blocks);
        }
      } catch (error) {
        console.error('Failed to initialize chat session:', error);
        setIsConnected(false);
      }
    };

    initializeSession();
  }, []);

  const onSendMessage = async (text: string) => {
    if (!sessionId) {
      console.error('No active session');
      return;
    }

    if (!isConnected) {
      console.error('Backend is not connected');
      return;
    }

    const userMessage: Message = {
      id: Date.now().toString(),
      sender: 'user',
      content: text,
    };

    const block: MessageBlock = {
      id: Date.now().toString(),
      userMessage: text,
      aiResponse: '',
      timestamp: new Date(),
      isLoading: true,
    };

    // Optimistically update UI
    setMessages((prevMessages) => [...prevMessages, userMessage]);
    setMessageBlocks((prevBlocks) => [...prevBlocks, block]);

    try {
      // Send message using API service
      const response = await chatService.sendMessage(sessionId, {
        id: userMessage.id,
        sender: userMessage.sender,
        content: userMessage.content,
        timestamp: new Date(),
      });

      const aiMessage: Message = {
        id: response.aiMessage.id,
        sender: 'ai',
        content: response.aiMessage.content,
      };

      // Update both messages and blocks
      setMessages((prevMessages) => [...prevMessages, aiMessage]);
      setMessageBlocks((prevBlocks) => {
        const updatedBlocks = [...prevBlocks];
        const lastBlock = updatedBlocks[updatedBlocks.length - 1];
        if (lastBlock) {
          lastBlock.aiResponse = aiMessage.content;
          lastBlock.isLoading = false;
        }
        return updatedBlocks;
      });

    } catch(err: any) {
      const errorMessage: Message = {
        id: Date.now().toString(),
        sender: 'ai',
        content: 'Error: ' + (err.message || 'Failed to send message'),
      };

      setMessages((prevMessages) => [...prevMessages, errorMessage]);
      
      // Update the loading state of the last block
      setMessageBlocks((prevBlocks) => {
        const updatedBlocks = [...prevBlocks];
        const lastBlock = updatedBlocks[updatedBlocks.length - 1];
        if (lastBlock) {
          lastBlock.aiResponse = errorMessage.content;
          lastBlock.isLoading = false;
        }
        return updatedBlocks;
      });
    }
  };

  // Function to clear chat history
  const clearChatHistory = async () => {
    if (sessionId && isConnected) {
      try {
        await chatService.deleteSession(sessionId);
        setMessages([]);
        setMessageBlocks([]);
        // Create new session
        const newSessionId = await chatService.createSession();
        setSessionId(newSessionId);
      } catch (error) {
        console.error('Failed to clear chat history:', error);
      }
    }
  };

  return {
    messages,
    messageBlocks,
    onSendMessage,
    clearChatHistory,
    isConnected,
    sessionId,
  };
}

export default useHandleInput;
