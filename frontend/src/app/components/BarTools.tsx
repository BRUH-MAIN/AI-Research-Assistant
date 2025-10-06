import UploadButton from "../assets/UploadButton";
import SendButton from "../assets/SendButton";

type BarToolsProps = {
  onSend?: () => void;
  disabled?: boolean;
};

function BarTools({ onSend, disabled = false }: BarToolsProps) {
  const baseButton =
    "grid h-11 w-11 place-items-center rounded-2xl border border-white/10 bg-white/6 text-white transition hover:border-white/30 hover:bg-white/10";

  return (
    <div className="flex items-center gap-2">
      <button
        className={`${baseButton} ${disabled ? "cursor-not-allowed opacity-40" : ""}`}
        disabled={disabled}
        type="button"
        aria-label="Upload reference"
      >
        <UploadButton className="h-5 w-5 text-white/80" />
      </button>
      <button
        className={`${baseButton} ${disabled ? "cursor-not-allowed opacity-40" : "bg-gradient-to-br from-accent to-accent-soft shadow-soft"}`}
        onClick={disabled ? undefined : onSend}
        disabled={disabled}
        type="button"
        aria-label="Send message"
      >
        <SendButton className="h-6 w-6 text-white" />
      </button>
    </div>
  );
}

export default BarTools;
