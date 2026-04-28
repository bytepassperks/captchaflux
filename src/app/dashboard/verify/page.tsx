"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Globe,
  Search,
  Shield,
  Clock,
  Cpu,
  Target,
  AlertCircle,
  Loader2,
  CheckCircle2,
  XCircle,
} from "lucide-react";

interface VerifyResult {
  captcha_detected: boolean;
  captcha_type: string | null;
  sitekey_present: boolean;
  engine_selected: string | null;
  fallback_chain: string[];
  solve_attempted: boolean;
  latency_ms: number;
  confidence_score: number;
  error?: string;
}

export default function VerifySitePage() {
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<VerifyResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleVerify(e: React.FormEvent) {
    e.preventDefault();
    if (!url.trim() || loading) return;

    setLoading(true);
    setResult(null);
    setError(null);

    try {
      const resp = await fetch("/api/verify-site", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: url.trim() }),
      });
      const data = await resp.json();

      if (!resp.ok) {
        setError(data.error || `Request failed (${resp.status})`);
        return;
      }

      setResult(data);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Network error — try again"
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Verify Site</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Test captcha detection and solving on domains you own or have
          permission to test
        </p>
      </div>

      {/* URL Input */}
      <form onSubmit={handleVerify} className="glass-card rounded-xl p-6">
        <label
          htmlFor="verify-url"
          className="block text-sm font-medium mb-3"
        >
          Target URL
        </label>
        <div className="flex gap-3">
          <div className="relative flex-1">
            <Globe className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              id="verify-url"
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://example.com/page-with-captcha"
              className="w-full rounded-lg border border-border/50 bg-background/50 py-2.5 pl-10 pr-4 text-sm font-mono placeholder:text-muted-foreground/50 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/30 transition-colors"
              disabled={loading}
            />
          </div>
          <button
            type="submit"
            disabled={loading || !url.trim()}
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-6 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Search className="h-4 w-4" />
            )}
            {loading ? "Verifying…" : "Verify"}
          </button>
        </div>
        <p className="mt-2 text-xs text-muted-foreground">
          Only domains in the allowlist can be tested. Demo captcha sites are
          pre-approved.
        </p>
      </form>

      {/* Error */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="glass-card rounded-xl p-5 border border-red-500/20"
          >
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-red-400 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-red-400">
                  Verification Failed
                </p>
                <p className="mt-1 text-sm text-muted-foreground">{error}</p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Loading skeleton */}
      {loading && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="glass-card rounded-xl p-6"
        >
          <div className="flex items-center gap-3 mb-6">
            <Loader2 className="h-5 w-5 animate-spin text-primary" />
            <p className="text-sm font-medium">
              Running verification pipeline…
            </p>
          </div>
          <div className="space-y-3">
            {["Fetching page HTML…", "Detecting captcha type…", "Attempting engine racing solve…"].map(
              (step, i) => (
                <div key={i} className="flex items-center gap-2 text-sm text-muted-foreground">
                  <div className="h-1.5 w-1.5 rounded-full bg-primary/40 animate-pulse" />
                  {step}
                </div>
              )
            )}
          </div>
        </motion.div>
      )}

      {/* Results */}
      <AnimatePresence>
        {result && !loading && (
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="space-y-6"
          >
            {/* Detection status banner */}
            <div
              className={`glass-card rounded-xl p-5 border ${
                result.captcha_detected
                  ? "border-flux-teal/20"
                  : "border-flux-amber/20"
              }`}
            >
              <div className="flex items-center gap-3">
                {result.captcha_detected ? (
                  <CheckCircle2 className="h-5 w-5 text-flux-teal" />
                ) : (
                  <XCircle className="h-5 w-5 text-flux-amber" />
                )}
                <div>
                  <p className="text-sm font-medium">
                    {result.captcha_detected
                      ? `Captcha detected: ${result.captcha_type}`
                      : "No captcha detected on this page"}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Completed in {result.latency_ms.toLocaleString()}ms
                  </p>
                </div>
              </div>
            </div>

            {/* Metric cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <ResultCard
                icon={<Shield className="h-4 w-4" />}
                label="Detection"
                value={
                  result.captcha_detected
                    ? result.captcha_type ?? "unknown"
                    : "none"
                }
                color={result.captcha_detected ? "#00E0B8" : "#6B7280"}
                delay={0}
              />
              <ResultCard
                icon={<Clock className="h-4 w-4" />}
                label="Latency"
                value={`${result.latency_ms.toLocaleString()}ms`}
                color="#5B8CFF"
                delay={0.05}
              />
              <ResultCard
                icon={<Cpu className="h-4 w-4" />}
                label="Engine"
                value={result.engine_selected ?? "n/a"}
                color="#A78BFA"
                delay={0.1}
              />
              <ResultCard
                icon={<Target className="h-4 w-4" />}
                label="Confidence"
                value={
                  result.confidence_score > 0
                    ? `${(result.confidence_score * 100).toFixed(0)}%`
                    : "n/a"
                }
                color="#FFB020"
                delay={0.15}
              />
            </div>

            {/* Detail table */}
            <div className="glass-card rounded-xl p-6">
              <h3 className="text-sm font-semibold mb-4">
                Verification Details
              </h3>
              <div className="space-y-3">
                {[
                  {
                    label: "Captcha Detected",
                    value: result.captcha_detected ? "Yes" : "No",
                  },
                  {
                    label: "Captcha Type",
                    value: result.captcha_type ?? "—",
                  },
                  {
                    label: "Sitekey Present",
                    value: result.sitekey_present ? "Yes" : "No",
                  },
                  {
                    label: "Solve Attempted",
                    value: result.solve_attempted ? "Yes" : "No",
                  },
                  {
                    label: "Engine Selected",
                    value: result.engine_selected ?? "—",
                  },
                  {
                    label: "Fallback Chain",
                    value:
                      result.fallback_chain.length > 0
                        ? result.fallback_chain.join(" → ")
                        : "—",
                  },
                  {
                    label: "Confidence Score",
                    value:
                      result.confidence_score > 0
                        ? `${(result.confidence_score * 100).toFixed(1)}%`
                        : "—",
                  },
                  {
                    label: "Total Latency",
                    value: `${result.latency_ms.toLocaleString()}ms`,
                  },
                ].map((row) => (
                  <div
                    key={row.label}
                    className="flex items-center justify-between py-2 border-b border-border/20 last:border-0"
                  >
                    <span className="text-sm text-muted-foreground">
                      {row.label}
                    </span>
                    <span className="text-sm font-mono">{row.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function ResultCard({
  icon,
  label,
  value,
  color,
  delay,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  color: string;
  delay: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay }}
      className="glass-card rounded-xl p-5"
    >
      <div className="flex items-center gap-2 text-muted-foreground mb-2">
        {icon}
        <span className="text-xs font-medium uppercase tracking-wider">
          {label}
        </span>
      </div>
      <p className="text-lg font-bold font-mono" style={{ color }}>
        {value}
      </p>
    </motion.div>
  );
}
