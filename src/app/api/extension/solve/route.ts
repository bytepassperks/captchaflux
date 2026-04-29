import { NextRequest } from "next/server";
import { API_BASE_URL } from "@/lib/constants";

interface SolveRequest {
  apiKey: string;
  captchaType: string;
  sitekey?: string;
  pageUrl: string;
  captchaImageBase64?: string;
}

interface SolveResponse {
  success: boolean;
  token?: string;
  engineUsed?: string;
  confidence?: number;
  solveTimeMs?: number;
  error?: string;
}

export async function POST(request: NextRequest) {
  let body: SolveRequest;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { apiKey, captchaType, sitekey, pageUrl, captchaImageBase64 } = body;

  if (!apiKey || !apiKey.startsWith("cflux_")) {
    return Response.json({ error: "Invalid API key" }, { status: 401 });
  }

  if (!captchaType || !pageUrl) {
    return Response.json(
      { error: "Missing required fields: captchaType, pageUrl" },
      { status: 400 }
    );
  }

  try {
    // For image-based captchas (MTCaptcha, text), use the /solve endpoint with image
    if (captchaImageBase64) {
      const resp = await fetch(`${API_BASE_URL}/solve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          captcha_type: captchaType,
          pageurl: pageUrl,
          sitekey: sitekey || undefined,
          captcha_image_base64: captchaImageBase64,
        }),
        signal: AbortSignal.timeout(60000),
      });

      if (!resp.ok) {
        const errText = await resp.text();
        return Response.json(
          { success: false, error: `Solver error: ${resp.status} ${errText}` },
          { status: resp.status }
        );
      }

      const result = await resp.json();
      const response: SolveResponse = {
        success: result.success,
        token: result.token,
        engineUsed: result.engine_used,
        confidence: result.confidence,
        solveTimeMs: result.solve_time_ms,
        error: result.error,
      };
      return Response.json(response);
    }

    // For token-based captchas (reCAPTCHA, hCaptcha, Turnstile), use /verify-site
    const resp = await fetch(`${API_BASE_URL}/verify-site`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url: pageUrl }),
      signal: AbortSignal.timeout(90000),
    });

    if (!resp.ok) {
      const errText = await resp.text();
      return Response.json(
        { success: false, error: `Solver error: ${resp.status} ${errText}` },
        { status: resp.status }
      );
    }

    const result = await resp.json();
    const response: SolveResponse = {
      success: result.solve_success || false,
      token: result.token,
      engineUsed: result.engine_selected,
      confidence: result.confidence_score,
      solveTimeMs: result.latency_ms,
      error: result.error,
    };
    return Response.json(response);
  } catch (err) {
    return Response.json(
      {
        success: false,
        error: err instanceof Error ? err.message : "Solve failed",
      },
      { status: 500 }
    );
  }
}
