"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import PixelIcon from "@/components/shared/PixelIcon";
import { useUser } from "@/lib/user-context";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Message {
  id:      string;
  role:    "user" | "assistant";
  content: string;
  ts:      Date;
}

// ─── Quick prompts shown when chat is empty ───────────────────────────────────

const QUICK_PROMPTS = [
  { label: "What's due this week?",        icon: "clock"    as const },
  { label: "What should we work on next?", icon: "target"   as const },
  { label: "Writing queue status",          icon: "quill"    as const },
  { label: "High priority grants",          icon: "alert"    as const },
  { label: "What grants are In Review?",   icon: "search"   as const },
  { label: "Summarize the full pipeline",   icon: "pipeline" as const },
];

// ─── Simple markdown renderer (bold + bullets) ───────────────────────────────

function renderMarkdown(text: string) {
  const lines = text.split("\n");
  return lines.map((line, i) => {
    // Bold: **text**
    const parts = line.split(/\*\*(.*?)\*\*/g);
    const rendered = parts.map((part, j) =>
      j % 2 === 1
        ? <strong key={j} className="font-black text-[#0a0a1a]">{part}</strong>
        : <span key={j}>{part}</span>
    );

    const isBullet = line.trimStart().startsWith("• ") || line.trimStart().startsWith("- ");
    if (isBullet) {
      return (
        <div key={i} className="flex gap-1.5 leading-relaxed">
          <span className="shrink-0 mt-0.5 text-[#7c3aed]">•</span>
          <span>{rendered.map((r, j) => {
            const src = (r as React.ReactElement<{ children: React.ReactNode }>).props?.children;
            const stripped = typeof src === "string" ? src.replace(/^[•\-]\s*/, "") : src;
            return j === 0
              ? <span key={j}>{typeof stripped === "string" ? stripped : src}</span>
              : r;
          })}</span>
        </div>
      );
    }

    return <p key={i} className={`leading-relaxed ${line === "" ? "mt-2" : ""}`}>{rendered}</p>;
  });
}

// ─── Message bubble ───────────────────────────────────────────────────────────

function Bubble({ msg }: { msg: Message }) {
  const isUser = msg.role === "user";
  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"} mb-3`}>
      {!isUser && (
        <div
          className="w-7 h-7 rounded-full border-[2px] border-[#0a0a1a] flex items-center justify-center mr-2 shrink-0 mt-0.5"
          style={{ background: "#e8d4ff", boxShadow: "1px 1px 0 #0a0a1a" }}
        >
          <PixelIcon name="star" size={12} color="#7c3aed" />
        </div>
      )}
      <div
        className={`max-w-[82%] rounded-2xl border-[2px] border-[#0a0a1a] px-4 py-3 text-sm`}
        style={{
          background:  isUser ? "#1565e8" : "#fffbf0",
          color:       isUser ? "#ffffff"  : "#0a0a1a",
          boxShadow:   isUser ? "2px 2px 0 #0a1a5e" : "2px 2px 0 #0a0a1a",
          borderRadius: isUser ? "18px 18px 4px 18px" : "18px 18px 18px 4px",
        }}
      >
        {isUser
          ? <p className="leading-relaxed">{msg.content}</p>
          : <div className="space-y-0.5 text-sm">{renderMarkdown(msg.content)}</div>
        }
      </div>
    </div>
  );
}

// ─── Thinking indicator ───────────────────────────────────────────────────────

function ThinkingBubble() {
  return (
    <div className="flex justify-start mb-3">
      <div
        className="w-7 h-7 rounded-full border-[2px] border-[#0a0a1a] flex items-center justify-center mr-2 shrink-0"
        style={{ background: "#e8d4ff", boxShadow: "1px 1px 0 #0a0a1a" }}
      >
        <PixelIcon name="star" size={12} color="#7c3aed" />
      </div>
      <div
        className="rounded-2xl border-[2px] border-[#0a0a1a] px-4 py-3 flex items-center gap-1.5"
        style={{ background: "#fffbf0", boxShadow: "2px 2px 0 #0a0a1a", borderRadius: "18px 18px 18px 4px" }}
      >
        {[0, 1, 2].map(i => (
          <div
            key={i}
            className="w-2 h-2 rounded-full animate-bounce"
            style={{ background: "#7c3aed", animationDelay: `${i * 0.15}s` }}
          />
        ))}
      </div>
    </div>
  );
}

// ─── Main chat panel ──────────────────────────────────────────────────────────

interface Props {
  onClose:  () => void;
  grantId?: string;   // optional — if viewing a specific grant page
  grantName?: string;
}

export default function AIChat({ onClose, grantId, grantName }: Props) {
  const { user }                    = useUser();
  const [messages, setMessages]     = useState<Message[]>([]);
  const [input, setInput]           = useState("");
  const [thinking, setThinking]     = useState(false);
  const [error, setError]           = useState("");
  const bottomRef                   = useRef<HTMLDivElement>(null);
  const inputRef                    = useRef<HTMLTextAreaElement>(null);

  // Scroll to bottom on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, thinking]);

  const send = useCallback(async (text: string) => {
    const content = text.trim();
    if (!content || thinking) return;
    setInput("");
    setError("");

    const userMsg: Message = {
      id: Date.now().toString(), role: "user", content, ts: new Date()
    };
    const updatedMessages = [...messages, userMsg];
    setMessages(updatedMessages);
    setThinking(true);

    try {
      const res = await fetch("/api/chat", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: updatedMessages.map(m => ({ role: m.role, content: m.content })),
          grantId,
        }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);

      setMessages(prev => [...prev, {
        id: Date.now().toString() + "a",
        role: "assistant",
        content: data.message,
        ts: new Date(),
      }]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setThinking(false);
    }
  }, [messages, thinking, grantId]);

  function handleKey(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(input); }
  }

  const isEmpty = messages.length === 0;

  return (
    <div
      className="fixed inset-0 z-[9998] flex items-end justify-center"
      style={{ background: "rgba(10,10,26,0.65)" }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className="w-full max-w-lg flex flex-col rounded-t-3xl border-t-[3px] border-x-[3px] border-[#0a0a1a]"
        style={{
          background:  "#fffbf0",
          boxShadow:   "0 -6px 0 #7c3aed",
          height:      "82dvh",
          maxHeight:   "82dvh",
        }}
      >
        {/* ── Header ──────────────────────────────────────── */}
        <div
          className="px-5 py-4 border-b-[2.5px] border-[#0a0a1a] flex items-center gap-3 shrink-0"
          style={{ background: "#e8d4ff" }}
        >
          <div
            className="w-8 h-8 rounded-full border-[2.5px] border-[#0a0a1a] flex items-center justify-center"
            style={{ background: "#7c3aed", boxShadow: "2px 2px 0 #0a0a1a" }}
          >
            <PixelIcon name="star" size={14} color="#fff" />
          </div>
          <div className="flex-1">
            <p className="text-[12px] font-black uppercase tracking-widest text-[#7c3aed]"
              style={{ fontFamily: "Orbitron, sans-serif" }}>LDU GRANT AI</p>
            <p className="text-[9px] text-[#0a0a1a]/50 font-medium">
              {grantName ? `Context: ${grantName.slice(0, 30)}` : "Live pipeline access · Ask anything"}
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-xl border-[2px] border-[#0a0a1a] flex items-center justify-center"
            style={{ background: "#ffffff", boxShadow: "2px 2px 0 #0a0a1a" }}
          >
            <span className="text-[14px] font-black">×</span>
          </button>
        </div>

        {/* ── Messages ────────────────────────────────────── */}
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-1">

          {/* Empty state — quick prompts */}
          {isEmpty && !thinking && (
            <div className="space-y-4">
              {/* Greeting */}
              <div className="flex justify-start mb-3">
                <div
                  className="w-7 h-7 rounded-full border-[2px] border-[#0a0a1a] flex items-center justify-center mr-2 shrink-0"
                  style={{ background: "#e8d4ff", boxShadow: "1px 1px 0 #0a0a1a" }}
                >
                  <PixelIcon name="star" size={12} color="#7c3aed" />
                </div>
                <div
                  className="max-w-[82%] rounded-2xl border-[2px] border-[#0a0a1a] px-4 py-3 text-sm"
                  style={{ background: "#fffbf0", boxShadow: "2px 2px 0 #0a0a1a", borderRadius: "18px 18px 18px 4px" }}
                >
                  <p className="leading-relaxed">
                    Hey{user?.name ? ` ${user.name.split(" ")[0]}` : ""}! I have live access to your pipeline.
                    Ask me anything about grants, deadlines, priorities, or strategy.
                  </p>
                </div>
              </div>

              {/* Quick prompts */}
              <div>
                <p className="text-[9px] font-black uppercase tracking-widest text-[#aaaacc] mb-2 px-1"
                  style={{ fontFamily: "Orbitron, sans-serif" }}>QUICK QUESTIONS</p>
                <div className="grid grid-cols-2 gap-2">
                  {QUICK_PROMPTS.map(qp => (
                    <button
                      key={qp.label}
                      onClick={() => send(qp.label)}
                      className="flex items-center gap-2 rounded-xl border-[2px] border-[#0a0a1a] px-3 py-2.5 text-left text-xs font-semibold transition-all active:translate-y-[1px] active:shadow-none"
                      style={{ background: "#ffffff", boxShadow: "2px 2px 0 #0a0a1a", color: "#0a0a1a" }}
                    >
                      <PixelIcon name={qp.icon} size={11} color="#7c3aed" />
                      <span className="leading-tight">{qp.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Messages */}
          {messages.map(msg => <Bubble key={msg.id} msg={msg} />)}
          {thinking && <ThinkingBubble />}

          {/* Error */}
          {error && (
            <div
              className="rounded-xl border-[2px] border-[#0a0a1a] px-3 py-2 flex items-center gap-2"
              style={{ background: "#ffe0e8", boxShadow: "2px 2px 0 #ff1e78" }}
            >
              <PixelIcon name="alert" size={11} color="#ff1e78" />
              <span className="text-xs font-bold text-[#ff1e78]">{error}</span>
            </div>
          )}

          <div ref={bottomRef} />
        </div>

        {/* ── Input ───────────────────────────────────────── */}
        <div
          className="shrink-0 px-4 py-3 border-t-[2.5px] border-[#0a0a1a] flex items-end gap-2"
          style={{ background: "#fffbf0" }}
        >
          <textarea
            ref={inputRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKey}
            rows={1}
            placeholder="Ask about grants, deadlines, strategy…"
            disabled={thinking}
            className="flex-1 rounded-xl border-[2.5px] border-[#0a0a1a] px-4 py-2.5 text-sm focus:outline-none resize-none disabled:opacity-50"
            style={{
              background:   "#ffffff",
              boxShadow:    "3px 3px 0 #0a0a1a",
              maxHeight:    "120px",
              overflowY:    "auto",
              lineHeight:   "1.5",
            }}
            onInput={e => {
              const t = e.currentTarget;
              t.style.height = "auto";
              t.style.height = Math.min(t.scrollHeight, 120) + "px";
            }}
          />
          <button
            onClick={() => send(input)}
            disabled={!input.trim() || thinking}
            className="w-11 h-11 rounded-xl border-[2.5px] border-[#0a0a1a] flex items-center justify-center shrink-0 transition-all active:translate-y-[2px] active:shadow-none disabled:opacity-40"
            style={{ background: "#e8d4ff", boxShadow: "3px 3px 0 #7c3aed" }}
          >
            <PixelIcon name="rocket" size={16} color="#7c3aed" />
          </button>
        </div>
      </div>
    </div>
  );
}
