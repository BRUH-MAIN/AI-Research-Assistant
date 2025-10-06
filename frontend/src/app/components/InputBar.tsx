import BarTools from "./BarTools";
import { useEffect, useRef } from "react";

type InputBarProps = {
  onSendMessage?: (message: string) => void;
  isConnected?: boolean;
};

function InputBar({ onSendMessage, isConnected = true }: InputBarProps) {
  const inputbarRef = useRef<HTMLTextAreaElement>(null);

  const handleClick = () => {
    if (isConnected) {
      inputbarRef.current?.focus();
    }
  };

  useEffect(() => {
    const textarea = inputbarRef.current;
    if (textarea) {
      textarea.focus();

      const handleInput = () => {
        textarea.style.height = "auto";
        textarea.style.height = `${textarea.scrollHeight}px`;
      };
      textarea.addEventListener("input", handleInput);

      handleInput();
      return () => {
        textarea.removeEventListener("input", handleInput);
      };
    }
  }, []);

  const handleSend = () => {
    if (inputbarRef.current && isConnected) {
      const message = inputbarRef.current.value.trim();
      if (message && onSendMessage) {
        onSendMessage(message);
        inputbarRef.current.value = "";
        inputbarRef.current.style.height = "auto";
      }
    }
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === "Enter" && !event.shiftKey && isConnected) {
      event.preventDefault();
      handleSend();
    }
  };

  return (
    <div
      className={`relative w-full cursor-text overflow-hidden rounded-[28px] border border-white/12 bg-white/6 p-2 shadow-soft backdrop-blur-2xl transition ${
        isConnected ? "hover:border-white/20" : "opacity-50"
      }`}
      onClick={handleClick}
    >
      <div className="absolute inset-0 bg-gradient-to-br from-white/6 via-white/3 to-white/2 opacity-40" aria-hidden />
      <div className="relative flex flex-col gap-2 rounded-3xl bg-surface/70 p-4 text-white">
        <textarea
          ref={inputbarRef}
          className="max-h-48 w-full resize-none bg-transparent text-base leading-relaxed text-white placeholder:text-white/40 focus:outline-none"
          placeholder={
            isConnected
              ? "Ask for comparisons, coding guidance, or literature summaries…"
              : "Backend disconnected — reconnect to resume conversations"
          }
          onKeyDown={handleKeyDown}
          disabled={!isConnected}
        />
        <div className="flex items-center justify-between text-xs text-white/50">
          <span>Press Enter to send • Shift + Enter for line break</span>
          <BarTools onSend={handleSend} disabled={!isConnected} />
        </div>
      </div>
    </div>
  );
}

export default InputBar;
