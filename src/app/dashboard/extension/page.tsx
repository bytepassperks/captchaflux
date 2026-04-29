"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import {
  Puzzle,
  Download,
  Key,
  Shield,
  Zap,
  CheckCircle2,
  Copy,
  ExternalLink,
  Globe,
  Monitor,
  Settings,
  ArrowRight,
  Eye,
  EyeOff,
  RefreshCw,
} from "lucide-react";

const STEPS = [
  {
    number: 1,
    title: "Download the Extension",
    description:
      "Download the CaptchaFlux Chrome Extension package and extract it to a local folder.",
    icon: Download,
    details: [
      "Clone or download the extension/ folder from the CaptchaFlux repository",
      "Extract to a permanent location (e.g., ~/captchaflux-extension)",
      "Keep this folder — Chrome needs it to stay in place",
    ],
  },
  {
    number: 2,
    title: "Load in Chrome",
    description:
      "Open Chrome's extension management page and load the unpacked extension.",
    icon: Globe,
    details: [
      'Navigate to chrome://extensions in your browser',
      'Enable "Developer mode" toggle in the top-right corner',
      'Click "Load unpacked" and select the extension folder',
      "The CaptchaFlux icon should appear in your toolbar",
    ],
  },
  {
    number: 3,
    title: "Get Your API Key",
    description:
      "Copy your API key from the API Keys page in this dashboard.",
    icon: Key,
    details: [
      "Go to the API Keys page in the CaptchaFlux dashboard",
      "Copy your API key (starts with cflux_)",
      "Your key determines your tier and feature access",
    ],
  },
  {
    number: 4,
    title: "Activate the Extension",
    description:
      "Click the CaptchaFlux icon in your toolbar and enter your API key.",
    icon: Shield,
    details: [
      "Click the CaptchaFlux lightning bolt icon in your Chrome toolbar",
      "Paste your API key into the input field",
      'Click "Activate Extension"',
      "The status dot will turn green when connected",
    ],
  },
  {
    number: 5,
    title: "Start Browsing",
    description:
      "Visit any page with a captcha. CaptchaFlux will auto-detect and solve it.",
    icon: Zap,
    details: [
      "Navigate to any website with a captcha (e.g., textshift.org/login)",
      "A floating modal will appear when a captcha is detected",
      "The extension will automatically solve and fill the answer",
      "Use the popup to toggle auto-solve on/off",
    ],
  },
];

const FEATURES = [
  {
    icon: Monitor,
    title: "Auto-Detection",
    description:
      "Scans every page for reCAPTCHA v2/v3, hCaptcha, Turnstile, MTCaptcha, and text/image captchas in real-time.",
  },
  {
    icon: Zap,
    title: "Engine Racing",
    description:
      "Multiple solving engines race in parallel. OCR, Vision AI, Audio, Token Harvest, and Behavior Simulation.",
  },
  {
    icon: Shield,
    title: "In-Page Solving",
    description:
      "Solves the captcha and fills the answer directly on the page. No copy-paste needed.",
  },
  {
    icon: Settings,
    title: "Tier-Based Access",
    description:
      "Features scale with your plan. Starter gets OCR, Growth adds Vision + Racing, Pro unlocks everything.",
  },
];

const SUPPORTED_CAPTCHAS = [
  { name: "reCAPTCHA v2", color: "text-blue-400" },
  { name: "reCAPTCHA v3", color: "text-blue-400" },
  { name: "hCaptcha", color: "text-yellow-400" },
  { name: "Cloudflare Turnstile", color: "text-orange-400" },
  { name: "MTCaptcha", color: "text-teal-400" },
  { name: "Text/Image Captchas", color: "text-purple-400" },
];

export default function ExtensionPage() {
  const [verifyKey, setVerifyKey] = useState("");
  const [verifyResult, setVerifyResult] = useState<{
    status: "idle" | "loading" | "success" | "error";
    tier?: string;
    features?: string[];
    usage?: { used: number; limit: number };
    error?: string;
  }>({ status: "idle" });
  const [showKey, setShowKey] = useState(false);
  const [copiedStep, setCopiedStep] = useState<number | null>(null);

  async function handleVerifyKey() {
    if (!verifyKey.trim()) return;
    setVerifyResult({ status: "loading" });

    try {
      const resp = await fetch("/api/extension/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ apiKey: verifyKey.trim() }),
      });
      const data = await resp.json();

      if (!resp.ok || data.error) {
        setVerifyResult({
          status: "error",
          error: data.error || "Verification failed",
        });
        return;
      }

      setVerifyResult({
        status: "success",
        tier: data.tier,
        features: data.features,
        usage: data.usage,
      });
    } catch {
      setVerifyResult({ status: "error", error: "Connection failed" });
    }
  }

  function copyToClipboard(text: string, stepNum: number) {
    navigator.clipboard.writeText(text);
    setCopiedStep(stepNum);
    setTimeout(() => setCopiedStep(null), 2000);
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Chrome Extension</h1>
        <p className="text-muted-foreground mt-1">
          Auto-detect and solve captchas on any website directly in your browser
        </p>
      </div>

      {/* Hero Card */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-xl border border-primary/20 bg-gradient-to-br from-primary/5 to-transparent p-6"
      >
        <div className="flex items-start gap-5">
          <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-primary/10 border border-primary/20 flex-shrink-0">
            <Puzzle className="h-7 w-7 text-primary" />
          </div>
          <div className="flex-1">
            <h2 className="text-lg font-semibold">
              CaptchaFlux Browser Extension
            </h2>
            <p className="text-sm text-muted-foreground mt-1 max-w-2xl">
              Install the Chrome extension to automatically detect and solve
              captchas as you browse. Supports reCAPTCHA, hCaptcha, Turnstile,
              MTCaptcha, and text/image captchas. Connected to your CaptchaFlux
              account for tier-based access and usage tracking.
            </p>
            <div className="flex flex-wrap gap-2 mt-4">
              {SUPPORTED_CAPTCHAS.map((c) => (
                <span
                  key={c.name}
                  className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-card/50 border border-border/50 text-xs font-medium ${c.color}`}
                >
                  {c.name}
                </span>
              ))}
            </div>
          </div>
        </div>
      </motion.div>

      {/* Integration Steps */}
      <div>
        <h2 className="text-lg font-semibold mb-4">Setup Guide</h2>
        <div className="space-y-4">
          {STEPS.map((step, idx) => (
            <motion.div
              key={step.number}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.08 }}
              className="rounded-xl border border-border/50 bg-card/30 overflow-hidden"
            >
              <div className="p-5">
                <div className="flex items-start gap-4">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 border border-primary/20 flex-shrink-0 text-sm font-bold text-primary">
                    {step.number}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <step.icon className="h-4 w-4 text-muted-foreground" />
                      <h3 className="font-semibold text-sm">{step.title}</h3>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">
                      {step.description}
                    </p>
                    <ul className="mt-3 space-y-1.5">
                      {step.details.map((detail, i) => (
                        <li
                          key={i}
                          className="flex items-start gap-2 text-sm text-muted-foreground"
                        >
                          <ArrowRight className="h-3 w-3 mt-1 text-primary/60 flex-shrink-0" />
                          <span>{detail}</span>
                        </li>
                      ))}
                    </ul>
                    {step.number === 2 && (
                      <div className="mt-3">
                        <button
                          onClick={() =>
                            copyToClipboard(
                              "chrome://extensions",
                              step.number
                            )
                          }
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-card border border-border/50 text-xs font-mono text-muted-foreground hover:text-foreground hover:border-primary/30 transition-colors"
                        >
                          {copiedStep === step.number ? (
                            <CheckCircle2 className="h-3 w-3 text-green-400" />
                          ) : (
                            <Copy className="h-3 w-3" />
                          )}
                          chrome://extensions
                        </button>
                      </div>
                    )}
                    {step.number === 3 && (
                      <div className="mt-3">
                        <a
                          href="/dashboard/api"
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-primary/10 border border-primary/20 text-xs font-medium text-primary hover:bg-primary/15 transition-colors"
                        >
                          <Key className="h-3 w-3" />
                          Go to API Keys
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Verify Extension Connection */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
      >
        <h2 className="text-lg font-semibold mb-4">
          Verify Extension Connection
        </h2>
        <div className="rounded-xl border border-border/50 bg-card/30 p-5">
          <p className="text-sm text-muted-foreground mb-4">
            Test your API key to verify the extension can connect to CaptchaFlux
            services. This checks authentication, tier access, and available
            features.
          </p>
          <div className="flex gap-3">
            <div className="relative flex-1">
              <input
                type={showKey ? "text" : "password"}
                value={verifyKey}
                onChange={(e) => setVerifyKey(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleVerifyKey()}
                placeholder="cflux_starter_..."
                className="w-full px-4 py-2.5 rounded-lg bg-background/50 border border-border/50 text-sm font-mono focus:outline-none focus:border-primary/50 pr-10"
              />
              <button
                onClick={() => setShowKey(!showKey)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                {showKey ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </button>
            </div>
            <button
              onClick={handleVerifyKey}
              disabled={
                !verifyKey.trim() || verifyResult.status === "loading"
              }
              className="px-5 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 transition-colors"
            >
              {verifyResult.status === "loading" ? (
                <RefreshCw className="h-4 w-4 animate-spin" />
              ) : (
                <Shield className="h-4 w-4" />
              )}
              Verify
            </button>
          </div>

          {/* Verify Result */}
          {verifyResult.status === "success" && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              className="mt-4 p-4 rounded-lg bg-green-500/5 border border-green-500/20"
            >
              <div className="flex items-center gap-2 mb-3">
                <CheckCircle2 className="h-4 w-4 text-green-400" />
                <span className="text-sm font-medium text-green-400">
                  Connection verified
                </span>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <div className="text-xs text-muted-foreground mb-1">
                    Tier
                  </div>
                  <div className="text-sm font-semibold capitalize">
                    {verifyResult.tier}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground mb-1">
                    Usage
                  </div>
                  <div className="text-sm font-semibold">
                    {verifyResult.usage?.used?.toLocaleString()} /{" "}
                    {verifyResult.usage?.limit?.toLocaleString()}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground mb-1">
                    Features
                  </div>
                  <div className="text-sm font-semibold">
                    {verifyResult.features?.length || 0} active
                  </div>
                </div>
              </div>
              {verifyResult.features && (
                <div className="flex flex-wrap gap-1.5 mt-3">
                  {verifyResult.features.map((f) => (
                    <span
                      key={f}
                      className="px-2 py-0.5 rounded bg-green-500/10 border border-green-500/15 text-[11px] text-green-300/80"
                    >
                      {f.replace(/_/g, " ")}
                    </span>
                  ))}
                </div>
              )}
            </motion.div>
          )}

          {verifyResult.status === "error" && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              className="mt-4 p-4 rounded-lg bg-red-500/5 border border-red-500/20"
            >
              <div className="flex items-center gap-2">
                <Shield className="h-4 w-4 text-red-400" />
                <span className="text-sm text-red-400">
                  {verifyResult.error}
                </span>
              </div>
            </motion.div>
          )}
        </div>
      </motion.div>

      {/* Features Grid */}
      <div>
        <h2 className="text-lg font-semibold mb-4">Extension Features</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {FEATURES.map((feature, idx) => (
            <motion.div
              key={feature.title}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 + idx * 0.08 }}
              className="rounded-xl border border-border/50 bg-card/30 p-5"
            >
              <div className="flex items-start gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 border border-primary/20 flex-shrink-0">
                  <feature.icon className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold text-sm">{feature.title}</h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    {feature.description}
                  </p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Tier Comparison */}
      <div>
        <h2 className="text-lg font-semibold mb-4">
          Extension Features by Tier
        </h2>
        <div className="rounded-xl border border-border/50 bg-card/30 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border/50">
                <th className="text-left py-3 px-5 font-medium text-muted-foreground">
                  Feature
                </th>
                <th className="text-center py-3 px-4 font-medium text-blue-400">
                  Starter
                </th>
                <th className="text-center py-3 px-4 font-medium text-teal-400">
                  Growth
                </th>
                <th className="text-center py-3 px-4 font-medium text-amber-400">
                  Pro
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/30">
              {[
                { name: "Captcha Detection", starter: true, growth: true, pro: true },
                { name: "OCR Solving", starter: true, growth: true, pro: true },
                { name: "Vision AI Solving", starter: false, growth: true, pro: true },
                { name: "Audio Solving", starter: false, growth: true, pro: true },
                { name: "Engine Racing", starter: false, growth: true, pro: true },
                { name: "Browser Pool", starter: false, growth: true, pro: true },
                { name: "Token Harvesting", starter: false, growth: false, pro: true },
                { name: "Behavior Simulation", starter: false, growth: false, pro: true },
                { name: "Adaptive Routing", starter: false, growth: false, pro: true },
                { name: "Analytics Export", starter: false, growth: false, pro: true },
                { name: "Monthly Requests", starter: "10k", growth: "100k", pro: "1M" },
              ].map((row) => (
                <tr key={row.name}>
                  <td className="py-2.5 px-5 text-muted-foreground">
                    {row.name}
                  </td>
                  {(["starter", "growth", "pro"] as const).map((tier) => (
                    <td key={tier} className="text-center py-2.5 px-4">
                      {typeof row[tier] === "boolean" ? (
                        row[tier] ? (
                          <CheckCircle2 className="h-4 w-4 text-green-400 mx-auto" />
                        ) : (
                          <span className="text-muted-foreground/30">—</span>
                        )
                      ) : (
                        <span className="text-xs font-mono font-medium">
                          {row[tier]}
                        </span>
                      )}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
