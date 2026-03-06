"use client";

import PixelIcon from "@/components/shared/PixelIcon";

interface Props {
  grantName: string;
  submissionLink?: string | null;
  onConfirm: () => void;
  onCancel: () => void;
  saving: boolean;
}

export default function ShipModal({ grantName, submissionLink, onConfirm, onCancel, saving }: Props) {
  const hasLink = !!submissionLink?.trim();

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-end sm:items-center justify-center bg-black/50"
      onClick={onCancel}
    >
      <div
        className="w-full max-w-md rounded-t-2xl sm:rounded-2xl border-[2.5px] border-[#0a0a1a] overflow-hidden"
        style={{ background: "#fffbf0", boxShadow: "6px 6px 0 #0a0a1a" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="h-2" style={{ background: "#00a83a" }} />
        <div className="p-5 space-y-4">
          <div className="flex items-center gap-2">
            <div
              className="w-10 h-10 rounded-xl border-[2px] border-[#0a0a1a] flex items-center justify-center"
              style={{ background: "#b8ffda", boxShadow: "2px 2px 0 #00a83a" }}
            >
              <PixelIcon name="rocket" size={20} color="#00a83a" />
            </div>
            <div>
              <h3
                className="text-[11px] font-black uppercase tracking-widest text-[#0a0a1a]"
                style={{ fontFamily: "Orbitron, sans-serif" }}
              >
                SHIP TO FUNDER
              </h3>
              <p className="text-sm font-bold text-[#0a0a1a] truncate">{grantName}</p>
            </div>
          </div>

          {hasLink ? (
            <div className="space-y-2">
              <p className="text-xs text-[#0a0a1a]/70">
                1. Open the submission portal and complete the application
              </p>
              <a
                href={submissionLink!.startsWith("http") ? submissionLink! : `https://${submissionLink}`}
                target="_blank"
                rel="noopener noreferrer"
                className="block w-full rounded-xl border-[2.5px] border-[#0a0a1a] px-4 py-3 text-[11px] font-black uppercase tracking-widest transition-all active:translate-x-[2px] active:translate-y-[2px] active:shadow-none"
                style={{
                  fontFamily: "Orbitron, sans-serif",
                  background: "#c8e0ff",
                  color: "#0066cc",
                  boxShadow: "3px 3px 0 #0066cc",
                }}
              >
                OPEN SUBMISSION PORTAL
              </a>
              <p className="text-xs text-[#0a0a1a]/70">
                2. After submitting, mark complete below
              </p>
            </div>
          ) : (
            <p className="text-xs text-[#0a0a1a]/70">
              Add the submission portal URL in the field above, or mark as submitted if you submitted elsewhere.
            </p>
          )}

          <div className="flex gap-2">
            <button
              onClick={onCancel}
              className="flex-1 rounded-xl border-[2.5px] border-[#0a0a1a] px-4 py-3 text-[10px] font-black uppercase tracking-widest"
              style={{
                fontFamily: "Orbitron, sans-serif",
                background: "#e8e8ee",
                color: "#0a0a1a",
                boxShadow: "2px 2px 0 #0a0a1a",
              }}
            >
              CANCEL
            </button>
            <button
              onClick={onConfirm}
              disabled={saving}
              className="flex-1 rounded-xl border-[2.5px] border-[#0a0a1a] px-4 py-3 text-[10px] font-black uppercase tracking-widest transition-all active:translate-x-[2px] active:translate-y-[2px] active:shadow-none disabled:opacity-60"
              style={{
                fontFamily: "Orbitron, sans-serif",
                background: "#b8ffda",
                color: "#00a83a",
                boxShadow: "3px 3px 0 #00a83a",
              }}
            >
              {saving ? "SAVING…" : "I'VE SUBMITTED — MARK COMPLETE"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
