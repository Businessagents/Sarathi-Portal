import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { CitizenJourney } from "../components/citizen-journey";

const SAVED_CASE_KEY = "licencepath-demo-case-v2";

const trackedJourney = {
  stage: 7,
  language: "en",
  mode: "self",
  acceptedNotice: true,
  helperConsent: false,
  selectedServices: ["ll_to_dl"],
  issueDate: "2026-07-29",
  identityConsent: true,
  otp: "482916",
  address: "18, Demo Lane, New Delhi 110001",
  duplicateReason: "",
  newName: "Asha Mehra",
  newAddress: "42, Sample Road, New Delhi 110003",
  newMobile: "9888800000",
  mobileOtp: "",
  evidence: {
    learners_licence: true,
    photo_signature: true,
    address_proof: true,
  },
  caseData: {
    caseId: "LP-DEMO-20260828-0001",
    llNumber: "LL-DL99-2026-000123",
    issueDate: "2026-07-29",
    serviceRequests: [
      { serviceId: "ll_to_dl", requestId: "LP-SR-01", state: "submitted" },
    ],
    payment: {
      state: "paid",
      attempts: 1,
      gatewayReference: "MOCK-PAY-20260828-9912",
    },
    submission: {
      state: "submitted",
      idempotencyKey: "licencepath-demo-submit-v3",
      applicationId: "MOCK-SAR-00004567",
    },
  },
  slot: "2026-09-04T11:30",
  outcomeIndex: 0,
  grievanceCategory: "",
  grievanceEvidence: false,
  scenario: "eligible",
  auditEvents: [],
};

afterEach(() => {
  window.localStorage.clear();
});

describe("citizen journey completion", () => {
  it("offers every requested language and switches the service screen to Tamil", async () => {
    render(<CitizenJourney />);

    const languagePicker = screen.getByRole("combobox", { name: "Choose language" });
    expect(screen.getByRole("option", { name: "हिन्दी" })).toBeTruthy();
    expect(screen.getByRole("option", { name: "தமிழ்" })).toBeTruthy();
    expect(screen.getByRole("option", { name: "मराठी" })).toBeTruthy();
    expect(screen.getByRole("option", { name: "తెలుగు" })).toBeTruthy();
    expect(screen.getByRole("option", { name: "ಕನ್ನಡ" })).toBeTruthy();
    expect(screen.getByRole("option", { name: "বাংলা" })).toBeTruthy();

    fireEvent.change(languagePicker, { target: { value: "ta" } });

    expect(await screen.findByRole("heading", { name: "ஊகமின்றி ஓட்டுநர் தேர்வுக்குத் தயாராகுங்கள்" })).toBeTruthy();
    expect(screen.getAllByText("பழகுநர் உரிமத்திலிருந்து நிரந்தர ஓட்டுநர் உரிமம்").length).toBeGreaterThan(0);
    await waitFor(() => expect(document.documentElement.lang).toBe("ta"));
  });

  it("lets a reviewer complete the simulated timeline from the final journey stage", async () => {
    window.localStorage.setItem(SAVED_CASE_KEY, JSON.stringify(trackedJourney));
    render(<CitizenJourney />);

    await waitFor(() =>
      expect(screen.getByRole("button", { name: "Continue saved demo" })).toBeTruthy(),
    );
    fireEvent.click(screen.getByRole("button", { name: "Continue saved demo" }));

    const completeButton = await screen.findByRole("button", {
      name: "Play remaining demo updates",
    });
    await act(async () => fireEvent.click(completeButton));

    expect(await screen.findByRole("heading", { name: "Journey complete" })).toBeTruthy();
  });
});
