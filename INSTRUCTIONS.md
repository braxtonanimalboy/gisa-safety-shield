# GISA Safety Shield — Setup Instructions for Clara
## 3 steps. That's it.

---

## What you're installing

A real browser extension that:
- Automatically blocks trafficking sites, scam sites, phishing, grooming, and malware
- Shows you a red warning page when something is blocked with the reason why
- Puts a warning badge on dangerous links BEFORE you click them
- Shows you a shield icon in Chrome with live stats of what's been blocked

---

## Step 1 — Upgrade your API

In your terminal, run these two commands:

```
cp ~/Desktop/gisa-clara/backend/main.py ~/Desktop/gisa-platform-complete/gisa-step1/backend/app/main.py
```

Then rebuild:

```
cd ~/Desktop/gisa-platform-complete/gisa-step1
docker compose -f docker-compose.simple.yml up -d --build api
```

Wait about 30 seconds, then check it worked:

```
curl http://localhost:8000/health
```

You should see it say "Clara's safety platform is running!" and show you all the threat categories.

---

## Step 2 — Load the Chrome Extension

1. Open Chrome
2. Type `chrome://extensions` in the address bar
3. Make sure "Developer mode" is ON (top right corner)
4. Click "Load unpacked"
5. Navigate to your Desktop → `gisa-clara` → `extension` folder
6. Click "Select"

You'll see the GISA shield 🛡 appear in your Chrome toolbar.

---

## Step 3 — Test it

Click the shield icon in Chrome. You should see:
- "PROTECTION ACTIVE" in green
- Your stats (blocked/scanned/warnings)

To test it's working, go to your API docs page:
```
http://localhost:8000/docs
```

Click on `/v1/scan`, try "Try it out", and scan these:
- `free-iphone-winner.tk` → should be BLOCKED (scam + bad TLD)
- `paypal-secure-login.com` → should be BLOCKED (phishing)
- `google.com` → should be ALLOWED

---

## What happens when something is blocked

Instead of the website loading, you'll see a dark page that says:
- What was blocked and why
- The threat category (trafficking / scam / phishing / etc.)
- A risk score out of 100
- The National Human Trafficking Hotline number (1-888-373-7888) for trafficking sites
- A "Go Back to Safety" button
- A "Report This Site" button

---

## Important: Keep your terminal open

The extension talks to your API running in Docker.
If you close the terminal or your Mac sleeps and Docker stops, the extension
will "fail open" — meaning it won't block anything until Docker is running again.

To restart Docker if it stops:
```
cd ~/Desktop/gisa-platform-complete/gisa-step1
docker compose -f docker-compose.simple.yml up -d
```

---

## What comes next (when you're ready)

1. Connect to real threat feeds (PhishTank, URLhaus) — gives you hundreds of thousands of real known-bad domains
2. Add a database so blocks are remembered and tracked over time
3. Deploy it to a real server so it protects your whole network, not just your Chrome

But for now — you have a working safety shield. 🛡
