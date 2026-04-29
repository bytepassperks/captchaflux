/**
 * CaptchaFlux Content Script — Modal Overlay UI
 * Shows a floating modal on the page when a captcha is being solved.
 */

(function () {
  "use strict";

  if (window.__captchaflux_modal_loaded) return;
  window.__captchaflux_modal_loaded = true;

  const CAPTCHA_LABELS = {
    recaptcha_v2: "reCAPTCHA v2",
    recaptcha_v3: "reCAPTCHA v3",
    hcaptcha: "hCaptcha",
    turnstile: "Cloudflare Turnstile",
    mtcaptcha: "MTCaptcha",
    text_image: "Text/Image Captcha",
  };

  let modalElement = null;

  function createModal() {
    if (modalElement) return modalElement;

    const container = document.createElement("div");
    container.id = "captchaflux-modal";
    container.className = "captchaflux-modal captchaflux-hidden";

    container.innerHTML = `
      <div class="captchaflux-modal-inner">
        <div class="captchaflux-modal-header">
          <div class="captchaflux-logo">
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <circle cx="10" cy="10" r="10" fill="#5B8CFF"/>
              <path d="M9 4L12 10H10L11 16L8 10H10L9 4Z" fill="white"/>
            </svg>
            <span class="captchaflux-brand">CaptchaFlux</span>
          </div>
          <button class="captchaflux-close" id="captchaflux-close">&times;</button>
        </div>
        <div class="captchaflux-modal-body">
          <div class="captchaflux-status" id="captchaflux-status">
            <div class="captchaflux-spinner" id="captchaflux-spinner"></div>
            <span class="captchaflux-status-text" id="captchaflux-status-text">Detecting captcha...</span>
          </div>
          <div class="captchaflux-type" id="captchaflux-type"></div>
          <div class="captchaflux-progress" id="captchaflux-progress">
            <div class="captchaflux-progress-steps">
              <div class="captchaflux-step active" id="captchaflux-step-detect">
                <div class="captchaflux-step-dot"></div>
                <span>Detect</span>
              </div>
              <div class="captchaflux-step-line"></div>
              <div class="captchaflux-step" id="captchaflux-step-solve">
                <div class="captchaflux-step-dot"></div>
                <span>Solve</span>
              </div>
              <div class="captchaflux-step-line"></div>
              <div class="captchaflux-step" id="captchaflux-step-fill">
                <div class="captchaflux-step-dot"></div>
                <span>Fill</span>
              </div>
            </div>
          </div>
          <div class="captchaflux-result captchaflux-hidden" id="captchaflux-result">
            <div class="captchaflux-result-icon" id="captchaflux-result-icon"></div>
            <div class="captchaflux-result-text" id="captchaflux-result-text"></div>
            <div class="captchaflux-result-meta" id="captchaflux-result-meta"></div>
          </div>
        </div>
      </div>
    `;

    document.body.appendChild(container);
    modalElement = container;

    // Close button
    container.querySelector("#captchaflux-close").addEventListener("click", () => {
      hideModal();
    });

    return container;
  }

  function showModal(captchaType, stage) {
    const modal = createModal();
    modal.classList.remove("captchaflux-hidden");

    const typeLabel = CAPTCHA_LABELS[captchaType] || captchaType;
    const typeEl = modal.querySelector("#captchaflux-type");
    typeEl.textContent = typeLabel;

    updateModalStage(stage, { captchaType });
  }

  function updateModalStage(stage, data = {}) {
    if (!modalElement) return;

    const statusText = modalElement.querySelector("#captchaflux-status-text");
    const spinner = modalElement.querySelector("#captchaflux-spinner");
    const resultEl = modalElement.querySelector("#captchaflux-result");
    const resultIcon = modalElement.querySelector("#captchaflux-result-icon");
    const resultText = modalElement.querySelector("#captchaflux-result-text");
    const resultMeta = modalElement.querySelector("#captchaflux-result-meta");
    const stepDetect = modalElement.querySelector("#captchaflux-step-detect");
    const stepSolve = modalElement.querySelector("#captchaflux-step-solve");
    const stepFill = modalElement.querySelector("#captchaflux-step-fill");

    // Reset steps
    stepDetect.className = "captchaflux-step";
    stepSolve.className = "captchaflux-step";
    stepFill.className = "captchaflux-step";

    switch (stage) {
      case "detecting":
        statusText.textContent = "Detecting captcha...";
        spinner.style.display = "block";
        resultEl.classList.add("captchaflux-hidden");
        stepDetect.classList.add("active");
        break;

      case "solving":
        statusText.textContent = "Solving captcha...";
        spinner.style.display = "block";
        resultEl.classList.add("captchaflux-hidden");
        stepDetect.classList.add("completed");
        stepSolve.classList.add("active");
        break;

      case "filling":
        statusText.textContent = "Filling answer...";
        spinner.style.display = "block";
        resultEl.classList.add("captchaflux-hidden");
        stepDetect.classList.add("completed");
        stepSolve.classList.add("completed");
        stepFill.classList.add("active");
        break;

      case "solved":
        statusText.textContent = "Captcha solved!";
        spinner.style.display = "none";
        stepDetect.classList.add("completed");
        stepSolve.classList.add("completed");
        stepFill.classList.add("completed");
        resultEl.classList.remove("captchaflux-hidden");
        resultIcon.innerHTML = '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#00E0B8" stroke-width="2"><path d="M20 6L9 17l-5-5"/></svg>';
        resultText.textContent = "Solved successfully";
        const meta = [];
        if (data.engineUsed) meta.push(`Engine: ${data.engineUsed}`);
        if (data.solveTimeMs) meta.push(`${(data.solveTimeMs / 1000).toFixed(1)}s`);
        if (data.confidence) meta.push(`${Math.round(data.confidence * 100)}%`);
        resultMeta.textContent = meta.join(" · ");
        break;

      case "error":
        statusText.textContent = "Solve failed";
        spinner.style.display = "none";
        stepDetect.classList.add("completed");
        stepSolve.classList.add("error");
        resultEl.classList.remove("captchaflux-hidden");
        resultIcon.innerHTML = '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#FF5050" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M15 9l-6 6M9 9l6 6"/></svg>';
        resultText.textContent = data.error || "Unknown error";
        resultMeta.textContent = "Will retry on next detection";
        break;
    }
  }

  function hideModal() {
    if (modalElement) {
      modalElement.classList.add("captchaflux-hidden");
    }
  }

  // Listen for messages from detector and solver
  window.addEventListener("message", (event) => {
    if (event.source !== window) return;

    const { type, ...data } = event.data;

    switch (type) {
      case "CAPTCHAFLUX_SHOW_MODAL":
        showModal(data.captchaType, data.stage);
        break;
      case "CAPTCHAFLUX_UPDATE_MODAL":
        updateModalStage(data.stage, data);
        break;
      case "CAPTCHAFLUX_HIDE_MODAL":
        hideModal();
        break;
      case "CAPTCHAFLUX_SOLVED":
        updateModalStage("filling", data);
        setTimeout(() => updateModalStage("solved", data), 500);
        break;
    }
  });
})();
