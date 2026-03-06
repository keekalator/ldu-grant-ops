"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import PixelIcon from "@/components/shared/PixelIcon";
import type { PixelIconName } from "@/components/shared/PixelIcon";
import { useUser } from "@/lib/user-context";

const NAV_ITEMS: {
  href: string; label: string; icon: PixelIconName;
  activeColor: string; activeBg: string; activeShadow: string; neonClass: string;
}[] = [
  { href: "/",              label: "HQ",       icon: "home",      activeColor: "#ffffff", activeBg: "#ff1e78", activeShadow: "3px 3px 0 #0a0a1a", neonClass: "nav-neon-pink"   },
  { href: "/pipeline",      label: "PIPELINE", icon: "target",    activeColor: "#ffffff", activeBg: "#0066cc", activeShadow: "3px 3px 0 #0a0a1a", neonClass: "nav-neon-blue"   },
  { href: "/writing-queue", label: "WRITING",  icon: "quill",     activeColor: "#0a0a1a", activeBg: "#ffe100", activeShadow: "3px 3px 0 #0a0a1a", neonClass: "nav-neon-yellow" },
  { href: "/workflow",      label: "AGENTS",   icon: "lightning", activeColor: "#ffffff", activeBg: "#7c3aed", activeShadow: "3px 3px 0 #0a0a1a", neonClass: "nav-neon-purple" },
  { href: "/funders",       label: "FUNDERS",  icon: "building",  activeColor: "#0a0a1a", activeBg: "#00d94e", activeShadow: "3px 3px 0 #0a0a1a", neonClass: "nav-neon-lime"   },
  { href: "/awards",        label: "WINS",     icon: "trophy",    activeColor: "#0a0a1a", activeBg: "#ffe100", activeShadow: "3px 3px 0 #ffa500", neonClass: "nav-neon-orange" },
];

export default function BottomNav() {
  const pathname = usePathname();
  const { needsSetup } = useUser();

  // Hide nav entirely during character select — don't block the scroll area
  if (needsSetup) return null;

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 safe-bottom">
      {/* Cream card nav bar + scanline */}
      <div
        className="relative border-t-[3px] border-[#0a0a1a] scanlines"
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
          {NAV_ITEMS.map(({ href, label, icon, activeColor, activeBg, activeShadow, neonClass }) => {
            const isActive = pathname === href || (href !== "/" && pathname.startsWith(href));
            return (
              <Link
                key={href}
                href={href}
                className="flex flex-col items-center gap-0.5 transition-all duration-150 active:translate-y-[2px] relative"
              >
                {/* Active dot indicator above icon */}
                <div
                  className="w-1.5 h-1.5 rounded-full mb-0.5 transition-all duration-200"
                  style={{
                    background: isActive ? activeBg : "transparent",
                    boxShadow: isActive ? `0 0 5px ${activeBg}, 0 0 10px ${activeBg}80` : "none",
                  }}
                />

                {/* Icon button — larger touch target, scaled up when active */}
                <div
                  className="flex items-center justify-center rounded-xl border-[2px] border-[#0a0a1a] transition-all duration-150"
                  style={isActive ? {
                    width: 44,
                    height: 44,
                    background: activeBg,
                    boxShadow: `${activeShadow}, 0 0 12px ${activeBg}60`,
                    transform: "translateY(-5px)",
                    animation: "navActivate 0.35s cubic-bezier(0.175,0.885,0.32,1.275) forwards",
                  } : {
                    width: 40,
                    height: 40,
                    background: "#ffffff",
                    boxShadow: "2px 2px 0 #0a0a1a",
                  }}
                >
                  {/* key forces remount on active change → triggers navIconPop animation */}
                  <div
                    key={isActive ? `on-${href}` : `off-${href}`}
                    className={isActive ? "nav-icon-active" : ""}
                  >
                    <PixelIcon
                      name={icon}
                      size={isActive ? 18 : 15}
                      color={isActive ? activeColor : "#aaaacc"}
                      glow={isActive}
                    />
                  </div>
                </div>

                {/* Label */}
                <span
                  className={`text-[7px] font-black uppercase tracking-wide pb-0.5 transition-all duration-150 ${isActive ? neonClass : ""}`}
                  style={{ fontFamily: "Orbitron, sans-serif", color: isActive ? undefined : "#aaaacc" }}
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
