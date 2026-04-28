import { NextRequest } from "next/server";
import { API_BASE_URL, ALLOWED_TEST_DOMAINS } from "@/lib/constants";

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

function isDomainAllowed(url: string): boolean {
  try {
    const parsed = new URL(url);
    const domain = parsed.hostname;
    return ALLOWED_TEST_DOMAINS.some(
      (allowed) => domain === allowed || domain.endsWith("." + allowed)
    );
  } catch {
    return false;
  }
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

  if (!isDomainAllowed(url)) {
    return Response.json(
      {
        error: `Domain not permitted. Add it to ALLOWED_TEST_DOMAINS or set NEXT_PUBLIC_ALLOWED_DOMAINS env var.`,
        allowed_domains: ALLOWED_TEST_DOMAINS,
      },
      { status: 403 }
    );
  }

  const result: VerifyResult = {
    captcha_detected: false,
    captcha_type: null,
    sitekey_present: false,
    engine_selected: null,
    fallback_chain: [],
    solve_attempted: false,
    latency_ms: 0,
    confidence_score: 0,
  };

  const startTime = Date.now();

  try {
    // Step 1: Fetch page HTML
    const pageResp = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/124.0.0.0",
      },
      signal: AbortSignal.timeout(15000),
    });
    const html = await pageResp.text();

    // Step 2: Detect captcha via captcha-solver-core
    const detectResp = await fetch(`${API_BASE_URL}/detect`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ html, url }),
      signal: AbortSignal.timeout(10000),
    });
    const detection = await detectResp.json();

    result.captcha_type = detection.captcha_type || null;
    result.captcha_detected =
      !!detection.captcha_type && detection.captcha_type !== "none";
    result.sitekey_present = !!detection.sitekey;
    result.confidence_score = detection.confidence || 0;

    if (!result.captcha_detected) {
      result.latency_ms = Date.now() - startTime;
      return Response.json(result);
    }

    // Step 3: Attempt solve via engine racing
    result.solve_attempted = true;
    const solveResp = await fetch(`${API_BASE_URL}/solve`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        captcha_type: detection.captcha_type,
        pageurl: url,
        sitekey: detection.sitekey,
      }),
      signal: AbortSignal.timeout(60000),
    });
    const solveResult = await solveResp.json();

    result.engine_selected = solveResult.engine_used || null;
    result.confidence_score = solveResult.confidence || result.confidence_score;
    result.fallback_chain = solveResult.fallback_chain || [
      solveResult.engine_used || "unknown",
    ];
    result.latency_ms = Date.now() - startTime;

    return Response.json(result);
  } catch (err) {
    result.latency_ms = Date.now() - startTime;
    result.error =
      err instanceof Error ? err.message : "Verification failed";
    return Response.json(result, { status: 500 });
  }
}
