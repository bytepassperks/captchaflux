import { NextRequest } from "next/server";
import { API_BASE_URL } from "@/lib/constants";

interface VerifyResult {
  captcha_detected: boolean;
  captcha_type: string | null;
  sitekey_present: boolean;
  engine_selected: string | null;
  fallback_chain: string[];
  solve_attempted: boolean;
  solve_success: boolean;
  token: string | null;
  latency_ms: number;
  confidence_score: number;
  error?: string;
}

export async function POST(request: NextRequest) {
  let body: { url?: string };
  try {
    body = await request.json();
  } catch {
    return Response.json(
      { error: "Invalid JSON body" },
      { status: 400 }
    );
  }

  const { url } = body;

  if (!url || typeof url !== "string") {
    return Response.json(
      { error: "Missing required field: url" },
      { status: 400 }
    );
  }

  try {
    new URL(url);
  } catch {
    return Response.json(
      { error: "Invalid URL format" },
      { status: 400 }
    );
  }

  try {
    // Proxy to captcha-solver-core's /verify-site which uses browser pool
    // for full JS rendering (handles MTCaptcha, reCAPTCHA, hCaptcha, Turnstile, etc.)
    const resp = await fetch(`${API_BASE_URL}/verify-site`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url }),
      signal: AbortSignal.timeout(90000),
    });

    if (!resp.ok) {
      const errBody = await resp.text();
      return Response.json(
        { error: `Solver service error: ${resp.status} ${errBody}` },
        { status: resp.status }
      );
    }

    const result: VerifyResult = await resp.json();
    return Response.json(result);
  } catch (err) {
    return Response.json(
      {
        captcha_detected: false,
        captcha_type: null,
        sitekey_present: false,
        engine_selected: null,
        fallback_chain: [],
        solve_attempted: false,
        solve_success: false,
        token: null,
        latency_ms: 0,
        confidence_score: 0,
        error: err instanceof Error ? err.message : "Verification failed",
      },
      { status: 500 }
    );
  }
}
