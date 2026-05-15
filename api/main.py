"""
GISA — Clara's Safety Platform
Real threat detection with free public threat feeds
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import httpx
import asyncio
import json
import os
import re
import hashlib
from datetime import datetime

app = FastAPI(title="GISA — Clara's Safety Platform", version="2.0.0")

# Allow Chrome extension to talk to this API
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── In-memory blocklist (loads from free threat feeds) ─────────────────────
BLOCKLIST: set = set()
LAST_UPDATED = None

# ── Known bad keywords and patterns ───────────────────────────────────────
TRAFFICKING_SIGNALS = [
    "escort", "massage-parlor", "happy-ending", "girls-for-hire",
    "boys-for-hire", "rent-a-girl", "companionship-service",
]

SCAM_SIGNALS = [
    "free-iphone", "you-won", "claim-prize", "winner-selected",
    "lottery-winner", "send-money", "wire-transfer-urgent",
    "nigerian-prince", "inheritance-claim",
]

MALWARE_SIGNALS = [
    "malware", "exploit", "ransomware", "trojan", "botnet",
    "payload", "dropper", "c2-server", "command-control",
]

PHISHING_SIGNALS = [
    "paypal-secure", "apple-id-verify", "microsoft-login-verify",
    "amazon-account-suspended", "bank-verify-account",
    "netflix-payment-failed", "instagram-verify",
    "account-suspended-verify", "login-confirm-secure",
]

DARK_WEB_SIGNALS = [
    "darkmarket", "dark-market", "blackmarket", "black-market",
    "onion-shop", "hidden-service", "tor-market",
    "drugs-online", "weapons-online", "stolen-cards",
    "hitman", "murder-for-hire", "illegal-guns",
]

# Suspicious TLDs often used by bad actors
RISKY_TLDS = {".ru", ".cc", ".biz", ".tk", ".gq", ".ml", ".cf", ".ga", ".pw"}

# Trusted safe domains - never block these
SAFE_DOMAINS = {
    "google.com", "youtube.com", "wikipedia.org", "khanacademy.org",
    "apple.com", "microsoft.com", "amazon.com", "facebook.com",
    "instagram.com", "twitter.com", "reddit.com", "github.com",
    "stackoverflow.com", "cloudflare.com", "netflix.com",
    "spotify.com", "zoom.us", "slack.com", "discord.com",
    "nih.gov", "cdc.gov", "who.int", "bbc.com", "nytimes.com",
    "reuters.com", "apnews.com", "npr.org", "webmd.com",
}


def normalise(domain: str) -> str:
    """Clean up a domain name"""
    d = domain.lower().strip()
    d = d.replace("https://", "").replace("http://", "")
    d = d.split("/")[0].split("?")[0]
    d = d.removeprefix("www.")
    return d


def score_domain(domain: str) -> tuple[float, str, list[str]]:
    """
    Score a domain 0-100 for threat likelihood.
    Returns (score, category, reasons)
    """
    domain = normalise(domain)
    reasons = []
    score = 0.0
    category = "safe"

    # Never block safe domains
    if domain in SAFE_DOMAINS:
        return 0.0, "safe", ["trusted domain"]

    # Check in-memory blocklist (from threat feeds)
    domain_hash = hashlib.sha256(domain.encode()).hexdigest()
    if domain in BLOCKLIST or domain_hash in BLOCKLIST:
        return 100.0, "known_threat", ["confirmed threat — in blocklist"]

    # Check for trafficking signals
    for signal in TRAFFICKING_SIGNALS:
        if signal in domain:
            score += 45
            category = "trafficking"
            reasons.append(f"trafficking signal: {signal}")
            break

    # Check for dark web / black market signals
    for signal in DARK_WEB_SIGNALS:
        if signal in domain:
            score += 50
            category = "darkmarket"
            reasons.append(f"dark market signal: {signal}")
            break

    # Check for phishing signals
    for signal in PHISHING_SIGNALS:
        if signal in domain:
            score += 40
            category = "phishing"
            reasons.append(f"phishing pattern: {signal}")
            break

    # Check for malware signals
    for signal in MALWARE_SIGNALS:
        if signal in domain:
            score += 45
            category = "malware"
            reasons.append(f"malware signal: {signal}")
            break

    # Check for scam signals
    for signal in SCAM_SIGNALS:
        if signal in domain:
            score += 35
            category = "scam"
            reasons.append(f"scam signal: {signal}")
            break

    # Risky TLD
    tld = "." + domain.split(".")[-1]
    if tld in RISKY_TLDS:
        score += 20
        reasons.append(f"risky domain extension: {tld}")

    # Brand impersonation (fake versions of trusted sites)
    trusted_brands = ["paypal", "apple", "google", "microsoft", "amazon",
                      "netflix", "facebook", "instagram", "bank", "chase"]
    for brand in trusted_brands:
        if brand in domain and f"{brand}.com" != domain and f"www.{brand}.com" != domain:
            score += 35
            category = "phishing"
            reasons.append(f"impersonating: {brand}")
            break

    # Very long domain = suspicious
    if len(domain) > 40:
        score += 10
        reasons.append("unusually long domain")

    # Many hyphens = suspicious
    if domain.count("-") >= 3:
        score += 10
        reasons.append("many hyphens in domain")

    # Number patterns mixed with brands
    if re.search(r'(paypal|apple|google|bank|amazon)\d+', domain):
        score += 25
        category = "phishing"
        reasons.append("brand name mixed with numbers")

    score = min(score, 100.0)

    if score >= 70:
        if category == "safe":
            category = "suspicious"
    elif score >= 40:
        if category == "safe":
            category = "suspicious"
    else:
        category = "safe"

    return round(score, 1), category, reasons


async def load_threat_feeds():
    """
    Load free public threat feeds into memory.
    These are real databases of known bad domains.
    """
    global BLOCKLIST, LAST_UPDATED
    count = 0

    async with httpx.AsyncClient(timeout=30) as client:

        # Spamhaus Domain Block List (free)
        try:
            r = await client.get("https://www.spamhaus.org/drop/dbl.txt",
                                  headers={"User-Agent": "GISA-Safety/2.0"})
            for line in r.text.splitlines():
                line = line.strip()
                if line and not line.startswith(";") and not line.startswith("#"):
                    BLOCKLIST.add(line.split()[0].lower())
                    count += 1
        except Exception as e:
            print(f"Spamhaus feed failed: {e}")

        # URLhaus malware URLs (free from abuse.ch)
        try:
            r = await client.post("https://urlhaus-api.abuse.ch/v1/urls/recent/limit/500/",
                                   timeout=30)
            data = r.json()
            for entry in (data.get("urls") or []):
                url = entry.get("url", "")
                if url:
                    domain = url.split("//")[-1].split("/")[0].removeprefix("www.")
                    if domain:
                        BLOCKLIST.add(domain.lower())
                        count += 1
        except Exception as e:
            print(f"URLhaus feed failed: {e}")

    LAST_UPDATED = datetime.utcnow().isoformat()
    print(f"[GISA] Threat feeds loaded: {count} domains in blocklist")
    return count


# ── Startup: load threat feeds ─────────────────────────────────────────────
@app.on_event("startup")
async def startup():
    print("[GISA] Starting up — loading threat feeds...")
    asyncio.create_task(load_threat_feeds())
    # Refresh feeds every 6 hours
    asyncio.create_task(refresh_feeds_loop())


async def refresh_feeds_loop():
    while True:
        await asyncio.sleep(6 * 3600)
        print("[GISA] Refreshing threat feeds...")
        await load_threat_feeds()


# ── API Endpoints ──────────────────────────────────────────────────────────

@app.get("/health")
async def health():
    return {
        "status": "ok",
        "service": "GISA — Clara's Safety Platform",
        "version": "2.0.0",
        "blocklist_size": len(BLOCKLIST),
        "feeds_last_updated": LAST_UPDATED,
        "message": "Protecting against trafficking, scams, phishing and malware"
    }


@app.get("/v1/scan")
async def scan(domain: str = "unknown"):
    """
    Scan a domain and return a safety verdict.
    Called by the Chrome extension on every page visit.
    """
    clean = normalise(domain)
    score, category, reasons = score_domain(clean)

    if score >= 70:
        verdict = "blocked"
        message = f"⛔ Blocked — {category.replace('_', ' ').title()}"
    elif score >= 40:
        verdict = "warn"
        message = f"⚠️ Be careful — this site looks suspicious"
    else:
        verdict = "allowed"
        message = "✅ Looks safe"

    return {
        "domain": clean,
        "verdict": verdict,
        "risk_score": score,
        "category": category,
        "reasons": reasons,
        "message": message,
        "blocklist_size": len(BLOCKLIST),
    }


@app.get("/v1/stats")
async def stats():
    """How many domains are we protecting against?"""
    return {
        "blocklist_domains": len(BLOCKLIST),
        "last_updated": LAST_UPDATED,
        "categories_detected": [
            "trafficking", "darkmarket", "phishing",
            "malware", "scam", "suspicious"
        ]
    }


@app.post("/v1/report")
async def report(domain: str, reason: str = "suspicious"):
    """Anyone can report a suspicious domain"""
    clean = normalise(domain)
    BLOCKLIST.add(clean)
    print(f"[GISA] User reported domain: {clean} — reason: {reason}")
    return {
        "ok": True,
        "message": f"Thanks! {clean} has been added to your local blocklist.",
        "domain": clean
    }
