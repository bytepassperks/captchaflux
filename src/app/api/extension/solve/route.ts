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

  // Extract the target object from the prompt
  const targetObject = prompt
    .replace(/select all (images|squares|tiles|pictures) (with|containing|of|that contain|showing) /i, '')
    .replace(/click verify once there are none left\.?/i, '')
    .replace(/if there are none,? click skip\.?/i, '')
    .trim();

  console.log(`[Vision] Grid: ${rows}x${cols}=${gridSize}, Target: "${targetObject}", Prompt: "${prompt}", ImageSize: ${imageBase64.length} chars`);

  const isTileGrid = gridSize === 16; // 4x4 grids are usually one image split into tiles

  const visionPrompt = isTileGrid
    ? `You are analyzing a CAPTCHA image challenge. The image shows ONE large photograph divided into a ${rows}x${cols} grid (${gridSize} tiles total).

Task: Select ONLY the tiles that contain ${targetObject}.

Grid numbering (0-indexed, left-to-right, top-to-bottom):
${gridMap}

IMPORTANT RULES:
- Only select tiles where ${targetObject} is actually visible in that specific tile
- Do NOT select tiles that show only background, sky, road, buildings, etc.
- The target object typically occupies 3-8 tiles out of 16. NEVER select all 16.
- Look carefully at each tile individually before deciding
- If the image also contains text like "Select all squares with...", IGNORE that text and focus on the actual grid images

Respond with ONLY JSON: {"indices": [numbers], "confidence": 0.9}`
    : `You are analyzing a CAPTCHA image challenge. The image shows a ${rows}x${cols} grid of ${gridSize} SEPARATE photographs.

Task: Select ONLY the images that clearly show ${targetObject}.

Grid numbering (0-indexed, left-to-right, top-to-bottom):
${gridMap}

IMPORTANT RULES:
- Only select images where ${targetObject} is clearly the main subject or prominently visible
- Usually 2-4 images match. NEVER select all images.
- Look at each image individually
- If the image also contains text like "Select all images with...", IGNORE that text

Respond with ONLY JSON: {"indices": [numbers], "confidence": 0.9}`;

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
          model: "claude-sonnet-4-6",
          max_tokens: 1024,
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
        console.log(`[Vision] PageGrid raw response: ${text.substring(0, 500)}`);
        const jsonMatch = text.match(/\{[\s\S]*?\}/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]);
          console.log(`[Vision] PageGrid result: indices=${JSON.stringify(parsed.indices)}, confidence=${parsed.confidence}`);
          // Sanity checks: reject if too many cells selected
          if (parsed.indices && parsed.indices.length >= gridSize) {
            console.warn(`[Vision] ALL cells selected (${parsed.indices.length}/${gridSize}), rejecting — this is always wrong`);
            return { indices: [], confidence: 0.1 };
          }
          if (isTileGrid && parsed.indices && parsed.indices.length > gridSize * 0.75) {
            console.warn(`[Vision] Too many tiles selected for tile grid (${parsed.indices.length}/${gridSize}), rejecting`);
            return { indices: [], confidence: 0.1 };
          }
          if (!isTileGrid && parsed.indices && parsed.indices.length > gridSize * 0.6) {
            console.warn(`[Vision] Too many cells for separate-image grid (${parsed.indices.length}/${gridSize}), rejecting`);
            return { indices: [], confidence: 0.1 };
          }
          return {
            indices: parsed.indices || [],
            confidence: parsed.confidence || 0.8,
          };
        }
      } else {
        const errText = await resp.text();
        console.error(`[Vision] PageGrid API error ${resp.status}: ${errText.substring(0, 300)}`);
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
        max_tokens: 1024,
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

      const modelId = "us.anthropic.claude-sonnet-4-6";
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
        console.log(`[Vision] Bedrock raw response: ${text.substring(0, 500)}`);
        const jsonMatch = text.match(/\{[\s\S]*?\}/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]);
          console.log(`[Vision] Bedrock result: indices=${JSON.stringify(parsed.indices)}, confidence=${parsed.confidence}`);
          if (parsed.indices && parsed.indices.length >= gridSize) {
            console.warn(`[Vision] Bedrock ALL cells selected (${parsed.indices.length}/${gridSize}), rejecting`);
            return { indices: [], confidence: 0.1 };
          }
          if (isTileGrid && parsed.indices && parsed.indices.length > gridSize * 0.75) {
            console.warn(`[Vision] Bedrock too many tiles for tile grid (${parsed.indices.length}/${gridSize}), rejecting`);
            return { indices: [], confidence: 0.1 };
          }
          if (!isTileGrid && parsed.indices && parsed.indices.length > gridSize * 0.6) {
            console.warn(`[Vision] Bedrock too many cells for separate-image grid (${parsed.indices.length}/${gridSize}), rejecting`);
            return { indices: [], confidence: 0.1 };
          }
          return {
            indices: parsed.indices || [],
            confidence: parsed.confidence || 0.7,
          };
        }
      } else {
        const errText = await resp.text();
        console.error(`[Vision] Bedrock API error ${resp.status}: ${errText.substring(0, 300)}`);
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
