"use client";

/**
 * UserContext — global team member identity.
 * Character selection is required every time you open/sign in (no persistence).
 * Every action (note, status change, field edit) is automatically attributed.
 *
 * The OnboardingModal renders via createPortal directly to document.body so
 * it always sits above every stacking context on the page.
 */

import {
  createContext, useContext, useState, useEffect,
  useCallback, type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import PixelIcon from "@/components/shared/PixelIcon";

// ─── Team roster ──────────────────────────────────────────────────────────────

export const TEAM_MEMBERS = [
  {
    id:    "Kika Keith (CEO)",
    short: "KIKA K",
    role:  "CEO / Founder",
    desc:  "Strategic approvals + funder relationships",
    color: "#ff1e78",
    bg:    "#ffe0e8",
    shadow:"#ff1e78",
    helpId:"kika-keith",
  },
  {
    id:    "Kika Howze (Impl.)",
    short: "KIKA H",
    role:  "Implementation Lead",
    desc:  "Runs the system, manages agents, reviews drafts",
    color: "#7c3aed",
    bg:    "#e8d4ff",
    shadow:"#7c3aed",
    helpId:"kika-howze",
  },
  {
    id:    "Sheila (Ops)",
    short: "SHEILA",
    role:  "Ops",
    desc:  "Government paperwork + post-award compliance",
    color: "#ffb800",
    bg:    "#fff3a0",
    shadow:"#ffb800",
    helpId:"sheila",
  },
] as const;

export type TeamMemberId = (typeof TEAM_MEMBERS)[number]["id"];

export interface TeamMember {
  id:     TeamMemberId;
  short:  string;
  role:   string;
  desc:   string;
  color:  string;
  bg:     string;
  shadow: string;
  helpId: string;
}

// ─── Context ──────────────────────────────────────────────────────────────────

interface UserCtx {
  user:        TeamMember | null;
  setUser:     (m: TeamMember) => void;
  clearUser:   () => void;
  needsSetup:  boolean;
}

const Ctx = createContext<UserCtx>({
  user: null,
  setUser: () => {},
  clearUser: () => {},
  needsSetup: false,
});

export function useUser() { return useContext(Ctx); }

const STORAGE_KEY  = "ldu_user_id";
const HELP_KEY     = "ldu_help_role"; // sync with HelpButton

// ─── Character pixel art (SVG, 20×24 grid) ───────────────────────────────────

// Each character is a unique pixel-art avatar rendered as an inline SVG grid
function CharacterSprite({ charId, color, size = 72 }: { charId: string; color: string; size?: number }) {
  // Pixel grids: 1 = filled, 0 = empty, each row is 10 wide × 12 tall
  const SPRITES: Record<string, (0|1)[][]> = {
    // Kika Keith — crown + flowing hair, bold CEO
    "kika-keith": [
      [0,1,0,1,0,1,0,1,0,0],
      [1,1,1,1,1,1,1,1,0,0],
      [0,1,1,1,1,1,1,0,0,0],
      [0,1,1,1,1,1,1,0,0,0],
      [1,1,0,1,1,0,1,1,0,0],
      [1,1,1,1,1,1,1,1,0,0],
      [0,1,1,1,1,1,1,0,0,0],
      [0,0,1,1,1,1,0,0,0,0],
      [0,1,1,1,1,1,1,0,0,0],
      [1,0,1,1,1,1,0,1,0,0],
      [1,0,1,0,0,1,0,1,0,0],
      [0,0,1,0,0,1,0,0,0,0],
    ],
    // Kika Howze — hoodie + lightning bolt, tech lead
    "kika-howze": [
      [0,0,1,1,1,1,0,0,0,0],
      [0,1,1,1,1,1,1,0,0,0],
      [0,1,0,1,1,0,1,0,0,0],
      [0,1,1,1,1,1,1,0,0,0],
      [1,1,1,1,1,1,1,1,0,0],
      [1,1,0,1,1,0,1,1,0,0],
      [0,1,1,1,1,1,1,0,0,0],
      [0,0,1,0,1,0,0,0,0,0],
      [0,1,1,0,1,1,0,0,0,0],
      [1,1,0,0,0,1,1,0,0,0],
      [1,0,0,0,0,0,1,0,0,0],
      [1,1,0,0,0,1,1,0,0,0],
    ],
    // Sheila — headband + steady ops vibes
    "sheila": [
      [0,1,1,1,1,1,1,0,0,0],
      [1,1,1,1,1,1,1,1,0,0],
      [1,0,1,0,0,1,0,1,0,0],
      [1,1,1,1,1,1,1,1,0,0],
      [0,1,1,1,1,1,1,0,0,0],
      [0,0,1,1,1,1,0,0,0,0],
      [0,1,1,1,1,1,1,0,0,0],
      [1,1,0,1,1,0,1,1,0,0],
      [1,0,0,1,1,0,0,1,0,0],
      [1,0,0,0,0,0,0,1,0,0],
      [1,1,0,0,0,0,1,1,0,0],
      [0,1,1,0,0,1,1,0,0,0],
    ],
  };

  const grid = SPRITES[charId] ?? SPRITES["sheila"];
  const cols = 10, rows = 12;
  const cell = size / cols;

  return (
    <svg width={size} height={size * rows / cols}
      viewBox={`0 0 ${cols * 10} ${rows * 10}`} aria-hidden="true">
      {grid.map((row, r) =>
        row.map((filled, c) =>
          filled ? (
            <rect key={`${r}-${c}`}
              x={c * 10} y={r * 10} width={10} height={10}
              fill={color} />
          ) : null
        )
      )}
    </svg>
  );
}

// ─── Character stats bars ─────────────────────────────────────────────────────

function StatBar({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-[7px] font-black w-14 shrink-0 uppercase"
        style={{ fontFamily: "Orbitron, sans-serif", color: "rgba(10,10,26,0.5)" }}>
        {label}
      </span>
      <div className="flex gap-0.5 flex-1">
        {[1,2,3,4,5].map(i => (
          <div key={i} className="h-2 flex-1 rounded-sm border border-[#0a0a1a]"
            style={{ background: i <= value ? color : "rgba(255,255,255,0.4)" }} />
        ))}
      </div>
    </div>
  );
}

// ─── Character config ─────────────────────────────────────────────────────────

const CHARACTERS = [
  {
    member:    TEAM_MEMBERS[0],
    charId:    "kika-keith",
    charClass: "CLOSER",
    tagline:   "Approves packages · Closes deals · Owns the relationships",
    stats:     { Strategy: 5, Relationships: 5, Speed: 3, Research: 2, Compliance: 2 },
    accent:    "#ff1e78",
    badge:     "CEO",
    glow:      "rgba(255,30,120,0.35)",
  },
  {
    member:    TEAM_MEMBERS[1],
    charId:    "kika-howze",
    charClass: "ENGINEER",
    tagline:   "Runs agents · Manages pipeline · Reviews every draft",
    stats:     { Strategy: 3, Relationships: 3, Speed: 5, Research: 5, Compliance: 3 },
    accent:    "#7c3aed",
    badge:     "IMPL",
    glow:      "rgba(124,58,237,0.35)",
  },
  {
    member:    TEAM_MEMBERS[2],
    charId:    "sheila",
    charClass: "OPS",
    tagline:   "Government paperwork · Post-award compliance · Registrations",
    stats:     { Strategy: 2, Relationships: 3, Speed: 4, Research: 3, Compliance: 5 },
    accent:    "#ffb800",
    badge:     "OPS",
    glow:      "rgba(255,184,0,0.35)",
  },
];

// ─── Onboarding modal ─────────────────────────────────────────────────────────

function OnboardingModal({ onSelect }: { onSelect: (m: TeamMember) => void }) {
  const [hovered, setHovered] = useState<string | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [imgErrors, setImgErrors] = useState<Record<string, boolean>>({});

  function handleSelect(member: TeamMember, charId: string) {
    setSelected(charId);
    // Small delay so the press animation is visible
    setTimeout(() => onSelect(member as TeamMember), 180);
  }

  return (
    // iOS-reliable modal pattern:
    // - outer fixed div: overflow hidden (clips, no scroll)
    // - inner absolute div: overflow-y scroll (actually scrolls on iOS)
    <div
      className="fixed inset-0 z-[9999] overflow-hidden"
      style={{
        background: "linear-gradient(160deg, #0d0030 0%, #1565e8 50%, #001a6e 100%)",
      }}
    >
      {/* Pixel grid background */}
      <div className="absolute inset-0 pointer-events-none opacity-[0.06]"
        style={{
          backgroundImage: "linear-gradient(#fffbf0 1px, transparent 1px), linear-gradient(90deg, #fffbf0 1px, transparent 1px)",
          backgroundSize: "24px 24px",
        }} />

      {/* Scrollable inner — absolute fill, this is what iOS actually scrolls */}
      <div
        className="absolute inset-0 overflow-y-scroll"
        style={{ WebkitOverflowScrolling: "touch" }}
      >
      {/* All content in one scrollable flow */}
      <div className="relative px-4 pt-6 pb-28 flex flex-col gap-4 max-w-sm mx-auto">

        {/* Header (scrolls with content — avoids sticky-in-overflow-hidden bug) */}
        <div className="text-center pb-1">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/icons/icon-192.png"
            alt="LDU"
            className="w-14 h-14 mx-auto mb-2 rounded-xl border-[3px] border-[#fffbf0] float-pixel"
            style={{ boxShadow: "4px 4px 0 #0a0a1a" }}
          />
          <p className="text-[9px] font-black uppercase tracking-[0.2em] text-[#fffbf0] opacity-50 mb-1"
            style={{ fontFamily: "Orbitron, sans-serif" }}>LIFE DEVELOPMENT UNIVERSITY</p>
          <h1 className="text-xl font-black text-[#fffbf0] leading-tight glitch-text"
            style={{ fontFamily: "Orbitron, sans-serif", textShadow: "3px 3px 0 #0a0a1a" }}>
            SELECT YOUR CHARACTER
          </h1>
          {/* Scroll hint */}
          <div className="flex items-center justify-center gap-1.5 mt-2">
            {CHARACTERS.map((_, i) => (
              <div key={i} className="w-2 h-2 rounded-full border border-[#fffbf0]/40"
                style={{ background: "rgba(255,255,255,0.3)" }} />
            ))}
          </div>
        </div>

        {/* Character cards */}
        {CHARACTERS.map(({ member, charId, accent, glow, charClass, tagline, stats }, idx) => {
          const isHovered = hovered === charId;
          const isSelected = selected === charId;
          const imgFailed = imgErrors[charId];
          return (
            <button
              key={member.id}
              onClick={() => handleSelect(member as TeamMember, charId)}
              onMouseEnter={() => setHovered(charId)}
              onMouseLeave={() => setHovered(null)}
              className="w-full rounded-2xl border-[3px] border-[#0a0a1a] overflow-hidden focus:outline-none"
              style={{
                boxShadow: isSelected
                  ? `2px 2px 0 ${accent}`
                  : isHovered
                    ? `6px 6px 0 ${accent}, 0 0 30px ${glow}`
                    : `4px 4px 0 ${accent}`,
                transform: isSelected
                  ? "translate(2px, 2px)"
                  : isHovered ? "translateY(-2px)" : "none",
                transition: "transform 0.1s ease, box-shadow 0.1s ease",
                animationDelay: `${idx * 0.08}s`,
              }}
            >
              {/* Class badge */}
              <div
                className="px-3 py-1.5 flex items-center justify-between border-b-[2px] border-[#0a0a1a]"
                style={{ background: accent }}
              >
                <span
                  className="text-[9px] font-black text-white tracking-[0.2em]"
                  style={{ fontFamily: "'Press Start 2P', monospace",
                    textShadow: `0 0 6px rgba(255,255,255,0.6)` }}
                >
                  {charClass}
                </span>
                <div className="flex gap-1">
                  {[0,1,2].map(i => (
                    <div key={i} className="w-1.5 h-1.5 rounded-sm bg-white opacity-70" />
                  ))}
                </div>
              </div>

              {/* Card image or pixel fallback */}
              <div className="min-h-[140px] flex items-center justify-center relative bg-[#fffbf0]/10">
                {imgFailed ? (
                  <div className="flex flex-col items-center gap-2 py-6">
                    <CharacterSprite charId={charId} color={accent} size={64} />
                    <span className="text-sm font-black text-[#fffbf0]"
                      style={{ fontFamily: "Orbitron, sans-serif" }}>
                      {member.id.split(" (")[0].toUpperCase()}
                    </span>
                  </div>
                ) : (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img
                    src={`/characters/${charId}.png`}
                    alt={member.id}
                    className="w-full block h-[200px] object-cover object-top"
                    style={{ imageRendering: "pixelated" }}
                    onError={() => setImgErrors((e) => ({ ...e, [charId]: true }))}
                  />
                )}
              </div>

              {/* Tagline + stats */}
              <div className="px-4 py-3 space-y-2.5" style={{ background: "#fffbf0", borderTop: "2px solid #0a0a1a" }}>
                <p className="text-[10px] text-[#555566] leading-relaxed font-medium">{tagline}</p>

                {/* Stat bars */}
                <div className="space-y-1.5">
                  {Object.entries(stats).map(([key, val]) => (
                    <div key={key} className="flex items-center gap-2">
                      <span className="text-[7px] font-black w-16 shrink-0 uppercase text-right"
                        style={{ fontFamily: "Orbitron, sans-serif", color: "rgba(10,10,26,0.45)" }}>
                        {key}
                      </span>
                      <div className="flex gap-0.5 flex-1">
                        {[1,2,3,4,5].map(i => (
                          <div
                            key={i}
                            className="h-2 flex-1 rounded-sm border border-[#0a0a1a]"
                            style={{ background: i <= val ? accent : "rgba(10,10,26,0.08)" }}
                          />
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* CTA */}
              <div
                className="w-full py-2.5 px-4 flex items-center justify-between border-t-[2px] border-[#0a0a1a]"
                style={{ background: isSelected ? "#0a0a1a" : accent }}
              >
                <span className="text-[10px] font-black text-white tracking-widest"
                  style={{ fontFamily: "Orbitron, sans-serif" }}>
                  {isSelected ? "LOADING..." : "TAP TO SELECT"}
                </span>
                <PixelIcon name={isSelected ? "check" : "play"} size={14} color="#ffffff" />
              </div>
            </button>
          );
        })}

        <p className="text-[8px] text-[#fffbf0] opacity-40 text-center tracking-widest"
          style={{ fontFamily: "Orbitron, sans-serif" }}>
          SCROLL TO SEE ALL {CHARACTERS.length} CHARACTERS · SWITCH ANYTIME VIA THE ? BUTTON
        </p>
      </div>
      </div>
    </div>
  );
}

// ─── Provider ─────────────────────────────────────────────────────────────────

export function UserProvider({ children }: { children: ReactNode }) {
  const [user,     setUserState] = useState<TeamMember | null>(null);
  const [hydrated, setHydrated]  = useState(false);

  // No persistence — character select shows every time you open/sign in
  useEffect(() => {
    setHydrated(true);
  }, []);

  const setUser = useCallback((m: TeamMember) => {
    setUserState(m);
  }, []);

  const clearUser = useCallback(() => {
    setUserState(null);
  }, []);

  // Always render children — never block the app tree.
  // The modal is portalled to document.body so it floats above everything.
  return (
    <Ctx.Provider value={{ user, setUser, clearUser, needsSetup: !user }}>
      {children}
      {/* Portal to document.body guarantees it's above ALL stacking contexts */}
      {hydrated && !user &&
        createPortal(
          <OnboardingModal onSelect={setUser} />,
          document.body
        )
      }
    </Ctx.Provider>
  );
}
