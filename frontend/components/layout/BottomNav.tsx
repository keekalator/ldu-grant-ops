"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import PixelIcon from "@/components/shared/PixelIcon";
import type { PixelIconName } from "@/components/shared/PixelIcon";

const NAV_ITEMS: {
  href: string; label: string; icon: PixelIconName;
  activeColor: string; activeBg: string; activeShadow: string;
}[] = [
  { href: "/",              label: "HQ",       icon: "home",      activeColor: "#ffffff", activeBg: "#ff1e78", activeShadow: "3px 3px 0 #0a0a1a" },
  { href: "/pipeline",      label: "PIPELINE", icon: "target",    activeColor: "#ffffff", activeBg: "#0066cc", activeShadow: "3px 3px 0 #0a0a1a" },
  { href: "/writing-queue", label: "WRITING",  icon: "quill",     activeColor: "#0a0a1a", activeBg: "#ffe100", activeShadow: "3px 3px 0 #0a0a1a" },
  { href: "/workflow",      label: "AGENTS",   icon: "lightning", activeColor: "#ffffff", activeBg: "#7c3aed", activeShadow: "3px 3px 0 #0a0a1a" },
  { href: "/funders",       label: "FUNDERS",  icon: "building",  activeColor: "#0a0a1a", activeBg: "#00d94e", activeShadow: "3px 3px 0 #0a0a1a" },
  { href: "/awards",        label: "WINS",     icon: "trophy",    activeColor: "#0a0a1a", activeBg: "#ffe100", activeShadow: "3px 3px 0 #ffa500" },
];

export default function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 safe-bottom">
      {/* Cream card nav bar */}
      <div
        className="relative border-t-[3px] border-[#0a0a1a]"
        style={{ background: "#fffbf0", boxShadow: "0 -3px 0 #0a0a1a" }}
      >
        {/* Top pixel border stripe */}
        <div
          className="absolute top-0 left-0 right-0 h-1"
          style={{
            background: "repeating-linear-gradient(90deg, #ff1e78 0px,#ff1e78 16px, #ffe100 16px,#ffe100 32px, #00d94e 32px,#00d94e 48px, #00d4ff 48px,#00d4ff 64px, #7c3aed 64px,#7c3aed 80px)",
            marginTop: "-3px",
          }}
        />

        <div className="flex items-end justify-around max-w-2xl mx-auto px-1 pt-2 pb-1">
          {NAV_ITEMS.map(({ href, label, icon, activeColor, activeBg, activeShadow }) => {
            const isActive = pathname === href || (href !== "/" && pathname.startsWith(href));
            return (
              <Link
                key={href}
                href={href}
                className="flex flex-col items-center gap-0.5 transition-all duration-150 active:translate-y-[2px]"
              >
                {/* Icon button */}
                <div
                  className="w-10 h-10 flex items-center justify-center rounded-xl border-[2px] border-[#0a0a1a] transition-all duration-150"
                  style={isActive ? {
                    background: activeBg,
                    boxShadow: activeShadow,
                    transform: "translateY(-4px)",
                  } : {
                    background: "#ffffff",
                    boxShadow: "2px 2px 0 #0a0a1a",
                  }}
                >
                  <PixelIcon name={icon} size={16} color={isActive ? activeColor : "#aaaacc"} />
                </div>

                {/* Label */}
                <span
                  className="text-[7px] font-black uppercase tracking-wide pb-0.5"
                  style={{ fontFamily: "Orbitron, sans-serif", color: isActive ? "#0a0a1a" : "#aaaacc" }}
                >
                  {label}
                </span>
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
