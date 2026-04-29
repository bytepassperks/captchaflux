/**
 * CaptchaFlux Extension Popup Script
 */

document.addEventListener("DOMContentLoaded", async () => {
  const loginView = document.getElementById("loginView");
  const mainView = document.getElementById("mainView");
  const statusDot = document.getElementById("statusDot");

  // Login elements
  const apiKeyInput = document.getElementById("apiKeyInput");
  const loginBtn = document.getElementById("loginBtn");
  const loginBtnText = document.getElementById("loginBtnText");
  const loginSpinner = document.getElementById("loginSpinner");
  const loginError = document.getElementById("loginError");

  // Main elements
  const enableToggle = document.getElementById("enableToggle");
  const toggleSubtitle = document.getElementById("toggleSubtitle");
  const tierBadge = document.getElementById("tierBadge");
  const tierEmail = document.getElementById("tierEmail");
  const usageText = document.getElementById("usageText");
  const usageBarFill = document.getElementById("usageBarFill");
  const featuresList = document.getElementById("featuresList");
  const logoutBtn = document.getElementById("logoutBtn");

  // Stats
  const statDetected = document.getElementById("statDetected");
  const statSolved = document.getElementById("statSolved");
  const statFailed = document.getElementById("statFailed");
  const statLatency = document.getElementById("statLatency");

  const FEATURE_LABELS = {
    detection: "Detection",
    ocr_solve: "OCR Solve",
    vision_solve: "Vision AI",
    audio_solve: "Audio Solve",
    engine_racing: "Engine Racing",
    browser_pool: "Browser Pool",
    token_harvest: "Token Harvest",
    behavior_solve: "Behavior Sim",
    adaptive_routing: "Adaptive Routing",
    analytics_export: "Analytics",
    basic_support: "Basic Support",
    priority_support: "Priority Support",
    dedicated_support: "Dedicated Support",
  };

  // Check current status
  const status = await sendMessage({ type: "GET_STATUS" });
  const stats = await sendMessage({ type: "GET_STATS" });

  if (status?.authenticated) {
    showMainView(status, stats);
  } else {
    showLoginView();
  }

  // Login handler
  loginBtn.addEventListener("click", async () => {
    const apiKey = apiKeyInput.value.trim();
    if (!apiKey) {
      showError("Please enter your API key");
      return;
    }

    setLoginLoading(true);
    loginError.classList.add("hidden");

    const result = await sendMessage({
      type: "AUTHENTICATE",
      data: { apiKey },
    });

    setLoginLoading(false);

    if (result?.success) {
      const newStatus = await sendMessage({ type: "GET_STATUS" });
      const newStats = await sendMessage({ type: "GET_STATS" });
      showMainView(newStatus, newStats);
    } else {
      showError(result?.error || "Authentication failed");
    }
  });

  // Enter key on input
  apiKeyInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") loginBtn.click();
  });

  // Toggle handler
  enableToggle.addEventListener("change", async () => {
    const enabled = enableToggle.checked;
    await sendMessage({
      type: "TOGGLE_ENABLED",
      data: { enabled },
    });
    updateToggleUI(enabled);
  });

  // Logout handler
  logoutBtn.addEventListener("click", async () => {
    await sendMessage({ type: "LOGOUT" });
    showLoginView();
  });

  // Functions
  function showLoginView() {
    loginView.classList.remove("hidden");
    mainView.classList.add("hidden");
    statusDot.className = "status-dot inactive";
    apiKeyInput.value = "";
    loginError.classList.add("hidden");
  }

  function showMainView(status, stats) {
    loginView.classList.add("hidden");
    mainView.classList.remove("hidden");

    // Toggle
    enableToggle.checked = status.enabled;
    updateToggleUI(status.enabled);

    // Tier
    const tier = status.tier || "starter";
    tierBadge.textContent = tier.charAt(0).toUpperCase() + tier.slice(1);
    tierBadge.className = `tier-badge ${tier}`;
    tierEmail.textContent = status.email || "—";

    // Usage
    const usage = status.usage || { used: 0, limit: 10000 };
    usageText.textContent = `${usage.used.toLocaleString()} / ${usage.limit.toLocaleString()}`;
    const pct = Math.min((usage.used / usage.limit) * 100, 100);
    usageBarFill.style.width = `${pct}%`;

    // Features
    const features = status.features || [];
    featuresList.innerHTML = features
      .map((f) => `<span class="feature-tag">${FEATURE_LABELS[f] || f}</span>`)
      .join("");

    // Stats
    if (stats) {
      statDetected.textContent = stats.detected || 0;
      statSolved.textContent = stats.solved || 0;
      statFailed.textContent = stats.failed || 0;
      if (stats.solved > 0 && stats.totalLatency > 0) {
        const avgMs = Math.round(stats.totalLatency / stats.solved);
        statLatency.textContent = avgMs > 1000 ? `${(avgMs / 1000).toFixed(1)}s` : `${avgMs}ms`;
      }
    }
  }

  function updateToggleUI(enabled) {
    statusDot.className = `status-dot ${enabled ? "active" : "inactive"}`;
    toggleSubtitle.textContent = enabled
      ? "Detecting and solving captchas"
      : "Extension paused";
  }

  function setLoginLoading(loading) {
    loginBtn.disabled = loading;
    loginBtnText.textContent = loading ? "Connecting..." : "Activate Extension";
    loginSpinner.classList.toggle("hidden", !loading);
  }

  function showError(msg) {
    loginError.textContent = msg;
    loginError.classList.remove("hidden");
  }

  function sendMessage(msg) {
    return new Promise((resolve) => {
      chrome.runtime.sendMessage(msg, (response) => {
        resolve(response);
      });
    });
  }
});
