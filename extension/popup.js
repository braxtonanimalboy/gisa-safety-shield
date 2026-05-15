const API = "http://localhost:8001";
let currentDomain = "";
let currentlyBlocked = false;

chrome.runtime.sendMessage({type:"GET_STATS"}, (stats) => {
  if (stats) {
    document.getElementById("stat-blocked").textContent  = stats.blocked  || 0;
    document.getElementById("stat-scanned").textContent  = stats.scanned  || 0;
    document.getElementById("stat-warnings").textContent = stats.warnings || 0;
  }
});

chrome.tabs.query({active:true, currentWindow:true}, async (tabs) => {
  const tab = tabs[0];
  if (!tab || !tab.url || !tab.url.startsWith("http")) {
    document.getElementById("current-domain").textContent = "—";
    document.getElementById("block-site-btn").style.display = "none";
    return;
  }
  try { currentDomain = new URL(tab.url).hostname.replace("www.",""); } catch { return; }
  document.getElementById("current-domain").textContent = currentDomain;
  document.getElementById("scan-input").placeholder = currentDomain;

  try {
    const resp = await fetch(`${API}/v1/scan?domain=${encodeURIComponent(currentDomain)}`);
    const result = await resp.json();
    const verdictEl = document.getElementById("current-verdict");
    const colors = {blocked:"#e24b4a", warning:"#ba7517", allowed:"#1d9e75"};
    const labels = {blocked:"🚫 BLOCKED", warning:"⚠️ WARNING", allowed:"✅ SAFE"};
    verdictEl.textContent = labels[result.verdict] || "—";
    verdictEl.style.color = colors[result.verdict] || "#888";

    const btn = document.getElementById("block-site-btn");
    btn.style.display = "block";
    if (result.category === "custom_block") {
      currentlyBlocked = true;
      btn.textContent = "✅ Unblock Site";
      btn.className = "block-site-btn unblock";
    } else {
      currentlyBlocked = false;
      btn.textContent = "🚫 Block Site";
      btn.className = "block-site-btn block";
    }
  } catch {
    document.getElementById("current-verdict").textContent = "API offline";
    document.getElementById("block-site-btn").style.display = "none";
  }
});

// Block/Unblock button
document.getElementById("block-site-btn").addEventListener("click", async () => {
  if (!currentDomain) return;
  const btn = document.getElementById("block-site-btn");
  const verdictEl = document.getElementById("current-verdict");

  if (currentlyBlocked) {
    // Unblock
    await fetch(`${API}/v1/custom-block?domain=${encodeURIComponent(currentDomain)}`, {method:"DELETE"});
    btn.textContent = "🚫 Block Site";
    btn.className = "block-site-btn block";
    currentlyBlocked = false;
    verdictEl.textContent = "✅ UNBLOCKED";
    verdictEl.style.color = "#1d9e75";
  } else {
    // Block immediately
    await fetch(`${API}/v1/custom-block?domain=${encodeURIComponent(currentDomain)}`, {method:"POST"});
    btn.textContent = "✅ Unblock Site";
    btn.className = "block-site-btn unblock";
    currentlyBlocked = true;
    verdictEl.textContent = "🚫 BLOCKED BY YOU";
    verdictEl.style.color = "#e24b4a";

    // Close popup and redirect current tab to blocked page
    chrome.tabs.query({active:true, currentWindow:true}, (tabs) => {
      if (tabs[0]) {
        const blockedUrl = chrome.runtime.getURL("blocked.html") +
          "?domain=" + encodeURIComponent(currentDomain) +
          "&category=custom_block&score=100" +
          "&reasons=" + encodeURIComponent(JSON.stringify(["🚫 Blocked by you"]));
        chrome.tabs.update(tabs[0].id, {url: blockedUrl});
      }
    });
    window.close();
  }
});

// API status
fetch(`${API}/health`).then(r => r.json()).then(() => {
  const el = document.getElementById("api-status");
  el.textContent = "● API online";
  el.className = "api-status api-online";
}).catch(() => {
  document.getElementById("api-status").textContent = "● API offline";
  document.getElementById("api-status").className = "api-status api-offline";
  document.getElementById("status-text").textContent = "API OFFLINE";
});

// Scan button
document.getElementById("scan-btn").addEventListener("click", scanDomain);
document.getElementById("scan-input").addEventListener("keypress", (e) => { if (e.key==="Enter") scanDomain(); });

async function scanDomain() {
  const input = document.getElementById("scan-input").value.trim() || currentDomain;
  const result_el = document.getElementById("scan-result");
  result_el.style.display = "block";
  result_el.className = "scan-result result-unknown";
  result_el.textContent = "Scanning...";
  try {
    const resp = await fetch(`${API}/v1/scan?domain=${encodeURIComponent(input)}`);
    const result = await resp.json();
    const classes = {blocked:"result-blocked", warning:"result-warning", allowed:"result-allowed"};
    const icons   = {blocked:"🚫", warning:"⚠️", allowed:"✅"};
    result_el.className = `scan-result ${classes[result.verdict]||"result-unknown"}`;
    let text = `${icons[result.verdict]||"?"} ${result.verdict.toUpperCase()} — ${result.message}`;
    if (result.category && result.category!=="safe") text += `\nCategory: ${result.category}`;
    if (result.risk_score>0) text += `\nRisk: ${result.risk_score}/100`;
    if (result.reasons && result.reasons.length>0) text += `\n${result.reasons[0]}`;
    result_el.textContent = text;
  } catch {
    result_el.className = "scan-result result-unknown";
    result_el.textContent = "Could not connect to GISA API.";
  }
}

// Nav buttons
document.getElementById("open-dashboard").addEventListener("click", () => { chrome.tabs.create({url:"http://localhost:8001/dashboard"}); });
document.getElementById("open-blocklist").addEventListener("click", () => { chrome.tabs.create({url:"http://localhost:8001/blocklist"}); });
document.getElementById("open-setup").addEventListener("click", () => { chrome.tabs.create({url:chrome.runtime.getURL("setup.html")}); });
