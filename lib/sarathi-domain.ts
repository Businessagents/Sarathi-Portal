export type PaymentState = "not_started" | "pending" | "paid" | "failed";
export type SubmissionState = "not_started" | "queued" | "submitted";

export type DemoCase = {
  caseId: string;
  llNumber: string;
  issueDate: string;
  payment: {
    state: PaymentState;
    attempts: number;
    gatewayReference?: string;
  };
  submission: {
    state: SubmissionState;
    idempotencyKey?: string;
    applicationId?: string;
  };
};

const DAY_MS = 86_400_000;

function atUtcMidnight(value: string) {
  const [year, month, day] = value.split("-").map(Number);
  return Date.UTC(year, month - 1, day);
}

function toIsoDate(epochMs: number) {
  return new Date(epochMs).toISOString().slice(0, 10);
}

export function evaluateEligibility(issueDate: string, today: string) {
  const issue = atUtcMidnight(issueDate);
  const current = atUtcMidnight(today);
  const daysHeld = Math.max(0, Math.floor((current - issue) / DAY_MS));
  const earliestDate = toIsoDate(issue + 30 * DAY_MS);

  return {
    eligible: daysHeld >= 30,
    daysHeld,
    earliestDate,
  };
}

export function beginPayment(current: DemoCase): DemoCase {
  if (current.payment.state === "pending" || current.payment.state === "paid") {
    return current;
  }

  return {
    ...current,
    payment: {
      state: "pending",
      attempts: current.payment.attempts + 1,
      gatewayReference: "MOCK-PAY-20260827-9912",
    },
  };
}

export function reconcilePayment(current: DemoCase): DemoCase {
  if (current.payment.state !== "pending") return current;

  return {
    ...current,
    payment: { ...current.payment, state: "paid" },
  };
}

export function submitApplication(
  current: DemoCase,
  idempotencyKey: string,
): DemoCase {
  if (current.payment.state !== "paid") return current;

  if (current.submission.idempotencyKey === idempotencyKey) return current;

  return {
    ...current,
    submission: {
      state: "submitted",
      idempotencyKey,
      applicationId: "MOCK-SAR-00004567",
    },
  };
}
