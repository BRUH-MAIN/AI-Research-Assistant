type TopBarProps = {
  isConnected: boolean;
};

function TopBar({ isConnected }: TopBarProps) {
  return (
    <header className="relative flex w-full flex-col gap-4 rounded-3xl border border-white/10 bg-white/5 p-6 shadow-soft backdrop-blur-2xl">
      <div className="flex flex-col gap-2 text-white/90 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.35em] text-white/60">Workspace</p>
          <h1 className="text-2xl font-semibold leading-tight md:text-3xl">
            Research Studio
          </h1>
          <p className="mt-1 max-w-xl text-sm text-white/70">
            Organize discoveries, synthesize insights, and converse with your AI partner in a single immersive canvas.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span
            className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-medium transition ${
              isConnected
                ? "border-emerald-400/40 bg-emerald-400/10 text-emerald-200"
                : "border-rose-400/40 bg-rose-500/10 text-rose-200"
            }`}
          >
            <span className="relative inline-flex h-2 w-2">
              <span
                className={`absolute inline-flex h-full w-full animate-ping rounded-full opacity-60 ${
                  isConnected ? "bg-emerald-400" : "bg-rose-400"
                }`}
              />
              <span
                className={`relative inline-flex h-2 w-2 rounded-full ${
                  isConnected ? "bg-emerald-400" : "bg-rose-400"
                }`}
              />
            </span>
            {isConnected ? "Live connection" : "Offline mode"}
          </span>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        {[
          {
            label: "Conversation depth",
            value: "Contextual memory",
            tone: "from-accent to-accent-soft",
          },
          {
            label: "Document sync",
            value: isConnected ? "Active" : "Paused",
            tone: isConnected ? "from-emerald-400 to-emerald-500" : "from-rose-400 to-rose-500",
          },
          {
            label: "Workspace mode",
            value: "Scholarly",
            tone: "from-sky-400 to-blue-600",
          },
        ].map((card, idx) => (
          <div
            key={idx}
            className="relative overflow-hidden rounded-2xl border border-white/10 bg-white/3 p-4 text-sm text-white/80 shadow-soft"
          >
            <div className={`absolute inset-0 opacity-20 blur-2xl bg-gradient-to-br ${card.tone}`} aria-hidden />
            <p className="text-xs uppercase tracking-[0.2em] text-white/60">{card.label}</p>
            <p className="mt-1 text-lg font-medium text-white">{card.value}</p>
          </div>
        ))}
      </div>
    </header>
  );
}

export default TopBar;
