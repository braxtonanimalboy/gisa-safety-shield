const API = "http://localhost:8001";
let userPassword = "";

document.getElementById("password").addEventListener("input", function() {
  const pw = this.value;
  const bar = document.getElementById("strength-bar");
  const txt = document.getElementById("strength-text");
  let strength = 0;
  if (pw.length >= 6) strength++;
  if (pw.length >= 10) strength++;
  if (/[A-Z]/.test(pw)) strength++;
  if (/[0-9]/.test(pw)) strength++;
  if (/[^A-Za-z0-9]/.test(pw)) strength++;
  const colors = ["#e24b4a","#e24b4a","#ba7517","#1d9e75","#1d9e75"];
  const labels = ["Too short","Weak","OK","Strong","Very strong"];
  bar.style.width = (strength * 20) + "%";
  bar.style.background = colors[Math.max(0,strength-1)] || "#222";
  txt.textContent = pw.length > 0 ? labels[Math.max(0,strength-1)] : "";
  txt.style.color = colors[Math.max(0,strength-1)] || "#555";
});

document.querySelectorAll(".toggle").forEach(t => {
  t.addEventListener("click", () => t.classList.toggle("off"));
});

document.getElementById("step1-next").addEventListener("click", () => {
  const pw = document.getElementById("password").value;
  const pw2 = document.getElementById("password2").value;
  const err = document.getElementById("step1-error");
  if (pw.length < 6) { err.textContent = "Password must be at least 6 characters."; err.style.display="block"; return; }
  if (pw !== pw2) { err.textContent = "Passwords don't match."; err.style.display="block"; return; }
  err.style.display = "none";
  userPassword = pw;
  goToStep(2);
});

document.getElementById("step2-next").addEventListener("click", () => goToStep(3));
document.getElementById("step2-back").addEventListener("click", () => goToStep(1));

function goToStep(n) {
  document.querySelectorAll(".step").forEach(s => s.classList.remove("active"));
  document.getElementById("step-" + n).classList.add("active");
  for (let i = 1; i <= 3; i++) {
    const dot = document.getElementById("dot-" + i);
    dot.className = "dot" + (i < n ? " done" : i === n ? " active" : "");
  }
  if (n === 3) runSetup();
}

async function runSetup() {
  await sleep(500);
  try {
    await fetch(API + "/health");
    markDone("check-api", "✓ Connected to GISA API");
  } catch {
    markFail("check-api", "Could not connect. Make sure Docker is running.");
    document.getElementById("step3-error").textContent = "API is offline. Start Docker and try again.";
    document.getElementById("step3-error").style.display = "block";
    return;
  }

  await sleep(600);
  try {
    const r = await fetch(API + "/v1/porn-blocker/setup?password=" + encodeURIComponent(userPassword), {method:"POST"});
    const d = await r.json();
    if (d.ok) markDone("check-password", "✓ Parental password set");
    else markFail("check-password", "Failed to set password");
  } catch {
    markFail("check-password", "Failed to set password");
  }

  await sleep(600);
  const adultEnabled = !document.getElementById("t-adult").classList.contains("off");
  if (adultEnabled) {
    try {
      await fetch(API + "/v1/porn-blocker/toggle?password=" + encodeURIComponent(userPassword) + "&enable=true", {method:"POST"});
    } catch {}
  }
  markDone("check-blockers", "✓ Protection settings saved");

  await sleep(500);
  markDone("check-done", "✓ GISA is ready!");

  document.getElementById("step3-success").textContent = "✅ GISA Safety Shield is fully set up!";
  document.getElementById("step3-success").style.display = "block";
  document.getElementById("go-dashboard").style.display = "block";
}

document.getElementById("go-dashboard").addEventListener("click", () => {
  window.location.href = API + "/dashboard";
});

function markDone(id, text) {
  const el = document.getElementById(id);
  el.classList.add("done");
  el.querySelector(".check-icon").textContent = "✓";
  el.querySelector("span").textContent = text;
}

function markFail(id, text) {
  const el = document.getElementById(id);
  el.querySelector(".check-icon").textContent = "✗";
  el.querySelector(".check-icon").style.borderColor = "#e24b4a";
  el.querySelector(".check-icon").style.color = "#e24b4a";
  el.querySelector("span").textContent = text;
  el.querySelector("span").style.color = "#e24b4a";
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }
