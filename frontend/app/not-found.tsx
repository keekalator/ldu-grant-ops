import Link from "next/link";
import PixelIcon from "@/components/shared/PixelIcon";

export default function NotFound() {
  return (
    <div
      className="min-h-screen flex items-center justify-center px-4"
      style={{ background: "#1565e8" }}
    >
      <div className="max-w-sm w-full space-y-4 text-center">

        {/* 404 hero */}
        <div
          className="rounded-2xl border-[2.5px] border-[#0a0a1a] p-8 scanlines"
          style={{ background: "#fffbf0", boxShadow: "6px 6px 0 #0a0a1a" }}
        >
          {/* Glitch number */}
          <p
            className="text-6xl font-black text-[#ff1e78] leading-none mb-2 glitch-text"
            style={{
              fontFamily: "'Press Start 2P', monospace",
              textShadow: "0 0 10px #ff1e78, 0 0 24px #ff1e7860",
            }}
          >
            404
          </p>
          <PixelIcon name="cross" size={28} color="#ff1e78" className="mx-auto my-3" glow />
          <p
            className="text-[11px] font-black uppercase tracking-widest text-[#0a0a1a] mb-1"
            style={{ fontFamily: "Orbitron, sans-serif" }}
          >
            PAGE NOT FOUND
          </p>
          <p className="text-xs text-[#555566] leading-relaxed">
            This mission doesn&apos;t exist in the database. Navigate back to HQ.
          </p>
        </div>

        {/* Nav options */}
        <div className="grid grid-cols-2 gap-3">
          <Link
            href="/"
            className="rounded-2xl border-[2.5px] border-[#0a0a1a] p-4 flex flex-col items-center gap-2 transition-all active:translate-x-[1px] active:translate-y-[1px] active:shadow-none"
            style={{ background: "#ff1e78", boxShadow: "4px 4px 0 #0a0a1a" }}
          >
            <PixelIcon name="home" size={20} color="white" glow />
            <span className="text-[9px] font-black text-white uppercase tracking-widest" style={{ fontFamily: "Orbitron, sans-serif" }}>
              GO TO HQ
            </span>
          </Link>
          <Link
            href="/pipeline"
            className="rounded-2xl border-[2.5px] border-[#0a0a1a] p-4 flex flex-col items-center gap-2 transition-all active:translate-x-[1px] active:translate-y-[1px] active:shadow-none"
            style={{ background: "#e8d4ff", boxShadow: "4px 4px 0 #7c3aed" }}
          >
            <PixelIcon name="target" size={20} color="#7c3aed" glow />
            <span className="text-[9px] font-black text-[#7c3aed] uppercase tracking-widest" style={{ fontFamily: "Orbitron, sans-serif" }}>
              PIPELINE
            </span>
          </Link>
        </div>

        <Link
          href="/workflow"
          className="flex items-center justify-center gap-2 w-full py-3 rounded-2xl border-[2.5px] border-[#0a0a1a] text-[9px] font-black uppercase tracking-wider transition-all active:translate-y-[1px]"
          style={{ fontFamily: "Orbitron, sans-serif", background: "#fffbf0", color: "#0a0a1a", boxShadow: "3px 3px 0 #0a0a1a" }}
        >
          <PixelIcon name="lightning" size={12} color="#7c3aed" glow />
          VIEW WORKFLOW — NO DATA NEEDED
        </Link>

      </div>
    </div>
  );
}
