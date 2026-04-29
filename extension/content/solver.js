/**
 * CaptchaFlux Content Script — Solver Orchestrator
 * Listens for captcha detections and triggers the solve flow
 * through the background service worker.
 */

(function () {
  "use strict";

  if (window.__captchaflux_solver_loaded) return;
  window.__captchaflux_solver_loaded = true;

  let isSolving = false;
  let autoSolveEnabled = true;

  // Listen for captcha detection from detector.js via background
  chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
    if (msg.type === "START_SOLVE" && !isSolving) {
      isSolving = true;
      startSolve(msg.data);
    }

    if (msg.type === "SOLVE_RESULT") {
      isSolving = false;
      handleSolveResult(msg.data);
    }

    if (msg.type === "SOLVE_ERROR") {
      isSolving = false;
      handleSolveError(msg.data);
    }

    if (msg.type === "AUTO_SOLVE_TOGGLE") {
      autoSolveEnabled = msg.enabled;
    }
  });

  async function startSolve(data) {
    // Show the solving modal
    window.postMessage(
      {
        type: "CAPTCHAFLUX_SHOW_MODAL",
        captchaType: data.captchaType,
        stage: "detecting",
      },
      "*"
    );

    // Wait a moment for visual feedback
    await sleep(300);

    // Update modal to solving stage
    window.postMessage(
      {
        type: "CAPTCHAFLUX_UPDATE_MODAL",
        stage: "solving",
        captchaType: data.captchaType,
      },
      "*"
    );

    // The actual solve happens in the background service worker
    // It will send back SOLVE_RESULT or SOLVE_ERROR
  }

  function handleSolveResult(data) {
    if (data.success) {
      window.postMessage(
        {
          type: "CAPTCHAFLUX_UPDATE_MODAL",
          stage: "solved",
          token: data.token,
          engineUsed: data.engineUsed,
          solveTimeMs: data.solveTimeMs,
          confidence: data.confidence,
        },
        "*"
      );

      // Auto-dismiss after 3 seconds
      setTimeout(() => {
        window.postMessage({ type: "CAPTCHAFLUX_HIDE_MODAL" }, "*");
      }, 3000);
    } else {
      handleSolveError({ error: data.error || "Solve failed" });
    }
  }

  function handleSolveError(data) {
    window.postMessage(
      {
        type: "CAPTCHAFLUX_UPDATE_MODAL",
        stage: "error",
        error: data.error || "Unknown error",
      },
      "*"
    );

    // Auto-dismiss error after 5 seconds
    setTimeout(() => {
      window.postMessage({ type: "CAPTCHAFLUX_HIDE_MODAL" }, "*");
    }, 5000);
  }

  function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
})();
