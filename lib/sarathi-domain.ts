export type PaymentState = "not_started" | "pending" | "paid" | "failed";
export type SubmissionState = "not_started" | "queued" | "submitted";

export type ServiceId =
  | "ll_to_dl"
  | "duplicate"
  | "name_change"
  | "address_change"
  | "mobile_update";

export type ServiceRequestState = "draft" | "ready" | "submitted" | "completed";

export type ServiceRequest = {
  serviceId: ServiceId;
  requestId: string;
  state: ServiceRequestState;
};

export type EvidenceId =
  | "learners_licence"
  | "photo_signature"
  | "address_proof"
  | "licence_loss_or_damage"
  | "name_change_proof";

export type ServiceRule = {
  id: ServiceId;
  fee: number;
  requiresAppointment: boolean;
  issuesPhysicalCard: boolean;
  evidence: EvidenceId[];
};

/**
 * Versioned, synthetic catalogue for the Delhi demo fixture. Production rules
 * belong in a jurisdiction-owned configuration service, never in UI code.
 */
export const DEMO_RULE_PACK = {
  id: "delhi-demo-2026-08-28-v2",
  jurisdiction: "Delhi demo fixture",
  source: "PRD problem model — not verified nationwide guidance",
  effectiveDate: "2026-08-28",
  services: {
    ll_to_dl: {
      id: "ll_to_dl",
      fee: 700,
      requiresAppointment: true,
      issuesPhysicalCard: true,
      evidence: ["learners_licence", "photo_signature", "address_proof"],
    },
    duplicate: {
      id: "duplicate",
      fee: 420,
      requiresAppointment: false,
      issuesPhysicalCard: true,
      evidence: ["licence_loss_or_damage"],
    },
    name_change: {
      id: "name_change",
      fee: 310,
      requiresAppointment: false,
      issuesPhysicalCard: false,
      evidence: ["name_change_proof"],
    },
    address_change: {
      id: "address_change",
      fee: 310,
      requiresAppointment: false,
      issuesPhysicalCard: false,
      evidence: ["address_proof"],
    },
    mobile_update: {
      id: "mobile_update",
      fee: 0,
      requiresAppointment: false,
      issuesPhysicalCard: false,
      evidence: [],
    },
  } satisfies Record<ServiceId, ServiceRule>,
} as const;

export type DemoCase = {
  caseId: string;
  llNumber: string;
  issueDate: string;
  serviceRequests: ServiceRequest[];
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

export function configureCaseServices(
  current: DemoCase,
  selectedServices: ServiceId[],
): DemoCase {
  const uniqueServices = [...new Set(selectedServices)];

  return {
    ...current,
    serviceRequests: uniqueServices.map((serviceId, index) => {
      const existing = current.serviceRequests.find(
        (request) => request.serviceId === serviceId,
      );

      return (
        existing ?? {
          serviceId,
          requestId: `LP-SR-${String(index + 1).padStart(2, "0")}`,
          state: "draft" as const,
        }
      );
    }),
  };
}

export function requiredEvidence(selectedServices: ServiceId[]) {
  return [
    ...new Set(
      selectedServices.flatMap(
        (serviceId) => DEMO_RULE_PACK.services[serviceId].evidence,
      ),
    ),
  ];
}

export function feeBreakdown(selectedServices: ServiceId[]) {
  const lines = selectedServices.map((serviceId) => ({
    serviceId,
    amount: DEMO_RULE_PACK.services[serviceId].fee,
  }));

  return {
    lines,
    total: lines.reduce((sum, line) => sum + line.amount, 0),
  };
}

export function caseRequiresAppointment(selectedServices: ServiceId[]) {
  return selectedServices.some(
    (serviceId) => DEMO_RULE_PACK.services[serviceId].requiresAppointment,
  );
}

export function caseIssuesPhysicalCard(selectedServices: ServiceId[]) {
  return selectedServices.some(
    (serviceId) => DEMO_RULE_PACK.services[serviceId].issuesPhysicalCard,
  );
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
      gatewayReference: "MOCK-PAY-20260828-9912",
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

export function confirmNoFee(current: DemoCase): DemoCase {
  if (current.payment.state === "paid") return current;

  return {
    ...current,
    payment: {
      state: "paid",
      attempts: 0,
      gatewayReference: "MOCK-NO-FEE-20260828",
    },
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
    serviceRequests: current.serviceRequests.map((request) => ({
      ...request,
      state: "submitted",
    })),
    submission: {
      state: "submitted",
      idempotencyKey,
      applicationId: "MOCK-SAR-00004567",
    },
  };
}
