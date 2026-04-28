export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || "https://captcha-solver-core.onrender.com";

export const DODO_CHECKOUT_LINKS = {
  starter: process.env.NEXT_PUBLIC_DODO_STARTER || "#",
  growth: process.env.NEXT_PUBLIC_DODO_GROWTH || "#",
  pro: process.env.NEXT_PUBLIC_DODO_PRO || "#",
};

export const PRICING_TIERS = [
  {
    name: "Starter",
    price: 29,
    period: "month",
    description: "For side projects and prototyping",
    features: [
      "10k requests / month",
      "Benchmark dashboard",
      "Detection API",
      "Email support",
    ],
    cta: "Start Building",
    popular: false,
    checkoutLink: "starter" as const,
  },
  {
    name: "Growth",
    price: 79,
    period: "month",
    description: "For production automation pipelines",
    features: [
      "100k requests / month",
      "Engine racing",
      "Browser pool (4 slots)",
      "Adaptive routing",
      "Priority support",
    ],
    cta: "Scale Up",
    popular: true,
    checkoutLink: "growth" as const,
  },
  {
    name: "Pro",
    price: 199,
    period: "month",
    description: "For teams running critical infrastructure",
    features: [
      "Unlimited benchmarking",
      "Priority arbitration",
      "Profile persistence",
      "Analytics export",
      "Dedicated support",
      "Custom engine config",
    ],
    cta: "Go Pro",
    popular: false,
    checkoutLink: "pro" as const,
  },
] as const;

export const PIPELINE_STEPS = [
  { label: "Detected Captcha", color: "flux-blue", delay: 0 },
  { label: "Selected Engine", color: "flux-teal", delay: 0.3 },
  { label: "Racing Engines", color: "flux-amber", delay: 0.6 },
  { label: "Token Returned", color: "flux-purple", delay: 0.9 },
  { label: "Automation Continues", color: "flux-teal", delay: 1.2 },
] as const;

export const ARCHITECTURE_FEATURES = [
  {
    title: "Persistent Browser Identities",
    description:
      "Browser profiles accumulate trust over time, dramatically improving checkbox auto-pass rates.",
    icon: "fingerprint",
  },
  {
    title: "Parallel Engine Racing",
    description:
      "Multiple solving engines race simultaneously. Fastest result wins within a 250ms arbitration window.",
    icon: "zap",
  },
  {
    title: "Rolling Benchmark Telemetry",
    description:
      "7-day rolling performance history with per-engine stats. Know exactly how your pipeline performs.",
    icon: "activity",
  },
  {
    title: "Adaptive Routing Intelligence",
    description:
      "Engine priority auto-reorders based on rolling success rates and latency measurements.",
    icon: "brain",
  },
  {
    title: "Memory-Speed Token Cache",
    description:
      "In-memory token caching delivers sub-millisecond lookups for pre-harvested captcha tokens.",
    icon: "database",
  },
  {
    title: "Detector Result Caching",
    description:
      "Domain-to-captcha-type mappings cached in memory. Repeat visits skip detection entirely.",
    icon: "layers",
  },
] as const;

export const FAQ_ITEMS = [
  {
    question: "What captcha types does CaptchaFlux support?",
    answer:
      "CaptchaFlux detects and processes reCAPTCHA v2/v3, hCaptcha, Cloudflare Turnstile, and text/image captchas through five specialized engines: OCR, Vision (YOLOv8), Audio (Whisper), Token Harvest, and Behavior Simulation.",
  },
  {
    question: "How does engine racing work?",
    answer:
      "When a solve request comes in, multiple engines are launched in parallel. The first successful result is returned within a 250ms arbitration window — if a higher-confidence result arrives during that window, it's preferred over the first. This dramatically reduces worst-case latency.",
  },
  {
    question: "Is this a captcha-solving service?",
    answer:
      "CaptchaFlux is a captcha observability and reliability API. It's designed for QA teams, automation engineers, accessibility testers, and RPA builders who need to understand and handle captcha interactions in their workflows.",
  },
  {
    question: "What's the typical solve latency?",
    answer:
      "OCR solves complete in ~200ms. Vision and audio engines typically resolve in 1-2 seconds. Browser-based behavioral simulation (for Turnstile) runs in 6-15 seconds. Token cache hits return in under 10ms.",
  },
  {
    question: "Can I self-host CaptchaFlux?",
    answer:
      "Yes. CaptchaFlux runs as a Docker container and can be deployed on any infrastructure with 2GB+ RAM. The API is identical whether cloud-hosted or self-hosted.",
  },
  {
    question: "How does the benchmark runner work?",
    answer:
      "The continuous benchmark scheduler tests captcha detection and solving against rotating demo endpoints every 6 hours. Results are stored in a rolling 7-day history with per-engine statistics, accessible via the /benchmark/* API endpoints.",
  },
] as const;
