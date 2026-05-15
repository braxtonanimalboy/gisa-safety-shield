// GISA Safety Shield — Background Service Worker
const API = "http://localhost:8001";
const CACHE = new Map();
const CACHE_TTL = 1000 * 60 * 30;
const SERIOUS_CATEGORIES = ["trafficking","grooming","sextortion","darkmarket","extremism"];

let stats = {blocked:0, scanned:0, warnings:0};
chrome.storage.local.get("stats", (data) => { if (data.stats) stats = data.stats; });

// ── AUTO OPEN SETUP ON FIRST INSTALL ─────────────────────────────────────────
chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === "install") {
    // First time install — open setup wizard
    chrome.tabs.create({ url: chrome.runtime.getURL("setup.html") });
  } else if (details.reason === "update") {
    // Updated — open dashboard to show what's new
    chrome.tabs.create({ url: "http://localhost:8001/dashboard" });
  }
});

// ── MAIN SCANNER ──────────────────────────────────────────────────────────────
chrome.webNavigation.onBeforeNavigate.addListener(async (details) => {
  if (details.frameId !== 0) return;
  if (!details.url.startsWith("http")) return;
  if (details.url.includes("blocked.html")) return;
  if (details.url.includes("setup.html")) return;

  let domain;
  try { domain = new URL(details.url).hostname.replace("www.",""); } catch { return; }

  const cached = CACHE.get(domain);
  if (cached && Date.now() - cached.time < CACHE_TTL) {
    if (cached.result.verdict === "blocked") blockTab(details.tabId, domain, cached.result);
    return;
  }

  try {
    const response = await fetch(`${API}/v1/scan?domain=${encodeURIComponent(domain)}`);
    const result = await response.json();
    CACHE.set(domain, {result, time: Date.now()});
    stats.scanned++;

    if (result.verdict === "blocked") {
      stats.blocked++;
      saveStats();
      blockTab(details.tabId, domain, result);
    } else if (result.verdict === "warning") {
      stats.warnings++;
      saveStats();
      showWarningNotification(domain, result);
    }
  } catch(err) {
    console.log("GISA API unavailable:", domain);
  }
});

function blockTab(tabId, domain, result) {
  const blockedUrl = chrome.runtime.getURL("blocked.html") +
    `?domain=${encodeURIComponent(domain)}` +
    `&category=${encodeURIComponent(result.category||"threat")}` +
    `&score=${encodeURIComponent(result.risk_score||0)}` +
    `&reasons=${encodeURIComponent(JSON.stringify(result.reasons||[]))}`;
  chrome.tabs.update(tabId, {url: blockedUrl});
  chrome.notifications.create({
    type:"basic", iconUrl:"icons/icon48.png",
    title:"🛡 GISA Blocked a Threat",
    message:`Blocked: ${domain} (${result.category})`,
  });
}

function showWarningNotification(domain, result) {
  chrome.notifications.create({
    type:"basic", iconUrl:"icons/icon48.png",
    title:"⚠️ GISA Warning",
    message:`${domain} looks suspicious. Be careful.`,
  });
}

function saveStats() { chrome.storage.local.set({stats}); }

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.type === "GET_STATS") { sendResponse(stats); }
  if (msg.type === "SCAN_DOMAIN") {
    fetch(`${API}/v1/scan?domain=${encodeURIComponent(msg.domain)}`)
      .then(r => r.json())
      .then(result => sendResponse(result))
      .catch(() => sendResponse({verdict:"unknown",message:"API offline"}));
    return true;
  }
});
