"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import PixelIcon from "@/components/shared/PixelIcon";

const AddGrantModal = dynamic(() => import("./AddGrantModal"), { ssr: false });

export default function AddGrantButton() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="w-11 h-11 rounded-xl border-[2.5px] border-[#0a0a1a] flex items-center justify-center shrink-0 transition-all active:translate-x-[2px] active:translate-y-[2px] active:shadow-none"
        style={{ background: "#e8d4ff", boxShadow: "3px 3px 0 #7c3aed" }}
        title="Add grant"
      >
        <PixelIcon name="rocket" size={16} color="#7c3aed" />
      </button>
      {open && <AddGrantModal onClose={() => setOpen(false)} />}
    </>
  );
}
