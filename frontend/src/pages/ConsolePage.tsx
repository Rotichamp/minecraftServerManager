import { useCallback, useEffect, useRef, useState, type KeyboardEvent } from "react";
import { useOutletContext } from "react-router-dom";
import { CornerDownLeft, Trash2 } from "lucide-react";
import type { ServerEntry } from "../types";
import { connectSocket } from "../lib/socket";
import { sendCommand, errMsg } from "../lib/api";
import { useToast } from "../components/Toast";

export default function ConsolePage() {
  const entry = useOutletContext<ServerEntry>();
  const toast = useToast();

  const [lines, setLines] = useState<string[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [connected, setConnected] = useState(false);

  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const historyRef = useRef<string[]>([]);
  const histPosRef = useRef(-1);

  /* Live log stream — dedicated socket, disconnected on unmount */
  useEffect(() => {
    const socket = connectSocket();
    const onConnect = () => {
      setConnected(true);
      socket.emit("subscribe_console", entry.containerId);
    };
    const onOutput = (data: { containerId: string; log: string }) => {
      if (data.containerId !== entry.containerId) return;
      setLines((prev) => [...prev.slice(-499), data.log]);
    };
    const onDisconnect = () => setConnected(false);

    socket.on("connect", onConnect);
    socket.on("console_output", onOutput);
    socket.on("disconnect", onDisconnect);

    return () => {
      socket.off("connect", onConnect);
      socket.off("console_output", onOutput);
      socket.off("disconnect", onDisconnect);
      socket.disconnect();
    };
  }, [entry.containerId]);

  /* Auto-scroll to newest line */
  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [lines]);

  const submit = useCallback(async () => {
    const cmd = input.trim();
    if (!cmd || sending) return;
    setInput("");
    historyRef.current.unshift(cmd);
    histPosRef.current = -1;

    setLines((prev) => [...prev.slice(-499), `> ${cmd}`]);
    setSending(true);
    try {
      const output = await sendCommand(entry.containerId, cmd);
      if (output) setLines((prev) => [...prev.slice(-499), output]);
    } catch (err) {
      toast("error", errMsg(err));
    } finally {
      setSending(false);
    }
  }, [input, sending, entry.containerId, toast]);

  function onKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") {
      void submit();
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      const h = historyRef.current;
      if (h.length === 0) return;
      histPosRef.current = Math.min(histPosRef.current + 1, h.length - 1);
      setInput(h[histPosRef.current]);
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      const h = historyRef.current;
      histPosRef.current = Math.max(histPosRef.current - 1, -1);
      setInput(histPosRef.current === -1 ? "" : h[histPosRef.current]);
    }
  }

  return (
    <div className="animate-fade-up">
      <div
        ref={scrollRef}
        role="log"
        aria-label="Server console output"
        className="scroll-thin h-[58vh] overflow-y-auto rounded-xl border border-white/[0.06] bg-black/60 p-4 font-mono text-xs leading-relaxed"
      >
        {lines.length === 0 ? (
          <p className="text-muted">
            {connected
              ? `Attached to ${entry.serverId} — waiting for server output…`
              : "Connecting to log stream…"}
          </p>
        ) : (
          lines.map((line, i) => (
            <p
              key={i}
              className={
                line.startsWith(">")
                  ? "whitespace-pre-wrap text-accent/90"
                  : "whitespace-pre-wrap text-ink/85"
              }
            >
              {line}
            </p>
          ))
        )}
      </div>

      {/* Command bar */}
      <form
        className="mt-3 flex items-center gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          void submit();
        }}
      >
        <span className="font-mono text-sm text-accent">/</span>
        <input
          ref={inputRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={onKeyDown}
          placeholder="type a command… (say hello, list, op Steve)"
          spellCheck={false}
          autoComplete="off"
          className="input font-mono !text-xs"
        />
        <button
          type="submit"
          disabled={sending || !input.trim()}
          aria-label="Send command"
          className="btn-primary shrink-0 px-3"
        >
          <CornerDownLeft className="h-4 w-4" />
        </button>
        <button
          type="button"
          aria-label="Clear console"
          onClick={() => setLines([])}
          className="btn-icon shrink-0 border border-white/10 bg-surface2"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </form>
      <p className="mt-2 px-1 font-mono text-[11px] text-muted">
        ↑/↓ for command history · leading slash optional
      </p>
    </div>
  );
}
