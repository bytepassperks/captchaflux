import { NextRequest } from "next/server";
import { API_BASE_URL } from "@/lib/constants";

interface SolveRequest {
  apiKey: string;
  captchaType: string;
  sitekey?: string;
  pageUrl: string;
  captchaImageBase64?: string;
  challengePrompt?: string;
  gridSize?: number;
}

interface SolveResponse {
  success: boolean;
  token?: string;
  engineUsed?: string;
  confidence?: number;
  solveTimeMs?: number;
  error?: string;
}

const PAGEGRID_API_KEY = process.env.CLAUDE_API_KEY || "";
const AWS_ACCESS_KEY = process.env.AWS_ACCESS_KEY_ID || "";
const AWS_SECRET_KEY = process.env.AWS_SECRET_ACCESS_KEY || "";
const AWS_REGION = process.env.AWS_DEFAULT_REGION || "us-east-1";

async function solveImageChallengeWithVision(
  imageBase64: string,
  prompt: string,
  gridSize: number
): Promise<{ indices: number[]; confidence: number }> {
  const rows = Math.round(Math.sqrt(gridSize)) || 3;
  const cols = Math.ceil(gridSize / rows);

  // Build dynamic grid numbering
  let gridMap = "";
  for (let r = 0; r < rows; r++) {
    const cells = [];
    for (let c = 0; c < cols; c++) {
      const idx = r * cols + c;
      if (idx < gridSize) cells.push(idx);
    }
    gridMap += `Row ${r}: cells ${cells.join(", ")}\n`;
  }

  const visionPrompt = `You are analyzing a CAPTCHA image challenge screenshot. The screenshot shows a web page with a CAPTCHA popup/overlay containing a ${rows}x${cols} grid of images.

The challenge prompt says: "${prompt}"

The grid cells are numbered 0 to ${gridSize - 1}, left to right, top to bottom:
${gridMap}
Look at the screenshot carefully. Find the image grid popup/overlay. Identify which grid cells contain the requested object.

IMPORTANT RULES:
- Only select cells that CLEARLY contain the target object
- The grid is inside a popup/dialog overlay on the page, not the background
- Cell numbering starts at 0 (top-left) and goes left-to-right, top-to-bottom
- Return ONLY a JSON object, no other text

Format: {"indices": [0, 4, 8], "confidence": 0.85}

Return ONLY the JSON, no other text.`;

  // Try PageGrid Claude first
  if (PAGEGRID_API_KEY) {
    try {
      const resp = await fetch("https://api.pagegrid.in/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": PAGEGRID_API_KEY,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 200,
          messages: [
            {
              role: "user",
              content: [
                {
                  type: "image",
                  source: {
                    type: "base64",
                    media_type: "image/png",
                    data: imageBase64,
                  },
                },
                { type: "text", text: visionPrompt },
              ],
            },
          ],
        }),
        signal: AbortSignal.timeout(30000),
      });

      if (resp.ok) {
        const data = await resp.json();
        const text =
          data.content?.[0]?.text || data.choices?.[0]?.message?.content || "";
        const jsonMatch = text.match(/\{[\s\S]*?\}/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]);
          return {
            indices: parsed.indices || [],
            confidence: parsed.confidence || 0.8,
          };
        }
      }
    } catch (e) {
      console.error("PageGrid vision failed:", e);
    }
  }

  // Fallback: AWS Bedrock Claude
  if (AWS_ACCESS_KEY && AWS_SECRET_KEY) {
    try {
      const { SignatureV4 } = await import("@smithy/signature-v4");
      const { Sha256 } = await import("@aws-crypto/sha256-js");

      const bedrockBody = JSON.stringify({
        anthropic_version: "bedrock-2023-05-31",
        max_tokens: 200,
        messages: [
          {
            role: "user",
            content: [
              {
                type: "image",
                source: {
                  type: "base64",
                  media_type: "image/png",
                  data: imageBase64,
                },
              },
              { type: "text", text: visionPrompt },
            ],
          },
        ],
      });

      const modelId = "us.anthropic.claude-3-haiku-20240307-v1:0";
      const url = `https://bedrock-runtime.${AWS_REGION}.amazonaws.com/model/${modelId}/invoke`;

      const signer = new SignatureV4({
        service: "bedrock",
        region: AWS_REGION,
        credentials: {
          accessKeyId: AWS_ACCESS_KEY,
          secretAccessKey: AWS_SECRET_KEY,
        },
        sha256: Sha256,
      });

      const signed = await signer.sign({
        method: "POST",
        protocol: "https:",
        hostname: `bedrock-runtime.${AWS_REGION}.amazonaws.com`,
        path: `/model/${modelId}/invoke`,
        headers: {
          "Content-Type": "application/json",
          host: `bedrock-runtime.${AWS_REGION}.amazonaws.com`,
        },
        body: bedrockBody,
      });

      const resp = await fetch(url, {
        method: "POST",
        headers: signed.headers as Record<string, string>,
        body: bedrockBody,
        signal: AbortSignal.timeout(30000),
      });

      if (resp.ok) {
        const data = await resp.json();
        const text = data.content?.[0]?.text || "";
        const jsonMatch = text.match(/\{[\s\S]*?\}/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]);
          return {
            indices: parsed.indices || [],
            confidence: parsed.confidence || 0.7,
          };
        }
      }
    } catch (e) {
      console.error("AWS Bedrock vision failed:", e);
    }
  }

  return { indices: [], confidence: 0 };
}

export async function POST(request: NextRequest) {
  let body: SolveRequest;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const {
    apiKey,
    captchaType,
    sitekey,
    pageUrl,
    captchaImageBase64,
    challengePrompt,
    gridSize,
  } = body;

  if (!apiKey || !apiKey.startsWith("cflux_")) {
    return Response.json({ error: "Invalid API key" }, { status: 401 });
  }

  if (!captchaType || !pageUrl) {
    return Response.json(
      { error: "Missing required fields: captchaType, pageUrl" },
      { status: 400 }
    );
  }

  const startTime = Date.now();

  try {
    // Image challenge solving (reCAPTCHA/hCaptcha grid challenges)
    if (captchaType === "image_challenge" && captchaImageBase64) {
      const result = await solveImageChallengeWithVision(
        captchaImageBase64,
        challengePrompt || "Select matching images",
        gridSize || 16
      );

      const solveTime = Date.now() - startTime;

      if (result.indices.length > 0) {
        return Response.json({
          success: true,
          token: result.indices.join(","),
          engineUsed: "vision_challenge",
          confidence: result.confidence,
          solveTimeMs: solveTime,
        });
      }

      return Response.json({
        success: false,
        error: "Vision AI could not identify matching cells",
        engineUsed: "vision_challenge",
        solveTimeMs: solveTime,
      });
    }

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
