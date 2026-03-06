import Link from "next/link";
import PixelIcon from "@/components/shared/PixelIcon";
import Header from "@/components/layout/Header";

export const dynamic = "force-dynamic";

interface HealthResult {
  ok: boolean;
  message?: string;
  error?: string;
  hint?: string;
}

async function checkHealth(): Promise<HealthResult> {
  const token  = process.env.AIRTABLE_API_TOKEN;
  const baseId = process.env.AIRTABLE_BASE_ID;

  if (!token)  return { ok: false, error: "AIRTABLE_API_TOKEN is not set", hint: "Create a .env.local file in the frontend/ folder with this variable." };
  if (!baseId) return { ok: false, error: "AIRTABLE_BASE_ID is not set",   hint: "Create a .env.local file in the frontend/ folder with this variable." };

  try {
    const { getOpportunities } = await import("@/lib/airtable");
    const records = await getOpportunities({ maxRecords: 1 });
    return { ok: true, message: `Connected! Found ${records.length} record(s) in a test read.` };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return {
      ok: false,
      error: msg,
      hint: "Token may lack data.records:read scope, or BASE_ID doesn't match. Re-read the setup steps below.",
    };
  }
}

const SETUP_STEPS = [
  {
    num: "01", icon: "quill" as const, color: "#7c3aed",
    title: "Create .env.local",
    body: "In your frontend/ folder, create a file called .env.local with these two lines:",
    code: "AIRTABLE_API_TOKEN=pat...\nAIRTABLE_BASE_ID=app...",
  },
  {
    num: "02", icon: "target" as const, color: "#0066cc",
    title: "Get your Airtable Personal Access Token",
    body: "Go to airtable.com/create/tokens → New Token → give it data.records:read scope → select your LDU Grants base → copy the token starting with 'pat'",
    code: null,
  },
  {
    num: "03", icon: "building" as const, color: "#00a83a",
    title: "Get your Base ID",
    body: "Open Airtable → LDU Grants base → click Help (?) → API Documentation → copy the Base ID starting with 'app' from the URL or docs",
    code: null,
  },
  {
    num: "04", icon: "rocket" as const, color: "#ff6b00",
    title: "Restart the dev server",
    body: "Stop your server (Ctrl+C) and run npm run dev again — Next.js only loads .env.local variables on startup",
    code: "npm run dev",
  },
  {
    num: "05", icon: "check" as const, color: "#ff1e78",
    title: "Reload this page",
    body: "Come back here after restarting and the status at the top should turn green. Then go to the main dashboard.",
    code: null,
  },
];

export default async function SetupPage() {
  const health = await checkHealth();

  return (
    <>
      <Header title="DIAGNOSTICS" subtitle="Connection status" />
      <div className="page-container space-y-5">

        {/* ── Status card ─────────────────────────────────── */}
        <div
          className="rounded-2xl border-[2.5px] p-5 scanlines"
          style={{
            borderColor: health.ok ? "#00d94e" : "#ff1e78",
            background:  health.ok ? "#b8ffda" : "#ffe0e8",
            boxShadow:   `5px 5px 0 ${health.ok ? "#00a83a" : "#ff1e78"}`,
          }}
        >
          <div className="flex items-start gap-4">
            <div
              className="w-12 h-12 rounded-xl border-[2.5px] border-[#0a0a1a] flex items-center justify-center shrink-0"
              style={{ background: health.ok ? "#00d94e" : "#ff1e78", boxShadow: "3px 3px 0 #0a0a1a" }}
            >
              <PixelIcon name={health.ok ? "check" : "alert"} size={22} color="white" glow />
            </div>
            <div className="flex-1">
              <p
                className="font-black text-base mb-1"
                style={{
                  fontFamily: "'Press Start 2P', monospace",
                  fontSize: "11px",
                  color: health.ok ? "#00a83a" : "#ff1e78",
                  textShadow: health.ok
                    ? "0 0 6px #00d94e, 0 0 14px #00d94e60"
                    : "0 0 6px #ff1e78, 0 0 14px #ff1e7860",
                }}
              >
                {health.ok ? "CONNECTED" : "NOT CONNECTED"}
              </p>
              <p className="text-sm text-[#0a0a1a] leading-relaxed">
                {health.ok ? health.message : health.error}
              </p>
              {health.hint && (
                <p className="text-xs text-[#555566] mt-1.5 leading-relaxed">
                  {health.hint}
                </p>
              )}
            </div>
          </div>

          {health.ok && (
            <div className="mt-4 flex gap-3">
              <Link
                href="/"
                className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl border-[2.5px] border-[#0a0a1a] text-[10px] font-black uppercase tracking-wider btn-glow-lime"
                style={{ fontFamily: "Orbitron, sans-serif", background: "#00d94e", color: "#0a0a1a", boxShadow: "3px 3px 0 #007a2a" }}
              >
                <PixelIcon name="home" size={13} color="#0a0a1a" />
                GO TO DASHBOARD
              </Link>
            </div>
          )}
        </div>

        {/* ── Env var checklist ────────────────────────────── */}
        <div className="rounded-2xl border-[2.5px] border-[#0a0a1a] overflow-hidden" style={{ boxShadow: "4px 4px 0 #0a0a1a" }}>
          <div className="px-4 py-3 flex items-center gap-2" style={{ background: "#b8e0ff", borderBottom: "2.5px solid #0a0a1a" }}>
            <PixelIcon name="target" size={13} color="#0066cc" glow />
            <span className="text-[10px] font-black uppercase tracking-widest text-[#0066cc]" style={{ fontFamily: "Orbitron, sans-serif" }}>
              ENVIRONMENT VARIABLES
            </span>
          </div>
          <div style={{ background: "#fffbf0" }}>
            {[
              { key: "AIRTABLE_API_TOKEN", set: !!process.env.AIRTABLE_API_TOKEN, hint: "Starts with 'pat'" },
              { key: "AIRTABLE_BASE_ID",   set: !!process.env.AIRTABLE_BASE_ID,   hint: "Starts with 'app'" },
            ].map((v) => (
              <div key={v.key} className="flex items-center gap-3 px-4 py-3 border-b border-dashed border-[#0a0a1a]/10 last:border-0">
                <div
                  className="w-6 h-6 rounded-md border-[2px] border-[#0a0a1a] flex items-center justify-center shrink-0"
                  style={{ background: v.set ? "#00d94e" : "#ffe0e8" }}
                >
                  <PixelIcon name={v.set ? "check" : "cross"} size={10} color={v.set ? "#0a0a1a" : "#ff1e78"} />
                </div>
                <div className="flex-1 min-w-0">
                  <code className="text-[10px] font-mono font-black text-[#0a0a1a]">{v.key}</code>
                  <p className="text-[9px] text-[#aaaacc]">{v.hint}</p>
                </div>
                <span
                  className="text-[8px] font-black px-2 py-0.5 rounded border-[1.5px] border-[#0a0a1a]"
                  style={{
                    fontFamily: "Orbitron, sans-serif",
                    background: v.set ? "#00d94e" : "#ffe0e8",
                    color: v.set ? "#0a0a1a" : "#ff1e78",
                    boxShadow: "1px 1px 0 #0a0a1a",
                  }}
                >
                  {v.set ? "SET" : "MISSING"}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* ── Setup guide ──────────────────────────────────── */}
        {!health.ok && (
          <div className="rounded-2xl border-[2.5px] border-[#0a0a1a] overflow-hidden" style={{ boxShadow: "4px 4px 0 #0a0a1a" }}>
            <div className="px-4 py-3 flex items-center gap-2" style={{ background: "#e8d4ff", borderBottom: "2.5px solid #0a0a1a" }}>
              <PixelIcon name="lightning" size={13} color="#7c3aed" glow />
              <span className="text-[10px] font-black uppercase tracking-widest text-[#7c3aed]" style={{ fontFamily: "Orbitron, sans-serif" }}>
                SETUP GUIDE
              </span>
            </div>
            <div className="divide-y-[1.5px] divide-dashed divide-[#0a0a1a]/10" style={{ background: "#fffbf0" }}>
              {SETUP_STEPS.map((step) => (
                <div key={step.num} className="flex items-start gap-3 px-4 py-3.5">
                  <div
                    className="w-7 h-7 rounded-lg border-[2px] border-[#0a0a1a] flex items-center justify-center shrink-0 mt-0.5"
                    style={{ background: step.color, boxShadow: "1px 1px 0 #0a0a1a" }}
                  >
                    <PixelIcon name={step.icon} size={12} color="white" glow />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="text-[8px] font-black text-[#aaaacc]" style={{ fontFamily: "Orbitron, sans-serif" }}>{step.num}</span>
                      <span className="text-[10px] font-black" style={{ fontFamily: "Orbitron, sans-serif", color: step.color }}>{step.title}</span>
                    </div>
                    <p className="text-xs text-[#555566] leading-relaxed">{step.body}</p>
                    {step.code && (
                      <div
                        className="mt-2 px-3 py-2 rounded-lg border-[1.5px] border-[#0a0a1a] font-mono text-[10px] text-[#0a0a1a] leading-relaxed whitespace-pre"
                        style={{ background: "#f0ece0", boxShadow: "1px 1px 0 #0a0a1a" }}
                      >
                        {step.code}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Nav links ────────────────────────────────────── */}
        <div className="grid grid-cols-2 gap-3">
          <Link
            href="/"
            className="rounded-2xl border-[2.5px] border-[#0a0a1a] p-4 flex flex-col gap-2 transition-all active:translate-x-[2px] active:translate-y-[2px] active:shadow-none grant-card"
            style={{ background: "#e8d4ff", boxShadow: "4px 4px 0 #7c3aed" }}
          >
            <PixelIcon name="home" size={18} color="#7c3aed" glow />
            <p className="text-[9px] font-black uppercase tracking-wider" style={{ fontFamily: "Orbitron, sans-serif", color: "#7c3aed" }}>BACK TO HQ</p>
            <p className="text-[10px] text-[#555566]">Main dashboard</p>
          </Link>
          <Link
            href="/workflow"
            className="rounded-2xl border-[2.5px] border-[#0a0a1a] p-4 flex flex-col gap-2 transition-all active:translate-x-[2px] active:translate-y-[2px] active:shadow-none grant-card"
            style={{ background: "#b8ffda", boxShadow: "4px 4px 0 #00a83a" }}
          >
            <PixelIcon name="lightning" size={18} color="#00a83a" glow />
            <p className="text-[9px] font-black uppercase tracking-wider" style={{ fontFamily: "Orbitron, sans-serif", color: "#00a83a" }}>WORKFLOW</p>
            <p className="text-[10px] text-[#555566]">Works without data</p>
          </Link>
        </div>

      </div>
    </>
  );
}
