"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Copy, Plus, Trash2, Eye, EyeOff } from "lucide-react";

interface ApiKey {
  id: string;
  name: string;
  key: string;
  created: string;
  lastUsed: string;
  requests: number;
}

const mockKeys: ApiKey[] = [
  {
    id: "1",
    name: "Production",
    key: "cflx_live_8f2a9b4c1d3e5f6a7b8c9d0e1f2a3b4c",
    created: "2026-04-15",
    lastUsed: "2026-04-28",
    requests: 12847,
  },
  {
    id: "2",
    name: "Staging",
    key: "cflx_test_1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d",
    created: "2026-04-20",
    lastUsed: "2026-04-27",
    requests: 3421,
  },
];

export default function ApiKeysPage() {
  const [keys] = useState<ApiKey[]>(mockKeys);
  const [visibleKeys, setVisibleKeys] = useState<Record<string, boolean>>({});
  const [copied, setCopied] = useState<string | null>(null);

  function toggleVisibility(id: string) {
    setVisibleKeys((prev) => ({ ...prev, [id]: !prev[id] }));
  }

  function copyKey(key: string, id: string) {
    navigator.clipboard.writeText(key);
    setCopied(id);
    setTimeout(() => setCopied(null), 2000);
  }

  function maskKey(key: string) {
    return key.slice(0, 10) + "••••••••••••••••••••••••";
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">API Keys</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Manage your CaptchaFlux API credentials
          </p>
        </div>
        <button className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors">
          <Plus className="h-4 w-4" />
          Create Key
        </button>
      </div>

      <div className="glass-card rounded-xl overflow-hidden">
        <div className="grid grid-cols-[1fr_2fr_1fr_1fr_auto] gap-4 px-6 py-3 border-b border-border/30 text-xs font-medium text-muted-foreground uppercase tracking-wider">
          <span>Name</span>
          <span>Key</span>
          <span>Last Used</span>
          <span>Requests</span>
          <span>Actions</span>
        </div>

        {keys.map((apiKey, i) => (
          <motion.div
            key={apiKey.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            className="grid grid-cols-[1fr_2fr_1fr_1fr_auto] gap-4 px-6 py-4 border-b border-border/20 last:border-0 items-center"
          >
            <span className="text-sm font-medium">{apiKey.name}</span>
            <div className="flex items-center gap-2">
              <code className="text-xs font-mono text-muted-foreground">
                {visibleKeys[apiKey.id]
                  ? apiKey.key
                  : maskKey(apiKey.key)}
              </code>
              <button
                onClick={() => toggleVisibility(apiKey.id)}
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                {visibleKeys[apiKey.id] ? (
                  <EyeOff className="h-3.5 w-3.5" />
                ) : (
                  <Eye className="h-3.5 w-3.5" />
                )}
              </button>
              <button
                onClick={() => copyKey(apiKey.key, apiKey.id)}
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                <Copy className="h-3.5 w-3.5" />
              </button>
              {copied === apiKey.id && (
                <span className="text-xs text-flux-teal">Copied</span>
              )}
            </div>
            <span className="text-sm text-muted-foreground">
              {apiKey.lastUsed}
            </span>
            <span className="text-sm font-mono">
              {apiKey.requests.toLocaleString()}
            </span>
            <button className="text-muted-foreground hover:text-flux-red transition-colors">
              <Trash2 className="h-4 w-4" />
            </button>
          </motion.div>
        ))}
      </div>

      <div className="glass-card rounded-xl p-6">
        <h3 className="text-sm font-semibold mb-4">Quick Start</h3>
        <div className="bg-background/50 rounded-lg p-4 font-mono text-sm">
          <div className="text-muted-foreground">
            <span className="text-flux-purple">curl</span>{" "}
            <span className="text-flux-teal">-X POST</span>{" "}
            https://api.captchaflux.com/solve \
          </div>
          <div className="text-muted-foreground pl-4">
            <span className="text-flux-teal">-H</span>{" "}
            <span className="text-flux-amber">
              &quot;Authorization: Bearer cflx_live_...&quot;
            </span>{" "}
            \
          </div>
          <div className="text-muted-foreground pl-4">
            <span className="text-flux-teal">-H</span>{" "}
            <span className="text-flux-amber">
              &quot;Content-Type: application/json&quot;
            </span>{" "}
            \
          </div>
          <div className="text-muted-foreground pl-4">
            <span className="text-flux-teal">-d</span>{" "}
            <span className="text-flux-amber">
              &apos;&#123;&quot;captcha_type&quot;: &quot;recaptcha_v2&quot;,
              &quot;pageurl&quot;: &quot;...&quot;,
              &quot;sitekey&quot;: &quot;...&quot;&#125;&apos;
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
