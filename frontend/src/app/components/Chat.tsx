import { useEffect, useRef } from 'react';
import ChatBlock from './ChatBlock';
import { Message, MessageBlock } from '../types/types';

type ChatWindowProps = {
    messages: MessageBlock[];
}

function Chat({ messages }: ChatWindowProps) {
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  return (
    <div className="w-full max-w-3xl p-0 space-y-4 bg-transparent">
        {messages.map((msg) => (
            <ChatBlock 
                key={msg.id} 
                message={msg.userMessage}
                response={msg.aiResponse}
            />
        ))}
        <div ref={chatEndRef} />
    </div>
  )
}

export default Chat
