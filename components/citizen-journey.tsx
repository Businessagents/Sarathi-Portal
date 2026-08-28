"use client";

import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  CalendarCheck,
  Check,
  CheckCircle,
  CircleNotch,
  ClockCountdown,
  FileArrowUp,
  Flask,
  HandHeart,
  Info,
  Lifebuoy,
  LockKey,
  MagnifyingGlass,
  PersonArmsSpread,
  Receipt,
  ShieldCheck,
  Translate,
  Warning,
} from "@phosphor-icons/react";
import { useEffect, useMemo, useState } from "react";
import {
  caseIssuesPhysicalCard,
  caseRequiresAppointment,
  configureCaseServices,
  confirmNoFee,
  DEMO_RULE_PACK,
  evaluateEligibility,
  feeBreakdown,
  requiredEvidence,
  type DemoAuditEvent,
  type DemoCase,
  type DemoOperation,
  type EvidenceId,
  type ServiceId,
} from "@/lib/sarathi-domain";

type Language = "en" | "hi";
type Mode = "self" | "assisted";
type DemoScenario =
  | "eligible"
  | "too_early"
  | "expired"
  | "invalid_record"
  | "identity_mismatch"
  | "unreadable_document"
  | "no_slots"
  | "test_failed"
  | "correction_required"
  | "dispatch_failed";
type EvidenceState = Partial<Record<EvidenceId, boolean>>;

type JourneyState = {
  stage: number;
  language: Language;
  largeText: boolean;
  highContrast: boolean;
  mode: Mode;
  acceptedNotice: boolean;
  helperConsent: boolean;
  selectedServices: ServiceId[];
  issueDate: string;
  identityConsent: boolean;
  otp: string;
  address: string;
  duplicateReason: "" | "lost" | "damaged";
  newName: string;
  newAddress: string;
  newMobile: string;
  mobileOtp: string;
  evidence: EvidenceState;
  caseData: DemoCase;
  slot: string;
  outcomeIndex: number;
  grievanceId?: string;
  grievanceCategory: "" | "payment" | "appointment" | "documents" | "status";
  grievanceEvidence: boolean;
  scenario: DemoScenario;
  auditEvents: DemoAuditEvent[];
};

const STORAGE_KEY = "licencepath-demo-case-v2";
const TODAY = "2026-08-28";

const serviceOrder: ServiceId[] = [
  "ll_to_dl",
  "duplicate",
  "name_change",
  "address_change",
  "mobile_update",
];

const serviceCopy: Record<
  ServiceId,
  { en: string; hi: string; descriptionEn: string; descriptionHi: string }
> = {
  ll_to_dl: {
    en: "Learner's Licence to permanent DL",
    hi: "लर्नर लाइसेंस से स्थायी DL",
    descriptionEn: "Check the waiting period, submit evidence, pay and book a driving test.",
    descriptionHi: "प्रतीक्षा अवधि जांचें, दस्तावेज दें, भुगतान करें और ड्राइविंग टेस्ट बुक करें।",
  },
  duplicate: {
    en: "Replace a lost or damaged licence",
    hi: "खोया या खराब लाइसेंस बदलें",
    descriptionEn: "Record the reason, attach a safe fixture and track replacement scrutiny.",
    descriptionHi: "कारण बताएं, सुरक्षित उदाहरण जोड़ें और बदलाव की जांच देखें।",
  },
  name_change: {
    en: "Change name on the licence",
    hi: "लाइसेंस पर नाम बदलें",
    descriptionEn: "Enter the corrected name and attach the demo change proof.",
    descriptionHi: "सही नाम भरें और बदलाव का डेमो प्रमाण जोड़ें।",
  },
  address_change: {
    en: "Change address on the licence",
    hi: "लाइसेंस पर पता बदलें",
    descriptionEn: "Give the new address once and add one combined address proof.",
    descriptionHi: "नया पता एक बार दें और एक संयुक्त पता प्रमाण जोड़ें।",
  },
  mobile_update: {
    en: "Update registered mobile number",
    hi: "पंजीकृत मोबाइल नंबर बदलें",
    descriptionEn: "Verify a synthetic new number without uploading a document.",
    descriptionHi: "बिना दस्तावेज अपलोड किए नकली नए नंबर की पुष्टि करें।",
  },
};

const evidenceCopy: Record<EvidenceId, { en: string; hi: string; meta: string }> = {
  learners_licence: { en: "Learner's Licence fixture", hi: "लर्नर लाइसेंस उदाहरण", meta: "PDF, 184 KB" },
  photo_signature: { en: "Photo and signature fixture", hi: "फोटो और हस्ताक्षर उदाहरण", meta: "JPG, 96 KB" },
  address_proof: { en: "Address proof fixture", hi: "पता प्रमाण उदाहरण", meta: "PDF, 211 KB" },
  licence_loss_or_damage: { en: "Loss or damaged-licence fixture", hi: "खोए या खराब लाइसेंस का उदाहरण", meta: "PDF, 156 KB" },
  name_change_proof: { en: "Name-change proof fixture", hi: "नाम बदलाव प्रमाण उदाहरण", meta: "PDF, 203 KB" },
};

const translations = {
  en: {
    skip: "Skip to main content",
    banner: "Independent, unofficial prototype. Use synthetic data only.",
    mock: "Mock dependency",
    about: "About this prototype",
    english: "English",
    hindi: "हिंदी",
    largeText: "Larger text",
    contrast: "High contrast",
    help: "Get help",
    saved: "Saved on this device",
    case: "Demo application case",
    mainJourney: "Your licence service plan",
    pilot: "Delhi demo rule pack",
    back: "Back",
    stages: ["Services", "Eligibility", "Identity", "Details", "Evidence", "Payment", "Submit", "Track"],
  },
  hi: {
    skip: "मुख्य सामग्री पर जाएं",
    banner: "यह स्वतंत्र और अनौपचारिक प्रोटोटाइप है। केवल नकली जानकारी का उपयोग करें।",
    mock: "नकली सेवा",
    about: "इस प्रोटोटाइप के बारे में",
    english: "English",
    hindi: "हिंदी",
    largeText: "बड़ा टेक्स्ट",
    contrast: "अधिक कॉन्ट्रास्ट",
    help: "मदद लें",
    saved: "इस डिवाइस पर सेव है",
    case: "डेमो आवेदन केस",
    mainJourney: "आपकी लाइसेंस सेवा योजना",
    pilot: "दिल्ली डेमो नियम पैक",
    back: "पीछे",
    stages: ["सेवाएं", "पात्रता", "पहचान", "जानकारी", "दस्तावेज", "भुगतान", "जमा करें", "स्थिति"],
  },
} as const;

function createDefaultCase(): DemoCase {
  const base: DemoCase = {
    caseId: "LP-DEMO-20260828-0001",
    llNumber: "",
    issueDate: "",
    serviceRequests: [],
    payment: { state: "not_started", attempts: 0 },
    submission: { state: "not_started" },
  };
  return configureCaseServices(base, ["ll_to_dl"]);
}

function createDefaultState(): JourneyState {
  return {
    stage: 0,
    language: "en",
    largeText: false,
    highContrast: false,
    mode: "self",
    acceptedNotice: false,
    helperConsent: false,
    selectedServices: ["ll_to_dl"],
    issueDate: "",
    identityConsent: false,
    otp: "",
    address: "",
    duplicateReason: "",
    newName: "Asha Mehra",
    newAddress: "42, Sample Road, New Delhi 110003",
    newMobile: "9888800000",
    mobileOtp: "",
    evidence: {},
    caseData: createDefaultCase(),
    slot: "",
    outcomeIndex: 0,
    grievanceCategory: "",
    grievanceEvidence: false,
    scenario: "eligible",
    auditEvents: [],
  };
}

function serviceLabel(serviceId: ServiceId, language: Language) {
  return serviceCopy[serviceId][language];
}

function serviceRequestCount(count: number) {
  return `${count} service request${count === 1 ? "" : "s"}`;
}

function paymentLabel(state: DemoCase["payment"]["state"], language: Language) {
  const labels = {
    en: { not_started: "Not started", pending: "Pending", paid: "Confirmed", failed: "Failed" },
    hi: { not_started: "शुरू नहीं हुआ", pending: "पुष्टि बाकी", paid: "पुष्टि हुई", failed: "असफल" },
  } as const;
  return labels[language][state];
}

function MockBadge({ language, label }: { language: Language; label?: string }) {
  return (
    <span className="mock-badge">
      <Flask aria-hidden="true" size={14} />
      {label ?? translations[language].mock}
    </span>
  );
}

function Field({
  label,
  hint,
  error,
  children,
}: {
  label: string;
  hint?: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="field">
      <span className="field-label">{label}</span>
      {hint ? <span className="field-hint">{hint}</span> : null}
      {children}
      {error ? <span className="field-error" role="alert">{error}</span> : null}
    </label>
  );
}

function Notice({ tone = "info", children }: { tone?: "info" | "warning" | "success"; children: React.ReactNode }) {
  const Icon = tone === "warning" ? Warning : tone === "success" ? CheckCircle : Info;
  return (
    <div className={`notice notice-${tone}`}>
      <Icon aria-hidden="true" size={22} weight="duotone" />
      <div>{children}</div>
    </div>
  );
}

function StageHeader({ icon: Icon, title, intro, language }: { icon: typeof Info; title: string; intro: string; language: Language }) {
  return (
    <header className="stage-header">
      <div className="stage-icon"><Icon aria-hidden="true" size={28} weight="duotone" /></div>
      <div><MockBadge language={language} label={language === "en" ? "Interactive demo" : "इंटरैक्टिव डेमो"} /><h1>{title}</h1><p>{intro.replace("1 service requests", "1 service request")}</p></div>
    </header>
  );
}

function buildOutcomeEvents(selectedServices: ServiceId[], language: Language, scenario: DemoScenario) {
  const en = language === "en";
  const events: Array<{ label: string; owner: string; time: string }> = [
    { label: en ? "Application case accepted" : "आवेदन केस स्वीकार हुआ", owner: "Mock workflow queue", time: "28 Aug, 10:42" },
    { label: en ? "Combined evidence scrutinised" : "संयुक्त दस्तावेज जांचे गए", owner: "Mock RTO desk", time: "28 Aug, 10:47" },
  ];

  if (selectedServices.includes("ll_to_dl")) {
    events.push(
      { label: en ? "Driving test appointment confirmed" : "ड्राइविंग टेस्ट अपॉइंटमेंट पक्का हुआ", owner: "Mock appointment adapter", time: "28 Aug, 10:49" },
      { label: en ? "Driving test passed" : "ड्राइविंग टेस्ट पास हुआ", owner: "Mock RTO", time: "4 Sep, 12:10" },
      { label: en ? "Permanent DL approved" : "स्थायी DL स्वीकृत हुआ", owner: "Mock Sarathi adapter", time: "4 Sep, 12:14" },
    );
  }
  if (scenario === "test_failed") {
    return [
      ...events.slice(0, 3),
      { label: en ? "Driving test not cleared" : "ड्राइविंग टेस्ट पास नहीं हुआ", owner: "Mock RTO", time: "4 Sep, 12:10" },
      { label: en ? "Citizen can book a new attempt" : "नागरिक नई कोशिश बुक कर सकता है", owner: "Citizen", time: "After the configured waiting period" },
    ];
  }
  if (scenario === "correction_required") {
    return [
      ...events.slice(0, 2),
      { label: en ? "Application returned for address correction" : "पते में सुधार के लिए आवेदन वापस आया", owner: "Mock RTO scrutiny desk", time: "29 Aug, 14:05" },
      { label: en ? "Correct the saved address; do not submit a new application" : "सेव पता सुधारें; नया आवेदन न बनाएं", owner: "Citizen", time: "Next action" },
    ];
  }
  if (scenario === "dispatch_failed") {
    return [
      ...events.slice(0, 5),
      { label: en ? "Card delivery attempt failed" : "कार्ड डिलीवरी की कोशिश असफल हुई", owner: "Mock carrier", time: "8 Sep, 16:22" },
      { label: en ? "Confirm the delivery address or raise a dispatch grievance" : "डिलीवरी पता जांचें या शिकायत दर्ज करें", owner: "Citizen", time: "Next action" },
    ];
  }
  if (selectedServices.includes("duplicate")) events.push({ label: en ? "Replacement request approved" : "बदलाव अनुरोध स्वीकृत हुआ", owner: "Mock RTO desk", time: "4 Sep, 12:18" });
  if (selectedServices.includes("name_change")) events.push({ label: en ? "Name updated on the licence record" : "लाइसेंस रिकॉर्ड पर नाम बदला", owner: "Mock Sarathi adapter", time: "4 Sep, 12:20" });
  if (selectedServices.includes("address_change")) events.push({ label: en ? "Address updated on the licence record" : "लाइसेंस रिकॉर्ड पर पता बदला", owner: "Mock Sarathi adapter", time: "4 Sep, 12:22" });
  if (selectedServices.includes("mobile_update")) events.push({ label: en ? "Registered mobile number updated" : "पंजीकृत मोबाइल नंबर बदला", owner: "Mock notification adapter", time: "4 Sep, 12:23" });
  if (caseIssuesPhysicalCard(selectedServices)) {
    events.push(
      { label: en ? "Licence card dispatched" : "लाइसेंस कार्ड भेजा गया", owner: "Mock dispatch adapter", time: "6 Sep, 09:05" },
      { label: en ? "Card delivered" : "कार्ड डिलीवर हुआ", owner: "Mock carrier", time: "8 Sep, 16:22" },
    );
  }
  events.push({ label: en ? "All service requests closed" : "सभी सेवा अनुरोध पूरे हुए", owner: "LicencePath case service", time: "8 Sep, 16:24" });
  return events;
}

type StageProps = { state: JourneyState; update: (next: Partial<JourneyState>) => void };

export function CitizenJourney({ requestedCaseId }: { requestedCaseId?: string }) {
  const [state, setState] = useState<JourneyState>(() => createDefaultState());
  const [hydrated, setHydrated] = useState(false);
  const [resumeFound, setResumeFound] = useState(false);
  const [resumeCandidate, setResumeCandidate] = useState<JourneyState | null>(null);
  const [serviceBusy, setServiceBusy] = useState<DemoOperation | null>(null);
  const [error, setError] = useState("");
  const [helpOpen, setHelpOpen] = useState(false);
  const [grievanceText, setGrievanceText] = useState("");
  const t = translations[state.language];

  const eligibility = useMemo(() => evaluateEligibility(state.issueDate, TODAY), [state.issueDate]);
  const evidenceRequirements = useMemo(() => requiredEvidence(state.selectedServices), [state.selectedServices]);
  const fees = useMemo(() => feeBreakdown(state.selectedServices), [state.selectedServices]);
  const requiresAppointment = caseRequiresAppointment(state.selectedServices);

  useEffect(() => {
    const saved = window.localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved) as JourneyState;
        if (!Array.isArray(parsed.selectedServices) || !parsed.caseData?.serviceRequests) throw new Error("Old demo state");
        const candidate = { ...createDefaultState(), ...parsed };
        if (!requestedCaseId || candidate.caseData.caseId === requestedCaseId) {
          setState(candidate);
          setResumeCandidate(candidate);
        } else {
          setError("That synthetic case is not stored in this browser. Start a fresh demo here instead.");
        }
      } catch {
        window.localStorage.removeItem(STORAGE_KEY);
      }
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated || resumeCandidate) return;
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    document.documentElement.lang = state.language;
  }, [hydrated, resumeCandidate, state]);

  useEffect(() => {
    if (!hydrated || resumeCandidate) return;
    const path = state.stage > 0 ? `/case/${state.caseData.caseId}` : "/";
    window.history.replaceState(null, "", path);
  }, [hydrated, resumeCandidate, state.caseData.caseId, state.stage]);

  const update = (next: Partial<JourneyState>) => setState((current) => ({ ...current, ...next }));
  const go = (stage: number) => {
    setError("");
    update({ stage });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const begin = () => {
    if (state.selectedServices.length === 0) {
      setError(state.language === "en" ? "Choose at least one service to build your journey." : "अपनी यात्रा बनाने के लिए कम से कम एक सेवा चुनें।");
      return;
    }
    if (!state.acceptedNotice) {
      setError(state.language === "en" ? "Confirm that you will use demo data only." : "पुष्टि करें कि आप केवल डेमो जानकारी का उपयोग करेंगे।");
      return;
    }
    if (state.mode === "assisted" && !state.helperConsent) {
      setError(state.language === "en" ? "Citizen consent is required for assisted mode." : "सहायता मोड के लिए नागरिक की सहमति जरूरी है।");
      return;
    }
    go(1);
  };

  const confirmEligibility = () => {
    if (!/^LL-DL99-2026-\d{6}$/.test(state.caseData.llNumber) || state.scenario === "invalid_record") {
      setError(state.language === "en" ? "This synthetic Learner's Licence number was not found. Check the format or load a reviewer scenario; no case or payment was created." : "यह नकली लर्नर लाइसेंस नंबर नहीं मिला। प्रारूप जांचें; कोई केस या भुगतान नहीं बना।");
      return;
    }
    if (state.selectedServices.includes("ll_to_dl") && !eligibility.eligible) {
      const message = eligibility.expired
        ? `This demo Learner's Licence expired on ${eligibility.expiryDate}. Start a new LL journey; payment is blocked.`
        : `The LL-to-DL request becomes eligible on ${eligibility.earliestDate}. No payment is needed today.`;
      setError(state.language === "en" ? message : `यह अनुरोध अभी आगे नहीं बढ़ सकता। डेमो नियम की तारीखें देखें; आज भुगतान न करें।`);
      return;
    }
    setState((current) => ({ ...current, stage: 2, caseData: { ...current.caseData, issueDate: current.issueDate } }));
    setError("");
  };

  const verifyIdentity = () => {
    if (state.scenario === "identity_mismatch") {
      setError(state.language === "en" ? "The retrieved name does not match this synthetic licence. Stop and review the record; nothing has been submitted." : "मिला नाम इस नकली लाइसेंस से मेल नहीं खाता। रिकॉर्ड जांचें; कुछ जमा नहीं हुआ।");
      return;
    }
    if (!state.identityConsent || state.otp !== "482916") {
      setError(state.language === "en" ? "Give consent and enter the displayed 6-digit test OTP." : "सहमति दें और दिखाया गया 6 अंकों का टेस्ट OTP दर्ज करें।");
      return;
    }
    go(3);
  };

  const continueDetails = () => {
    const en = state.language === "en";
    if (state.address.trim().length < 8) {
      setError(en ? "Enter the supplied synthetic address before continuing." : "आगे बढ़ने से पहले दी गई नकली पता जानकारी भरें।");
      return;
    }
    if (state.selectedServices.includes("duplicate") && !state.duplicateReason) {
      setError(en ? "Choose whether the demo licence was lost or damaged." : "चुनें कि डेमो लाइसेंस खोया है या खराब हुआ है।");
      return;
    }
    if (state.selectedServices.includes("name_change") && state.newName.trim().length < 3) {
      setError(en ? "Enter the corrected synthetic name." : "सही नकली नाम भरें।");
      return;
    }
    if (state.selectedServices.includes("address_change") && state.newAddress.trim().length < 8) {
      setError(en ? "Enter the new synthetic address." : "नया नकली पता भरें।");
      return;
    }
    if (state.selectedServices.includes("mobile_update") && (!/^\d{10}$/.test(state.newMobile) || state.mobileOtp !== "639204")) {
      setError(en ? "Use the 10-digit demo mobile number and test OTP 639204." : "10 अंकों का डेमो मोबाइल नंबर और टेस्ट OTP 639204 उपयोग करें।");
      return;
    }
    go(4);
  };

  const continueEvidence = () => {
    if (!evidenceRequirements.every((evidenceId) => state.evidence[evidenceId])) {
      setError(state.language === "en" ? "Attach every generated fixture in your combined checklist." : "संयुक्त चेकलिस्ट के सभी नकली दस्तावेज जोड़ें।");
      return;
    }
    if (state.scenario === "unreadable_document") {
      setError(state.language === "en" ? "The address fixture is unreadable. Remove it and choose ‘Mark replacement readable’ in Demo controls before continuing." : "पता दस्तावेज पढ़ा नहीं जा सकता। इसे हटाएं और डेमो कंट्रोल से पठनीय उदाहरण चुनें।");
      return;
    }
    go(5);
  };

  const runCaseOperation = async (operation: DemoOperation, idempotencyKey?: string) => {
    setServiceBusy(operation);
    setError("");
    try {
      const response = await fetch(`/api/demo/cases/${state.caseData.caseId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ operation, caseData: state.caseData, idempotencyKey }),
      });
      const result = (await response.json()) as { caseData?: DemoCase; auditEvent?: DemoAuditEvent; error?: string };
      if (!response.ok || !result.caseData || !result.auditEvent) throw new Error(result.error ?? "Mock service failed.");
      setState((current) => ({ ...current, caseData: result.caseData!, auditEvents: [...current.auditEvents, result.auditEvent!] }));
    } catch (operationError) {
      setError(operationError instanceof Error ? operationError.message : "Mock service failed. Try again.");
    } finally {
      setServiceBusy(null);
    }
  };
  const pay = () => void runCaseOperation("begin_payment");
  const reconcile = () => void runCaseOperation("reconcile_payment");
  const confirmZeroFee = () => setState((current) => ({ ...current, caseData: confirmNoFee(current.caseData) }));
  const submit = () => void runCaseOperation("submit_application", "licencepath-demo-submit-v3");

  const continueAfterSubmission = () => {
    if (requiresAppointment && !state.slot) {
      setError(state.language === "en" ? "Choose one simulated driving test slot." : "एक नकली ड्राइविंग टेस्ट स्लॉट चुनें।");
      return;
    }
    go(7);
  };

  const resetDemo = () => {
    window.localStorage.removeItem(STORAGE_KEY);
    setState(createDefaultState());
    setResumeFound(false);
    setResumeCandidate(null);
    setError("");
    window.history.replaceState(null, "", "/");
  };

  const continueSavedDemo = () => {
    if (!resumeCandidate) return;
    setState(resumeCandidate);
    setResumeFound(true);
    setResumeCandidate(null);
  };

  const startFreshDemo = () => {
    window.localStorage.removeItem(STORAGE_KEY);
    setState(createDefaultState());
    setResumeCandidate(null);
    setResumeFound(false);
    setError("");
    window.history.replaceState(null, "", "/");
  };

  const applyScenario = (scenario: DemoScenario) => {
    const values: Partial<JourneyState> = { scenario, evidence: {}, slot: "", outcomeIndex: 0 };
    const llNumber = scenario === "invalid_record" ? "LL-INVALID" : "LL-DL99-2026-000123";
    const issueDate = scenario === "too_early" ? "2026-08-20" : scenario === "expired" ? "2026-01-01" : "2026-07-29";
    setState((current) => ({
      ...current,
      ...values,
      issueDate: current.stage <= 1 ? issueDate : current.issueDate,
      otp: scenario === "identity_mismatch" ? "482916" : current.otp,
      address: current.address || "18, Demo Lane, New Delhi 110001",
      caseData: current.stage <= 1
        ? { ...createDefaultCase(), caseId: current.caseData.caseId, llNumber, issueDate }
        : current.caseData,
      auditEvents: current.stage <= 1 ? [] : current.auditEvents,
    }));
    setError("");
  };

  const createGrievance = () => {
    if (!state.grievanceCategory || grievanceText.trim().length < 8) return;
    update({ grievanceId: "MOCK-GRV-20260828-014" });
    setHelpOpen(false);
    setGrievanceText("");
  };

  return (
    <div className={`app-shell ${state.largeText ? "large-text" : ""} ${state.highContrast ? "high-contrast" : ""}`}>
      <a className="skip-link" href="#main-content">{t.skip}</a>
      <div className="prototype-banner" role="note"><Warning aria-hidden="true" size={18} weight="fill" /><span>{t.banner}</span><MockBadge language={state.language} /></div>

      <header className="site-header">
        <div className="brand-wrap"><Link className="brand" href="/" aria-label="LicencePath home"><span className="brand-mark" aria-hidden="true">LP</span><span>LicencePath</span></Link><span className="pilot-label">{t.pilot}</span></div>
        <nav className="header-actions" aria-label="Language and accessibility">
          <button className="utility-button" onClick={() => update({ language: state.language === "en" ? "hi" : "en" })} type="button"><Translate aria-hidden="true" size={19} />{state.language === "en" ? t.hindi : t.english}</button>
          <button aria-pressed={state.largeText} className="utility-button" onClick={() => update({ largeText: !state.largeText })} type="button"><PersonArmsSpread aria-hidden="true" size={19} />{t.largeText}</button>
          <button aria-pressed={state.highContrast} className="utility-button compact-utility" onClick={() => update({ highContrast: !state.highContrast })} type="button">{t.contrast}</button>
          <Link className="utility-link" href={state.language === "hi" ? "/about/hi" : "/about"}>{t.about}</Link>
        </nav>
      </header>

      <div className="journey-frame">
        <aside className="progress-panel" aria-label="Application progress">
          <div className="case-kicker">{t.case}</div><strong>{state.caseData.caseId}</strong><p>{t.mainJourney}</p>
          <ol className="step-list">{t.stages.map((label, index) => <li className={index === state.stage ? "active" : index < state.stage ? "complete" : ""} key={label}><span aria-hidden="true">{index < state.stage ? <Check size={14} weight="bold" /> : index + 1}</span><span>{label}</span></li>)}</ol>
          <div className="save-state"><CheckCircle aria-hidden="true" size={18} weight="fill" />{t.saved}</div>
          {state.grievanceId ? <div className="grievance-ref">{state.grievanceId}</div> : null}
        </aside>

        <main id="main-content" className="journey-main" tabIndex={-1}>
          <div className="mobile-progress" aria-live="polite"><span>{state.stage + 1} / {t.stages.length}</span><strong>{t.stages[state.stage]}</strong></div>
          <DemoControls state={state} applyScenario={applyScenario} onFillIdentity={() => update({ otp: "482916", address: "18, Demo Lane, New Delhi 110001" })} onAdvance={() => update({ outcomeIndex: state.outcomeIndex + 1 })} />
          {resumeFound && state.stage > 0 ? <Notice tone="success"><strong>{state.language === "en" ? "Your demo was restored." : "आपका डेमो फिर से खुल गया है।"}</strong><p>{state.language === "en" ? "Continue without entering the same information again." : "वही जानकारी दोबारा भरे बिना आगे बढ़ें।"}</p></Notice> : null}

          {resumeCandidate ? <ResumeGate language={state.language} saved={resumeCandidate} onContinue={continueSavedDemo} onFresh={startFreshDemo} /> : <>
            {state.stage === 0 ? <StartStage state={state} update={update} error={error} onContinue={begin} /> : null}
            {state.stage === 1 ? <EligibilityStage state={state} eligibility={eligibility} error={error} update={update} onContinue={confirmEligibility} /> : null}
            {state.stage === 2 ? <IdentityStage state={state} update={update} error={error} onContinue={verifyIdentity} /> : null}
            {state.stage === 3 ? <DetailsStage state={state} update={update} error={error} onContinue={continueDetails} /> : null}
            {state.stage === 4 ? <EvidenceStage state={state} update={update} required={evidenceRequirements} error={error} onContinue={continueEvidence} /> : null}
            {state.stage === 5 ? <PaymentStage state={state} fees={fees} error={error} busy={serviceBusy} onPay={pay} onReconcile={reconcile} onConfirmZeroFee={confirmZeroFee} onContinue={() => go(6)} /> : null}
            {state.stage === 6 ? <SubmissionStage state={state} update={update} requiresAppointment={requiresAppointment} error={error} busy={serviceBusy} onSubmit={submit} onContinue={continueAfterSubmission} onResolveSlots={() => update({ scenario: "eligible" })} /> : null}
            {state.stage === 7 ? <TrackingStage state={state} reset={resetDemo} /> : null}
          </>}

          {state.stage > 0 && state.stage < 7 ? <button className="back-button" onClick={() => go(state.stage - 1)} type="button"><ArrowLeft aria-hidden="true" size={18} />{t.back}</button> : null}
        </main>

        <aside className="context-panel" aria-label="Current case summary">
          <h2>{state.language === "en" ? "Your case" : "आपका केस"}</h2>
          <p className="context-count">{state.language === "en" ? serviceRequestCount(state.selectedServices.length) : `${state.selectedServices.length} सेवा अनुरोध`}</p>
          <ul className="case-service-list">{state.selectedServices.map((serviceId) => <li key={serviceId}><span>{serviceLabel(serviceId, state.language)}</span><small>{state.caseData.serviceRequests.find((request) => request.serviceId === serviceId)?.requestId}</small></li>)}</ul>
          <dl><div><dt>{state.language === "en" ? "Rule pack" : "नियम पैक"}</dt><dd>{DEMO_RULE_PACK.id}</dd></div><div><dt>{state.language === "en" ? "Payment" : "भुगतान"}</dt><dd>{paymentLabel(state.caseData.payment.state, state.language)}</dd></div><div><dt>{state.language === "en" ? "Application" : "आवेदन"}</dt><dd>{state.caseData.submission.applicationId ?? (state.language === "en" ? "Not submitted" : "जमा नहीं हुआ")}</dd></div></dl>
          <div className="audit-summary"><strong>{state.language === "en" ? "Mock service audit" : "नकली सेवा ऑडिट"}</strong><span>{state.auditEvents.length} {state.language === "en" ? "server-recorded operations" : "सर्वर संचालन"}</span>{state.auditEvents.slice(-3).map((event, index) => <small key={`${event.eventId}-${index}`}>{event.operation}: {event.result}</small>)}</div>
          <Notice><strong>{state.language === "en" ? "Nothing here reaches Sarathi." : "यहां से कुछ भी Sarathi तक नहीं जाता।"}</strong></Notice>
        </aside>
      </div>

      <button className="help-button" onClick={() => setHelpOpen(true)} type="button"><Lifebuoy aria-hidden="true" size={22} weight="duotone" />{t.help}</button>
      {helpOpen ? <div className="modal-backdrop" role="presentation" onMouseDown={() => setHelpOpen(false)}><section aria-labelledby="help-title" aria-modal="true" className="help-modal" role="dialog" onMouseDown={(event) => event.stopPropagation()}><div className="modal-head"><div><MockBadge language={state.language} /><h2 id="help-title">{state.language === "en" ? "Get help with this step" : "इस चरण में मदद लें"}</h2></div><button aria-label="Close help" onClick={() => setHelpOpen(false)} type="button">×</button></div>{state.grievanceId ? <Notice tone="success"><strong>{state.grievanceId}</strong><p>{state.language === "en" ? "Open · Owner: mock service desk · updates will appear in this case history." : "खुली · जिम्मेदार: नकली सेवा डेस्क · अपडेट केस इतिहास में दिखेंगे।"}</p></Notice> : <><p>{state.language === "en" ? "Create a synthetic grievance with a visible category, owner and reference. No response time is promised in this prototype." : "श्रेणी, जिम्मेदार और संदर्भ वाली नकली शिकायत बनाएं। इस प्रोटोटाइप में जवाब का समय तय नहीं है।"}</p><Field label={state.language === "en" ? "Issue category" : "समस्या श्रेणी"}><select value={state.grievanceCategory} onChange={(event) => update({ grievanceCategory: event.target.value as JourneyState["grievanceCategory"] })}><option value="">Choose a category</option><option value="payment">Payment</option><option value="appointment">Appointment</option><option value="documents">Documents</option><option value="status">Status or dispatch</option></select></Field><Field label={state.language === "en" ? "What went wrong?" : "क्या समस्या हुई?"} hint={state.language === "en" ? "Do not enter personal information." : "कोई निजी जानकारी न लिखें।"}><textarea value={grievanceText} onChange={(event) => setGrievanceText(event.target.value)} rows={4} /></Field><label className="check-row"><input checked={state.grievanceEvidence} onChange={(event) => update({ grievanceEvidence: event.target.checked })} type="checkbox" /><span><strong>{state.language === "en" ? "Attach generated case-history fixture" : "नकली केस इतिहास जोड़ें"}</strong><small>{state.language === "en" ? "No real document is uploaded." : "कोई असली दस्तावेज अपलोड नहीं होता।"}</small></span></label><button className="primary-button" disabled={!state.grievanceCategory || grievanceText.trim().length < 8} onClick={createGrievance} type="button">{state.language === "en" ? "Create demo grievance" : "डेमो शिकायत बनाएं"}</button></>}</section></div> : null}
    </div>
  );
}

function ResumeGate({ language, saved, onContinue, onFresh }: { language: Language; saved: JourneyState; onContinue: () => void; onFresh: () => void }) {
  const en = language === "en";
  return <section className="stage-section"><StageHeader icon={ClockCountdown} language={language} title={en ? "A saved synthetic demo is in this browser" : "इस ब्राउज़र में सेव नकली डेमो है"} intro={en ? "Choose deliberately so one review run never contaminates the next." : "जानबूझकर चुनें ताकि एक समीक्षा अगली समीक्षा को प्रभावित न करे।"} /><Notice tone="warning"><strong>{saved.caseData.caseId}</strong><p>{en ? `Saved at step ${saved.stage + 1} of ${translations.en.stages.length}. This is browser-only synthetic data, not another citizen's record.` : `चरण ${saved.stage + 1} पर सेव। यह केवल ब्राउज़र की नकली जानकारी है, किसी नागरिक का रिकॉर्ड नहीं।`}</p></Notice><div className="resume-actions"><button className="primary-button" onClick={onContinue} type="button">{en ? "Continue saved demo" : "सेव डेमो जारी रखें"}</button><button className="secondary-button" onClick={onFresh} type="button">{en ? "Start new demo and clear saved data" : "नया डेमो शुरू करें और सेव डेटा हटाएं"}</button></div></section>;
}

function DemoControls({ state, applyScenario, onFillIdentity, onAdvance }: { state: JourneyState; applyScenario: (scenario: DemoScenario) => void; onFillIdentity: () => void; onAdvance: () => void }) {
  const en = state.language === "en";
  return <details className="demo-controls"><summary><Flask aria-hidden="true" size={17} />{en ? "Reviewer demo controls" : "समीक्षक डेमो कंट्रोल"}</summary><div><p>{en ? "These controls are outside the citizen journey. Load a condition, then observe the citizen-facing recovery path." : "ये कंट्रोल नागरिक यात्रा से अलग हैं। स्थिति चुनें और समाधान मार्ग देखें।"}</p><label><span>{en ? "Scenario" : "स्थिति"}</span><select value={state.scenario} onChange={(event) => applyScenario(event.target.value as DemoScenario)}><option value="eligible">Eligible, payment timeout</option><option value="too_early">Waiting period not complete</option><option value="expired">Learner's Licence expired</option><option value="invalid_record">Invalid LL number</option><option value="identity_mismatch">Retrieved person mismatch</option><option value="unreadable_document">Unreadable evidence</option><option value="no_slots">No appointment slots</option><option value="test_failed">Driving test not cleared</option><option value="correction_required">Returned for correction</option><option value="dispatch_failed">Dispatch failed</option></select></label><button className="secondary-button" onClick={() => applyScenario(state.scenario)} type="button">{en ? "Reload selected scenario inputs" : "चुनी स्थिति फिर लोड करें"}</button>{state.stage === 2 ? <button className="secondary-button" onClick={onFillIdentity} type="button">{en ? "Fill synthetic identity inputs" : "नकली पहचान जानकारी भरें"}</button> : null}{state.scenario === "unreadable_document" ? <button className="secondary-button" onClick={() => applyScenario("eligible")} type="button">{en ? "Mark replacement readable" : "नया दस्तावेज पठनीय मानें"}</button> : null}{state.stage === 7 ? <button className="secondary-button" onClick={onAdvance} type="button">{en ? "Send next provider event" : "अगला सेवा इवेंट भेजें"}</button> : null}<small>{en ? "All values, events and outcomes are synthetic." : "सभी जानकारी, इवेंट और परिणाम नकली हैं।"}</small></div></details>;
}

function StartStage({ state, update, error, onContinue }: StageProps & { error: string; onContinue: () => void }) {
  const en = state.language === "en";
  return (
    <section className="stage-section start-stage">
      <StageHeader icon={ShieldCheck} language={state.language} title={en ? "Reach the driving test ready — without guessing" : "बिना अनुमान के ड्राइविंग टेस्ट तक तैयार होकर पहुंचें"} intro={en ? "For a first-time applicant, LicencePath checks when an LL-to-DL application is eligible, what evidence is needed and what happens after payment." : "पहली बार आवेदन करने वाले के लिए LicencePath पात्रता, दस्तावेज और भुगतान के बाद की कार्रवाई स्पष्ट करता है।"} />

      <div className="system-compare" aria-label={en ? "Current journey compared with LicencePath" : "मौजूदा यात्रा और LicencePath की तुलना"}>
        <article><span>{en ? "Observed risk to test" : "जांचने योग्य जोखिम"}</span><h2>{en ? "A failed visit can start before the RTO" : "RTO से पहले ही यात्रा विफल हो सकती है"}</h2><ol><li>{en ? "Eligibility is understood too late" : "पात्रता देर से समझ आती है"}</li><li>{en ? "The evidence checklist is incomplete" : "दस्तावेज सूची अधूरी रहती है"}</li><li>{en ? "A timed-out payment looks unpaid" : "रुका भुगतान असफल लगता है"}</li><li>{en ? "The next owner or correction is unclear" : "अगली जिम्मेदारी या सुधार साफ नहीं"}</li></ol><small>{en ? "This is a product hypothesis, not validated user research. See About for the evidence gap." : "यह प्रोडक्ट परिकल्पना है, प्रमाणित यूज़र रिसर्च नहीं। प्रमाण की कमी About में देखें।"}</small></article>
        <article className="proposed-flow"><span>{en ? "Focused prototype" : "केंद्रित प्रोटोटाइप"}</span><h2>{en ? "One LL-to-DL journey" : "एक LL से DL यात्रा"}</h2><ol><li>{en ? "Check the number and date before effort" : "मेहनत से पहले नंबर और तारीख जांचें"}</li><li>{en ? "Show the exact synthetic evidence list" : "सटीक नकली दस्तावेज सूची दिखाएं"}</li><li>{en ? "Reconcile one payment before retry" : "दोबारा भुगतान से पहले जांचें"}</li><li>{en ? "Show owner, next action and recovery" : "जिम्मेदार, अगला काम और समाधान दिखाएं"}</li></ol></article>
      </div>

      <fieldset className="choice-group"><legend>{en ? "Who is completing this?" : "यह आवेदन कौन पूरा कर रहा है?"}</legend><div className="choice-grid two"><label className={`choice-card ${state.mode === "self" ? "selected" : ""}`}><input checked={state.mode === "self"} name="mode" onChange={() => update({ mode: "self" })} type="radio" /><LockKey aria-hidden="true" size={26} weight="duotone" /><span><strong>{en ? "I am applying" : "मैं आवेदन कर रहा हूं"}</strong><small>{en ? "You control every confirmation." : "हर पुष्टि आपके नियंत्रण में है।"}</small></span></label><label className={`choice-card ${state.mode === "assisted" ? "selected" : ""}`}><input checked={state.mode === "assisted"} name="mode" onChange={() => update({ mode: "assisted" })} type="radio" /><HandHeart aria-hidden="true" size={26} weight="duotone" /><span><strong>{en ? "Someone is helping me" : "कोई मेरी मदद कर रहा है"}</strong><small>{en ? "The citizen still confirms consent, payment and submission." : "नागरिक सहमति, भुगतान और आवेदन की पुष्टि खुद करता है।"}</small></span></label></div></fieldset>
      {state.mode === "assisted" ? <Notice><label className="check-row"><input checked={state.helperConsent} onChange={(event) => update({ helperConsent: event.target.checked })} type="checkbox" /><span><strong>{en ? "I consent to assisted mode for 30 minutes." : "मैं 30 मिनट के सहायता मोड की सहमति देता हूं।"}</strong><small>{en ? "Demo helper: Neha Verma, family member. Actions appear in the audit trail." : "डेमो सहायक: नेहा वर्मा, परिवार की सदस्य। हर कार्रवाई रिकॉर्ड होगी।"}</small></span></label></Notice> : null}

      <section className="choice-group" aria-labelledby="scope-title"><h2 id="scope-title">{en ? "Prototype scope" : "प्रोटोटाइप दायरा"}</h2><div className="service-grid"><article className="service-choice selected"><span><strong>{en ? serviceCopy.ll_to_dl.en : serviceCopy.ll_to_dl.hi}</strong><small>{en ? serviceCopy.ll_to_dl.descriptionEn : serviceCopy.ll_to_dl.descriptionHi}</small><em>{en ? "Included and interactive" : "शामिल और इंटरैक्टिव"}</em></span><CheckCircle aria-hidden="true" size={24} weight="fill" /></article>{serviceOrder.filter((id) => id !== "ll_to_dl").map((serviceId) => { const copy = serviceCopy[serviceId]; return <article aria-disabled="true" className="service-choice unavailable" key={serviceId}><span><strong>{en ? copy.en : copy.hi}</strong><small>{en ? "Not included in this prototype." : "इस प्रोटोटाइप में शामिल नहीं।"}</small><em>{en ? "Future research" : "भविष्य शोध"}</em></span></article>; })}</div></section>
      <div className="selection-summary" aria-live="polite"><strong>1</strong><span>{en ? "focused LL-to-DL request with eligibility, evidence, payment recovery, appointment and status exceptions." : "पात्रता, दस्तावेज, भुगतान समाधान, अपॉइंटमेंट और स्थिति वाली केंद्रित LL से DL यात्रा।"}</span></div>
      <label className="notice-confirm"><input checked={state.acceptedNotice} onChange={(event) => update({ acceptedNotice: event.target.checked })} type="checkbox" /><span>{en ? "I understand this is not an official service and I will use only the synthetic details provided." : "मैं समझता हूं कि यह आधिकारिक सेवा नहीं है और केवल दी गई नकली जानकारी का उपयोग करूंगा।"}</span></label>
      {error ? <p className="form-error" role="alert">{error}</p> : null}
      <button className="primary-button" onClick={onContinue} type="button">{en ? "Start the LL-to-DL check" : "LL से DL जांच शुरू करें"}<ArrowRight aria-hidden="true" size={18} weight="bold" /></button>
    </section>
  );
}

function EligibilityStage({ state, eligibility, error, update, onContinue }: StageProps & { eligibility: ReturnType<typeof evaluateEligibility>; error: string; onContinue: () => void }) {
  const en = state.language === "en";
  return (
    <section className="stage-section">
      <StageHeader icon={ClockCountdown} language={state.language} title={en ? "Check the licence and date before collecting evidence" : "दस्तावेज लेने से पहले लाइसेंस और तारीख जांचें"} intro={en ? "Enter the supplied synthetic details. Your inputs now determine whether the journey can continue." : "दी गई नकली जानकारी भरें। आपकी जानकारी तय करेगी कि यात्रा आगे बढ़ सकती है या नहीं।"} />
      <Notice tone="warning"><strong>{en ? "Delhi was chosen only as a bounded test fixture" : "दिल्ली केवल सीमित टेस्ट उदाहरण है"}</strong><p>{DEMO_RULE_PACK.id} · {en ? "unverified illustrative rules. A transport authority must approve every source, effective date and change before production." : "असत्यापित उदाहरण नियम। असल सेवा से पहले परिवहन अधिकारी हर स्रोत, तारीख और बदलाव मंजूर करेगा।"}</p></Notice>
      {state.selectedServices.includes("ll_to_dl") ? <><div className="form-grid"><Field label={en ? "Synthetic Learner's Licence number" : "नकली लर्नर लाइसेंस नंबर"} hint={en ? "Expected demo format: LL-DL99-2026-000123" : "डेमो प्रारूप: LL-DL99-2026-000123"}><input onChange={(event) => update({ caseData: { ...state.caseData, llNumber: event.target.value.toUpperCase() } })} value={state.caseData.llNumber} /></Field><Field label={en ? "Learner's Licence issue date" : "लर्नर लाइसेंस जारी होने की तारीख"}><input max={TODAY} onChange={(event) => update({ issueDate: event.target.value })} type="date" value={state.issueDate} /></Field></div>{state.issueDate ? <div className={`eligibility-result ${eligibility.eligible ? "eligible" : "not-eligible"}`} aria-live="polite"><span>{eligibility.eligible ? <CheckCircle size={30} weight="fill" /> : <ClockCountdown size={30} weight="fill" />}</span><div><strong>{eligibility.eligible ? (en ? "Eligible in this test fixture" : "इस टेस्ट उदाहरण में पात्र") : eligibility.expired ? (en ? "This test licence has expired" : "यह टेस्ट लाइसेंस समाप्त है") : (en ? "The waiting period is not complete" : "प्रतीक्षा अवधि पूरी नहीं हुई")}</strong><p>{en ? `Held for ${eligibility.daysHeld} days. Earliest: ${eligibility.earliestDate}; fixture expiry: ${eligibility.expiryDate}.` : `${eligibility.daysHeld} दिन। पहली तारीख: ${eligibility.earliestDate}; समाप्ति: ${eligibility.expiryDate}.`}</p></div></div> : <Notice><strong>{en ? "Enter a date to calculate the result" : "परिणाम के लिए तारीख भरें"}</strong></Notice>}</> : null}
      <div className="request-checks">{state.selectedServices.filter((id) => id !== "ll_to_dl").map((serviceId) => <article key={serviceId}><CheckCircle aria-hidden="true" size={22} weight="fill" /><div><strong>{serviceLabel(serviceId, state.language)}</strong><p>{en ? "Available in this demo rule pack. Details and evidence are checked next." : "इस डेमो नियम पैक में उपलब्ध। आगे जानकारी और दस्तावेज जांचे जाएंगे।"}</p></div><MockBadge language={state.language} label={en ? "Configured rule" : "सेट नियम"} /></article>)}</div>
      {error ? <p className="form-error" role="alert">{error}</p> : null}<button className="primary-button" onClick={onContinue} type="button">{en ? "Continue to identity" : "पहचान पर जाएं"}<ArrowRight size={18} weight="bold" /></button>
    </section>
  );
}

function IdentityStage({ state, update, error, onContinue }: StageProps & { error: string; onContinue: () => void }) {
  const en = state.language === "en";
  return <section className="stage-section"><StageHeader icon={LockKey} language={state.language} title={en ? "Retrieve the synthetic profile with explicit consent" : "स्पष्ट सहमति से नकली प्रोफाइल पाएं"} intro={en ? "The citizen enters a test credential; it is not printed inside the citizen-facing instructions." : "नागरिक टेस्ट जानकारी भरता है; यह नागरिक निर्देश में छपी नहीं है।"} /><Notice><strong>{en ? "Mock identity adapter" : "नकली पहचान सेवा"}</strong><p>{en ? "No SMS is sent. A reviewer can fill the synthetic credential from Demo controls above." : "कोई SMS नहीं भेजा जाता। समीक्षक ऊपर डेमो कंट्रोल से नकली जानकारी भर सकता है।"}</p></Notice><Field label={en ? "Demo mobile number" : "डेमो मोबाइल नंबर"}><div className="input-with-badge"><input readOnly value="+91 90000 00000" /><MockBadge language={state.language} label="Mock identity" /></div></Field><label className="notice-confirm"><input checked={state.identityConsent} onChange={(event) => update({ identityConsent: event.target.checked })} type="checkbox" /><span>{en ? "I consent to retrieve Asha Verma's synthetic profile and licence record for this demo." : "मैं इस डेमो के लिए आशा वर्मा की नकली प्रोफाइल और लाइसेंस रिकॉर्ड देखने की सहमति देता हूं।"}</span></label><Field label={en ? "6-digit test credential" : "6 अंकों की टेस्ट जानकारी"} error={error}><input autoComplete="one-time-code" inputMode="numeric" maxLength={6} onChange={(event) => update({ otp: event.target.value.replace(/\D/g, "") })} value={state.otp} /></Field><button className="primary-button" onClick={onContinue} type="button">{en ? "Retrieve demo record" : "डेमो रिकॉर्ड पाएं"}<MagnifyingGlass size={18} weight="bold" /></button></section>;
}

function DetailsStage({ state, update, error, onContinue }: StageProps & { error: string; onContinue: () => void }) {
  const en = state.language === "en";
  return (
    <section className="stage-section">
      <StageHeader icon={Receipt} language={state.language} title={en ? "Give only the details each service needs" : "हर सेवा को जितनी जानकारी चाहिए उतनी ही दें"} intro={en ? "Common profile data is prefilled once; each service opens only its own missing fields." : "साझा प्रोफाइल एक बार भरी है; हर सेवा केवल अपनी बाकी जानकारी खोलती है।"} />
      <div className="record-card"><div><span>{en ? "Record holder" : "रिकॉर्ड धारक"}</span><strong>Asha Verma</strong></div><div><span>{en ? "Existing DL" : "मौजूदा DL"}</span><strong>DL-0420260012345</strong></div><div><span>{en ? "Source" : "स्रोत"}</span><strong>Mock Sarathi adapter</strong></div><MockBadge language={state.language} /></div>
      <div className="service-detail-stack">
        {state.selectedServices.includes("ll_to_dl") ? <article><div className="detail-heading"><span>01</span><div><h2>{serviceLabel("ll_to_dl", state.language)}</h2><small>LP-SR-01</small></div></div><Field label={en ? "Current synthetic address" : "मौजूदा नकली पता"} hint={en ? "Used for this service request only" : "केवल इस सेवा अनुरोध के लिए"}><textarea onChange={(event) => update({ address: event.target.value })} rows={3} value={state.address} /></Field><p className="inline-requirement"><CalendarCheck size={20} />{en ? "This branch needs a simulated in-person driving test." : "इस शाखा में नकली व्यक्तिगत ड्राइविंग टेस्ट चाहिए।"}</p></article> : null}
        {state.selectedServices.includes("duplicate") ? <article><div className="detail-heading"><span>02</span><div><h2>{serviceLabel("duplicate", state.language)}</h2><small>{en ? "Reason changes the evidence guidance" : "कारण से दस्तावेज निर्देश बदलते हैं"}</small></div></div><Field label={en ? "What happened to the demo licence?" : "डेमो लाइसेंस का क्या हुआ?"}><select onChange={(event) => update({ duplicateReason: event.target.value as JourneyState["duplicateReason"] })} value={state.duplicateReason}><option value="">{en ? "Choose a reason" : "कारण चुनें"}</option><option value="lost">{en ? "Lost" : "खो गया"}</option><option value="damaged">{en ? "Damaged or defaced" : "खराब हो गया"}</option></select></Field></article> : null}
        {state.selectedServices.includes("name_change") ? <article><div className="detail-heading"><span>03</span><div><h2>{serviceLabel("name_change", state.language)}</h2><small>{en ? "Existing name: Asha Verma" : "मौजूदा नाम: आशा वर्मा"}</small></div></div><Field label={en ? "Corrected synthetic name" : "सही नकली नाम"}><input onChange={(event) => update({ newName: event.target.value })} value={state.newName} /></Field></article> : null}
        {state.selectedServices.includes("address_change") ? <article><div className="detail-heading"><span>04</span><div><h2>{serviceLabel("address_change", state.language)}</h2><small>{en ? "Collected once for the address request" : "पता अनुरोध के लिए एक बार लिया गया"}</small></div></div><Field label={en ? "New synthetic address" : "नया नकली पता"}><textarea onChange={(event) => update({ newAddress: event.target.value })} rows={3} value={state.newAddress} /></Field></article> : null}
        {state.selectedServices.includes("mobile_update") ? <article><div className="detail-heading"><span>05</span><div><h2>{serviceLabel("mobile_update", state.language)}</h2><small>{en ? "Mock notification adapter" : "नकली सूचना सेवा"}</small></div></div><Notice><strong>{en ? "Test OTP for the new mobile: 639204" : "नए मोबाइल का टेस्ट OTP: 639204"}</strong><p>{en ? "No real SMS is sent." : "कोई असली SMS नहीं भेजा जाता।"}</p></Notice><div className="form-grid"><Field label={en ? "New 10-digit demo mobile" : "नया 10 अंकों का डेमो मोबाइल"}><input inputMode="numeric" maxLength={10} onChange={(event) => update({ newMobile: event.target.value.replace(/\D/g, "") })} value={state.newMobile} /></Field><Field label={en ? "6-digit test OTP" : "6 अंकों का टेस्ट OTP"}><input inputMode="numeric" maxLength={6} onChange={(event) => update({ mobileOtp: event.target.value.replace(/\D/g, "") })} value={state.mobileOtp} /></Field></div></article> : null}
      </div>
      {error ? <p className="form-error" role="alert">{error}</p> : null}<button className="primary-button" onClick={onContinue} type="button">{en ? "Build combined evidence checklist" : "संयुक्त दस्तावेज चेकलिस्ट बनाएं"}<ArrowRight size={18} weight="bold" /></button>
    </section>
  );
}

function EvidenceStage({ state, update, required, error, onContinue }: StageProps & { required: EvidenceId[]; error: string; onContinue: () => void }) {
  const en = state.language === "en";
  const setEvidence = (evidenceId: EvidenceId) => update({ evidence: { ...state.evidence, [evidenceId]: !state.evidence[evidenceId] } });
  return <section className="stage-section"><StageHeader icon={FileArrowUp} language={state.language} title={en ? "Attach and check each required fixture" : "हर जरूरी उदाहरण जोड़ें और जांचें"} intro={en ? "The citizen must complete the checklist; the demo can also return a document as unreadable." : "नागरिक चेकलिस्ट पूरी करता है; डेमो दस्तावेज को अपठनीय भी लौटा सकता है।"} /><Notice tone="warning"><strong>{en ? "Never upload a real Aadhaar, PAN, licence or payment receipt." : "असली आधार, PAN, लाइसेंस या भुगतान रसीद कभी अपलोड न करें।"}</strong><p>{en ? "Every button below attaches a generated fixture already included in the demo." : "नीचे हर बटन डेमो में पहले से मौजूद नकली फाइल जोड़ता है।"}</p></Notice>{required.length > 0 ? <div className="evidence-list">{required.map((evidenceId) => { const copy = evidenceCopy[evidenceId]; const attached = Boolean(state.evidence[evidenceId]); const rejected = attached && state.scenario === "unreadable_document" && evidenceId === "address_proof"; return <article className={attached && !rejected ? "attached" : rejected ? "rejected" : ""} key={evidenceId}><div className="file-icon">{attached && !rejected ? <Check size={22} weight="bold" /> : <FileArrowUp size={22} />}</div><div><strong>{en ? copy.en : copy.hi}</strong><small>{rejected ? (en ? "Quality check failed · text is unreadable" : "गुणवत्ता जांच असफल · टेक्स्ट पढ़ा नहीं जा सकता") : attached ? `${copy.meta} · ${en ? "Quality check passed" : "गुणवत्ता जांच पास"}` : "PDF or JPG · maximum 2 MB"}</small></div><button className="secondary-button" onClick={() => setEvidence(evidenceId)} type="button">{attached ? (en ? "Remove" : "हटाएं") : (en ? "Attach fixture" : "उदाहरण जोड़ें")}</button></article>; })}</div> : null}{error ? <p className="form-error" role="alert">{error}</p> : null}<button className="primary-button" onClick={onContinue} type="button">{en ? "Review illustrative fees" : "उदाहरण शुल्क देखें"}<ArrowRight size={18} weight="bold" /></button></section>;
}

function PaymentStage({ state, fees, error, busy, onPay, onReconcile, onConfirmZeroFee, onContinue }: { state: JourneyState; fees: ReturnType<typeof feeBreakdown>; error: string; busy: DemoOperation | null; onPay: () => void; onReconcile: () => void; onConfirmZeroFee: () => void; onContinue: () => void }) {
  const en = state.language === "en";
  const status = state.caseData.payment.state;
  return <section className="stage-section"><StageHeader icon={Receipt} language={state.language} title={en ? "Recover one uncertain payment — do not pay twice" : "अनिश्चित भुगतान जांचें — दो बार भुगतान न करें"} intro={en ? "This visible sequence calls the mock case API and records every operation in the audit panel." : "यह क्रम नकली केस API को कॉल करता है और हर कार्रवाई ऑडिट पैनल में दर्ज करता है।"} /><div className="fee-box">{fees.lines.map((line) => <div key={line.serviceId}><span>{serviceLabel(line.serviceId, state.language)}</span><strong>₹{line.amount}</strong></div>)}<div className="fee-total"><span>{en ? "Illustrative total" : "उदाहरण कुल"}</span><strong>₹{fees.total}</strong></div><small>{en ? `Source: ${DEMO_RULE_PACK.id}. Synthetic, not an official fee.` : `स्रोत: ${DEMO_RULE_PACK.id}। नकली, आधिकारिक शुल्क नहीं।`}</small></div>{status === "not_started" && fees.total > 0 ? <><ol className="recovery-steps"><li>{en ? "Start one mock payment" : "एक नकली भुगतान शुरू करें"}</li><li>{en ? "Gateway response times out" : "गेटवे जवाब रुकता है"}</li><li>{en ? "Reconcile the same reference" : "उसी संदर्भ की जांच करें"}</li></ol><button className="primary-button" disabled={busy !== null} onClick={onPay} type="button">{busy === "begin_payment" ? (en ? "Starting…" : "शुरू…") : (en ? "Start mock payment" : "नकली भुगतान शुरू करें")}<ArrowRight size={18} /></button></> : null}{status === "not_started" && fees.total === 0 ? <button className="primary-button" onClick={onConfirmZeroFee} type="button">{en ? "Confirm no payment due" : "कोई भुगतान नहीं की पुष्टि करें"}</button> : null}{status === "pending" ? <><div className="status-panel pending"><CircleNotch aria-hidden="true" size={30} /><div><strong>{en ? "Money debited; confirmation timed out" : "राशि कटी; पुष्टि रुक गई"}</strong><p>{en ? `Do not pay again. ${state.caseData.payment.gatewayReference} · attempt ${state.caseData.payment.attempts}` : `दोबारा भुगतान न करें। ${state.caseData.payment.gatewayReference}`}</p></div><MockBadge language={state.language} label="Mock API" /></div><button className="primary-button" disabled={busy !== null} onClick={onReconcile} type="button">{busy === "reconcile_payment" ? (en ? "Checking…" : "जांच…") : (en ? "Check existing payment" : "मौजूदा भुगतान जांचें")}</button></> : null}{status === "paid" ? <><div className="status-panel success"><CheckCircle aria-hidden="true" size={32} weight="fill" /><div><strong>{en ? "Existing payment found; no second charge" : "मौजूदा भुगतान मिला; दूसरी कटौती नहीं"}</strong><p>{en ? `One attempt remains recorded. Audit events: ${state.auditEvents.length}.` : `एक कोशिश दर्ज है। ऑडिट इवेंट: ${state.auditEvents.length}.`}</p></div></div><a className="download-button" download href={en ? "/licencepath-demo-payment-receipt.txt" : "/licencepath-demo-payment-receipt-hi.txt"}><Receipt size={18} />{en ? "Download accessible demo receipt" : "सुलभ डेमो रसीद डाउनलोड करें"}</a><button className="primary-button" onClick={onContinue} type="button">{en ? "Continue to submission" : "आवेदन जमा करें"}<ArrowRight size={18} /></button></> : null}{error ? <p className="form-error" role="alert">{error}</p> : null}</section>;
}

function SubmissionStage({ state, update, requiresAppointment, error, busy, onSubmit, onContinue, onResolveSlots }: StageProps & { requiresAppointment: boolean; error: string; busy: DemoOperation | null; onSubmit: () => void; onContinue: () => void; onResolveSlots: () => void }) {
  const en = state.language === "en";
  const submitted = state.caseData.submission.state === "submitted";
  return <section className="stage-section"><StageHeader icon={CalendarCheck} language={state.language} title={en ? "Retry safely, then choose an appointment" : "सुरक्षित दोबारा कोशिश करें, फिर अपॉइंटमेंट चुनें"} intro={en ? "The mock case API exposes the idempotency key and returns the same application reference on retry." : "नकली केस API इडेम्पोटेंसी कुंजी दिखाता है और दोबारा कोशिश पर वही आवेदन संदर्भ देता है।"} />{!submitted ? <><div className="review-summary"><h2>{en ? "Plain-language review" : "आसान भाषा में जांच"}</h2><p>{en ? "Asha Verma is submitting one synthetic LL-to-DL request." : "आशा वर्मा एक नकली LL से DL अनुरोध जमा कर रही हैं।"}</p><p><strong>{en ? "Idempotency key:" : "इडेम्पोटेंसी कुंजी:"}</strong> licencepath-demo-submit-v3</p></div><button className="primary-button" disabled={busy !== null} onClick={onSubmit} type="button">{busy === "submit_application" ? (en ? "Submitting…" : "जमा…") : (en ? "Submit through mock case API" : "नकली केस API से जमा करें")}<ShieldCheck size={18} /></button></> : null}{submitted ? <><Notice tone="success"><strong>{en ? "Application created once" : "आवेदन एक बार बना"}</strong><p>{state.caseData.submission.applicationId} · {en ? "safe retries return this reference" : "सुरक्षित दोबारा कोशिश यही संदर्भ लौटाती है"} <MockBadge language={state.language} label="Mock API" /></p></Notice><button className="secondary-button" disabled={busy !== null} onClick={onSubmit} type="button">{en ? "Simulate interrupted connection and retry" : "रुका कनेक्शन और दोबारा कोशिश दिखाएं"}</button>{state.auditEvents.filter((event) => event.operation === "submit_application").length > 1 ? <Notice><strong>{en ? "Duplicate prevented" : "डुप्लिकेट रोका गया"}</strong><p>{en ? `Both calls used the same key and returned ${state.caseData.submission.applicationId}.` : `दोनों कॉल ने वही कुंजी उपयोग की और ${state.caseData.submission.applicationId} लौटाया।`}</p></Notice> : null}<Link className="case-link" href={`/case/${state.caseData.caseId}`}>{en ? "Open this addressable demo case" : "यह पता योग्य डेमो केस खोलें"}</Link><small className="case-link-note">{en ? "The URL is bookmarkable, but this prototype can recover details only from this browser. Production requires authenticated server storage." : "URL बुकमार्क हो सकता है, लेकिन विवरण केवल इसी ब्राउज़र से मिलेंगे। असल सेवा में सुरक्षित सर्वर स्टोरेज चाहिए।"}</small>{requiresAppointment && state.scenario === "no_slots" ? <Notice tone="warning"><strong>{en ? "No test slots are available" : "कोई टेस्ट स्लॉट उपलब्ध नहीं"}</strong><p>{en ? "The submitted application remains saved. Check another date or RTO; do not submit again." : "जमा आवेदन सेव है। दूसरी तारीख या RTO देखें; दोबारा जमा न करें।"}<button className="text-button" onClick={onResolveSlots} type="button">{en ? "Load later availability" : "बाद की उपलब्धता लोड करें"}</button></p></Notice> : requiresAppointment ? <><Field label={en ? "Choose a simulated driving test slot" : "नकली ड्राइविंग टेस्ट स्लॉट चुनें"} error={error}><select onChange={(event) => update({ slot: event.target.value })} value={state.slot}><option value="">{en ? "Select a slot" : "स्लॉट चुनें"}</option><option value="2026-09-04T11:30">4 Sep 2026, 11:30 AM · 6 places</option><option value="2026-09-05T09:00">5 Sep 2026, 9:00 AM · accessible assistance</option></select></Field><Notice><strong>{en ? "RTO-TEST-01 · arrive 30 minutes early" : "RTO-TEST-01 · 30 मिनट पहले पहुंचें"}</strong><p>{en ? "Bring the synthetic appointment receipt and original demo LL fixture. Rescheduling preserves the application reference." : "नकली अपॉइंटमेंट रसीद और मूल डेमो LL उदाहरण लाएं। तारीख बदलने पर आवेदन संदर्भ वही रहेगा।"}</p></Notice></> : null}{state.scenario !== "no_slots" ? <button className="primary-button" onClick={onContinue} type="button">{en ? "Book and open status" : "बुक करें और स्थिति खोलें"}<ArrowRight size={18} /></button> : null}</> : null}{error ? <p className="form-error" role="alert">{error}</p> : null}</section>;
}

function TrackingStage({ state, reset }: { state: JourneyState; reset: () => void }) {
  const en = state.language === "en";
  const events = buildOutcomeEvents(state.selectedServices, state.language, state.scenario);
  const complete = state.outcomeIndex >= events.length - 1;
  const visibleIndex = Math.min(state.outcomeIndex, events.length - 1);
  const citizenActionScenario = ["test_failed", "correction_required", "dispatch_failed"].includes(state.scenario);
  return <section className="stage-section"><StageHeader icon={citizenActionScenario ? Warning : CheckCircle} language={state.language} title={citizenActionScenario ? (en ? "The case needs attention — it is not lost" : "केस पर ध्यान चाहिए — यह खोया नहीं") : complete ? (en ? "The LL-to-DL request is complete" : "LL से DL अनुरोध पूरा हुआ") : (en ? "Status with an owner and next action" : "जिम्मेदार और अगले काम के साथ स्थिति")} intro={en ? "Provider events arrive through reviewer controls; the citizen view only explains what happened and what to do next." : "सेवा इवेंट समीक्षक कंट्रोल से आते हैं; नागरिक दृश्य केवल स्थिति और अगला काम बताता है।"} /><div className="next-action"><span>{en ? "Next action" : "अगला काम"}</span><strong>{events[visibleIndex + 1]?.label ?? (citizenActionScenario ? events[visibleIndex]?.label : (en ? "No action needed" : "कोई काम बाकी नहीं"))}</strong><small>{`${en ? "Owner" : "जिम्मेदार"}: ${events[visibleIndex + 1]?.owner ?? events[visibleIndex]?.owner}`}</small></div><ol className="timeline">{events.map((event, index) => <li className={index <= visibleIndex ? "reached" : "future"} key={`${event.label}-${index}`}><span className="timeline-marker">{index <= visibleIndex ? <Check size={15} weight="bold" /> : index + 1}</span><div><strong>{event.label}</strong><p>{event.owner} <span>·</span> {event.time}</p></div>{index <= visibleIndex ? <MockBadge language={state.language} /> : null}</li>)}</ol><Notice><strong>{en ? "Reviewer simulation is separate" : "समीक्षक सिमुलेशन अलग है"}</strong><p>{en ? "Open Demo controls above to send the next mock provider event. Citizens would receive events automatically or from authorised staff." : "अगला नकली इवेंट भेजने के लिए ऊपर डेमो कंट्रोल खोलें। नागरिकों को इवेंट स्वतः या अधिकृत कर्मचारी से मिलेंगे।"}</p></Notice>{complete && !citizenActionScenario ? <div className="completion-box"><CheckCircle size={44} weight="fill" /><h2>{en ? "Journey complete" : "यात्रा पूरी"}</h2><p>{en ? "The focused demo reached a clear outcome without hiding payment, submission or status recovery." : "केंद्रित डेमो ने भुगतान, आवेदन या स्थिति समाधान छिपाए बिना साफ परिणाम दिखाया।"}</p><button className="secondary-button" onClick={reset} type="button">{en ? "Start a fresh demo" : "नया डेमो शुरू करें"}</button></div> : null}</section>;
}
