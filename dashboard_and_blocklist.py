# ── PASTE THIS AT THE BOTTOM OF main.py (replace existing /dashboard and /blocklist endpoints) ──

@app.get("/blocklist", response_class=HTMLResponse)
async def blocklist_page():
    return """<!DOCTYPE html>
<html><head><title>GISA — My Blocked Sites</title><meta charset="UTF-8">
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:-apple-system,sans-serif;background:#0a0a0a;color:#fff;min-height:100vh}
.header{background:#111;border-bottom:1px solid #1a1a1a;padding:20px 32px;display:flex;align-items:center;justify-content:space-between}
.header h1{font-size:20px;font-weight:700}
.header p{font-size:12px;color:#555;margin-top:2px;font-family:monospace}
.back-btn{background:#1a1a1a;color:#888;border:1px solid #333;border-radius:8px;padding:8px 16px;font-size:13px;cursor:pointer;text-decoration:none}
.container{max-width:700px;margin:0 auto;padding:32px}
.add-card{background:#111;border-radius:14px;padding:24px;border:1px solid #1a1a1a;margin-bottom:24px}
.add-card h2{font-size:14px;font-weight:600;margin-bottom:16px;color:#888;font-family:monospace;text-transform:uppercase;letter-spacing:0.05em}
.add-row{display:flex;gap:10px}
.add-input{flex:1;background:#0a0a0a;border:1px solid #333;border-radius:8px;color:#fff;padding:10px 14px;font-size:14px;outline:none;transition:border-color 0.2s}
.add-input:focus{border-color:#e24b4a}
.add-btn{background:#e24b4a;color:#fff;border:none;border-radius:8px;padding:10px 20px;font-size:14px;font-weight:700;cursor:pointer;white-space:nowrap}
.add-btn:hover{background:#c0392b}
.stats-row{display:flex;gap:12px;margin-bottom:24px}
.stat-pill{background:#111;border:1px solid #1a1a1a;border-radius:8px;padding:10px 16px;font-size:13px;color:#555;font-family:monospace}
.stat-pill span{color:#fff;font-weight:700}
.domain-list{background:#111;border-radius:14px;border:1px solid #1a1a1a;overflow:hidden}
.domain-item{display:flex;align-items:center;justify-content:space-between;padding:14px 20px;border-bottom:1px solid #1a1a1a;transition:background 0.15s}
.domain-item:last-child{border-bottom:none}
.domain-item:hover{background:#1a1a1a}
.domain-left{display:flex;align-items:center;gap:12px}
.block-icon{width:32px;height:32px;background:#2a0000;border-radius:8px;display:flex;align-items:center;justify-content:center;font-size:16px}
.domain-name{font-family:monospace;font-size:14px;font-weight:600}
.domain-meta{font-size:11px;color:#555;margin-top:2px}
.remove-btn{background:transparent;border:1px solid #333;color:#555;border-radius:6px;padding:6px 14px;font-size:12px;cursor:pointer;transition:all 0.15s;font-weight:600}
.remove-btn:hover{border-color:#e24b4a;color:#e24b4a;background:#2a0000}
.empty{padding:48px;text-align:center;color:#333}
.empty-icon{font-size:48px;margin-bottom:16px}
.empty-text{font-size:15px;margin-bottom:8px;color:#555}
.empty-sub{font-size:13px;color:#333}
.toast{position:fixed;bottom:24px;right:24px;background:#1d9e75;color:#fff;padding:12px 20px;border-radius:10px;font-size:14px;font-weight:600;opacity:0;transition:opacity 0.3s;pointer-events:none}
.toast.show{opacity:1}
</style>
</head>
<body>
<div class="header">
  <div>
    <h1>🚫 My Blocked Sites</h1>
    <p>Custom sites you've blocked — saved permanently</p>
  </div>
  <a href="/dashboard" class="back-btn">← Dashboard</a>
</div>
<div class="container">
  <div class="add-card">
    <h2>Block a New Site</h2>
    <div class="add-row">
      <input class="add-input" id="add-input" placeholder="Enter domain (e.g. tiktok.com, reddit.com)" />
      <button class="add-btn" id="add-btn">+ Block Site</button>
    </div>
  </div>
  <div class="stats-row">
    <div class="stat-pill">Custom blocks: <span id="total-count">0</span></div>
    <div class="stat-pill">Status: <span style="color:#1d9e75">Active</span></div>
  </div>
  <div class="domain-list" id="domain-list">
    <div class="empty"><div class="empty-icon">🛡</div><div class="empty-text">No custom blocks yet</div><div class="empty-sub">Add a site above to block it instantly</div></div>
  </div>
</div>
<div class="toast" id="toast"></div>
<script>
function showToast(msg, color) {
  const t = document.getElementById("toast");
  t.textContent = msg;
  t.style.background = color || "#1d9e75";
  t.classList.add("show");
  setTimeout(() => t.classList.remove("show"), 2500);
}

async function loadList() {
  try {
    const r = await fetch("/v1/custom-blocklist");
    const data = await r.json();
    document.getElementById("total-count").textContent = data.total;
    const list = document.getElementById("domain-list");
    if (!data.domains || data.domains.length === 0) {
      list.innerHTML = '<div class="empty"><div class="empty-icon">🛡</div><div class="empty-text">No custom blocks yet</div><div class="empty-sub">Add a site above to block it instantly</div></div>';
      return;
    }
    list.innerHTML = data.domains.map(d =>
      '<div class="domain-item" id="item-' + encodeURIComponent(d) + '">' +
      '<div class="domain-left"><div class="block-icon">🚫</div><div><div class="domain-name">' + d + '</div><div class="domain-meta">Blocked by you</div></div></div>' +
      '<button class="remove-btn" data-domain="' + d + '">Unblock</button>' +
      '</div>'
    ).join("");
    document.querySelectorAll(".remove-btn").forEach(btn => {
      btn.addEventListener("click", () => removeDomain(btn.dataset.domain));
    });
  } catch(e) {
    document.getElementById("domain-list").innerHTML = '<div class="empty"><div class="empty-text">Could not connect to GISA API</div><div class="empty-sub">Make sure Docker is running</div></div>';
  }
}

async function removeDomain(domain) {
  const item = document.getElementById("item-" + encodeURIComponent(domain));
  if (item) { item.style.opacity = "0.4"; item.style.pointerEvents = "none"; }
  await fetch("/v1/custom-block?domain=" + encodeURIComponent(domain), {method:"DELETE"});
  showToast("✅ " + domain + " unblocked!", "#1d9e75");
  loadList();
}

document.getElementById("add-btn").addEventListener("click", async () => {
  const val = document.getElementById("add-input").value.trim().replace("www.","").split("/")[0];
  if (!val || !val.includes(".")) { showToast("Enter a valid domain (e.g. tiktok.com)", "#e24b4a"); return; }
  await fetch("/v1/custom-block?domain=" + encodeURIComponent(val), {method:"POST"});
  document.getElementById("add-input").value = "";
  showToast("🚫 " + val + " blocked!", "#e24b4a");
  loadList();
});

document.getElementById("add-input").addEventListener("keypress", e => {
  if (e.key === "Enter") document.getElementById("add-btn").click();
});

loadList();
</script>
</body></html>"""
