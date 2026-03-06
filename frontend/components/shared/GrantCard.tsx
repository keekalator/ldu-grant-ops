"use client";

import Link from "next/link";
import PixelIcon from "@/components/shared/PixelIcon";
import { formatCurrency, formatDeadline, daysUntilDeadline, abbreviatePillar } from "@/lib/utils";
import { getEntityStyle } from "@/lib/entities";
import type { Opportunity, Priority } from "@/types";

const STATUS_CONFIG: Record<string, { icon: string; bg: string; shadow: string; label: string }> = {
  Prospect:    { icon: "search",  bg: "#e8d4ff", shadow: "#7c3aed", label: "PROSPECT"   },
  Qualifying:  { icon: "search",  bg: "#e8d4ff", shadow: "#7c3aed", label: "QUALIFYING" },
  Writing:     { icon: "quill",   bg: "#fff3a0", shadow: "#ffb800", label: "WRITING"    },
  "In Review": { icon: "search",  bg: "#b8f0ff", shadow: "#0066cc", label: "IN REVIEW"  },
  Submitted:   { icon: "rocket",  bg: "#b8ffda", shadow: "#00a83a", label: "SUBMITTED"  },
  Active:      { icon: "rocket",  bg: "#b8ffda", shadow: "#00a83a", label: "ACTIVE"     },
  Awarded:     { icon: "trophy",  bg: "#ffd970", shadow: "#ffa500", label: "AWARDED"    },
  Declined:    { icon: "cross",   bg: "#e8e8ee", shadow: "#aaaacc", label: "DECLINED"   },
  Rejected:    { icon: "cross",   bg: "#e8e8ee", shadow: "#aaaacc", label: "REJECTED"   },
};

const PRIORITY_CONFIG: Record<Priority, { bg: string; text: string }> = {
  High:   { bg: "#ff1e78", text: "white"    },
  Medium: { bg: "#ffe100", text: "#0a0a1a"  },
  Low:    { bg: "#e8e8ee", text: "#aaaacc"  },
};

interface GrantCardProps {
  opportunity: Opportunity;
  compact?: boolean;
  onClick?: () => void;
}

export default function GrantCard({ opportunity, compact = false, onClick }: GrantCardProps) {
  const { fields } = opportunity;

  const name       = fields["Grant Name"] ?? "Unnamed Mission";
  const status     = fields.Status ?? "Prospect";
  const amount     = fields["Award Amount Range"];
  const deadline   = fields.Deadline;
  const pillar     = fields.Pillar?.[0];
  const priority   = fields.Priority as Priority | undefined;
  const entity     = fields["Submitting Entity"];
  const funderName = fields["Funder"] ?? fields["Funder Name"];

  const cfg     = STATUS_CONFIG[status] ?? STATUS_CONFIG.Prospect;
  const entCfg  = getEntityStyle(entity);
  const days    = daysUntilDeadline(deadline);
  const isOverdue = days < 0;
  const isUrgent  = days >= 0 && days <= 7;

  const cardBg     = isOverdue ? "#ffe0e8" : isUrgent ? "#fff8e0" : "#fffbf0";
  const cardShadow = isOverdue ? "#ff1e78" : isUrgent ? "#ffe100" : "#0a0a1a";

  const inner = (
    <div className="flex items-stretch">
      {/* Entity color stripe — left edge */}
      <div className="w-[5px] shrink-0 rounded-l-[18px]" style={{ background: entCfg.color }} />

      <div
        className="flex items-start gap-3 flex-1 min-w-0"
        style={{ padding: compact ? "10px 12px" : "14px 14px" }}
      >
        {/* Status icon badge */}
        <div
          className="w-10 h-10 rounded-xl border-[2px] border-[#0a0a1a] flex items-center justify-center shrink-0"
          style={{ background: cfg.bg, boxShadow: `2px 2px 0 ${cfg.shadow}` }}
        >
          <PixelIcon name={cfg.icon as any} size={18} color="#0a0a1a" />
        </div>

        {/* Main content */}
        <div className="flex-1 min-w-0">
          {/* Grant name */}
          <p className="font-bold text-sm text-[#0a0a1a] leading-snug mb-0.5 pr-1">
            {name}
          </p>

          {/* Funder name */}
          {funderName && (
            <p className="text-[10px] text-[#555566] truncate mb-1">{funderName}</p>
          )}

          {/* Tags row */}
          <div className="flex items-center gap-1.5 flex-wrap">
            {/* Status */}
            <span
              className="text-[8px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md border-[1.5px] border-[#0a0a1a]"
              style={{ fontFamily: "Orbitron, sans-serif",
                background: cfg.bg, boxShadow: `1px 1px 0 ${cfg.shadow}` }}
            >
              {cfg.label}
            </span>

            {/* Entity */}
            {entity && (
              <span
                className="text-[8px] font-black px-2 py-0.5 rounded-md border-[1.5px] border-[#0a0a1a]"
                style={{ fontFamily: "Orbitron, sans-serif",
                  background: entCfg.bg, color: entCfg.color,
                  boxShadow: `1px 1px 0 ${entCfg.shadow}` }}
              >
                {entCfg.label}
              </span>
            )}

            {/* Pillar abbreviation */}
            {pillar && (
              <span className="text-[9px] font-semibold text-[#aaaacc]">
                {abbreviatePillar(pillar)}
              </span>
            )}

            {/* Priority */}
            {priority && PRIORITY_CONFIG[priority] && (
              <span
                className="text-[8px] font-black px-2 py-0.5 rounded-md border-[1.5px] border-[#0a0a1a]"
                style={{ fontFamily: "Orbitron, sans-serif",
                  background: PRIORITY_CONFIG[priority].bg,
                  color: PRIORITY_CONFIG[priority].text,
                  boxShadow: "1px 1px 0 #0a0a1a" }}
              >
                {priority === "High" ? "!! HIGH" : priority === "Medium" ? "! MED" : "LOW"}
              </span>
            )}
          </div>

          {/* Amount + deadline row */}
          <div className="flex items-center gap-2 mt-2 flex-wrap">
            {amount ? (
              <span
                className="text-xs font-black px-2 py-0.5 rounded-md border-[1.5px] border-[#0a0a1a] text-[#0a0a1a]"
                style={{ fontFamily: "Orbitron, sans-serif",
                  background: "#00d94e", boxShadow: "1px 1px 0 #0a0a1a" }}
              >
                {formatCurrency(amount)}
              </span>
            ) : null}

            {deadline && (
              <div
                className="flex items-center gap-1 px-2 py-0.5 rounded-md border-[1.5px] border-[#0a0a1a]"
                style={{
                  background: isOverdue ? "#ff1e78" : isUrgent ? "#ffe100" : "#ffffff",
                  boxShadow: "1px 1px 0 #0a0a1a",
                }}
              >
                <PixelIcon name="clock" size={9} color={isOverdue ? "white" : "#0a0a1a"} />
                <span
                  className="text-[9px] font-black"
                  style={{ fontFamily: "Orbitron, sans-serif",
                    color: isOverdue ? "white" : "#0a0a1a" }}
                >
                  {formatDeadline(deadline)}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Tap-me arrow button */}
        <div
          className="self-center shrink-0 w-8 h-8 rounded-xl border-[2px] border-[#0a0a1a] flex items-center justify-center ml-1"
          style={{ background: entCfg.bg, boxShadow: `2px 2px 0 ${entCfg.shadow}` }}
        >
          <PixelIcon name="arrow_right" size={14} color={entCfg.color} />
        </div>
      </div>
    </div>
  );

  // If an onClick override is provided (e.g. for custom sheet/modal), use button
  if (onClick) {
    return (
      <button
        onClick={onClick}
        className="w-full text-left rounded-2xl border-[2.5px] border-[#0a0a1a] overflow-hidden grant-card"
        style={{ background: cardBg, boxShadow: `4px 4px 0 ${cardShadow}` }}
      >
        {inner}
      </button>
    );
  }

  // Default: Link — works instantly, no hydration needed
  return (
    <Link
      href={`/opportunity/${opportunity.id}`}
      className="block rounded-2xl border-[2.5px] border-[#0a0a1a] overflow-hidden grant-card"
      style={{ background: cardBg, boxShadow: `4px 4px 0 ${cardShadow}` }}
    >
      {inner}
    </Link>
  );
}
