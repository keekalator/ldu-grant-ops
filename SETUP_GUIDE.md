# LDU Grant Operations — Setup Guide

## What You're Building

This system automates the grunt work of finding, qualifying, scoring, and drafting grant applications for LDU. Once it's running, your daily involvement is reviewing what the agents produce and sending final packages to Kika Keith for approval.

This guide assumes you have never done this before. Every step is spelled out.

---

## Phase 1: Install the Tools (30 minutes)

### Step 1.1 — Install Python

Python is the programming language the agents run on. You need version 3.11 or newer.

1. Go to https://www.python.org/downloads/
2. Click the big yellow "Download Python 3.x.x" button
3. Run the installer
4. **CRITICAL on Windows:** Check the box that says "Add Python to PATH" before clicking Install
5. Verify it worked: Open Terminal (Mac) or Command Prompt (Windows) and type:
   ```
   python --version
   ```
   You should see something like `Python 3.12.1`

### Step 1.2 — Install Cursor

Cursor is the app where you'll manage and run everything. It looks like a code editor, but you'll mainly use it to talk to its built-in AI assistant and run commands.

1. Go to https://cursor.sh
2. Download and install
3. Open Cursor — it will look like a code editor with a dark background. That's normal.

### Step 1.3 — Install Git

Git tracks your project files. You might already have it.

1. Open Terminal/Command Prompt and type: `git --version`
2. If you see a version number, skip to Phase 2
3. If not, go to https://git-scm.com/downloads and install it

---

## Phase 2: Set Up the Project (20 minutes)

### Step 2.1 — Download This Project

You should have received this project as a zip file. If so:
1. Unzip it to a folder you'll remember (e.g., `Documents/ldu-grant-ops`)
2. Open Cursor
3. Go to File → Open Folder → select the `ldu-grant-ops` folder
4. You should see all the files in the left sidebar

### Step 2.2 — Open the Terminal in Cursor

1. In Cursor, press `Ctrl + ~` (Windows) or `Cmd + ~` (Mac) to open the terminal
2. You'll see a command prompt at the bottom of the screen — this is where you type commands

### Step 2.3 — Create Your Virtual Environment

A virtual environment keeps this project's tools separate from everything else on your computer. Type these commands one at a time in the Cursor terminal:

**Mac/Linux:**
```bash
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```

**Windows:**
```bash
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
```

You'll see a bunch of text scroll by as packages install. Wait until it finishes and you see the prompt again. This takes 2-3 minutes.

**How to know it worked:** Your terminal prompt should now start with `(venv)` — that means the virtual environment is active.

---

## Phase 3: Get Your API Keys (45 minutes)

The agents need permission to talk to Airtable, Claude AI, and Make.com. You get that permission through API keys — think of them as passwords for software.

### Step 3.1 — Claude AI (Anthropic) Key

This is the AI that writes your grant narratives.

1. Go to https://console.anthropic.com
2. Sign up or log in
3. Go to Settings → API Keys
4. Click "Create Key"
5. Name it "LDU Grant Ops"
6. Copy the key (starts with `sk-ant-...`) — you'll need it in Step 3.5

**Cost:** Claude API charges per use. For grant operations at this scale, expect $50-150/month depending on volume. You can set spending limits in the console.

### Step 3.2 — Airtable Token

This is your pipeline database.

1. Go to https://airtable.com and sign up or log in
2. Create a new base called "LDU Grant Operations"
3. Copy the Base ID from the URL — when you open the base, the URL looks like:
   `https://airtable.com/appXXXXXXXXXXXXXX/...`
   The part starting with `app` is your Base ID
4. Go to https://airtable.com/create/tokens
5. Click "Create new token"
6. Name: "LDU Grant Ops Agent"
7. Add these scopes: `data.records:read`, `data.records:write`, `schema.bases:read`, `schema.bases:write`
8. Under "Access," add your LDU Grant Operations base
9. Click "Create token" and copy it (starts with `pat_...`)

### Step 3.3 — Set Up Airtable Tables

Now create the 6 tables the agents need. Run this command in your Cursor terminal:

```bash
python scripts/setup_airtable.py
```

This will print out the exact fields and options for each table. Create them in Airtable by hand following the specifications — it takes about 15 minutes. The 6 tables are:

1. **Opportunities** — Every grant prospect
2. **Funders** — Organizations that give grants
3. **Submissions** — Applications you've sent
4. **Reporting** — Reports due on awarded grants
5. **Boilerplate Library** — Reusable narrative sections
6. **Team Tasks** — To-do items for the team

### Step 3.4 — Make.com Webhooks

Make.com automates the connections between your tools.

1. Go to https://make.com and log in to your existing account
2. For each of the 7 scenarios below, create a new scenario:
   - Click "Create a new scenario"
   - Add a "Webhooks" module as the trigger (choose "Custom webhook")
   - Click the webhook module → "Add" → Name it → Copy the webhook URL
   - You'll build out the full scenarios later — for now you just need the URLs

**The 7 scenarios:**
1. Prospect Intake (Instrumentl → Airtable)
2. Deadline Calendar Sync (Airtable → Google Calendar)
3. Post-Submission Follow-Up (status change triggers)
4. Report Due Alerts (approaching deadlines)
5. Award Onboarding (new award setup)
6. Decline Recovery (feedback request)
7. Weekly CEO Summary (Friday 4PM → Poke)

### Step 3.5 — Configure Your .env File

This is where all your keys live. In Cursor:

1. In the file explorer (left sidebar), find `.env.example`
2. Right-click → Duplicate (or in terminal: `cp .env.example .env`)
3. Open the new `.env` file
4. Fill in each value with the keys you collected above
5. Save the file

**IMPORTANT:** The `.env` file contains your private keys. Never share it or upload it anywhere.

---

## Phase 4: Test Everything (10 minutes)

Run the connection test to make sure everything talks to each other:

```bash
python scripts/run_pipeline.py --mode test
```

You should see a table showing OK or FAILED for each service. If something fails, the error message will tell you what's wrong — usually a typo in the .env file.

---

## Phase 5: Start Using the System

### Your Daily Routine

**Morning (automated, just review):**
```bash
python scripts/run_pipeline.py --mode daily
```
This scans for new prospects, screens them, and scores them. Review the output.

**Monday Pipeline Review:**
```bash
python scripts/run_pipeline.py --mode weekly
```
This shows your full pipeline status, upcoming deadlines, and writing queue.

**Friday CEO Summary:**
```bash
python scripts/run_pipeline.py --mode summary
```
This generates the summary that goes to Kika Keith.

### Adding a Manual Prospect

When you find a grant through a newsletter, referral, or your own research:

1. Add it directly to the Opportunities table in Airtable
2. Set the Source to "Manual-KH"
3. Tag it to the correct Pillar(s)
4. Set Status to "Prospect"
5. Next time you run the daily cycle, the agents will screen and score it automatically

### Using Cursor's AI to Help You

This is the most powerful part. The `.cursorrules` file teaches Cursor's AI everything about LDU's grant operations. You can:

1. Press `Cmd+K` (Mac) or `Ctrl+K` (Windows) in any file
2. Ask questions like:
   - "Add a new priority funder to Pillar 3"
   - "Change the scoring threshold for Pillar 5 to 2.5"
   - "Write a boilerplate needs statement for South LA demographics"
   - "Help me debug why the Airtable connection is failing"
3. Cursor's AI will make the changes for you

---

## What Each Folder Does (Quick Reference)

| Folder | Purpose | You Touch It? |
|--------|---------|---------------|
| `config/` | Settings, pillar definitions, scoring rules | Occasionally — to update pillars or thresholds |
| `agents/research/` | Screening, scoring, funder intel | Rarely — agents run automatically |
| `agents/writing/` | Narrative drafting, budgets, QA | Rarely — agents run automatically |
| `agents/followup/` | Tracking, reporting, relationships | Rarely — agents run automatically |
| `integrations/` | Connections to Airtable, Claude, etc. | Only during setup |
| `data/boilerplate/` | Reusable narrative content | Yes — review and update quarterly |
| `data/templates/` | Budget and letter templates | Yes — customize per application |
| `scripts/` | Commands you run | Yes — this is your control panel |
| `logs/` | Activity logs from agents | Only when troubleshooting |

---

## Troubleshooting

**"ModuleNotFoundError"** → Your virtual environment isn't active. Run `source venv/bin/activate` (Mac) or `venv\Scripts\activate` (Windows)

**"Invalid API key"** → Check your .env file for typos. Keys are case-sensitive.

**Airtable errors** → Make sure the table names in Airtable match exactly: "Opportunities", "Funders", "Submissions", "Reporting", "Boilerplate Library", "Team Tasks"

**For anything else** → Open Cursor's AI chat (Cmd+L or Ctrl+L) and describe the problem. It knows this project inside out.
