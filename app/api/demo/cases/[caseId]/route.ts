import {
  beginPayment,
  DEMO_RULE_PACK,
  reconcilePayment,
  submitApplication,
  type DemoAuditEvent,
  type DemoCase,
  type DemoOperation,
} from "@/lib/sarathi-domain";

type DemoRequest = {
  operation?: DemoOperation;
  caseData?: DemoCase;
  idempotencyKey?: string;
};

function isSyntheticCaseId(caseId: string) {
  return /^LP-DEMO-[A-Z0-9-]+$/.test(caseId);
}

export async function GET(
  _request: Request,
  context: RouteContext<"/api/demo/cases/[caseId]">,
) {
  const { caseId } = await context.params;

  if (!isSyntheticCaseId(caseId)) {
    return Response.json({ error: "Synthetic demo case not found." }, { status: 404 });
  }

  return Response.json({
    caseId,
    persistence: "browser-only demo state",
    rulePack: DEMO_RULE_PACK,
    operations: ["begin_payment", "reconcile_payment", "submit_application"],
    safeguards: ["synthetic identifiers only", "no government endpoints", "no real payment"],
  });
}

export async function POST(
  request: Request,
  context: RouteContext<"/api/demo/cases/[caseId]">,
) {
  const { caseId } = await context.params;
  if (!isSyntheticCaseId(caseId)) {
    return Response.json({ error: "Synthetic demo case not found." }, { status: 404 });
  }

  let body: DemoRequest;
  try {
    body = (await request.json()) as DemoRequest;
  } catch {
    return Response.json({ error: "Request body must be JSON." }, { status: 400 });
  }

  if (!body.caseData || body.caseData.caseId !== caseId || !body.operation) {
    return Response.json({ error: "Case and operation are required." }, { status: 400 });
  }

  let caseData = body.caseData;
  let result = "no_state_change";

  if (body.operation === "begin_payment") {
    caseData = beginPayment(caseData);
    result = "gateway_timeout_payment_pending";
  } else if (body.operation === "reconcile_payment") {
    caseData = reconcilePayment(caseData);
    result = "existing_payment_found_no_second_charge";
  } else if (body.operation === "submit_application") {
    if (!body.idempotencyKey) {
      return Response.json({ error: "Idempotency key is required." }, { status: 400 });
    }
    const previousApplicationId = caseData.submission.applicationId;
    caseData = submitApplication(caseData, body.idempotencyKey);
    result = previousApplicationId
      ? "retry_returned_existing_application"
      : "application_created_once";
  }

  const auditEvent: DemoAuditEvent = {
    eventId: `AUD-${body.operation}-${result}-${caseData.payment.attempts}-${caseData.submission.applicationId ?? "draft"}`,
    operation: body.operation,
    result,
    recordedAt: "2026-08-28T10:42:00+05:30",
    idempotencyKey: body.idempotencyKey,
  };

  return Response.json({ caseData, auditEvent });
}
