import { describe, expect, it } from "vitest";
import {
  caseRequiresAppointment,
  configureCaseServices,
  evaluateEligibility,
  feeBreakdown,
  reconcilePayment,
  requiredEvidence,
  submitApplication,
  type DemoCase,
} from "../lib/sarathi-domain";

const baseCase: DemoCase = {
  caseId: "LP-DEMO-20260827-0001",
  llNumber: "LL-DL99-2026-000123",
  issueDate: "2026-07-29",
  serviceRequests: [
    { serviceId: "ll_to_dl", requestId: "LP-SR-01", state: "draft" },
  ],
  payment: { state: "not_started", attempts: 0 },
  submission: { state: "not_started" },
};

describe("citizen journey domain seams", () => {
  it("blocks the main journey before the 30-day eligibility window", () => {
    expect(evaluateEligibility("2026-07-30", "2026-08-28")).toMatchObject({
      eligible: false,
      expired: false,
      validDate: true,
      daysHeld: 29,
      earliestDate: "2026-08-29",
    });
  });

  it("blocks an expired learner licence before evidence or payment", () => {
    expect(evaluateEligibility("2026-01-01", "2026-08-28")).toMatchObject({
      eligible: false,
      expired: true,
      expiryDate: "2026-06-30",
    });
  });

  it("allows the main journey on day 30", () => {
    expect(evaluateEligibility("2026-07-29", "2026-08-28").eligible).toBe(true);
  });

  it("reconciles an ambiguous payment without creating a second attempt", () => {
    const pending: DemoCase = {
      ...baseCase,
      payment: {
        state: "pending",
        attempts: 1,
        gatewayReference: "MOCK-PAY-20260827-9912",
      },
    };

    const paid = reconcilePayment(pending);
    expect(paid.payment.state).toBe("paid");
    expect(paid.payment.attempts).toBe(1);
    expect(paid.payment.gatewayReference).toBe("MOCK-PAY-20260827-9912");
  });

  it("returns the same application when submit is repeated", () => {
    const paid: DemoCase = {
      ...baseCase,
      payment: { state: "paid", attempts: 1 },
    };

    const first = submitApplication(paid, "demo-submit-key");
    const repeated = submitApplication(first, "demo-submit-key");

    expect(repeated.submission.applicationId).toBe("MOCK-SAR-00004567");
    expect(repeated.submission.idempotencyKey).toBe("demo-submit-key");
    expect(repeated.serviceRequests[0].state).toBe("submitted");
  });

  it("builds independent requests inside one multi-service case", () => {
    const configured = configureCaseServices(baseCase, [
      "duplicate",
      "address_change",
      "mobile_update",
    ]);

    expect(configured.serviceRequests.map((request) => request.serviceId)).toEqual([
      "duplicate",
      "address_change",
      "mobile_update",
    ]);
    expect(new Set(configured.serviceRequests.map((request) => request.requestId)).size).toBe(3);
  });

  it("deduplicates combined evidence and keeps per-service fee lines", () => {
    expect(requiredEvidence(["ll_to_dl", "address_change"])).toEqual([
      "learners_licence",
      "photo_signature",
      "address_proof",
    ]);
    expect(feeBreakdown(["ll_to_dl", "address_change", "mobile_update"])).toEqual({
      lines: [
        { serviceId: "ll_to_dl", amount: 700 },
        { serviceId: "address_change", amount: 310 },
        { serviceId: "mobile_update", amount: 0 },
      ],
      total: 1010,
    });
  });

  it("requires an appointment only when a selected branch needs one", () => {
    expect(caseRequiresAppointment(["duplicate", "mobile_update"])).toBe(false);
    expect(caseRequiresAppointment(["duplicate", "ll_to_dl"])).toBe(true);
  });
});
