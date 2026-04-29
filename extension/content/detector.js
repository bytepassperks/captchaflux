/**
 * CaptchaFlux Content Script — Captcha Detector
 * Scans the current page for known captcha types and reports findings
 * to the background service worker.
 */

(function () {
  "use strict";

  if (window.__captchaflux_detector_loaded) return;
  window.__captchaflux_detector_loaded = true;

  const CAPTCHA_SIGNATURES = {
    recaptcha_v2: {
      selectors: [
        ".g-recaptcha",
        '[data-sitekey]',
        'iframe[src*="recaptcha"]',
        "#g-recaptcha-response",
        ".recaptcha-checkbox",
      ],
      scripts: ["google.com/recaptcha", "gstatic.com/recaptcha"],
      sitekeyAttr: "data-sitekey",
    },
    recaptcha_v3: {
      selectors: ['script[src*="recaptcha/api.js?render="]'],
      scripts: ["recaptcha/api.js?render="],
      sitekeyExtract: /recaptcha\/api\.js\?render=([A-Za-z0-9_-]+)/,
    },
    hcaptcha: {
      selectors: [
        ".h-captcha",
        '[data-sitekey]',
        'iframe[src*="hcaptcha.com"]',
      ],
      scripts: ["hcaptcha.com/1/api.js"],
      sitekeyAttr: "data-sitekey",
    },
    turnstile: {
      selectors: [
        ".cf-turnstile",
        '[data-sitekey]',
        'iframe[src*="challenges.cloudflare.com"]',
      ],
      scripts: ["challenges.cloudflare.com/turnstile"],
      sitekeyAttr: "data-sitekey",
    },
    mtcaptcha: {
      selectors: [
        ".mtcaptcha",
        '[data-sitekey*="MTPublic"]',
        'iframe[src*="service.mtcaptcha.com"]',
        "#mtcap-image",
        ".mtcap-inputbox",
      ],
      scripts: ["service.mtcaptcha.com", "mtcaptcha"],
      sitekeyAttr: "data-sitekey",
    },
    text_image: {
      selectors: [
        'img[src*="captcha"]',
        'img[alt*="captcha"]',
        'img[id*="captcha"]',
        'img[class*="captcha"]',
        'input[name*="captcha"]',
      ],
      scripts: [],
    },
  };

  function extractSitekey(type, element) {
    const sig = CAPTCHA_SIGNATURES[type];
    if (!sig) return null;

    if (sig.sitekeyAttr && element) {
      const key = element.getAttribute(sig.sitekeyAttr);
      if (key) return key;
    }

    if (sig.sitekeyExtract) {
      const scripts = document.querySelectorAll("script[src]");
      for (const s of scripts) {
        const match = s.src.match(sig.sitekeyExtract);
        if (match) return match[1];
      }
    }

    // Search all elements with data-sitekey
    const allSitekeys = document.querySelectorAll("[data-sitekey]");
    for (const el of allSitekeys) {
      const key = el.getAttribute("data-sitekey");
      if (key) return key;
    }

    // MTCaptcha: try extracting from script content
    if (type === "mtcaptcha") {
      const scripts = document.querySelectorAll("script");
      for (const s of scripts) {
        const match = s.textContent?.match(
          /sitekey["\s:=]+(MTPublic-[A-Za-z0-9]+)/
        );
        if (match) return match[1];
      }
    }

    return null;
  }

  function getCaptchaElement(type) {
    const sig = CAPTCHA_SIGNATURES[type];
    if (!sig) return null;

    for (const sel of sig.selectors) {
      const el = document.querySelector(sel);
      if (el) return el;
    }
    return null;
  }

  function getCaptchaImageElement() {
    // Direct selectors for captcha images
    const candidates = [
      'img[src*="captcha"]',
      'img[id*="captcha"]',
      'img[class*="captcha"]',
      'img[alt*="captcha"]',
      "#mtcap-image img",
      ".mtcap-image img",
      'img[src*="mtcap"]',
    ];

    for (const sel of candidates) {
      const el = document.querySelector(sel);
      if (el) return el;
    }

    // Find images near captcha input fields (sibling/adjacent images)
    const inputEl = getCaptchaInputElement();
    if (inputEl) {
      const parent = inputEl.closest("div, form, fieldset, section");
      if (parent) {
        const nearbyImg = parent.querySelector("img");
        if (nearbyImg) return nearbyImg;
      }
      // Check next/previous siblings
      let sibling = inputEl.nextElementSibling;
      while (sibling) {
        if (sibling.tagName === "IMG") return sibling;
        const img = sibling.querySelector?.("img");
        if (img) return img;
        sibling = sibling.nextElementSibling;
      }
    }

    // Check iframes for MTCaptcha
    const iframes = document.querySelectorAll(
      'iframe[src*="mtcaptcha"], iframe[src*="captcha"]'
    );
    for (const iframe of iframes) {
      try {
        const doc = iframe.contentDocument;
        if (doc) {
          const img = doc.querySelector("img");
          if (img) return img;
        }
      } catch {
        // Cross-origin — can't access
      }
    }

    return null;
  }

  function getCaptchaInputElement() {
    const candidates = [
      'input[name*="captcha"]',
      'input[id*="captcha"]',
      'input[class*="captcha"]',
      'input[name*="mtcaptcha"]',
      ".mtcap-inputbox input",
      "#mtcap-inputbox input",
      'input[placeholder*="captcha" i]',
      'input[placeholder*="code" i]',
      'input[aria-label*="captcha" i]',
    ];

    for (const sel of candidates) {
      const el = document.querySelector(sel);
      if (el && el.type !== "hidden") return el;
    }
    return null;
  }

  function detectCaptcha() {
    const html = document.documentElement.outerHTML.toLowerCase();
    const results = [];

    for (const [type, sig] of Object.entries(CAPTCHA_SIGNATURES)) {
      let detected = false;
      let matchedElement = null;

      // Check selectors
      for (const sel of sig.selectors) {
        try {
          const el = document.querySelector(sel);
          if (el) {
            detected = true;
            matchedElement = el;
            break;
          }
        } catch {
          // Invalid selector
        }
      }

      // Check scripts
      if (!detected && sig.scripts) {
        for (const scriptPattern of sig.scripts) {
          if (html.includes(scriptPattern.toLowerCase())) {
            detected = true;
            break;
          }
        }
      }

      if (detected) {
        const sitekey = extractSitekey(type, matchedElement);
        results.push({
          type,
          sitekey,
          element: matchedElement,
          confidence: sitekey ? 0.95 : 0.75,
        });
      }
    }

    // Prioritize: specific types over generic text_image
    if (results.length > 1) {
      const specific = results.filter((r) => r.type !== "text_image");
      if (specific.length > 0) return specific[0];
    }

    return results[0] || null;
  }

  async function captureElementScreenshot(element) {
    if (!element || element.tagName !== "IMG") return null;

    // Method 1: Canvas (works for same-origin images)
    try {
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      canvas.width = element.naturalWidth || element.width;
      canvas.height = element.naturalHeight || element.height;
      ctx.drawImage(element, 0, 0);
      const dataUrl = canvas.toDataURL("image/png");
      return dataUrl.split(",")[1];
    } catch {
      // Tainted canvas — cross-origin image
    }

    // Method 2: Fetch the image URL directly (content script shares page origin)
    try {
      const imgUrl = element.src || element.getAttribute("src");
      if (imgUrl) {
        const absoluteUrl = new URL(imgUrl, window.location.href).href;
        const resp = await fetch(absoluteUrl, { credentials: "include" });
        const blob = await resp.blob();
        return await new Promise((resolve) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result.split(",")[1]);
          reader.onerror = () => resolve(null);
          reader.readAsDataURL(blob);
        });
      }
    } catch {
      // Fetch failed
    }

    return null;
  }

  // Main detection loop
  let lastDetection = null;
  let scanCount = 0;

  async function scan() {
    // Check if extension is enabled
    const settings = await new Promise((resolve) => {
      chrome.storage.local.get(
        ["enabled", "apiKey", "authenticated"],
        resolve
      );
    });

    if (!settings.enabled || !settings.apiKey || !settings.authenticated) {
      return;
    }

    const detection = detectCaptcha();

    if (detection && !lastDetection) {
      lastDetection = detection;

      // Get captcha image if available (works for same-origin images)
      const imgEl = getCaptchaImageElement();
      let imageBase64 = null;
      let imageUrl = null;
      let captchaRect = null;
      if (imgEl) {
        imageBase64 = await captureElementScreenshot(imgEl);
        imageUrl = imgEl.src || imgEl.getAttribute("src");
        if (imageUrl) {
          imageUrl = new URL(imageUrl, window.location.href).href;
        }
      }

      // For cross-origin iframes (MTCaptcha etc), get iframe bounding rect
      // so background can use captureVisibleTab + crop
      if (!imageBase64) {
        const captchaEl =
          detection.element ||
          document.querySelector(
            'iframe[src*="mtcaptcha"], iframe[src*="captcha"], iframe[src*="recaptcha"], iframe[src*="hcaptcha"], iframe[src*="turnstile"]'
          );
        if (captchaEl) {
          const rect = captchaEl.getBoundingClientRect();
          captchaRect = {
            x: Math.round(rect.x),
            y: Math.round(rect.y),
            width: Math.round(rect.width),
            height: Math.round(rect.height),
            dpr: window.devicePixelRatio || 1,
          };
        }
      }

      // Get input element info
      const inputEl = getCaptchaInputElement();

      // Notify background
      chrome.runtime.sendMessage({
        type: "CAPTCHA_DETECTED",
        data: {
          captchaType: detection.type,
          sitekey: detection.sitekey,
          pageUrl: window.location.href,
          confidence: detection.confidence,
          hasImage: !!imageBase64 || !!imageUrl || !!captchaRect,
          imageBase64: imageBase64,
          imageUrl: imageUrl,
          captchaRect: captchaRect,
          hasInput: !!inputEl,
        },
      });
    } else if (!detection && lastDetection) {
      lastDetection = null;
      chrome.runtime.sendMessage({ type: "CAPTCHA_CLEARED" });
    }

    scanCount++;
  }

  // Initial scan after page load
  setTimeout(scan, 1000);

  // Re-scan periodically (captchas may load dynamically)
  setInterval(scan, 3000);

  // Also scan on DOM mutations
  const observer = new MutationObserver(() => {
    clearTimeout(window.__captchaflux_mutation_timer);
    window.__captchaflux_mutation_timer = setTimeout(scan, 500);
  });

  observer.observe(document.body || document.documentElement, {
    childList: true,
    subtree: true,
  });

  // Listen for solve results from background
  chrome.runtime.onMessage.addListener((msg) => {
    if (msg.type === "SOLVE_RESULT" && msg.data) {
      const { success, token, captchaType } = msg.data;

      if (success && token) {
        // Fill in the answer
        fillCaptchaAnswer(captchaType, token);
      }
    }

    if (msg.type === "TRIGGER_SCAN") {
      scan();
    }
  });

  function fillCaptchaAnswer(captchaType, token) {
    switch (captchaType) {
      case "recaptcha_v2":
      case "recaptcha_v3": {
        const textarea = document.querySelector("#g-recaptcha-response");
        if (textarea) {
          textarea.value = token;
          textarea.style.display = "none";
          // Trigger callback
          const callback = document.querySelector(".g-recaptcha");
          if (callback) {
            const cbName = callback.getAttribute("data-callback");
            if (cbName && typeof window[cbName] === "function") {
              window[cbName](token);
            }
          }
          // Also try grecaptcha callback
          try {
            if (window.grecaptcha) {
              window.grecaptcha.execute?.();
            }
          } catch {}
        }
        break;
      }

      case "hcaptcha": {
        const textarea = document.querySelector(
          'textarea[name="h-captcha-response"]'
        );
        if (textarea) {
          textarea.value = token;
          // Trigger hcaptcha callback
          try {
            if (window.hcaptcha) {
              const iframeEl = document.querySelector(
                'iframe[src*="hcaptcha"]'
              );
              if (iframeEl) {
                iframeEl.closest(".h-captcha")?.setAttribute("data-hcaptcha-response", token);
              }
            }
          } catch {}
        }
        break;
      }

      case "turnstile": {
        const input = document.querySelector(
          'input[name="cf-turnstile-response"]'
        );
        if (input) {
          input.value = token;
          input.dispatchEvent(new Event("input", { bubbles: true }));
          input.dispatchEvent(new Event("change", { bubbles: true }));
        }
        break;
      }

      case "mtcaptcha":
      case "text_image": {
        const inputEl = getCaptchaInputElement();
        if (inputEl) {
          inputEl.focus();
          inputEl.value = token;
          inputEl.dispatchEvent(new Event("input", { bubbles: true }));
          inputEl.dispatchEvent(new Event("change", { bubbles: true }));

          // Also set the hidden verified token if MTCaptcha
          const hiddenToken = document.querySelector(
            'input[name="mtcaptcha-verifiedtoken"]'
          );
          if (hiddenToken) {
            hiddenToken.value = token;
          }
        }
        break;
      }
    }

    // Notify modal to update
    window.postMessage({ type: "CAPTCHAFLUX_SOLVED", token, captchaType }, "*");
  }

  // Expose for solver
  window.__captchaflux = {
    detectCaptcha,
    getCaptchaImageElement,
    getCaptchaInputElement,
    captureElementScreenshot,
    fillCaptchaAnswer,
  };
})();
