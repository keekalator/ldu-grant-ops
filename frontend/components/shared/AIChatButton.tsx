"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import PixelIcon from "@/components/shared/PixelIcon";

const AIChat = dynamic(() => import("./AIChat"), { ssr: false });

interface Props {
  grantId?:   string;
  grantName?: string;
}

export default function AIChatButton({ grantId, grantName }: Props) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-24 right-4 z-[990] w-12 h-12 rounded-2xl border-[2.5px] border-[#0a0a1a] flex items-center justify-center transition-all active:translate-x-[2px] active:translate-y-[2px] active:shadow-none"
        style={{
          background:  "#e8d4ff",
          boxShadow:   "4px 4px 0 #7c3aed",
        }}
        aria-label="Open AI Grant Assistant"
        title="Ask LDU Grant AI"
      >
        <PixelIcon name="star" size={18} color="#7c3aed" />
      </button>

      {open && (
        <AIChat
          onClose={() => setOpen(false)}
          grantId={grantId}
          grantName={grantName}
        />
      )}
    </>
  );
}
