"use client";

/**
 * UserContext — global team member identity.
 * Captured once on first visit, persisted in localStorage.
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
    member: TEAM_MEMBERS[0], // Kika Keith
    charId:  "kika-keith",
    class:   "CLOSER",
    tagline: "Approves packages · Closes deals · Owns the relationships",
    stats:   { Strategy: 5, Relationships: 5, Speed: 3, Research: 2, Compliance: 2 },
    accent:  "#ff1e78",
    badge:   "CEO",
    glow:    "rgba(255,30,120,0.35)",
  },
  {
    member: TEAM_MEMBERS[1], // Kika Howze
    charId:  "kika-howze",
    class:   "ENGINEER",
    tagline: "Runs agents · Manages pipeline · Reviews every draft",
    stats:   { Strategy: 3, Relationships: 3, Speed: 5, Research: 5, Compliance: 3 },
    accent:  "#7c3aed",
    badge:   "IMPL",
    glow:    "rgba(124,58,237,0.35)",
  },
  {
    member: TEAM_MEMBERS[2], // Sheila
    charId:  "sheila",
    class:   "OPS",
    tagline: "Government paperwork · Post-award compliance · Registrations",
    stats:   { Strategy: 2, Relationships: 3, Speed: 4, Research: 3, Compliance: 5 },
    accent:  "#ffb800",
    badge:   "OPS",
    glow:    "rgba(255,184,0,0.35)",
  },
];

// ─── Onboarding modal ─────────────────────────────────────────────────────────

function OnboardingModal({ onSelect }: { onSelect: (m: TeamMember) => void }) {
  const [hovered, setHovered] = useState<string | null>(null);

  return (
    <div
      className="fixed inset-0 z-[999] flex flex-col items-center px-4 overflow-y-auto justify-start pt-8 pb-10"
      style={{
        background: "linear-gradient(160deg, #0d0030 0%, #1565e8 50%, #001a6e 100%)",
      }}
    >
      {/* Pixel grid background overlay */}
      <div className="absolute inset-0 pointer-events-none opacity-[0.06]"
        style={{
          backgroundImage: "linear-gradient(#fffbf0 1px, transparent 1px), linear-gradient(90deg, #fffbf0 1px, transparent 1px)",
          backgroundSize: "24px 24px",
        }} />

      {/* Header */}
      <div className="relative text-center mb-6 max-w-sm w-full">
        {/* LDU pixel shield icon */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/icons/icon-192.png"
          alt="LDU"
          className="w-16 h-16 mx-auto mb-3 rounded-xl border-[3px] border-[#fffbf0]"
          style={{ boxShadow: "4px 4px 0 #0a0a1a" }}
        />

        <h1 className="text-2xl font-black text-[#fffbf0] leading-tight mb-2"
          style={{ fontFamily: "Orbitron, sans-serif",
            textShadow: "3px 3px 0 #0a0a1a, 0 0 30px rgba(124,58,237,0.8)" }}>
          SELECT YOUR<br />CHARACTER
        </h1>
        <p className="text-[10px] text-[#fffbf0] opacity-60 tracking-widest"
          style={{ fontFamily: "Orbitron, sans-serif" }}>
          YOUR ACTIONS WILL BE LOGGED UNDER YOUR NAME
        </p>

        {/* Blinking dots */}
        <div className="flex justify-center gap-1 mt-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="w-2 h-2 rounded-sm border border-[#fffbf0] animate-pulse"
              style={{ background: ["#ff1e78","#7c3aed","#ffb800"][i],
                animationDelay: `${i * 0.2}s` }} />
          ))}
        </div>
      </div>

      {/* Character cards — full-width image cards */}
      <div className="flex flex-col gap-4 w-full max-w-sm relative">
        {CHARACTERS.map(({ member, charId, accent, glow }) => {
          const isHovered = hovered === charId;
          return (
            <button
              key={member.id}
              onClick={() => onSelect(member as TeamMember)}
              onMouseEnter={() => setHovered(charId)}
              onMouseLeave={() => setHovered(null)}
              className="w-full rounded-2xl border-[3px] border-[#0a0a1a] overflow-hidden transition-all duration-100 active:translate-y-[3px] active:shadow-none focus:outline-none"
              style={{
                boxShadow: isHovered
                  ? `6px 6px 0 ${accent}, 0 0 30px ${glow}`
                  : `4px 4px 0 ${accent}`,
                transform: isHovered ? "translateY(-2px)" : "none",
              }}
            >
              {/* Full character card image */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={`/characters/${charId}.png`}
                alt={member.id}
                className="w-full block"
                style={{ imageRendering: "pixelated" }}
              />

              {/* Tap-to-select footer */}
              <div
                className="w-full py-2 px-4 flex items-center justify-between border-t-[2px] border-[#0a0a1a]"
                style={{ background: accent }}
              >
                <span className="text-[10px] font-black text-white tracking-widest"
                  style={{ fontFamily: "Orbitron, sans-serif" }}>
                  TAP TO SELECT
                </span>
                <PixelIcon name="play" size={14} color="#ffffff" />
              </div>
            </button>
          );
        })}
      </div>

      {/* Footer */}
      <p className="text-[8px] text-[#fffbf0] opacity-40 mt-6 text-center tracking-widest"
        style={{ fontFamily: "Orbitron, sans-serif" }}>
        PRESS START · SWITCH ANYTIME VIA THE ? BUTTON
      </p>
    </div>
  );
}

// ─── Provider ─────────────────────────────────────────────────────────────────

export function UserProvider({ children }: { children: ReactNode }) {
  const [user,     setUserState] = useState<TeamMember | null>(null);
  const [hydrated, setHydrated]  = useState(false);

  // Hydrate from localStorage after first render (client only)
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const found = TEAM_MEMBERS.find(m => m.id === saved);
        if (found) {
          setUserState(found as TeamMember);
          localStorage.setItem(HELP_KEY, found.helpId);
        }
      }
    } catch {}
    setHydrated(true);
  }, []);

  const setUser = useCallback((m: TeamMember) => {
    setUserState(m);
    try {
      localStorage.setItem(STORAGE_KEY, m.id);
      localStorage.setItem(HELP_KEY, m.helpId);
    } catch {}
  }, []);

  const clearUser = useCallback(() => {
    setUserState(null);
    try {
      localStorage.removeItem(STORAGE_KEY);
      localStorage.removeItem(HELP_KEY);
    } catch {}
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
