/**
 * CaptchaFlux Background Service Worker
 * Handles API communication, authentication, and solve orchestration.
 */

const API_BASE = "https://captchaflux.onrender.com";

// Badge states
const BADGE_STATES = {
  idle: { text: "", color: "#5B8CFF" },
  detecting: { text: "...", color: "#FFB020" },
  solving: { text: "⟳", color: "#5B8CFF" },
  solved: { text: "✓", color: "#00E0B8" },
  error: { text: "!", color: "#FF5050" },
  off: { text: "OFF", color: "#64748b" },
};

function setBadge(state, tabId) {
  const s = BADGE_STATES[state] || BADGE_STATES.idle;
  chrome.action.setBadgeText({ text: s.text, tabId });
  chrome.action.setBadgeBackgroundColor({ color: s.color, tabId });
}

// Track solve stats per session
let sessionStats = {
  detected: 0,
  solved: 0,
  failed: 0,
  totalLatency: 0,
};

// Listen for messages from content scripts
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  const tabId = sender.tab?.id;

  switch (msg.type) {
    case "CAPTCHA_DETECTED":
      handleCaptchaDetected(msg.data, tabId);
      break;

    case "CAPTCHA_CLEARED":
      setBadge("idle", tabId);
      break;

    case "GET_STATUS":
      getStatus().then(sendResponse);
      return true; // Async response

    case "GET_STATS":
      sendResponse(sessionStats);
      break;

    case "AUTHENTICATE":
      authenticate(msg.data.apiKey).then(sendResponse);
      return true;

    case "LOGOUT":
      logout().then(sendResponse);
      return true;

    case "TOGGLE_ENABLED":
      toggleEnabled(msg.data.enabled, tabId).then(sendResponse);
      return true;

    case "MANUAL_SOLVE":
      triggerManualSolve(tabId);
      break;
  }
});

async function handleCaptchaDetected(data, tabId) {
  sessionStats.detected++;
  setBadge("detecting", tabId);

  // Check settings
  const settings = await chrome.storage.local.get([
    "enabled",
    "apiKey",
    "autoSolve",
    "authenticated",
  ]);

  if (!settings.enabled || !settings.authenticated || !settings.apiKey) {
    setBadge("off", tabId);
    return;
  }

  if (!settings.autoSolve) {
    // Auto-solve disabled — just show detection badge
    setBadge("detecting", tabId);
    return;
  }

  // Start solving
  await solveCaptcha(data, tabId, settings.apiKey);
}

// Capture visible tab and crop to a specific rect using OffscreenCanvas
async function captureTabCaptcha(tabId, rect) {
  const dataUrl = await chrome.tabs.captureVisibleTab(null, { format: "png" });
  const resp = await fetch(dataUrl);
  const blob = await resp.blob();

  const dpr = rect.dpr || 1;
  const sx = Math.max(0, Math.round(rect.x * dpr));
  const sy = Math.max(0, Math.round(rect.y * dpr));
  const sw = Math.max(1, Math.round(rect.width * dpr));
  const sh = Math.max(1, Math.round(rect.height * dpr));

  const bitmap = await createImageBitmap(blob, sx, sy, sw, sh);
  const canvas = new OffscreenCanvas(bitmap.width, bitmap.height);
  const ctx = canvas.getContext("2d");
  ctx.drawImage(bitmap, 0, 0);
  const resultBlob = await canvas.convertToBlob({ type: "image/png" });
  const buffer = await resultBlob.arrayBuffer();
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

// Fill captcha answer in all frames (handles cross-origin iframes)
async function fillCaptchaInAllFrames(tabId, token, captchaType) {
  try {
    await chrome.scripting.executeScript({
      target: { tabId, allFrames: true },
      func: (tkn, cType) => {
        // Try filling in every frame — the right frame will have the input
        const selectors = [
          // MTCaptcha mini widget (most specific first)
          "input.mtcap-inputtext-mini",
          "input.mtcap-inputtext",
          ".mtcap-inputbox-mini input",
          ".mtcap-inputbox input",
          'input[class*="mtcap" i]',
          // Generic captcha selectors
          'input[name*="captcha" i]',
          'input[id*="captcha" i]',
          'input[class*="captcha" i]',
          'input[placeholder*="captcha" i]',
          'input[placeholder*="code" i]',
          'input[placeholder*="text from" i]',
          'input[aria-label*="captcha" i]',
          "#mtcap-inputbox input",
          'input[name*="mtcap" i]',
          'input[id*="mtcap" i]',
        ];

        for (const sel of selectors) {
          const input = document.querySelector(sel);
          if (input && input.type !== "hidden") {
            // Clear existing value
            input.value = "";
            input.focus();

            // Simulate typing character by character for validation
            for (const char of tkn) {
              input.value += char;
              input.dispatchEvent(
                new KeyboardEvent("keydown", {
                  key: char,
                  code: "Key" + char.toUpperCase(),
                  bubbles: true,
                })
              );
              input.dispatchEvent(
                new KeyboardEvent("keypress", {
                  key: char,
                  code: "Key" + char.toUpperCase(),
                  bubbles: true,
                })
              );
              input.dispatchEvent(
                new InputEvent("input", { data: char, bubbles: true })
              );
              input.dispatchEvent(
                new KeyboardEvent("keyup", {
                  key: char,
                  code: "Key" + char.toUpperCase(),
                  bubbles: true,
                })
              );
            }

            input.dispatchEvent(new Event("change", { bubbles: true }));
            return true;
          }
        }

        // Also handle token-based response fields in the main frame
        const tokenFields = [
          "#g-recaptcha-response",
          'textarea[name="g-recaptcha-response"]',
          'textarea[name="h-captcha-response"]',
          'input[name="cf-turnstile-response"]',
          'input[name="mtcaptcha-verifiedtoken"]',
        ];
        for (const sel of tokenFields) {
          const field = document.querySelector(sel);
          if (field) {
            field.value = tkn;
            field.dispatchEvent(new Event("input", { bubbles: true }));
            field.dispatchEvent(new Event("change", { bubbles: true }));
          }
        }

        // Try triggering captcha callbacks
        if (cType === "recaptcha_v2" || cType === "recaptcha_v3") {
          const el = document.querySelector(".g-recaptcha");
          if (el) {
            const cbName = el.getAttribute("data-callback");
            if (cbName && typeof window[cbName] === "function") {
              window[cbName](tkn);
            }
          }
          try {
            if (window.grecaptcha?.enterprise) {
              // reCAPTCHA Enterprise
            } else if (window.grecaptcha) {
              window.grecaptcha.execute?.();
            }
          } catch {}
        }

        return false;
      },
      args: [token, captchaType],
    });
  } catch {
    // executeScript failed — tab may have navigated
  }
}

async function solveCaptcha(data, tabId, apiKey) {
  setBadge("solving", tabId);

  // Tell content script to show modal
  chrome.tabs.sendMessage(tabId, {
    type: "START_SOLVE",
    data: {
      captchaType: data.captchaType,
      sitekey: data.sitekey,
    },
  });

  const startTime = Date.now();

  try {
    const requestBody = {
      apiKey,
      captchaType: data.captchaType,
      sitekey: data.sitekey || undefined,
      pageUrl: data.pageUrl,
    };

    // Build image data from best available source
    let imageBase64 = data.imageBase64;

    // Fallback 1: Fetch image URL from background (may get different image for dynamic captchas)
    if (!imageBase64 && data.imageUrl) {
      try {
        const imgResp = await fetch(data.imageUrl);
        const buffer = await imgResp.arrayBuffer();
        const bytes = new Uint8Array(buffer);
        let binary = "";
        for (let i = 0; i < bytes.length; i++) {
          binary += String.fromCharCode(bytes[i]);
        }
        imageBase64 = btoa(binary);
      } catch {
        // Background fetch failed
      }
    }

    // Fallback 2: Screenshot visible tab and crop to captcha area
    // This is the most reliable method — captures exactly what user sees
    if (!imageBase64 && data.captchaRect) {
      try {
        imageBase64 = await captureTabCaptcha(tabId, data.captchaRect);
      } catch {
        // Tab capture failed
      }
    }

    if (imageBase64) {
      requestBody.captchaImageBase64 = imageBase64;
    }

    const resp = await fetch(`${API_BASE}/api/extension/solve`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(requestBody),
    });

    const result = await resp.json();
    const solveTime = Date.now() - startTime;

    if (result.success && result.token) {
      sessionStats.solved++;
      sessionStats.totalLatency += solveTime;
      setBadge("solved", tabId);

      // Fill the answer in ALL frames (handles cross-origin iframes)
      await fillCaptchaInAllFrames(tabId, result.token, data.captchaType);

      // Also notify content script for modal update
      chrome.tabs.sendMessage(tabId, {
        type: "SOLVE_RESULT",
        data: {
          success: true,
          token: result.token,
          captchaType: data.captchaType,
          engineUsed: result.engineUsed || "unknown",
          solveTimeMs: result.solveTimeMs || solveTime,
          confidence: result.confidence || 0,
        },
      });

      // Update usage
      updateUsage();

      // Reset badge after 5 seconds
      setTimeout(() => setBadge("idle", tabId), 5000);
    } else {
      throw new Error(result.error || "Solve returned no token");
    }
  } catch (err) {
    sessionStats.failed++;
    setBadge("error", tabId);

    chrome.tabs.sendMessage(tabId, {
      type: "SOLVE_ERROR",
      data: { error: err.message },
    });

    setTimeout(() => setBadge("idle", tabId), 5000);
  }
}

async function authenticate(apiKey) {
  try {
    const resp = await fetch(`${API_BASE}/api/extension/auth`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ apiKey }),
    });

    if (!resp.ok) {
      const err = await resp.json();
      return { success: false, error: err.error || "Authentication failed" };
    }

    const data = await resp.json();

    // Store auth info
    await chrome.storage.local.set({
      apiKey,
      authenticated: true,
      enabled: true,
      autoSolve: true,
      tier: data.tier,
      usage: data.usage,
      email: data.email,
      features: data.features,
    });

    return { success: true, ...data };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

async function logout() {
  await chrome.storage.local.remove([
    "apiKey",
    "authenticated",
    "tier",
    "usage",
    "email",
    "features",
  ]);
  await chrome.storage.local.set({ enabled: false, autoSolve: false });
  sessionStats = { detected: 0, solved: 0, failed: 0, totalLatency: 0 };
  return { success: true };
}

async function toggleEnabled(enabled, tabId) {
  await chrome.storage.local.set({ enabled });
  setBadge(enabled ? "idle" : "off", tabId);

  // Notify all tabs
  const tabs = await chrome.tabs.query({});
  for (const tab of tabs) {
    try {
      chrome.tabs.sendMessage(tab.id, {
        type: "AUTO_SOLVE_TOGGLE",
        enabled,
      });
    } catch {
      // Tab may not have content script
    }
  }

  return { success: true, enabled };
}

async function getStatus() {
  const data = await chrome.storage.local.get([
    "enabled",
    "authenticated",
    "apiKey",
    "tier",
    "usage",
    "email",
    "features",
    "autoSolve",
  ]);
  return data;
}

async function updateUsage() {
  const data = await chrome.storage.local.get(["usage"]);
  if (data.usage) {
    data.usage.used = (data.usage.used || 0) + 1;
    await chrome.storage.local.set({ usage: data.usage });
  }
}

function triggerManualSolve(tabId) {
  if (!tabId) return;
  chrome.tabs.sendMessage(tabId, { type: "TRIGGER_SCAN" });
}

// Initialize on install
chrome.runtime.onInstalled.addListener(async () => {
  const existing = await chrome.storage.local.get(["enabled"]);
  if (existing.enabled === undefined) {
    await chrome.storage.local.set({
      enabled: false,
      autoSolve: true,
      authenticated: false,
    });
  }
});
