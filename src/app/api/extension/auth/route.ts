import { NextRequest } from "next/server";

interface AuthResponse {
  authenticated: boolean;
  tier: string;
  usage: { used: number; limit: number };
  email: string;
  features: string[];
}

const TIER_LIMITS: Record<string, number> = {
  starter: 10000,
  growth: 100000,
  pro: 1000000,
};

const TIER_FEATURES: Record<string, string[]> = {
  starter: ["detection", "ocr_solve", "basic_support"],
  growth: [
    "detection",
    "ocr_solve",
    "vision_solve",
    "audio_solve",
    "engine_racing",
    "browser_pool",
    "priority_support",
  ],
  pro: [
    "detection",
    "ocr_solve",
    "vision_solve",
    "audio_solve",
    "engine_racing",
    "browser_pool",
    "token_harvest",
    "behavior_solve",
    "adaptive_routing",
    "analytics_export",
    "dedicated_support",
  ],
};

export async function POST(request: NextRequest) {
  let body: { apiKey?: string };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { apiKey } = body;

  if (!apiKey || typeof apiKey !== "string") {
    return Response.json(
      { error: "Missing required field: apiKey" },
      { status: 400 }
    );
  }

  if (!apiKey.startsWith("cflux_")) {
    return Response.json(
      { error: "Invalid API key format. Keys must start with cflux_" },
      { status: 401 }
    );
  }

  // Decode tier from key prefix pattern: cflux_{tier}_{hash}
  const parts = apiKey.split("_");
  const tier = parts.length >= 3 ? parts[1] : "starter";
  const validTiers = ["starter", "growth", "pro"];
  const resolvedTier = validTiers.includes(tier) ? tier : "starter";

  const limit = TIER_LIMITS[resolvedTier] || 10000;

  // In production, this would query a database for actual usage
  const usage = {
    used: Math.floor(Math.random() * Math.min(limit * 0.3, 500)),
    limit,
  };

  const response: AuthResponse = {
    authenticated: true,
    tier: resolvedTier,
    usage,
    email: "user@captchaflux.com",
    features: TIER_FEATURES[resolvedTier] || TIER_FEATURES.starter,
  };

  return Response.json(response);
}
