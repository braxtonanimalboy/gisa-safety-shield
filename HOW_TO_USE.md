# GISA — Clara's Safety Shield
## What this does + how to set it up

This automatically blocks:
- 🚨 Trafficking and exploitation sites
- 🕶 Dark markets and illegal marketplaces  
- 🎣 Phishing sites stealing passwords
- ☠ Malware and virus sites
- 💸 Scam sites
- 🚨 Known threat domains (from real threat databases)

---

## STEP 1 — Start the API (the brain)

Open Terminal and run:

```
cd ~/Desktop/gisa-clara
docker compose up -d
```

Wait about 30 seconds. Then check it's working:

```
curl http://localhost:8000/health
```

You should see something like:
```
{"status":"ok","blocklist_size":1500,"message":"Protecting against trafficking..."}
```

The blocklist_size number tells you how many real threat domains are loaded.
It loads from real databases (Spamhaus, URLhaus) automatically on startup.

---

## STEP 2 — Install the Chrome Extension

1. Open Chrome
2. Go to: chrome://extensions
3. Turn on Developer Mode (top right toggle)
4. Click "Load unpacked"
5. Select the `extension` folder inside `gisa-clara`
6. You'll see a green shield 🛡 in your Chrome toolbar

---

## STEP 3 — Test it

Try visiting these in Chrome and watch what happens:

Safe (should load normally):
- google.com
- wikipedia.org
- khanacademy.org

Blocked (should show the block page):
Try the scan in the popup with: `malware-download.ru`
Or: `paypal-secure-verify-account.com`
Or: `free-iphone-winner-claim.biz`

---

## How it works

Every time you click a link or type a URL:
1. Extension catches it BEFORE the page loads
2. Asks your API: "is this safe?"
3. API checks against:
   - Real threat databases (Spamhaus, URLhaus)
   - Trafficking/exploitation keyword patterns
   - Dark market signals
   - Phishing patterns
   - Malware signals
   - Brand impersonation detection
4. If score is 70+/100 → BLOCKED
5. If score is 40-69 → WARNING
6. If score is under 40 → ALLOWED

---

## How to keep it running

Every time you restart your Mac, just run:
```
cd ~/Desktop/gisa-clara
docker compose up -d
```

The extension stays installed — you only need to restart the API.

---

## To stop it

```
cd ~/Desktop/gisa-clara
docker compose down
```

---

Built by Clara. Fighting trafficking one blocked domain at a time. 🛡
