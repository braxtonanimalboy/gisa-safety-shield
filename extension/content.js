const API = "http://localhost:8001";
const scanned = new Set();

const GROOMING_PHRASES = [
  "don't tell your parents","keep this between us","you're so mature for your age",
  "send me a photo","you're special","meet me in person","i won't tell anyone",
  "delete this message","our little secret","how old are you really"
];
const SCAM_PHRASES = [
  "you have been selected","claim your prize","you won","send gift card",
  "wire transfer","western union","act now limited time","guaranteed profit",
  "make money from home"
];
const TRAFFICKING_PHRASES = [
  "make easy money","travel expenses paid","no experience needed",
  "modeling opportunity","earn cash fast","discreet work available"
];

async function scanPageLinks() {
  const links = document.querySelectorAll("a[href]");
  for (const link of links) {
    const href = link.href;
    if (!href || !href.startsWith("http")) continue;
    let domain;
    try { domain = new URL(href).hostname.replace("www.",""); } catch { continue; }
    if (scanned.has(domain)) continue;
    if (domain === window.location.hostname.replace("www.","")) continue;
    scanned.add(domain);
    try {
      const resp = await fetch(`${API}/v1/scan?domain=${encodeURIComponent(domain)}`);
      const result = await resp.json();
      if (result.verdict === "blocked") markDangerousLink(link, result);
    } catch {}
    await sleep(100);
  }
}

function scanPageContent() {
  const text = document.body ? document.body.innerText.toLowerCase() : "";
  if (!text) return;
  let dangerFound=false, dangerType="", dangerPhrase="";
  for (const phrase of GROOMING_PHRASES) {
    if (text.includes(phrase.toLowerCase())) { dangerFound=true; dangerType="grooming"; dangerPhrase=phrase; break; }
  }
  if (!dangerFound) {
    for (const phrase of TRAFFICKING_PHRASES) {
      if (text.includes(phrase.toLowerCase())) { dangerFound=true; dangerType="trafficking"; dangerPhrase=phrase; break; }
    }
  }
  if (!dangerFound) {
    for (const phrase of SCAM_PHRASES) {
      if (text.includes(phrase.toLowerCase())) { dangerFound=true; dangerType="scam"; dangerPhrase=phrase; break; }
    }
  }
  if (dangerFound) showPageWarning(dangerType, dangerPhrase);
}

function showPageWarning(type, phrase) {
  if (window.location.href.includes("blocked.html")) return;
  if (document.getElementById("gisa-warning-banner")) return;

  const banner = document.createElement("div");
  banner.id = "gisa-warning-banner";
  banner.style.cssText = "position:fixed;top:0;left:0;right:0;z-index:999999;background:#e24b4a;color:white;padding:12px 20px;font-family:-apple-system,sans-serif;font-size:14px;font-weight:600;display:flex;align-items:center;justify-content:space-between;box-shadow:0 2px 10px rgba(0,0,0,0.3);";

  const msg = document.createElement("span");
  msg.textContent = `🛡 GISA WARNING: This page contains ${type} signals — "${phrase}"`;

  const btn = document.createElement("button");
  btn.textContent = "Dismiss";
  btn.style.cssText = "background:transparent;border:1px solid white;color:white;padding:4px 10px;border-radius:4px;cursor:pointer;font-size:12px;font-weight:600;";
  btn.addEventListener("click", function() {
    banner.remove();
  });

  banner.appendChild(msg);
  banner.appendChild(btn);
  document.body.prepend(banner);
}

function markDangerousLink(link, result) {
  if (link.dataset.gisaMarked) return;
  link.dataset.gisaMarked = "true";
  const badge = document.createElement("span");
  badge.style.cssText = "display:inline-block;margin-left:4px;padding:1px 6px;background:#e24b4a;color:white;font-size:10px;font-family:monospace;font-weight:bold;border-radius:3px;vertical-align:middle;cursor:default;";
  badge.textContent = "⚠ BLOCKED";
  badge.title = `GISA: ${result.category} — Risk ${result.risk_score}/100`;
  link.appendChild(badge);
  link.style.opacity = "0.6";
}

function sleep(ms) { return new Promise(resolve => setTimeout(resolve, ms)); }

document.addEventListener("DOMContentLoaded", () => {
  scanPageLinks();
  setTimeout(scanPageContent, 1500);
});
setTimeout(scanPageLinks, 2000);
setTimeout(scanPageContent, 3000);
