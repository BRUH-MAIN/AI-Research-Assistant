import React from "react";
import remarkGfm from "remark-gfm";
import ReactMarkdown from "react-markdown";

type ChatBlockProps = {
  message: string;
  response: string;
};

function ChatBlock({ message, response }: ChatBlockProps) {
  return (
    <article className="mx-auto w-full max-w-3xl space-y-6 text-white/90">
      <div className="flex justify-end">
        <div className="relative max-w-xl rounded-3xl border border-white/10 bg-gradient-to-br from-white/10 via-white/5 to-white/2 px-5 py-4 text-sm shadow-soft">
          <span className="absolute -right-3 top-4 h-6 w-6 rounded-full bg-gradient-to-br from-accent to-accent-soft blur-sm" aria-hidden />
          <p className="leading-relaxed text-white/90">{message}</p>
        </div>
      </div>

      <div className="flex items-start gap-4">
        <div className="relative grid h-9 w-9 place-items-center rounded-full border border-white/10 bg-gradient-to-br from-accent to-accent-soft text-xs font-semibold text-white shadow-soft">
          AR
        </div>
        <div className="flex-1 rounded-3xl border border-white/10 bg-white/4 p-5 shadow-soft">
          <div className="prose prose-invert max-w-none text-sm leading-relaxed text-white/85 [&>pre]:rounded-2xl [&>pre]:border [&>pre]:border-white/10 [&>pre]:bg-black/40">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{response}</ReactMarkdown>
          </div>
        </div>
      </div>
    </article>
  );
}

export default ChatBlock;
