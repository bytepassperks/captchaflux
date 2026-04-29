import { NextRequest } from "next/server";

export async function POST(request: NextRequest) {
  const body = await request.json();

  const { event, customer_id, plan, amount } = body;

  switch (event) {
    case "payment.success": {
      console.log(
        `[DodoPayments] Payment success: customer=${customer_id} plan=${plan} amount=${amount}`
      );
      return Response.json({
        status: "ok",
        action: "plan_activated",
        customer_id,
        plan,
        api_key: `cflx_live_${crypto.randomUUID().replace(/-/g, "")}`,
      });
    }

    case "subscription.cancelled": {
      console.log(
        `[DodoPayments] Subscription cancelled: customer=${customer_id}`
      );
      return Response.json({
        status: "ok",
        action: "plan_deactivated",
        customer_id,
      });
    }

    case "payment.failed": {
      console.log(
        `[DodoPayments] Payment failed: customer=${customer_id}`
      );
      return Response.json({
        status: "ok",
        action: "payment_retry_scheduled",
        customer_id,
      });
    }

    default: {
      console.log(`[DodoPayments] Unknown event: ${event}`);
      return Response.json({ status: "ok", action: "ignored" });
    }
  }
}
