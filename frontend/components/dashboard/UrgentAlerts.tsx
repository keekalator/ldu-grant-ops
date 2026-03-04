"use client";

import Link from "next/link";
import PixelIcon from "@/components/shared/PixelIcon";
import type { UrgentAlert } from "@/types";

const ALERT_CONFIG = {
  overdue:  { bg: "#ff1e78", cardBg: "#ffe0e8", shadow: "#0a0a1a", label: "OVERDUE",  icon: "alert"  as const, textColor: "white" },
  deadline: { bg: "#ffe100", cardBg: "#fff8d0", shadow: "#0a0a1a", label: "DUE SOON", icon: "clock"  as const, textColor: "#0a0a1a" },
  review:   { bg: "#00d4ff", cardBg: "#d0f4ff", shadow: "#0a0a1a", label: "REVIEW",   icon: "search" as const, textColor: "#0a0a1a" },
};

function alertDesc(alert: UrgentAlert): string {
  if (alert.type === "overdue") return `${Math.abs(alert.daysUntil)}d past deadline`;
  if (alert.daysUntil === 0) return "Due TODAY";
  if (alert.daysUntil === 1) return "Due TOMORROW";
  return `${alert.daysUntil} days left`;
}

export default function UrgentAlerts({ alerts }: { alerts: UrgentAlert[] }) {
  if (alerts.length === 0) {
    return (
      <div
        className="retro-card p-5 text-center"
        style={{ borderColor: "#00d94e", boxShadow: "4px 4px 0 #00d94e" }}
      >
        <PixelIcon name="check" size={28} color="#00d94e" className="mx-auto mb-2" />
        <p className="font-black text-[#0a0a1a] text-sm" style={{ fontFamily: "Orbitron, sans-serif" }}>ALL CLEAR</p>
        <p className="text-xs text-[#aaaacc] mt-0.5">No urgent items</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {alerts.map((alert, i) => {
        const cfg = ALERT_CONFIG[alert.type];
        return (
          <Link
            key={`${alert.opportunityId}-${i}`}
            href={`/opportunity/${alert.opportunityId}`}
            className="rounded-2xl border-[2.5px] border-[#0a0a1a] p-3 flex items-center gap-3 transition-all active:translate-x-[2px] active:translate-y-[2px] active:shadow-none"
            style={{ background: cfg.cardBg, boxShadow: `4px 4px 0 ${cfg.shadow}` }}
          >
            {/* Icon */}
            <div
              className="w-10 h-10 rounded-xl border-[2px] border-[#0a0a1a] flex items-center justify-center shrink-0 relative"
              style={{ background: cfg.bg, boxShadow: "2px 2px 0 #0a0a1a" }}
            >
              <PixelIcon name={cfg.icon} size={18} color={cfg.textColor} />
              {(alert.type === "overdue" || alert.daysUntil <= 2) && (
                <span className="absolute -top-1.5 -right-1.5 flex h-3 w-3">
                  <span className="animate-ping absolute h-full w-full rounded-full bg-[#ff1e78] opacity-75" />
                  <span className="relative rounded-full h-3 w-3 bg-[#ff1e78] border border-[#0a0a1a]" />
                </span>
              )}
            </div>

            {/* Text */}
            <div className="flex-1 min-w-0">
              <p className="font-bold text-sm text-[#0a0a1a] truncate">{alert.grantName}</p>
              <p className="text-[11px] text-[#0a0a1a] opacity-60 font-semibold mt-0.5">
                {alertDesc(alert)} · {alert.status}
              </p>
            </div>

            {/* Label pill + arrow */}
            <div className="flex items-center gap-1.5 shrink-0">
              <span
                className="text-[9px] font-black px-2.5 py-1 rounded-lg border-[2px] border-[#0a0a1a] uppercase tracking-wider"
                style={{ fontFamily: "Orbitron, sans-serif", background: cfg.bg, color: cfg.textColor, boxShadow: "1px 1px 0 #0a0a1a" }}
              >
                {cfg.label}
              </span>
              <PixelIcon name="arrow_right" size={12} color="#aaaacc" />
            </div>
          </Link>
        );
      })}
    </div>
  );
}
