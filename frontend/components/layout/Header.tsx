"use client";

import { useRouter, usePathname } from "next/navigation";
import { useState } from "react";
import PixelIcon from "@/components/shared/PixelIcon";

interface HeaderProps {
  title: string;
  subtitle?: string;
  showRefresh?: boolean;
  onRefresh?: () => void;
  alertCount?: number;
  rightSlot?: React.ReactNode;
}

export default function Header({ title, subtitle, showRefresh = false, onRefresh, alertCount = 0 }: HeaderProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [spinning, setSpinning] = useState(false);

  const handleRefresh = () => {
    setSpinning(true);
    onRefresh?.();
    router.refresh();
    setTimeout(() => setSpinning(false), 800);
  };

  const handleBellClick = () => {
    if (alertCount === 0) return;
    if (pathname === "/") {
      // Already on home — smooth scroll to the alerts section
      const el = document.getElementById("alerts");
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    } else {
      // Navigate to home then let the hash scroll to alerts
      router.push("/#alerts");
    }
  };

  return (
    <header className="sticky top-0 z-40 px-4 pt-4 pb-3 max-w-2xl mx-auto">
      {/* Cream bar + scanline */}
      <div
        className="absolute inset-0 border-b-[3px] border-[#0a0a1a] scanlines"
        style={{ background: "#fffbf0" }}
      />

      <div className="relative flex items-center justify-between">
        {/* Logo */}
        <div className="flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-xl border-[2.5px] border-[#0a0a1a] flex items-center justify-center shrink-0 animate-float"
            style={{ background: "#ff1e78", boxShadow: "3px 3px 0 #0a0a1a" }}
          >
            <span
              className="text-[9px] font-black text-white"
              style={{ fontFamily: "Orbitron, sans-serif", letterSpacing: "-0.02em" }}
            >
              LDU
            </span>
          </div>

          <div>
            <h1
              className="text-base font-black leading-tight text-[#0a0a1a] glitch-text"
              style={{ fontFamily: "Orbitron, sans-serif" }}
            >
              {title}
            </h1>
            {subtitle && (
              <p className="text-[9px] font-bold uppercase tracking-widest text-[#aaaacc]" style={{ fontFamily: "Orbitron, sans-serif" }}>
                {subtitle}
              </p>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          {showRefresh && (
            <button
              onClick={handleRefresh}
              className="w-9 h-9 rounded-xl border-[2.5px] border-[#0a0a1a] flex items-center justify-center transition-all active:translate-y-[2px] active:shadow-none btn-glow-pink"
              style={{ background: "#ffffff", boxShadow: "2px 2px 0 #0a0a1a" }}
              aria-label="Refresh"
            >
              <PixelIcon
                name="refresh"
                size={16}
                color="#0a0a1a"
                className={spinning ? "animate-spin" : ""}
              />
            </button>
          )}

          {/* Notification bell — only active when alerts exist */}
          <button
            onClick={handleBellClick}
            className="w-9 h-9 rounded-xl border-[2.5px] border-[#0a0a1a] flex items-center justify-center relative transition-all active:translate-y-[2px] active:shadow-none"
            style={{
              background: "#ffe100",
              boxShadow: "2px 2px 0 #0a0a1a",
              cursor: alertCount > 0 ? "pointer" : "default",
            }}
            aria-label={alertCount > 0 ? `${alertCount} alert${alertCount > 1 ? "s" : ""} — tap to view` : "No alerts"}
          >
            <PixelIcon name="bell" size={16} color="#0a0a1a" glow={alertCount > 0} />
            {/* Alert count badge — only shown when alerts exist */}
            {alertCount > 0 && (
              <span
                className="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] px-1 rounded-sm border-[2px] border-[#0a0a1a] flex items-center justify-center neon-pink neon-flicker"
                style={{
                  background: "#ff1e78",
                  fontFamily: "Orbitron, sans-serif",
                  fontSize: "7px",
                  fontWeight: 900,
                  color: "white",
                  boxShadow: "1px 1px 0 #0a0a1a",
                }}
              >
                {alertCount}
              </span>
            )}
          </button>
        </div>
      </div>
    </header>
  );
}
