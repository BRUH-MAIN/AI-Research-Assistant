import TopBar from "../components/TopBar";
import InputBar from "../components/InputBar";
import useHandleInput from "../hooks/useHandleInput";
import Chat from "./Chat";
import { useState, useEffect } from "react";

function MainWindow() {
  const { messages, onSendMessage, messageBlocks, isConnected } = useHandleInput();
  const [isChatVisible, setIsChatVisible] = useState(false);

  useEffect(() => {
    if (messages.length > 0 && !isChatVisible) {
      const timer = setTimeout(() => {
        setIsChatVisible(true);
      }, 360);
      return () => clearTimeout(timer);
    }
  }, [messages, isChatVisible]);

  return (
    <section className="relative flex h-full w-full flex-col gap-6 overflow-hidden px-4 pb-8 pt-6 sm:px-8 lg:px-12">
      <div className="pointer-events-none absolute inset-0 opacity-60 blur-3xl" aria-hidden>
        <div className="absolute inset-0 bg-glow-iris" />
      </div>

      <TopBar isConnected={isConnected} />

      {!isConnected && (
        <div className="relative z-20 -mt-2 flex w-full items-center justify-between gap-4 rounded-2xl border border-amber-400/30 bg-amber-500/10 px-4 py-3 text-xs text-amber-200 shadow-soft">
          <div>
            <p className="font-semibold tracking-wide">Offline mode</p>
            <p className="text-amber-100/80">Launch the FastAPI backend on :8000 to resume streaming responses.</p>
          </div>
          <span className="hidden rounded-full border border-amber-400/40 px-3 py-1 sm:block">
            Troubleshooting guide →
          </span>
        </div>
      )}

      <div className="relative z-10 flex flex-1 flex-col gap-6">
        <div className="relative flex-1 overflow-hidden rounded-[32px] border border-white/10 bg-surface/80 p-6 shadow-soft backdrop-blur-2xl">
          <div className="pointer-events-none absolute inset-0 bg-white/3 opacity-60" aria-hidden />
          {isChatVisible ? (
            <div className="relative flex h-full w-full justify-center overflow-y-auto pb-16 pr-1">
              <Chat messages={messageBlocks} />
            </div>
          ) : (
            <div className="relative flex h-full flex-col items-center justify-center gap-6 text-center text-white/70">
              <div className="space-y-3">
                <p className="text-sm uppercase tracking-[0.3em] text-white/50">Conversation ready</p>
                <h2 className="text-3xl font-semibold text-white">Ask about any paper, dataset, or idea.</h2>
                <p className="mx-auto max-w-xl text-sm text-white/70">
                  Summon evidence-based explanations, compare methodologies, or spin up summaries. Your responses will unfold here.
                </p>
              </div>
              <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs uppercase tracking-[0.2em] text-white/60">
                Press Shift ↵ to add line breaks
              </div>
            </div>
          )}
        </div>

        <div className="relative z-20 mx-auto w-full max-w-3xl">
          <InputBar onSendMessage={onSendMessage} isConnected={isConnected} />
        </div>
      </div>
    </section>
  );
}

export default MainWindow;
