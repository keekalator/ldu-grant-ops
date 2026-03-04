"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import PixelIcon from "@/components/shared/PixelIcon";

const DisqualifyModal = dynamic(() => import("./DisqualifyModal"), { ssr: false });

interface Props {
  opportunityId: string;
  grantName:     string;
}

export default function DisqualifyButton({ opportunityId, grantName }: Props) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="w-full flex items-center justify-center gap-2 rounded-xl border-[2px] border-[#0a0a1a] px-4 py-2.5 text-[10px] font-black uppercase tracking-widest transition-all active:translate-y-[1px] active:shadow-none"
        style={{
          fontFamily: "Orbitron, sans-serif",
          background: "#fffbf0",
          color: "#aaaacc",
          boxShadow: "2px 2px 0 #aaaacc",
        }}
      >
        <PixelIcon name="cross" size={11} color="#aaaacc" />
        DISQUALIFY / OMIT THIS GRANT
      </button>
      {open && (
        <DisqualifyModal
          opportunityId={opportunityId}
          grantName={grantName}
          onClose={() => setOpen(false)}
        />
      )}
    </>
  );
}
