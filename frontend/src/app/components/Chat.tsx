import { useEffect, useRef } from "react";
import ChatBlock from "./ChatBlock";
import { MessageBlock } from "../types/types";

type ChatWindowProps = {
  messages: MessageBlock[];
};

function Chat({ messages }: ChatWindowProps) {
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  return (
    <div className="flex w-full max-w-4xl flex-col gap-10 pb-10">
      {messages.map((msg) => (
        <ChatBlock
          key={msg.id}
          message={msg.userMessage}
          response={msg.aiResponse}
        />
      ))}
      <div ref={chatEndRef} />
    </div>
  );
}

export default Chat;
