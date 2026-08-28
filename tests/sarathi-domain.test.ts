import { describe, expect, it } from "vitest";
import {
  evaluateEligibility,
  reconcilePayment,
  submitApplication,
  type DemoCase,
} from "../lib/sarathi-domain";

const baseCase: DemoCase = {
  caseId: "LP-DEMO-20260827-0001",
  llNumber: "LL-DL99-2026-000123",
  issueDate: "2026-07-29",
  payment: { state: "not_started", attempts: 0 },
  submission: { state: "not_started" },
};

describe("citizen journey domain seams", () => {
  it("blocks the main journey before the 30-day eligibility window", () => {
    expect(evaluateEligibility("2026-07-30", "2026-08-28")).toEqual({
      eligible: false,
      daysHeld: 29,
      earliestDate: "2026-08-29",
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
  });
});
