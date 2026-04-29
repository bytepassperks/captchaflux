import { NextRequest } from "next/server";
import { API_BASE_URL } from "@/lib/constants";

interface DetectRequest {
  apiKey: string;
  html: string;
  pageUrl: string;
}

interface DetectResponse {
  captchaDetected: boolean;
  captchaType: string | null;
  sitekey: string | null;
  confidence: number;
}

export async function POST(request: NextRequest) {
  let body: DetectRequest;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { apiKey, html, pageUrl } = body;

  if (!apiKey || !apiKey.startsWith("cflux_")) {
    return Response.json({ error: "Invalid API key" }, { status: 401 });
  }

  if (!html || !pageUrl) {
    return Response.json(
      { error: "Missing required fields: html, pageUrl" },
      { status: 400 }
    );
  }

  try {
    const resp = await fetch(`${API_BASE_URL}/detect`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ html, url: pageUrl }),
      signal: AbortSignal.timeout(30000),
    });

    if (!resp.ok) {
      return Response.json(
        { captchaDetected: false, captchaType: null, sitekey: null, confidence: 0 },
        { status: 200 }
      );
    }

    const result = await resp.json();
    const response: DetectResponse = {
      captchaDetected: !!result.captcha_type && result.captcha_type !== "unknown",
      captchaType: result.captcha_type || null,
      sitekey: result.sitekey || null,
      confidence: result.confidence || 0,
    };
    return Response.json(response);
  } catch {
    return Response.json(
      { captchaDetected: false, captchaType: null, sitekey: null, confidence: 0 },
      { status: 200 }
    );
  }
}
