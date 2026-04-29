/**
 * CaptchaFlux Background Service Worker
 * Handles API communication, authentication, and solve orchestration.
 */

const API_BASE = "https://captchaflux.onrender.com";

// Debug log buffer — saved to storage for inspection
const _debugLogs = [];
function debugLog(...args) {
  const msg = args.map(a => typeof a === 'object' ? JSON.stringify(a) : String(a)).join(' ');
  console.log(msg);
  _debugLogs.push({ t: Date.now(), m: msg });
  // Keep last 50 entries
  if (_debugLogs.length > 50) _debugLogs.shift();
  chrome.storage.local.set({ _cfDebugLogs: _debugLogs });
}

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
  debugLog('[CaptchaFlux] fillCaptchaInAllFrames start:', { tabId, token, captchaType });
  try {
    const results = await chrome.scripting.executeScript({
      target: { tabId, allFrames: true },
      func: (tkn, cType) => {
        const diag = {
          url: location.href.substring(0, 80),
          allInputs: document.querySelectorAll("input").length,
          matched: null,
          filled: false,
        };

        // Visible captcha input selectors
        const selectors = [
          "input.mtcap-inputtext-mini",
          "input.mtcap-inputtext",
          ".mtcap-inputbox-mini input",
          ".mtcap-inputbox input",
          'input[class*="mtcap" i]',
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
            diag.matched = sel;

            // Use native setter to bypass framework watchers
            const nativeSetter = Object.getOwnPropertyDescriptor(
              HTMLInputElement.prototype, 'value'
            )?.set;

            // Focus the input
            input.focus();
            input.click();

            // Clear existing value using native setter + select all
            if (nativeSetter) {
              nativeSetter.call(input, '');
            } else {
              input.value = '';
            }
            input.dispatchEvent(new Event('input', { bubbles: true }));

            // Method 1: Try execCommand (creates trusted InputEvents)
            let execCmdWorked = false;
            try {
              input.select();
              execCmdWorked = document.execCommand('insertText', false, tkn);
            } catch {}

            if (!execCmdWorked || input.value !== tkn) {
              // Method 2: Native setter + minimal event chain
              if (nativeSetter) {
                nativeSetter.call(input, tkn);
              } else {
                input.value = tkn;
              }
              input.dispatchEvent(new Event('input', { bubbles: true }));
            }

            // Do NOT fire blur/change/statusBtn click here — those trigger
            // server-side validation which clears the input if OCR is wrong.
            // The text will persist in the input for the user to see.
            // Validation happens naturally when the form is submitted.

            diag.filled = true;
            diag.valueAfter = input.value;
            diag.method = execCmdWorked ? 'execCommand' : 'nativeSetter';
            return diag;
          }
        }

        // Token-based response fields (reCAPTCHA, hCaptcha, Turnstile, MTCaptcha verified token)
        const tokenFields = [
          { sel: "#g-recaptcha-response", tag: "textarea" },
          { sel: 'textarea[name="g-recaptcha-response"]', tag: "textarea" },
          { sel: 'textarea[name="h-captcha-response"]', tag: "textarea" },
          { sel: 'input[name="cf-turnstile-response"]', tag: "input" },
        ];
        for (const { sel } of tokenFields) {
          const field = document.querySelector(sel);
          if (field) {
            const ns = Object.getOwnPropertyDescriptor(
              field.tagName === "TEXTAREA" ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype,
              'value'
            )?.set;
            if (ns) ns.call(field, tkn);
            else field.value = tkn;
            field.dispatchEvent(new Event("input", { bubbles: true }));
            field.dispatchEvent(new Event("change", { bubbles: true }));
            diag.matched = sel;
            diag.filled = true;
          }
        }

        // Trigger captcha callbacks
        if (cType === "recaptcha_v2" || cType === "recaptcha_v3") {
          const el = document.querySelector(".g-recaptcha");
          if (el) {
            const cbName = el.getAttribute("data-callback");
            if (cbName && typeof window[cbName] === "function") {
              try { window[cbName](tkn); } catch {}
            }
          }
          try {
            if (window.grecaptcha) window.grecaptcha.execute?.();
          } catch {}
        }

        if (cType === "hcaptcha") {
          try {
            if (window.hcaptcha) window.hcaptcha.execute?.();
          } catch {}
        }

        return diag;
      },
      args: [token, captchaType],
    });
    const fillDiag = results?.map(r => ({ frameId: r.frameId, result: r.result }));
    debugLog('[CaptchaFlux] executeScript results:', JSON.stringify(fillDiag));
    chrome.storage.local.set({ _cfFillDiag: fillDiag, _cfFillTime: Date.now() });
  } catch (e) {
    debugLog('[CaptchaFlux] executeScript FAILED:', e.message);
    chrome.storage.local.set({ _cfFillError: e.message, _cfFillTime: Date.now() });
  }
}

// Solve token-based captchas (reCAPTCHA, hCaptcha, Turnstile) by clicking checkbox in user's browser
async function solveTokenCaptchaClientSide(data, tabId) {
  const cType = data.captchaType;
  debugLog('[CaptchaFlux] solveTokenCaptchaClientSide:', cType);

  // Step 1: Click the captcha checkbox inside the iframe
  const clickResults = await chrome.scripting.executeScript({
    target: { tabId, allFrames: true },
    func: (captchaType) => {
      const url = location.href;

      // reCAPTCHA v2: checkbox is inside recaptcha iframe
      if (captchaType === 'recaptcha_v2') {
        const checkbox = document.querySelector('#recaptcha-anchor, .recaptcha-checkbox');
        if (checkbox) {
          checkbox.click();
          return { clicked: true, frame: url, type: 'recaptcha_checkbox' };
        }
      }

      // hCaptcha: checkbox inside hcaptcha iframe
      if (captchaType === 'hcaptcha') {
        const checkbox = document.querySelector('#checkbox, .check');
        if (checkbox) {
          checkbox.click();
          return { clicked: true, frame: url, type: 'hcaptcha_checkbox' };
        }
      }

      // Turnstile: managed widget, click the challenge container
      if (captchaType === 'turnstile') {
        const checkbox = document.querySelector('#challenge-stage input[type="checkbox"], .cb-i, input[type="checkbox"]');
        if (checkbox) {
          checkbox.click();
          return { clicked: true, frame: url, type: 'turnstile_checkbox' };
        }
        // Try clicking body of turnstile iframe
        if (url.includes('challenges.cloudflare.com')) {
          document.body.click();
          return { clicked: true, frame: url, type: 'turnstile_body' };
        }
      }

      return null;
    },
    args: [cType],
  });

  const clickedFrame = clickResults?.find(r => r.result?.clicked);
  debugLog('[CaptchaFlux] Click result:', JSON.stringify(clickedFrame?.result || 'no frame clicked'));

  if (!clickedFrame?.result?.clicked) {
    // If no checkbox found, try clicking the widget in the main page
    await chrome.scripting.executeScript({
      target: { tabId },
      func: (captchaType) => {
        if (captchaType === 'recaptcha_v2') {
          const iframe = document.querySelector('iframe[src*="recaptcha/api2/anchor"]');
          if (iframe) iframe.click();
        }
        if (captchaType === 'hcaptcha') {
          const iframe = document.querySelector('iframe[src*="hcaptcha.com/captcha/checkbox"]');
          if (iframe) iframe.click();
        }
        if (captchaType === 'turnstile') {
          const widget = document.querySelector('.cf-turnstile, iframe[src*="challenges.cloudflare.com"]');
          if (widget) widget.click();
        }
      },
      args: [cType],
    });
  }

  // Step 2: Wait for token to appear (poll for up to 30 seconds)
  for (let attempt = 0; attempt < 15; attempt++) {
    await new Promise(r => setTimeout(r, 2000));

    const tokenResults = await chrome.scripting.executeScript({
      target: { tabId },
      func: (captchaType) => {
        if (captchaType === 'recaptcha_v2' || captchaType === 'recaptcha_v3') {
          const ta = document.querySelector('#g-recaptcha-response');
          if (ta && ta.value && ta.value.length > 20) {
            return { token: ta.value, source: 'g-recaptcha-response' };
          }
        }
        if (captchaType === 'hcaptcha') {
          const ta = document.querySelector('textarea[name="h-captcha-response"]');
          if (ta && ta.value && ta.value.length > 20) {
            return { token: ta.value, source: 'h-captcha-response' };
          }
        }
        if (captchaType === 'turnstile') {
          const inp = document.querySelector('input[name="cf-turnstile-response"]');
          if (inp && inp.value && inp.value.length > 20) {
            return { token: inp.value, source: 'cf-turnstile-response' };
          }
        }
        // Check for green checkmark (reCAPTCHA solved state)
        const anchor = document.querySelector('.recaptcha-checkbox-checked, .recaptcha-checkbox[aria-checked="true"]');
        if (anchor) {
          // reCAPTCHA solved but token might be in iframe
          return { solved: true, source: 'checkbox-state' };
        }
        return null;
      },
      args: [cType],
    });

    const tokenResult = tokenResults?.[0]?.result;
    if (tokenResult?.token) {
      debugLog('[CaptchaFlux] Token found after', (attempt + 1) * 2, 'seconds from', tokenResult.source);
      return { success: true, token: tokenResult.token, engine: 'client_checkbox' };
    }

    // Also check inside iframes for the solved state
    const iframeCheck = await chrome.scripting.executeScript({
      target: { tabId, allFrames: true },
      func: () => {
        // Check if reCAPTCHA shows green checkmark
        const checked = document.querySelector('.recaptcha-checkbox-checked, [aria-checked="true"]#recaptcha-anchor');
        if (checked) return { solved: true, frame: location.href };
        // Check hCaptcha solved
        const hcSolved = document.querySelector('.check.checked, #checkbox[aria-checked="true"]');
        if (hcSolved) return { solved: true, frame: location.href };
        return null;
      },
    });

    const solvedFrame = iframeCheck?.find(r => r.result?.solved);
    if (solvedFrame) {
      // Captcha visually solved, try to get token from main frame
      debugLog('[CaptchaFlux] Checkbox solved, extracting token...');
      await new Promise(r => setTimeout(r, 1000));
      const finalToken = await chrome.scripting.executeScript({
        target: { tabId },
        func: () => {
          const fields = [
            document.querySelector('#g-recaptcha-response'),
            document.querySelector('textarea[name="g-recaptcha-response"]'),
            document.querySelector('textarea[name="h-captcha-response"]'),
            document.querySelector('input[name="cf-turnstile-response"]'),
          ];
          for (const f of fields) {
            if (f && f.value && f.value.length > 20) return f.value;
          }
          return null;
        },
      });
      if (finalToken?.[0]?.result) {
        return { success: true, token: finalToken[0].result, engine: 'client_checkbox' };
      }
    }

    debugLog('[CaptchaFlux] Poll attempt', attempt + 1, '- no token yet');
  }

  return { success: false, error: 'Captcha checkbox clicked but no token received (may require image challenge)' };
}

async function solveCaptcha(data, tabId, apiKey) {
  debugLog('[CaptchaFlux] solveCaptcha called:', { captchaType: data.captchaType, hasImage: !!data.imageBase64, hasImageUrl: !!data.imageUrl, hasRect: !!data.captchaRect, tabId });
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
    // ===== TOKEN-BASED CAPTCHAS: Solve client-side by clicking checkbox =====
    const tokenCaptchas = ['recaptcha_v2', 'recaptcha_v3', 'hcaptcha', 'turnstile'];
    if (tokenCaptchas.includes(data.captchaType)) {
      debugLog('[CaptchaFlux] Token-based captcha — solving client-side');
      const clientResult = await solveTokenCaptchaClientSide(data, tabId);
      const solveTime = Date.now() - startTime;

      if (clientResult.success && clientResult.token) {
        sessionStats.solved++;
        sessionStats.totalLatency += solveTime;
        setBadge("solved", tabId);

        chrome.tabs.sendMessage(tabId, {
          type: "SOLVE_RESULT",
          data: {
            success: true,
            token: clientResult.token,
            captchaType: data.captchaType,
            engineUsed: clientResult.engine,
            solveTimeMs: solveTime,
            confidence: 0.95,
          },
        });
        updateUsage();
        setTimeout(() => setBadge("idle", tabId), 5000);
        return;
      }

      // Client-side failed — report error accurately
      throw new Error(clientResult.error || 'Client-side solve failed');
    }

    // ===== IMAGE-BASED CAPTCHAS: Solve via server-side OCR =====
    const requestBody = {
      apiKey,
      captchaType: data.captchaType,
      sitekey: data.sitekey || undefined,
      pageUrl: data.pageUrl,
    };

    // Build image data from best available source
    let imageBase64 = data.imageBase64;
    debugLog('[CaptchaFlux] imageBase64 from content:', imageBase64 ? `${imageBase64.length} chars` : 'null');

    // Priority 1: Extract captcha image directly from inside cross-origin iframe
    if (!imageBase64) {
      debugLog('[CaptchaFlux] Trying direct iframe image extraction...');
      try {
        const extractResults = await chrome.scripting.executeScript({
          target: { tabId, allFrames: true },
          func: () => {
            const imgEl = document.querySelector('img[id*="mtcap-image"]');
            if (imgEl && imgEl.src && imgEl.src.startsWith('data:image')) {
              return { src: imgEl.src, method: 'img-tag' };
            }
            const bgDiv = document.querySelector('.mtcap-image-mini, .mtcap-image, [id*="mtcap-image"]');
            if (bgDiv) {
              const bg = bgDiv.style.backgroundImage || getComputedStyle(bgDiv).backgroundImage;
              if (bg && bg.includes('data:image')) {
                const match = bg.match(/url\(["']?(data:image[^"')]+)["']?\)/);
                if (match) return { src: match[1], method: 'bg-image' };
              }
            }
            const captchaImgs = document.querySelectorAll('img[src*="captcha"], img[id*="captcha"], img[class*="captcha"]');
            for (const img of captchaImgs) {
              if (img.src) return { src: img.src, method: 'generic-img' };
            }
            return null;
          },
        });
        for (const frame of extractResults) {
          if (frame.result && frame.result.src) {
            const src = frame.result.src;
            debugLog('[CaptchaFlux] Got captcha image from iframe via', frame.result.method);
            if (src.startsWith('data:image')) {
              const b64Part = src.split(',')[1];
              if (b64Part) {
                imageBase64 = b64Part;
                debugLog('[CaptchaFlux] Extracted image base64:', imageBase64.length, 'chars');
              }
            } else if (src.startsWith('http')) {
              try {
                const imgResp = await fetch(src);
                const buffer = await imgResp.arrayBuffer();
                const bytes = new Uint8Array(buffer);
                let binary = "";
                for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
                imageBase64 = btoa(binary);
                debugLog('[CaptchaFlux] Fetched external captcha image:', imageBase64.length, 'chars');
              } catch (e) {
                debugLog('[CaptchaFlux] Failed to fetch captcha image URL:', e.message);
              }
            }
            break;
          }
        }
      } catch (e) {
        debugLog('[CaptchaFlux] iframe image extraction failed:', e.message);
      }
    }

    // Fallback 1: Fetch image URL from background
    if (!imageBase64 && data.imageUrl) {
      debugLog('[CaptchaFlux] Trying imageUrl fetch:', data.imageUrl);
      try {
        const imgResp = await fetch(data.imageUrl);
        const buffer = await imgResp.arrayBuffer();
        const bytes = new Uint8Array(buffer);
        let binary = "";
        for (let i = 0; i < bytes.length; i++) {
          binary += String.fromCharCode(bytes[i]);
        }
        imageBase64 = btoa(binary);
        debugLog('[CaptchaFlux] imageUrl fetch success:', imageBase64.length, 'chars');
      } catch (e) {
        debugLog('[CaptchaFlux] imageUrl fetch failed:', e.message);
      }
    }

    // Fallback 2: Screenshot visible tab and crop to captcha area
    if (!imageBase64 && data.captchaRect) {
      debugLog('[CaptchaFlux] Trying tab screenshot, rect:', data.captchaRect);
      try {
        imageBase64 = await captureTabCaptcha(tabId, data.captchaRect);
        debugLog('[CaptchaFlux] Tab screenshot success:', imageBase64 ? imageBase64.length + ' chars' : 'null');
      } catch (e) {
        debugLog('[CaptchaFlux] Tab screenshot failed:', e.message);
      }
    }

    debugLog('[CaptchaFlux] Final image status:', imageBase64 ? `${imageBase64.length} chars` : 'NO IMAGE');
    if (imageBase64) {
      requestBody.captchaImageBase64 = imageBase64;
    }

    debugLog('[CaptchaFlux] Sending to API...');
    const resp = await fetch(`${API_BASE}/api/extension/solve`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(requestBody),
    });

    const result = await resp.json();
    const solveTime = Date.now() - startTime;
    debugLog('[CaptchaFlux] API response:', { success: result.success, token: result.token ? result.token.substring(0, 20) + '...' : null, engine: result.engineUsed, error: result.error });
    chrome.storage.local.set({ _cfApiResp: { success: result.success, token: result.token, engine: result.engineUsed, error: result.error, time: Date.now() } });

    if (result.success && result.token) {
      sessionStats.solved++;
      sessionStats.totalLatency += solveTime;
      setBadge("solved", tabId);

      debugLog('[CaptchaFlux] Calling fillCaptchaInAllFrames with token:', result.token);
      await fillCaptchaInAllFrames(tabId, result.token, data.captchaType);
      debugLog('[CaptchaFlux] fillCaptchaInAllFrames completed');

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

      updateUsage();
      setTimeout(() => setBadge("idle", tabId), 5000);
    } else {
      throw new Error(result.error || "Solve returned no token");
    }
  } catch (err) {
    debugLog('[CaptchaFlux] solveCaptcha ERROR:', err.message);
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
