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
  beginPayment,
  caseIssuesPhysicalCard,
  caseRequiresAppointment,
  configureCaseServices,
  confirmNoFee,
  DEMO_RULE_PACK,
  evaluateEligibility,
  feeBreakdown,
  reconcilePayment,
  requiredEvidence,
  submitApplication,
  type DemoCase,
  type EvidenceId,
  type ServiceId,
} from "@/lib/sarathi-domain";

type Language = "en" | "hi";
type Mode = "self" | "assisted";
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
    llNumber: "LL-DL99-2026-000123",
    issueDate: "2026-07-29",
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
    issueDate: "2026-07-29",
    identityConsent: false,
    otp: "",
    address: "18, Demo Lane, New Delhi 110001",
    duplicateReason: "",
    newName: "Asha Mehra",
    newAddress: "42, Sample Road, New Delhi 110003",
    newMobile: "9888800000",
    mobileOtp: "",
    evidence: {},
    caseData: createDefaultCase(),
    slot: "",
    outcomeIndex: 0,
  };
}

function serviceLabel(serviceId: ServiceId, language: Language) {
  return serviceCopy[serviceId][language];
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
      <div><MockBadge language={language} label={language === "en" ? "Interactive demo" : "इंटरैक्टिव डेमो"} /><h1>{title}</h1><p>{intro}</p></div>
    </header>
  );
}

function buildOutcomeEvents(selectedServices: ServiceId[], language: Language) {
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

export function CitizenJourney() {
  const [state, setState] = useState<JourneyState>(() => createDefaultState());
  const [hydrated, setHydrated] = useState(false);
  const [resumeFound, setResumeFound] = useState(false);
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
        setState({ ...createDefaultState(), ...parsed });
        setResumeFound(true);
      } catch {
        window.localStorage.removeItem(STORAGE_KEY);
      }
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    document.documentElement.lang = state.language;
  }, [hydrated, state]);

  const update = (next: Partial<JourneyState>) => setState((current) => ({ ...current, ...next }));
  const go = (stage: number) => {
    setError("");
    update({ stage });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const toggleService = (serviceId: ServiceId) => {
    setState((current) => {
      const selectedServices = current.selectedServices.includes(serviceId)
        ? current.selectedServices.filter((id) => id !== serviceId)
        : serviceOrder.filter((id) => [...current.selectedServices, serviceId].includes(id));
      const resetCase = {
        ...current.caseData,
        payment: { state: "not_started" as const, attempts: 0 },
        submission: { state: "not_started" as const },
      };
      return {
        ...current,
        selectedServices,
        evidence: {},
        slot: "",
        outcomeIndex: 0,
        caseData: configureCaseServices(resetCase, selectedServices),
      };
    });
    setError("");
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
    if (state.selectedServices.includes("ll_to_dl") && !eligibility.eligible) {
      setError(state.language === "en" ? `The LL-to-DL request becomes eligible on ${eligibility.earliestDate}. No payment is needed today.` : `LL से DL अनुरोध ${eligibility.earliestDate} को पात्र होगा। आज भुगतान न करें।`);
      return;
    }
    setState((current) => ({ ...current, stage: 2, caseData: { ...current.caseData, issueDate: current.issueDate } }));
    setError("");
  };

  const verifyIdentity = () => {
    if (!state.identityConsent || state.otp !== "482916") {
      setError(state.language === "en" ? "Give consent and enter the displayed 6-digit test OTP." : "सहमति दें और दिखाया गया 6 अंकों का टेस्ट OTP दर्ज करें।");
      return;
    }
    go(3);
  };

  const continueDetails = () => {
    const en = state.language === "en";
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
    go(5);
  };

  const pay = () => setState((current) => ({ ...current, caseData: beginPayment(current.caseData) }));
  const reconcile = () => setState((current) => ({ ...current, caseData: reconcilePayment(current.caseData) }));
  const confirmZeroFee = () => setState((current) => ({ ...current, caseData: confirmNoFee(current.caseData) }));
  const submit = () => setState((current) => ({ ...current, caseData: submitApplication(current.caseData, "licencepath-demo-submit-v2") }));

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
    setError("");
  };

  const createGrievance = () => {
    if (grievanceText.trim().length < 8) return;
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
          {resumeFound && state.stage > 0 ? <Notice tone="success"><strong>{state.language === "en" ? "Your demo was restored." : "आपका डेमो फिर से खुल गया है।"}</strong><p>{state.language === "en" ? "Continue without entering the same information again." : "वही जानकारी दोबारा भरे बिना आगे बढ़ें।"}</p></Notice> : null}

          {state.stage === 0 ? <StartStage state={state} update={update} error={error} toggleService={toggleService} onContinue={begin} /> : null}
          {state.stage === 1 ? <EligibilityStage state={state} eligibility={eligibility} error={error} update={update} onContinue={confirmEligibility} /> : null}
          {state.stage === 2 ? <IdentityStage state={state} update={update} error={error} onContinue={verifyIdentity} /> : null}
          {state.stage === 3 ? <DetailsStage state={state} update={update} error={error} onContinue={continueDetails} /> : null}
          {state.stage === 4 ? <EvidenceStage state={state} update={update} required={evidenceRequirements} error={error} onContinue={continueEvidence} /> : null}
          {state.stage === 5 ? <PaymentStage state={state} fees={fees} onPay={pay} onReconcile={reconcile} onConfirmZeroFee={confirmZeroFee} onContinue={() => go(6)} /> : null}
          {state.stage === 6 ? <SubmissionStage state={state} update={update} requiresAppointment={requiresAppointment} error={error} onSubmit={submit} onContinue={continueAfterSubmission} /> : null}
          {state.stage === 7 ? <TrackingStage state={state} update={update} reset={resetDemo} /> : null}

          {state.stage > 0 && state.stage < 7 ? <button className="back-button" onClick={() => go(state.stage - 1)} type="button"><ArrowLeft aria-hidden="true" size={18} />{t.back}</button> : null}
        </main>

        <aside className="context-panel" aria-label="Current case summary">
          <h2>{state.language === "en" ? "Your case" : "आपका केस"}</h2>
          <p className="context-count">{state.selectedServices.length} {state.language === "en" ? "service request(s)" : "सेवा अनुरोध"}</p>
          <ul className="case-service-list">{state.selectedServices.map((serviceId) => <li key={serviceId}><span>{serviceLabel(serviceId, state.language)}</span><small>{state.caseData.serviceRequests.find((request) => request.serviceId === serviceId)?.requestId}</small></li>)}</ul>
          <dl><div><dt>{state.language === "en" ? "Rule pack" : "नियम पैक"}</dt><dd>{DEMO_RULE_PACK.id}</dd></div><div><dt>{state.language === "en" ? "Payment" : "भुगतान"}</dt><dd>{paymentLabel(state.caseData.payment.state, state.language)}</dd></div><div><dt>{state.language === "en" ? "Application" : "आवेदन"}</dt><dd>{state.caseData.submission.applicationId ?? (state.language === "en" ? "Not submitted" : "जमा नहीं हुआ")}</dd></div></dl>
          <Notice><strong>{state.language === "en" ? "Nothing here reaches Sarathi." : "यहां से कुछ भी Sarathi तक नहीं जाता।"}</strong></Notice>
        </aside>
      </div>

      <button className="help-button" onClick={() => setHelpOpen(true)} type="button"><Lifebuoy aria-hidden="true" size={22} weight="duotone" />{t.help}</button>
      {helpOpen ? <div className="modal-backdrop" role="presentation" onMouseDown={() => setHelpOpen(false)}><section aria-labelledby="help-title" aria-modal="true" className="help-modal" role="dialog" onMouseDown={(event) => event.stopPropagation()}><div className="modal-head"><div><MockBadge language={state.language} /><h2 id="help-title">{state.language === "en" ? "Get help with this step" : "इस चरण में मदद लें"}</h2></div><button aria-label="Close help" onClick={() => setHelpOpen(false)} type="button">×</button></div><p>{state.language === "en" ? "Create a synthetic grievance linked to this demo case. A mock service owner responds within 2 working days." : "इस डेमो केस से जुड़ी नकली शिकायत बनाएं। नकली सेवा अधिकारी 2 कार्य दिवस में जवाब देगा।"}</p><Field label={state.language === "en" ? "What went wrong?" : "क्या समस्या हुई?"} hint={state.language === "en" ? "Do not enter personal information." : "कोई निजी जानकारी न लिखें।"}><textarea value={grievanceText} onChange={(event) => setGrievanceText(event.target.value)} rows={4} /></Field><button className="primary-button" disabled={grievanceText.trim().length < 8} onClick={createGrievance} type="button">{state.language === "en" ? "Create demo grievance" : "डेमो शिकायत बनाएं"}</button></section></div> : null}
    </div>
  );
}

function StartStage({ state, update, error, toggleService, onContinue }: StageProps & { error: string; toggleService: (serviceId: ServiceId) => void; onContinue: () => void }) {
  const en = state.language === "en";
  return (
    <section className="stage-section start-stage">
      <StageHeader icon={ShieldCheck} language={state.language} title={en ? "Choose what you need — we build the journey" : "अपनी जरूरत चुनें — हम यात्रा बनाएंगे"} intro={en ? "Select one or several licence services. The app creates one case with a separate, trackable request for each service." : "एक या कई लाइसेंस सेवाएं चुनें। ऐप हर सेवा के लिए अलग, ट्रैक करने योग्य अनुरोध के साथ एक केस बनाता है।"} />

      <div className="system-compare" aria-label={en ? "Current journey compared with LicencePath" : "मौजूदा यात्रा और LicencePath की तुलना"}>
        <article><span>{en ? "PRD problem model" : "PRD समस्या मॉडल"}</span><h2>{en ? "How the current journey can feel" : "मौजूदा यात्रा कैसी लग सकती है"}</h2><ol><li>{en ? "Find the correct State or RTO service menu" : "सही राज्य या RTO सेवा मेनू खोजें"}</li><li>{en ? "Interpret eligibility and document rules" : "पात्रता और दस्तावेज नियम समझें"}</li><li>{en ? "Move through identity, payment, appointment and status handoffs" : "पहचान, भुगतान, अपॉइंटमेंट और स्थिति के बीच जाएं"}</li><li>{en ? "Recover using separate references or grievance paths" : "अलग संदर्भ या शिकायत मार्ग से समस्या सुलझाएं"}</li></ol><small>{en ? "This is the PRD's citizen problem statement, not a reverse-engineered claim about every State portal." : "यह PRD की नागरिक समस्या है, हर राज्य पोर्टल के बारे में रिवर्स-इंजीनियर किया गया दावा नहीं।"}</small></article>
        <article className="proposed-flow"><span>{en ? "LicencePath proposal" : "LicencePath प्रस्ताव"}</span><h2>{en ? "One guided case" : "एक निर्देशित केस"}</h2><ol><li>{en ? "Choose goals in plain language" : "आसान भाषा में जरूरत चुनें"}</li><li>{en ? "Verify the common profile once" : "साझा प्रोफाइल एक बार जांचें"}</li><li>{en ? "Get one combined checklist and fee review" : "एक संयुक्त चेकलिस्ट और शुल्क देखें"}</li><li>{en ? "Track each request, owner and recovery action" : "हर अनुरोध, जिम्मेदार और समाधान देखें"}</li></ol></article>
      </div>

      <fieldset className="choice-group"><legend>{en ? "Who is completing this?" : "यह आवेदन कौन पूरा कर रहा है?"}</legend><div className="choice-grid two"><label className={`choice-card ${state.mode === "self" ? "selected" : ""}`}><input checked={state.mode === "self"} name="mode" onChange={() => update({ mode: "self" })} type="radio" /><LockKey aria-hidden="true" size={26} weight="duotone" /><span><strong>{en ? "I am applying" : "मैं आवेदन कर रहा हूं"}</strong><small>{en ? "You control every confirmation." : "हर पुष्टि आपके नियंत्रण में है।"}</small></span></label><label className={`choice-card ${state.mode === "assisted" ? "selected" : ""}`}><input checked={state.mode === "assisted"} name="mode" onChange={() => update({ mode: "assisted" })} type="radio" /><HandHeart aria-hidden="true" size={26} weight="duotone" /><span><strong>{en ? "Someone is helping me" : "कोई मेरी मदद कर रहा है"}</strong><small>{en ? "The citizen still confirms consent, payment and submission." : "नागरिक सहमति, भुगतान और आवेदन की पुष्टि खुद करता है।"}</small></span></label></div></fieldset>
      {state.mode === "assisted" ? <Notice><label className="check-row"><input checked={state.helperConsent} onChange={(event) => update({ helperConsent: event.target.checked })} type="checkbox" /><span><strong>{en ? "I consent to assisted mode for 30 minutes." : "मैं 30 मिनट के सहायता मोड की सहमति देता हूं।"}</strong><small>{en ? "Demo helper: Neha Verma, family member. Actions appear in the audit trail." : "डेमो सहायक: नेहा वर्मा, परिवार की सदस्य। हर कार्रवाई रिकॉर्ड होगी।"}</small></span></label></Notice> : null}

      <fieldset className="choice-group"><legend>{en ? "Which services do you need?" : "आपको कौन सी सेवाएं चाहिए?"}</legend><p className="group-hint">{en ? "Choose more than one to see a combined case. Bundling rules are illustrative and would be State/RTO-configured in production." : "संयुक्त केस देखने के लिए एक से अधिक चुनें। असल सेवा में जोड़ने के नियम राज्य/RTO के अनुसार होंगे।"}</p><div className="service-grid">{serviceOrder.map((serviceId) => { const selected = state.selectedServices.includes(serviceId); const copy = serviceCopy[serviceId]; return <label className={`service-choice ${selected ? "selected" : ""}`} key={serviceId}><input checked={selected} onChange={() => toggleService(serviceId)} type="checkbox" /><span><strong>{en ? copy.en : copy.hi}</strong><small>{en ? copy.descriptionEn : copy.descriptionHi}</small><em>₹{DEMO_RULE_PACK.services[serviceId].fee} {en ? "illustrative" : "उदाहरण"}</em></span>{selected ? <CheckCircle aria-hidden="true" size={24} weight="fill" /> : null}</label>; })}</div></fieldset>
      <div className="selection-summary" aria-live="polite"><strong>{state.selectedServices.length}</strong><span>{en ? "service requests will share one case, identity check, evidence bundle and timeline." : "सेवा अनुरोध एक केस, पहचान जांच, दस्तावेज बंडल और टाइमलाइन साझा करेंगे।"}</span></div>
      <label className="notice-confirm"><input checked={state.acceptedNotice} onChange={(event) => update({ acceptedNotice: event.target.checked })} type="checkbox" /><span>{en ? "I understand this is not an official service and I will use only the synthetic details provided." : "मैं समझता हूं कि यह आधिकारिक सेवा नहीं है और केवल दी गई नकली जानकारी का उपयोग करूंगा।"}</span></label>
      {error ? <p className="form-error" role="alert">{error}</p> : null}
      <button className="primary-button" onClick={onContinue} type="button">{en ? "Build my service journey" : "मेरी सेवा यात्रा बनाएं"}<ArrowRight aria-hidden="true" size={18} weight="bold" /></button>
    </section>
  );
}

function EligibilityStage({ state, eligibility, error, update, onContinue }: StageProps & { eligibility: ReturnType<typeof evaluateEligibility>; error: string; onContinue: () => void }) {
  const en = state.language === "en";
  return (
    <section className="stage-section">
      <StageHeader icon={ClockCountdown} language={state.language} title={en ? "Check every request before effort or payment" : "मेहनत या भुगतान से पहले हर अनुरोध जांचें"} intro={en ? "The selected services are evaluated against one explicit, versioned demo rule pack." : "चुनी गई सेवाओं को एक स्पष्ट, संस्करण वाले डेमो नियम पैक से जांचा जाता है।"} />
      <Notice tone="warning"><strong>{en ? "Illustrative jurisdiction rules" : "उदाहरण क्षेत्र नियम"}</strong><p>{DEMO_RULE_PACK.id} · {DEMO_RULE_PACK.source}. {en ? "Production must load authorised, current State/RTO rules." : "असल सेवा में अधिकृत, मौजूदा राज्य/RTO नियम लोड होंगे।"}</p></Notice>
      {state.selectedServices.includes("ll_to_dl") ? <><div className="form-grid"><Field label={en ? "Synthetic Learner's Licence number" : "नकली लर्नर लाइसेंस नंबर"} hint={en ? "Provided by the mock record adapter" : "नकली रिकॉर्ड सेवा से मिला"}><div className="input-with-badge"><input readOnly value={state.caseData.llNumber} /><MockBadge language={state.language} label="Mock Sarathi" /></div></Field><Field label={en ? "Learner's Licence issue date" : "लर्नर लाइसेंस जारी होने की तारीख"}><input max={TODAY} onChange={(event) => update({ issueDate: event.target.value })} type="date" value={state.issueDate} /></Field></div><div className={`eligibility-result ${eligibility.eligible ? "eligible" : "not-eligible"}`} aria-live="polite"><span>{eligibility.eligible ? <CheckCircle size={30} weight="fill" /> : <ClockCountdown size={30} weight="fill" />}</span><div><strong>{eligibility.eligible ? (en ? "LL-to-DL request is eligible in this fixture" : "इस उदाहरण में LL से DL अनुरोध पात्र है") : (en ? "LL-to-DL request is not eligible yet" : "LL से DL अनुरोध अभी पात्र नहीं है")}</strong><p>{en ? `Held for ${eligibility.daysHeld} days. Earliest demo date: ${eligibility.earliestDate}.` : `${eligibility.daysHeld} दिन पूरे हुए। पहली डेमो तारीख: ${eligibility.earliestDate}.`}</p></div></div>{!eligibility.eligible ? <button className="text-button" onClick={() => update({ issueDate: "2026-07-29" })} type="button">{en ? "Use the eligible demo date" : "पात्र डेमो तारीख चुनें"}</button> : null}</> : null}
      <div className="request-checks">{state.selectedServices.filter((id) => id !== "ll_to_dl").map((serviceId) => <article key={serviceId}><CheckCircle aria-hidden="true" size={22} weight="fill" /><div><strong>{serviceLabel(serviceId, state.language)}</strong><p>{en ? "Available in this demo rule pack. Details and evidence are checked next." : "इस डेमो नियम पैक में उपलब्ध। आगे जानकारी और दस्तावेज जांचे जाएंगे।"}</p></div><MockBadge language={state.language} label={en ? "Configured rule" : "सेट नियम"} /></article>)}</div>
      {error ? <p className="form-error" role="alert">{error}</p> : null}<button className="primary-button" onClick={onContinue} type="button">{en ? "Continue to identity" : "पहचान पर जाएं"}<ArrowRight size={18} weight="bold" /></button>
    </section>
  );
}

function IdentityStage({ state, update, error, onContinue }: StageProps & { error: string; onContinue: () => void }) {
  const en = state.language === "en";
  return <section className="stage-section"><StageHeader icon={LockKey} language={state.language} title={en ? "Retrieve the common demo profile once" : "साझा डेमो प्रोफाइल एक बार पाएं"} intro={en ? `${state.selectedServices.length} service requests reuse one consented identity and licence record.` : `${state.selectedServices.length} सेवा अनुरोध एक सहमति वाली पहचान और लाइसेंस रिकॉर्ड उपयोग करते हैं।`} /><Notice><strong>{en ? "Test OTP: 482916" : "टेस्ट OTP: 482916"}</strong><p>{en ? "Mock identity adapter. No SMS is sent and no real mobile number is used." : "नकली पहचान सेवा। कोई SMS नहीं भेजा जाता और असली मोबाइल नंबर उपयोग नहीं होता।"}</p></Notice><Field label={en ? "Demo mobile number" : "डेमो मोबाइल नंबर"}><div className="input-with-badge"><input readOnly value="+91 90000 00000" /><MockBadge language={state.language} label="Mock identity" /></div></Field><label className="notice-confirm"><input checked={state.identityConsent} onChange={(event) => update({ identityConsent: event.target.checked })} type="checkbox" /><span>{en ? "I consent to retrieve Asha Verma's synthetic profile and licence record for the selected demo services." : "मैं चुनी गई डेमो सेवाओं के लिए आशा वर्मा की नकली प्रोफाइल और लाइसेंस रिकॉर्ड देखने की सहमति देता हूं।"}</span></label><Field label={en ? "6-digit test OTP" : "6 अंकों का टेस्ट OTP"} error={error}><input autoComplete="one-time-code" inputMode="numeric" maxLength={6} onChange={(event) => update({ otp: event.target.value.replace(/\D/g, "") })} value={state.otp} /></Field><button className="primary-button" onClick={onContinue} type="button">{en ? "Retrieve demo record" : "डेमो रिकॉर्ड पाएं"}<MagnifyingGlass size={18} weight="bold" /></button></section>;
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
  return <section className="stage-section"><StageHeader icon={FileArrowUp} language={state.language} title={en ? "One combined evidence checklist" : "एक संयुक्त दस्तावेज चेकलिस्ट"} intro={en ? `The app deduplicated evidence across ${state.selectedServices.length} service requests.` : `ऐप ने ${state.selectedServices.length} सेवा अनुरोधों के दोहराए दस्तावेज हटा दिए।`} /><Notice tone="warning"><strong>{en ? "Never upload a real Aadhaar, PAN, licence or payment receipt." : "असली आधार, PAN, लाइसेंस या भुगतान रसीद कभी अपलोड न करें।"}</strong><p>{en ? "Every button below attaches a generated fixture already included in the demo." : "नीचे हर बटन डेमो में पहले से मौजूद नकली फाइल जोड़ता है।"}</p></Notice>{required.length > 0 ? <div className="evidence-list">{required.map((evidenceId) => { const copy = evidenceCopy[evidenceId]; const attached = Boolean(state.evidence[evidenceId]); return <article className={attached ? "attached" : ""} key={evidenceId}><div className="file-icon">{attached ? <Check size={22} weight="bold" /> : <FileArrowUp size={22} />}</div><div><strong>{en ? copy.en : copy.hi}</strong><small>{attached ? `${copy.meta} · ${en ? "Quality check passed" : "गुणवत्ता जांच पास"}` : "PDF or JPG · maximum 2 MB"}</small></div><button className="secondary-button" onClick={() => setEvidence(evidenceId)} type="button">{attached ? (en ? "Remove" : "हटाएं") : (en ? "Attach fixture" : "उदाहरण जोड़ें")}</button></article>; })}</div> : <div className="empty-evidence"><CheckCircle size={32} weight="fill" /><div><strong>{en ? "No document is required for this demo selection" : "इस डेमो चयन के लिए कोई दस्तावेज नहीं चाहिए"}</strong><p>{en ? "The verified synthetic mobile is enough for the selected branch." : "चुनी गई शाखा के लिए सत्यापित नकली मोबाइल पर्याप्त है।"}</p></div></div>}{error ? <p className="form-error" role="alert">{error}</p> : null}<button className="primary-button" onClick={onContinue} type="button">{en ? "Review illustrative fees" : "उदाहरण शुल्क देखें"}<ArrowRight size={18} weight="bold" /></button></section>;
}

function PaymentStage({ state, fees, onPay, onReconcile, onConfirmZeroFee, onContinue }: { state: JourneyState; fees: ReturnType<typeof feeBreakdown>; onPay: () => void; onReconcile: () => void; onConfirmZeroFee: () => void; onContinue: () => void }) {
  const en = state.language === "en";
  const status = state.caseData.payment.state;
  return <section className="stage-section"><StageHeader icon={Receipt} language={state.language} title={en ? "Review the case before simulated payment" : "नकली भुगतान से पहले केस जांचें"} intro={en ? "Each service keeps its own fee line while payment and submission remain separate states." : "हर सेवा की अलग शुल्क पंक्ति है और भुगतान व आवेदन अलग स्थितियां हैं।"} /><div className="fee-box">{fees.lines.map((line) => <div key={line.serviceId}><span>{serviceLabel(line.serviceId, state.language)}</span><strong>₹{line.amount}</strong></div>)}<div className="fee-total"><span>{en ? "Illustrative total" : "उदाहरण कुल"}</span><strong>₹{fees.total}</strong></div><small>{en ? `Source: ${DEMO_RULE_PACK.id}. These are synthetic values, not official fees.` : `स्रोत: ${DEMO_RULE_PACK.id}। ये नकली मूल्य हैं, आधिकारिक शुल्क नहीं।`}</small></div>{status === "not_started" && fees.total > 0 ? <><Notice><strong>{en ? "Recovery scenario" : "समस्या समाधान स्थिति"}</strong><p>{en ? "The mock gateway first returns an uncertain result. The app checks the same reference instead of charging again." : "नकली भुगतान सेवा पहले अनिश्चित परिणाम देती है। ऐप दोबारा शुल्क लगाने की जगह उसी संदर्भ को जांचता है।"}</p></Notice><button className="primary-button" onClick={onPay} type="button">{en ? "Simulate payment" : "नकली भुगतान करें"}<ArrowRight size={18} /></button></> : null}{status === "not_started" && fees.total === 0 ? <><Notice tone="success"><strong>{en ? "No payment due in this demo rule pack" : "इस डेमो नियम पैक में कोई भुगतान नहीं"}</strong><p>{en ? "The zero-fee decision is still recorded before submission." : "शून्य शुल्क का निर्णय भी आवेदन से पहले रिकॉर्ड होगा।"}</p></Notice><button className="primary-button" onClick={onConfirmZeroFee} type="button">{en ? "Confirm no payment due" : "कोई भुगतान नहीं की पुष्टि करें"}</button></> : null}{status === "pending" ? <><div className="status-panel pending"><CircleNotch aria-hidden="true" size={30} /><div><strong>{en ? "Payment confirmation pending" : "भुगतान की पुष्टि बाकी है"}</strong><p>{en ? "Do not pay again. Reference: MOCK-PAY-20260828-9912" : "दोबारा भुगतान न करें। संदर्भ: MOCK-PAY-20260828-9912"}</p></div><MockBadge language={state.language} label="Mock payment" /></div><button className="primary-button" onClick={onReconcile} type="button">{en ? "Check the same payment reference" : "उसी भुगतान संदर्भ को जांचें"}</button></> : null}{status === "paid" ? <><div className="status-panel success"><CheckCircle aria-hidden="true" size={32} weight="fill" /><div><strong>{fees.total === 0 ? (en ? "Zero-fee decision recorded" : "शून्य शुल्क दर्ज हुआ") : (en ? "Payment found and reconciled" : "भुगतान मिला और पुष्टि हुई")}</strong><p>{en ? "The case is ready for one idempotent submission." : "केस एक सुरक्षित, दोहराव-रहित आवेदन के लिए तैयार है।"}</p></div></div>{fees.total > 0 ? <a className="download-button" download href={en ? "/licencepath-demo-payment-receipt.txt" : "/licencepath-demo-payment-receipt-hi.txt"}><Receipt size={18} />{en ? "Download accessible demo receipt" : "सुलभ डेमो रसीद डाउनलोड करें"}</a> : null}<button className="primary-button" onClick={onContinue} type="button">{en ? "Continue to submission" : "आवेदन जमा करें"}<ArrowRight size={18} /></button></> : null}</section>;
}

function SubmissionStage({ state, update, requiresAppointment, error, onSubmit, onContinue }: StageProps & { requiresAppointment: boolean; error: string; onSubmit: () => void; onContinue: () => void }) {
  const en = state.language === "en";
  const submitted = state.caseData.submission.state === "submitted";
  return <section className="stage-section"><StageHeader icon={CalendarCheck} language={state.language} title={en ? "Submit one case with independent service requests" : "अलग सेवा अनुरोधों वाला एक केस जमा करें"} intro={en ? "Repeated taps return the same case and application reference." : "बार-बार दबाने पर वही केस और आवेदन नंबर मिलता है।"} />{!submitted ? <><div className="review-summary"><h2>{en ? "Plain-language review" : "आसान भाषा में जांच"}</h2><p>{en ? `Asha Verma is submitting ${state.selectedServices.length} synthetic service request(s) in one case.` : `आशा वर्मा एक केस में ${state.selectedServices.length} नकली सेवा अनुरोध जमा कर रही हैं।`}</p><ul>{state.selectedServices.map((serviceId) => <li key={serviceId}><CheckCircle size={18} weight="fill" />{serviceLabel(serviceId, state.language)}</li>)}</ul><p>{en ? "Payment or the zero-fee decision is confirmed. Required generated evidence is attached." : "भुगतान या शून्य शुल्क की पुष्टि है। जरूरी नकली दस्तावेज जुड़े हैं।"}</p></div><label className="notice-confirm"><input defaultChecked type="checkbox" /><span>{en ? "Asha confirms the synthetic information and submits all selected requests." : "आशा नकली जानकारी की पुष्टि करके सभी चुने अनुरोध जमा करती हैं।"}</span></label><button className="primary-button" onClick={onSubmit} type="button">{en ? "Submit demo case once" : "डेमो केस एक बार जमा करें"}<ShieldCheck size={18} /></button></> : null}{submitted ? <><Notice tone="success"><strong>{en ? "Case submitted once" : "केस एक बार जमा हुआ"}</strong><p>{state.caseData.submission.applicationId} · {state.caseData.serviceRequests.length} {en ? "linked service requests" : "जुड़े सेवा अनुरोध"} <MockBadge language={state.language} label="Mock submission" /></p></Notice><div className="submitted-requests">{state.caseData.serviceRequests.map((request) => <article key={request.requestId}><span>{request.requestId}</span><strong>{serviceLabel(request.serviceId, state.language)}</strong><small>{en ? "Submitted · separately trackable" : "जमा · अलग से ट्रैक करने योग्य"}</small></article>)}</div>{requiresAppointment ? <><Field label={en ? "Choose a simulated driving test slot" : "नकली ड्राइविंग टेस्ट स्लॉट चुनें"} error={error}><select onChange={(event) => update({ slot: event.target.value })} value={state.slot}><option value="">{en ? "Select a slot" : "स्लॉट चुनें"}</option><option value="2026-09-04T11:30">4 Sep 2026, 11:30 AM</option><option value="2026-09-05T09:00">5 Sep 2026, 9:00 AM</option></select></Field><Notice><strong>{en ? "Mock appointment adapter · RTO-TEST-01" : "नकली अपॉइंटमेंट सेवा · RTO-TEST-01"}</strong><p>{en ? "No real appointment exists." : "कोई असली अपॉइंटमेंट नहीं है।"}</p></Notice></> : <Notice><strong>{en ? "No appointment required by this demo selection" : "इस डेमो चयन में अपॉइंटमेंट जरूरी नहीं"}</strong><p>{en ? "The case moves directly to scrutiny and status tracking." : "केस सीधे जांच और स्थिति ट्रैकिंग पर जाता है।"}</p></Notice>}<button className="primary-button" onClick={onContinue} type="button">{requiresAppointment ? (en ? "Book and track all requests" : "बुक करें और सभी अनुरोध ट्रैक करें") : (en ? "Track all requests" : "सभी अनुरोध ट्रैक करें")}<ArrowRight size={18} /></button></> : null}</section>;
}

function TrackingStage({ state, update, reset }: StageProps & { reset: () => void }) {
  const en = state.language === "en";
  const events = buildOutcomeEvents(state.selectedServices, state.language);
  const complete = state.outcomeIndex >= events.length - 1;
  const nextEvent = () => update({ outcomeIndex: Math.min(state.outcomeIndex + 1, events.length - 1) });
  return <section className="stage-section"><StageHeader icon={CheckCircle} language={state.language} title={complete ? (en ? "Every service request is complete" : "हर सेवा अनुरोध पूरा हुआ") : (en ? "One timeline, clear branch ownership" : "एक टाइमलाइन, हर शाखा की साफ जिम्मेदारी")} intro={complete ? (en ? "The selected citizen journey reached a clear, recoverable outcome." : "चुनी गई नागरिक यात्रा स्पष्ट, सुरक्षित परिणाम तक पहुंची।") : (en ? "Each event names the service owner and dependency behind the next action." : "हर घटना अगले काम के जिम्मेदार और सेवा का नाम बताती है।")} /><div className="next-action"><span>{en ? "Next action" : "अगला काम"}</span><strong>{complete ? (en ? "No action needed" : "कोई काम बाकी नहीं") : events[state.outcomeIndex + 1]?.label}</strong><small>{complete ? (en ? "Case closed safely" : "केस सुरक्षित रूप से बंद") : `${en ? "Owner" : "जिम्मेदार"}: ${events[state.outcomeIndex + 1]?.owner}`}</small></div><ol className="timeline">{events.map((event, index) => <li className={index <= state.outcomeIndex ? "reached" : "future"} key={`${event.label}-${index}`}><span className="timeline-marker">{index <= state.outcomeIndex ? <Check size={15} weight="bold" /> : index + 1}</span><div><strong>{event.label}</strong><p>{event.owner} <span>·</span> {event.time}</p></div>{index <= state.outcomeIndex ? <MockBadge language={state.language} /> : null}</li>)}</ol>{!complete ? <button className="primary-button" onClick={nextEvent} type="button">{en ? "Advance mock workflow" : "नकली प्रक्रिया आगे बढ़ाएं"}<ArrowRight size={18} /></button> : <div className="completion-box"><CheckCircle size={44} weight="fill" /><h2>{en ? "A complete, selectable citizen journey" : "पूरी, चुनी जा सकने वाली नागरिक यात्रा"}</h2><p>{en ? `Asha completed ${state.selectedServices.length} service request(s) through one case, with separate ownership and recovery at every handoff.` : `आशा ने एक केस में ${state.selectedServices.length} सेवा अनुरोध पूरे किए, हर चरण में अलग जिम्मेदारी और समाधान के साथ।`}</p><div><button className="secondary-button" onClick={reset} type="button">{en ? "Start another service plan" : "नई सेवा योजना शुरू करें"}</button><Link className="primary-link" href={en ? "/about" : "/about/hi"}>{en ? "See the scale-up architecture" : "बड़े स्तर की संरचना देखें"}</Link></div></div>}</section>;
}
