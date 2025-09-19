import BarTools from "./BarTools"
import { useEffect, useRef } from "react"

type InputBarProps = {
  onSendMessage?: (message:string) => void;
  isConnected?: boolean;
}

function InputBar({ onSendMessage, isConnected = true }: InputBarProps) {
  const inputbarRef = useRef<HTMLTextAreaElement>(null)

  const handleClick = () => {
    if (isConnected) {
      inputbarRef.current?.focus()
    }
  }

  useEffect(() => {
    const textarea = inputbarRef.current;
    if (textarea) {
      textarea.focus();

      const handleInput = () => {
        textarea.style.height = 'auto'; // Reset height
        textarea.style.height = `${textarea.scrollHeight}px`; // Set to scrollHeight
      }
      textarea.addEventListener('input', handleInput);

      // Initial height adjustment
      handleInput();
      return () => {
        textarea.removeEventListener('input', handleInput);
      }
    }
  }, [])

  const handleSend = () => {
    if (inputbarRef.current && isConnected) {
      const message = inputbarRef.current.value.trim();
      if (message && onSendMessage) {
        onSendMessage(message);
        inputbarRef.current.value = ''; // Clear the input after sending
        inputbarRef.current.style.height = 'auto';
      }
    }
  }

  const handleKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Enter' && !event.shiftKey && isConnected) {
      event.preventDefault();
      handleSend();
    }
  };

  return (
    <div 
      className={`border-1 border-white bg-transparent relative cursor-text max-w-3xl w-full p-[1px] rounded-0 overflow-hidden flex flex-col items-center justify-between ${
        !isConnected ? 'opacity-50' : ''
      }`}
      onClick={handleClick}
    >
        <div className="p-0 relative w-full h-full bg-slate-950 rounded-0 flex items-center justify-center">
            <div className="gap-1 p-2 h-full w-full bg-transparent rounded-0 flex flex-col items-center justify-between">
                <textarea
                    ref={inputbarRef}
                    className="rounded-0 flex-grow overflow-y-auto max-h-40 w-full p-2 bg-transparent text-white border-none focus:outline-none resize-none"
                    placeholder={isConnected ? "Type your message here..." : "Backend disconnected - check connection"}
                    onKeyDown={handleKeyDown}
                    disabled={!isConnected}
                />
                <BarTools onSend={handleSend} disabled={!isConnected}/>
            </div>
        </div>
    </div>
  )
}

export default InputBar
