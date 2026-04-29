import { NextRequest } from "next/server";

interface UsageEvent {
  apiKey: string;
  event: "solve_attempt" | "solve_success" | "solve_failure" | "detection";
  captchaType: string;
  pageUrl: string;
  engineUsed?: string;
  solveTimeMs?: number;
  confidence?: number;
}

export async function POST(request: NextRequest) {
  let body: UsageEvent;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { apiKey, event, captchaType, pageUrl } = body;

  if (!apiKey || !apiKey.startsWith("cflux_")) {
    return Response.json({ error: "Invalid API key" }, { status: 401 });
  }

  if (!event || !captchaType || !pageUrl) {
    return Response.json(
      { error: "Missing required fields: event, captchaType, pageUrl" },
      { status: 400 }
    );
  }

  // In production, this would write to a database
  // For now, log and return success
  console.log(
    `[Extension Usage] ${event} | ${captchaType} | ${pageUrl} | engine=${body.engineUsed || "—"} | ${body.solveTimeMs || 0}ms`
  );

  return Response.json({
    recorded: true,
    event,
    timestamp: new Date().toISOString(),
  });
}
