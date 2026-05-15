const params   = new URLSearchParams(window.location.search);
const domain   = params.get("domain")   || "unknown";
const category = params.get("category") || "threat";
const score    = parseInt(params.get("score") || "0");
let reasons    = [];
try { reasons  = JSON.parse(params.get("reasons") || "[]"); } catch {}

document.getElementById("domain-display").textContent = domain;
document.getElementById("score-display").textContent  = score + "/100";
setTimeout(function() {
  document.getElementById("bar-fill").style.width = score + "%";
}, 200);

var catNames = {
  trafficking: "⚠️ Human Trafficking",
  grooming:    "🚨 Predatory / Grooming",
  darkmarket:  "🚨 Dark Marketplace",
  phishing:    "⚠️ Phishing Scam",
  scam:        "⚠️ Scam Site",
  malware:     "🚨 Malware",
  threat:      "⚠️ Threat Detected"
};
document.getElementById("badge").textContent = catNames[category] || "⚠️ Threat Detected";

if (category === "trafficking" || category === "grooming") {
  document.getElementById("hotline").style.display = "block";
}

if (reasons.length > 0) {
  document.getElementById("reasons-box").style.display = "block";
  var list = document.getElementById("reasons-list");
  reasons.forEach(function(r) {
    var div = document.createElement("div");
    div.className = "reason";
    div.textContent = "• " + r;
    list.appendChild(div);
  });
}

document.getElementById("btn-back").addEventListener("click", function() {
  window.location.href = "https://www.google.com";
});

document.getElementById("btn-report").addEventListener("click", function() {
  fetch("http://localhost:8001/v1/report?domain=" + encodeURIComponent(domain) + "&reason=" + encodeURIComponent(category), { method: "POST" }).catch(function() {});
  alert("Thank you! " + domain + " has been reported to GISA.");
});
