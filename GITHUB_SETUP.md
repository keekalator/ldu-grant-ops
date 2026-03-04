# GitHub Setup Guide
## One-time setup — takes about 20 minutes

This guide connects your grant operations system to GitHub so agents run automatically, the dashboard deploys itself, and your API keys are secured.

---

## Step 1 — Create a GitHub Repository (5 min)

1. Go to [github.com/new](https://github.com/new)
2. Repository name: `ldu-grant-ops`
3. Set to **Private**
4. Do NOT initialize with README (we have one)
5. Click **Create repository**
6. Copy the repo URL (e.g. `https://github.com/YOUR_USERNAME/ldu-grant-ops.git`)

---

## Step 2 — Push the Code (2 min)

Open Terminal in the project root (`ldu-grant-ops 3/`) and run:

```bash
git init
git add .
git commit -m "Initial commit — LDU grant operations system"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/ldu-grant-ops.git
git push -u origin main
```

---

## Step 3 — Add GitHub Secrets (10 min)

Secrets are encrypted — GitHub uses them in Actions but never exposes the values.

Go to: **GitHub repo → Settings → Secrets and variables → Actions → New repository secret**

Add each of these:

| Secret Name | Value | Where to find it |
|-------------|-------|-----------------|
| `ANTHROPIC_API_KEY` | `sk-ant-api03-...` | Your `.env` file |
| `AIRTABLE_API_TOKEN` | `patjYD...` | Your `.env` file |
| `AIRTABLE_BASE_ID` | `appboQ...` | Your `.env` file |
| `POKE_WEBHOOK_URL` | Your Poke URL | Your `.env` file |
| `CEO_CONTACT` | Kika Keith's phone | Your `.env` file |
| `IMPL_LEAD_CONTACT` | Kika Howze's phone | Your `.env` file |
| `INSTRUMENTL_API_KEY` | When you get it | Instrumentl dashboard |
| `VERCEL_TOKEN` | From Vercel | See Step 4 |
| `VERCEL_ORG_ID` | From Vercel | See Step 4 |
| `VERCEL_PROJECT_ID` | From Vercel | See Step 4 |
| `NEXT_PUBLIC_BASE_URL` | Your Vercel URL | After first Vercel deploy |

**IMPORTANT**: After adding secrets, delete your local `.env` file from your computer. It's no longer needed — GitHub Actions injects them automatically.

---

## Step 4 — Connect Vercel for Dashboard Auto-Deploy (5 min)

1. Go to [vercel.com](https://vercel.com) → **Add New Project**
2. Import your `ldu-grant-ops` GitHub repository
3. Set **Root Directory** to `frontend`
4. Add environment variables (same as Step 3: ANTHROPIC_API_KEY, AIRTABLE_API_TOKEN, AIRTABLE_BASE_ID)
5. Deploy — Vercel gives you a URL like `ldu-grant-ops.vercel.app`

**Get Vercel Secrets for GitHub:**
- Go to Vercel → Settings → Tokens → Create token → add as `VERCEL_TOKEN` in GitHub
- Go to your project → Settings → General → copy Project ID → add as `VERCEL_PROJECT_ID`
- Your Organization ID is in the URL: `vercel.com/[ORG_ID]/...` → add as `VERCEL_ORG_ID`

---

## Step 5 — Verify Agents Are Running (1 min)

After push, go to: **GitHub repo → Actions tab**

You should see:
- `LDU Agent Schedule` workflow listed
- It will run automatically on the schedule — or click **Run workflow** to test manually

To manually test everything works:
1. Click `LDU Agent Schedule` → **Run workflow** → mode: `test` → **Run workflow**
2. Watch the logs — all services should show ✅ OK

---

## After Setup: What Runs Automatically

| Day/Time (PT) | What happens | No human needed |
|---------------|-------------|-----------------|
| Mon + Thu, 6 AM | Agents scrape new grants from Grants.gov, CA Arts, CalRecycle | ✅ |
| Every day, 8 AM | Agents screen + score all Prospects + generate writing plans | ✅ |
| Monday, 8 AM | Weekly pipeline health review | ✅ |
| Friday, 4 PM | Claude generates CEO summary brief | ✅ |
| Any `main` branch push | Dashboard auto-deploys to Vercel | ✅ |
| Every Monday | Dependabot opens security update PRs | ✅ |

**Kika Howze's new SOP:** Check the GitHub Actions tab once a week to confirm all runs succeeded (green ✅). Everything else is automatic.

---

## Manual Override — Run Any Agent Anytime

Go to: **GitHub repo → Actions → LDU Agent Schedule → Run workflow**

Select mode:
- `scrape` — find new grants now
- `daily` — screen + score now
- `weekly` — pipeline review now
- `summary` — generate CEO brief now
- `write` — draft writing agents (add record ID for specific grant)
- `test` — verify all API connections

No terminal needed.

---

## GitHub MCP for Cursor (optional but recommended)

This gives Cursor's AI direct access to your GitHub repo — I can browse files, check issues, and track changes more effectively.

Install: [github.com/github/github-mcp-server](https://github.com/github/github-mcp-server)

Add to Cursor Settings → MCP:
```json
{
  "github": {
    "command": "npx",
    "args": ["-y", "@modelcontextprotocol/server-github"],
    "env": {
      "GITHUB_PERSONAL_ACCESS_TOKEN": "YOUR_GITHUB_PAT"
    }
  }
}
```

Create a PAT at: GitHub → Settings → Developer settings → Personal access tokens → Fine-grained tokens → permissions: `Contents: Read`, `Actions: Read/Write`
