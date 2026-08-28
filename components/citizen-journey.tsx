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
  evaluateEligibility,
  reconcilePayment,
  submitApplication,
  type DemoCase,
} from "@/lib/sarathi-domain";

type Language = "en" | "hi";
type Mode = "self" | "assisted";
type Evidence = { ll: boolean; photo: boolean; address: boolean };

type JourneyState = {
  stage: number;
  language: Language;
  largeText: boolean;
  highContrast: boolean;
  mode: Mode;
  acceptedNotice: boolean;
  helperConsent: boolean;
  issueDate: string;
  identityConsent: boolean;
  otp: string;
  address: string;
  evidence: Evidence;
  caseData: DemoCase;
  slot: string;
  outcomeIndex: number;
  grievanceId?: string;
};

const defaultCase: DemoCase = {
  caseId: "LP-DEMO-20260827-0001",
  llNumber: "LL-DL99-2026-000123",
  issueDate: "2026-07-29",
  payment: { state: "not_started", attempts: 0 },
  submission: { state: "not_started" },
};

const defaultState: JourneyState = {
  stage: 0,
  language: "en",
  largeText: false,
  highContrast: false,
  mode: "self",
  acceptedNotice: false,
  helperConsent: false,
  issueDate: "2026-07-29",
  identityConsent: false,
  otp: "",
  address: "18, Demo Lane, New Delhi 110001",
  evidence: { ll: false, photo: false, address: false },
  caseData: defaultCase,
  slot: "",
  outcomeIndex: 0,
};

const translations = {
  en: {
    skip: "Skip to main content",
    banner: "Independent, unofficial prototype. Use synthetic data only.",
    mock: "Mock",
    about: "About this prototype",
    english: "English",
    hindi: "हिंदी",
    largeText: "Larger text",
    contrast: "High contrast",
    help: "Get help",
    saved: "Saved on this device",
    case: "Demo case",
    mainJourney: "Get a permanent Driving Licence",
    pilot: "Delhi pilot fixture",
    next: "Continue",
    back: "Back",
    stages: ["Start", "Eligibility", "Identity", "Application", "Evidence", "Payment", "Submit", "Track"],
  },
  hi: {
    skip: "मुख्य सामग्री पर जाएं",
    banner: "यह स्वतंत्र और अनौपचारिक प्रोटोटाइप है। केवल नकली जानकारी का उपयोग करें।",
    mock: "नकली",
    about: "इस प्रोटोटाइप के बारे में",
    english: "English",
    hindi: "हिंदी",
    largeText: "बड़ा टेक्स्ट",
    contrast: "अधिक कॉन्ट्रास्ट",
    help: "मदद लें",
    saved: "इस डिवाइस पर सेव है",
    case: "डेमो केस",
    mainJourney: "स्थायी ड्राइविंग लाइसेंस पाएं",
    pilot: "दिल्ली पायलट उदाहरण",
    next: "आगे बढ़ें",
    back: "पीछे",
    stages: ["शुरू", "पात्रता", "पहचान", "आवेदन", "दस्तावेज", "भुगतान", "जमा करें", "स्थिति"],
  },
} as const;

const outcomeEvents = [
  { en: "Application submitted", hi: "आवेदन जमा हुआ", owner: "LicencePath queue", time: "28 Aug, 10:42" },
  { en: "RTO test booked", hi: "RTO टेस्ट बुक हुआ", owner: "Mock RTO", time: "28 Aug, 10:43" },
  { en: "Driving test passed", hi: "ड्राइविंग टेस्ट पास हुआ", owner: "Mock RTO", time: "4 Sep, 12:10" },
  { en: "Licence approved", hi: "लाइसेंस स्वीकृत हुआ", owner: "Mock Sarathi", time: "4 Sep, 12:14" },
  { en: "Card dispatched", hi: "कार्ड भेजा गया", owner: "Mock carrier", time: "6 Sep, 09:05" },
  { en: "Delivered and closed", hi: "डिलीवर हुआ और केस बंद", owner: "Mock carrier", time: "8 Sep, 16:22" },
];

function paymentLabel(state: DemoCase["payment"]["state"], language: Language) {
  const labels = {
    en: { not_started: "Not started", pending: "Pending", paid: "Paid", failed: "Failed" },
    hi: { not_started: "शुरू नहीं हुआ", pending: "पुष्टि बाकी", paid: "भुगतान हुआ", failed: "असफल" },
  } as const;
  return labels[language][state];
}

function MockBadge({ language }: { language: Language }) {
  return <span className="mock-badge"><Flask aria-hidden="true" size={14} />{translations[language].mock}</span>;
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
  return <div className={`notice notice-${tone}`}><Icon aria-hidden="true" size={22} weight="duotone" /><div>{children}</div></div>;
}

export function CitizenJourney() {
  const [state, setState] = useState<JourneyState>(defaultState);
  const [hydrated, setHydrated] = useState(false);
  const [resumeFound, setResumeFound] = useState(false);
  const [error, setError] = useState("");
  const [helpOpen, setHelpOpen] = useState(false);
  const [grievanceText, setGrievanceText] = useState("");
  const t = translations[state.language];

  const eligibility = useMemo(
    () => evaluateEligibility(state.issueDate, "2026-08-28"),
    [state.issueDate],
  );

  useEffect(() => {
    const saved = window.localStorage.getItem("licencepath-demo-case");
    if (saved) {
      try {
        setState({ ...defaultState, ...JSON.parse(saved) });
        setResumeFound(true);
      } catch {
        window.localStorage.removeItem("licencepath-demo-case");
      }
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    window.localStorage.setItem("licencepath-demo-case", JSON.stringify(state));
    document.documentElement.lang = state.language;
  }, [hydrated, state]);

  const update = (next: Partial<JourneyState>) => setState((current) => ({ ...current, ...next }));
  const go = (stage: number) => {
    setError("");
    update({ stage });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const begin = () => {
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
    if (!eligibility.eligible) {
      setError(state.language === "en" ? `This LL becomes eligible on ${eligibility.earliestDate}. No payment is needed today.` : `यह LL ${eligibility.earliestDate} को पात्र होगा। आज भुगतान न करें।`);
      return;
    }
    setState((current) => ({
      ...current,
      stage: 2,
      caseData: { ...current.caseData, issueDate: current.issueDate },
    }));
    setError("");
  };

  const verifyIdentity = () => {
    if (!state.identityConsent || state.otp !== "482916") {
      setError(state.language === "en" ? "Give consent and enter the displayed 6-digit test OTP." : "सहमति दें और दिखाया गया 6 अंकों का टेस्ट OTP दर्ज करें।");
      return;
    }
    go(3);
  };

  const continueEvidence = () => {
    if (!Object.values(state.evidence).every(Boolean)) {
      setError(state.language === "en" ? "Attach all three generated fixtures before review." : "आगे बढ़ने से पहले तीनों नकली दस्तावेज जोड़ें।");
      return;
    }
    go(5);
  };

  const pay = () => {
    setState((current) => ({ ...current, caseData: beginPayment(current.caseData) }));
  };

  const reconcile = () => {
    setState((current) => ({ ...current, caseData: reconcilePayment(current.caseData) }));
  };

  const submit = () => {
    setState((current) => ({
      ...current,
      caseData: submitApplication(current.caseData, "licencepath-demo-submit-1"),
    }));
  };

  const confirmSlot = () => {
    if (!state.slot) {
      setError(state.language === "en" ? "Choose one simulated test slot." : "एक नकली टेस्ट स्लॉट चुनें।");
      return;
    }
    go(7);
  };

  const resetDemo = () => {
    window.localStorage.removeItem("licencepath-demo-case");
    setState(defaultState);
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

      <div className="prototype-banner" role="note">
        <Warning aria-hidden="true" size={18} weight="fill" />
        <span>{t.banner}</span>
        <MockBadge language={state.language} />
      </div>

      <header className="site-header">
        <div className="brand-wrap">
          <Link className="brand" href="/" aria-label="LicencePath home">
            <span className="brand-mark" aria-hidden="true">LP</span>
            <span>LicencePath</span>
          </Link>
          <span className="pilot-label">{t.pilot}</span>
        </div>
        <nav className="header-actions" aria-label="Language and accessibility">
          <button className="utility-button" onClick={() => update({ language: state.language === "en" ? "hi" : "en" })} type="button">
            <Translate aria-hidden="true" size={19} />
            {state.language === "en" ? t.hindi : t.english}
          </button>
          <button aria-pressed={state.largeText} className="utility-button" onClick={() => update({ largeText: !state.largeText })} type="button">
            <PersonArmsSpread aria-hidden="true" size={19} />
            {t.largeText}
          </button>
          <button aria-pressed={state.highContrast} className="utility-button compact-utility" onClick={() => update({ highContrast: !state.highContrast })} type="button">
            {t.contrast}
          </button>
          <Link className="utility-link" href={state.language === "hi" ? "/about/hi" : "/about"}>{t.about}</Link>
        </nav>
      </header>

      <div className="journey-frame">
        <aside className="progress-panel" aria-label="Application progress">
          <div className="case-kicker">{t.case}</div>
          <strong>{state.caseData.caseId}</strong>
          <p>{t.mainJourney}</p>
          <ol className="step-list">
            {t.stages.map((label, index) => (
              <li className={index === state.stage ? "active" : index < state.stage ? "complete" : ""} key={label}>
                <span aria-hidden="true">{index < state.stage ? <Check size={14} weight="bold" /> : index + 1}</span>
                <span>{label}</span>
              </li>
            ))}
          </ol>
          <div className="save-state"><CheckCircle aria-hidden="true" size={18} weight="fill" />{t.saved}</div>
          {state.grievanceId ? <div className="grievance-ref">{state.grievanceId}</div> : null}
        </aside>

        <main id="main-content" className="journey-main" tabIndex={-1}>
          <div className="mobile-progress" aria-live="polite">
            <span>{state.stage + 1} / {t.stages.length}</span>
            <strong>{t.stages[state.stage]}</strong>
          </div>

          {resumeFound && state.stage > 0 ? (
            <Notice tone="success">
              <strong>{state.language === "en" ? "Your demo was restored." : "आपका डेमो फिर से खुल गया है।"}</strong>
              <p>{state.language === "en" ? "Continue without entering the same information again." : "वही जानकारी दोबारा भरे बिना आगे बढ़ें।"}</p>
            </Notice>
          ) : null}

          {state.stage === 0 ? <StartStage state={state} update={update} error={error} onContinue={begin} /> : null}
          {state.stage === 1 ? <EligibilityStage language={state.language} issueDate={state.issueDate} eligibility={eligibility} error={error} update={update} onContinue={confirmEligibility} /> : null}
          {state.stage === 2 ? <IdentityStage state={state} update={update} error={error} onContinue={verifyIdentity} /> : null}
          {state.stage === 3 ? <ApplicationStage state={state} update={update} onContinue={() => go(4)} /> : null}
          {state.stage === 4 ? <EvidenceStage state={state} update={update} error={error} onContinue={continueEvidence} /> : null}
          {state.stage === 5 ? <PaymentStage state={state} onPay={pay} onReconcile={reconcile} onContinue={() => go(6)} /> : null}
          {state.stage === 6 ? <SubmissionStage state={state} update={update} error={error} onSubmit={submit} onContinue={confirmSlot} /> : null}
          {state.stage === 7 ? <TrackingStage state={state} update={update} reset={resetDemo} /> : null}

          {state.stage > 0 && state.stage < 7 ? (
            <button className="back-button" onClick={() => go(state.stage - 1)} type="button"><ArrowLeft aria-hidden="true" size={18} />{t.back}</button>
          ) : null}
        </main>

        <aside className="context-panel" aria-label="Current case summary">
          <h2>{state.language === "en" ? "Your case" : "आपका केस"}</h2>
          <dl>
            <div><dt>{state.language === "en" ? "Service" : "सेवा"}</dt><dd>{t.mainJourney}</dd></div>
            <div><dt>{state.language === "en" ? "Pilot" : "पायलट"}</dt><dd>Delhi, RTO-TEST-01 <MockBadge language={state.language} /></dd></div>
            <div><dt>{state.language === "en" ? "Payment" : "भुगतान"}</dt><dd>{paymentLabel(state.caseData.payment.state, state.language)}</dd></div>
            <div><dt>{state.language === "en" ? "Application" : "आवेदन"}</dt><dd>{state.caseData.submission.applicationId ?? (state.language === "en" ? "Not submitted" : "जमा नहीं हुआ")}</dd></div>
          </dl>
          <Notice>
            <strong>{state.language === "en" ? "Nothing here reaches Sarathi." : "यहां से कुछ भी Sarathi तक नहीं जाता।"}</strong>
          </Notice>
        </aside>
      </div>

      <button className="help-button" onClick={() => setHelpOpen(true)} type="button"><Lifebuoy aria-hidden="true" size={22} weight="duotone" />{t.help}</button>

      {helpOpen ? (
        <div className="modal-backdrop" role="presentation" onMouseDown={() => setHelpOpen(false)}>
          <section aria-labelledby="help-title" aria-modal="true" className="help-modal" role="dialog" onMouseDown={(event) => event.stopPropagation()}>
            <div className="modal-head"><div><MockBadge language={state.language} /><h2 id="help-title">{state.language === "en" ? "Get help with this step" : "इस चरण में मदद लें"}</h2></div><button aria-label="Close help" onClick={() => setHelpOpen(false)} type="button">×</button></div>
            <p>{state.language === "en" ? "Create a synthetic grievance linked to this demo case. A mock service owner responds within 2 working days." : "इस डेमो केस से जुड़ी नकली शिकायत बनाएं। नकली सेवा अधिकारी 2 कार्य दिवस में जवाब देगा।"}</p>
            <Field label={state.language === "en" ? "What went wrong?" : "क्या समस्या हुई?"} hint={state.language === "en" ? "Do not enter personal information." : "कोई निजी जानकारी न लिखें।"}>
              <textarea value={grievanceText} onChange={(event) => setGrievanceText(event.target.value)} rows={4} />
            </Field>
            <button className="primary-button" disabled={grievanceText.trim().length < 8} onClick={createGrievance} type="button">{state.language === "en" ? "Create demo grievance" : "डेमो शिकायत बनाएं"}</button>
          </section>
        </div>
      ) : null}
    </div>
  );
}

type StageProps = { state: JourneyState; update: (next: Partial<JourneyState>) => void };

function StageHeader({ icon: Icon, title, intro, language }: { icon: typeof Info; title: string; intro: string; language: Language }) {
  return <header className="stage-header"><div className="stage-icon"><Icon aria-hidden="true" size={28} weight="duotone" /></div><div><MockBadge language={language} /><h1>{title}</h1><p>{intro}</p></div></header>;
}

function StartStage({ state, update, error, onContinue }: StageProps & { error: string; onContinue: () => void }) {
  const en = state.language === "en";
  return <section className="stage-section start-stage">
    <StageHeader icon={ShieldCheck} language={state.language} title={en ? "Start with what you need" : "अपनी जरूरत से शुरू करें"} intro={en ? "We will guide one complete LL-to-DL application with safe demo data." : "हम सुरक्षित डेमो जानकारी के साथ LL से DL का पूरा आवेदन समझाएंगे।"} />
    <fieldset className="choice-group"><legend>{en ? "Who is completing this?" : "यह आवेदन कौन पूरा कर रहा है?"}</legend><div className="choice-grid two">
      <label className={`choice-card ${state.mode === "self" ? "selected" : ""}`}><input checked={state.mode === "self"} name="mode" onChange={() => update({ mode: "self" })} type="radio" /><LockKey aria-hidden="true" size={26} weight="duotone" /><span><strong>{en ? "I am applying" : "मैं आवेदन कर रहा हूं"}</strong><small>{en ? "You control every confirmation." : "हर पुष्टि आपके नियंत्रण में है।"}</small></span></label>
      <label className={`choice-card ${state.mode === "assisted" ? "selected" : ""}`}><input checked={state.mode === "assisted"} name="mode" onChange={() => update({ mode: "assisted" })} type="radio" /><HandHeart aria-hidden="true" size={26} weight="duotone" /><span><strong>{en ? "Someone is helping me" : "कोई मेरी मदद कर रहा है"}</strong><small>{en ? "The citizen still confirms consent, payment and submission." : "नागरिक सहमति, भुगतान और आवेदन की पुष्टि खुद करता है।"}</small></span></label>
    </div></fieldset>
    {state.mode === "assisted" ? <Notice><label className="check-row"><input checked={state.helperConsent} onChange={(e) => update({ helperConsent: e.target.checked })} type="checkbox" /><span><strong>{en ? "I consent to assisted mode for 30 minutes." : "मैं 30 मिनट के सहायता मोड की सहमति देता हूं।"}</strong><small>{en ? "Demo helper: Neha Verma, family member. Actions are shown in the audit trail." : "डेमो सहायक: नेहा वर्मा, परिवार की सदस्य। हर कार्रवाई रिकॉर्ड होगी।"}</small></span></label></Notice> : null}
    <fieldset className="choice-group"><legend>{en ? "Choose a service" : "सेवा चुनें"}</legend><label className="service-choice selected"><input checked readOnly type="checkbox" /><span><strong>{en ? "Learner's Licence to permanent Driving Licence" : "लर्नर लाइसेंस से स्थायी ड्राइविंग लाइसेंस"}</strong><small>{en ? "Complete journey available now" : "पूरी यात्रा अभी उपलब्ध है"}</small></span><CheckCircle aria-hidden="true" size={24} weight="fill" /></label><details><summary>{en ? "Other services using the same case" : "इसी केस की अन्य सेवाएं"}</summary><p>{en ? "Duplicate, name change, address change and mobile update are supporting branches. Their state-specific rules are not presented as verified in this Delhi fixture." : "डुप्लीकेट, नाम, पता और मोबाइल बदलाव सहायक सेवाएं हैं। इनके नियम इस दिल्ली उदाहरण में सत्यापित नहीं माने गए हैं।"}</p></details></fieldset>
    <label className="notice-confirm"><input checked={state.acceptedNotice} onChange={(e) => update({ acceptedNotice: e.target.checked })} type="checkbox" /><span>{en ? "I understand this is not an official service and I will use only the synthetic details provided." : "मैं समझता हूं कि यह आधिकारिक सेवा नहीं है और केवल दी गई नकली जानकारी का उपयोग करूंगा।"}</span></label>
    {error ? <p className="form-error" role="alert">{error}</p> : null}
    <button className="primary-button" onClick={onContinue} type="button">{en ? "Check eligibility" : "पात्रता जांचें"}<ArrowRight aria-hidden="true" size={18} weight="bold" /></button>
  </section>;
}

function EligibilityStage({ language, issueDate, eligibility, error, update, onContinue }: { language: Language; issueDate: string; eligibility: ReturnType<typeof evaluateEligibility>; error: string; update: (next: Partial<JourneyState>) => void; onContinue: () => void }) {
  const en = language === "en";
  return <section className="stage-section"><StageHeader icon={ClockCountdown} language={language} title={en ? "Check eligibility before you pay" : "भुगतान से पहले पात्रता जांचें"} intro={en ? "This fixture uses a 30-day waiting period and a Delhi test RTO." : "इस उदाहरण में 30 दिन की प्रतीक्षा और दिल्ली का टेस्ट RTO है।"} />
    <Notice tone="warning"><strong>{en ? "Illustrative rule" : "उदाहरण नियम"}</strong><p>{en ? "Verify the current rule with the responsible transport department before a real application." : "असल आवेदन से पहले संबंधित परिवहन विभाग से मौजूदा नियम जांचें।"}</p></Notice>
    <div className="form-grid"><Field label={en ? "Synthetic Learner's Licence number" : "नकली लर्नर लाइसेंस नंबर"} hint={en ? "Use the prefilled demo value." : "पहले से भरी डेमो जानकारी रखें।"}><div className="input-with-badge"><input readOnly value={defaultCase.llNumber} /><MockBadge language={language} /></div></Field><Field label={en ? "Learner's Licence issue date" : "लर्नर लाइसेंस जारी होने की तारीख"}><input max="2026-08-28" onChange={(e) => update({ issueDate: e.target.value })} type="date" value={issueDate} /></Field></div>
    <div className={`eligibility-result ${eligibility.eligible ? "eligible" : "not-eligible"}`} aria-live="polite"><span>{eligibility.eligible ? <CheckCircle size={30} weight="fill" /> : <ClockCountdown size={30} weight="fill" />}</span><div><strong>{eligibility.eligible ? (en ? "Eligible today" : "आज पात्र हैं") : (en ? "Not eligible yet" : "अभी पात्र नहीं हैं")}</strong><p>{en ? `Held for ${eligibility.daysHeld} days. Earliest valid date: ${eligibility.earliestDate}.` : `${eligibility.daysHeld} दिन पूरे हुए। पहली पात्र तारीख: ${eligibility.earliestDate}.`}</p></div></div>
    {!eligibility.eligible ? <button className="text-button" onClick={() => update({ issueDate: "2026-07-29" })} type="button">{en ? "Use the eligible demo date" : "पात्र डेमो तारीख चुनें"}</button> : null}
    {error ? <p className="form-error" role="alert">{error}</p> : null}<button className="primary-button" onClick={onContinue} type="button">{en ? "Continue to identity" : "पहचान पर जाएं"}<ArrowRight size={18} weight="bold" /></button>
  </section>;
}

function IdentityStage({ state, update, error, onContinue }: StageProps & { error: string; onContinue: () => void }) {
  const en = state.language === "en";
  return <section className="stage-section"><StageHeader icon={LockKey} language={state.language} title={en ? "Retrieve your demo record" : "अपना डेमो रिकॉर्ड पाएं"} intro={en ? "A displayed test OTP replaces any real identity provider." : "असली पहचान सेवा की जगह दिखाया गया टेस्ट OTP है।"} />
    <Notice><strong>{en ? "Test OTP: 482916" : "टेस्ट OTP: 482916"}</strong><p>{en ? "No SMS is sent. No real mobile number is used." : "कोई SMS नहीं भेजा जाता। असली मोबाइल नंबर उपयोग नहीं होता।"}</p></Notice>
    <Field label={en ? "Demo mobile number" : "डेमो मोबाइल नंबर"}><div className="input-with-badge"><input readOnly value="+91 90000 00000" /><MockBadge language={state.language} /></div></Field>
    <label className="notice-confirm"><input checked={state.identityConsent} onChange={(e) => update({ identityConsent: e.target.checked })} type="checkbox" /><span>{en ? "I consent to retrieve the synthetic Asha Verma record for this demo." : "मैं इस डेमो के लिए आशा वर्मा का नकली रिकॉर्ड देखने की सहमति देता हूं।"}</span></label>
    <Field label={en ? "6-digit test OTP" : "6 अंकों का टेस्ट OTP"} error={error}><input autoComplete="one-time-code" inputMode="numeric" maxLength={6} onChange={(e) => update({ otp: e.target.value.replace(/\D/g, "") })} value={state.otp} /></Field>
    <button className="primary-button" onClick={onContinue} type="button">{en ? "Retrieve demo record" : "डेमो रिकॉर्ड पाएं"}<MagnifyingGlass size={18} weight="bold" /></button>
  </section>;
}

function ApplicationStage({ state, update, onContinue }: StageProps & { onContinue: () => void }) {
  const en = state.language === "en";
  return <section className="stage-section"><StageHeader icon={Receipt} language={state.language} title={en ? "Confirm only what is missing" : "केवल बाकी जानकारी की पुष्टि करें"} intro={en ? "We prefilled the retrieved synthetic record and generated one checklist." : "नकली रिकॉर्ड पहले से भरा है और एक चेकलिस्ट तैयार है।"} />
    <div className="record-card"><div><span>{en ? "Record holder" : "रिकॉर्ड धारक"}</span><strong>Asha Verma</strong></div><div><span>{en ? "Vehicle class" : "वाहन वर्ग"}</span><strong>LMV</strong></div><div><span>{en ? "Source" : "स्रोत"}</span><strong>Mock Sarathi adapter</strong></div><MockBadge language={state.language} /></div>
    <div className="checklist"><h2>{en ? "Your combined checklist" : "आपकी पूरी चेकलिस्ट"}</h2><ul><li><CheckCircle size={20} weight="fill" />{en ? "Valid Learner's Licence held for 30 days" : "30 दिन पुराना वैध लर्नर लाइसेंस"}</li><li><CheckCircle size={20} weight="fill" />{en ? "Generated address proof fixture" : "बनाया गया नकली पता प्रमाण"}</li><li><CheckCircle size={20} weight="fill" />{en ? "Generated photograph and signature fixture" : "बनाया गया नकली फोटो और हस्ताक्षर"}</li><li><CalendarCheck size={20} weight="fill" />{en ? "In-person driving test at RTO-TEST-01" : "RTO-TEST-01 पर ड्राइविंग टेस्ट"}</li></ul><small>{en ? "Rule source: Delhi pilot fixture. Effective 28 Aug 2026. Not nationwide guidance." : "नियम स्रोत: दिल्ली पायलट उदाहरण। 28 अगस्त 2026 से। पूरे भारत की जानकारी नहीं।"}</small></div>
    <Field label={en ? "Current address" : "वर्तमान पता"} hint={en ? "Synthetic fixture only" : "केवल नकली जानकारी"}><textarea onChange={(e) => update({ address: e.target.value })} rows={3} value={state.address} /></Field>
    <label className="notice-confirm"><input defaultChecked type="checkbox" /><span>{en ? "I will attend the offline driving test and carry the listed originals." : "मैं ऑफलाइन ड्राइविंग टेस्ट दूंगा और सूची में दिए मूल दस्तावेज लाऊंगा।"}</span></label>
    <button className="primary-button" onClick={onContinue} type="button">{en ? "Add demo evidence" : "डेमो दस्तावेज जोड़ें"}<ArrowRight size={18} weight="bold" /></button>
  </section>;
}

function EvidenceStage({ state, update, error, onContinue }: StageProps & { error: string; onContinue: () => void }) {
  const en = state.language === "en";
  const docs: Array<[keyof Evidence, string, string]> = [["ll", en ? "Learner's Licence fixture" : "लर्नर लाइसेंस उदाहरण", "PDF, 184 KB"], ["photo", en ? "Photo and signature fixture" : "फोटो और हस्ताक्षर उदाहरण", "JPG, 96 KB"], ["address", en ? "Address proof fixture" : "पता प्रमाण उदाहरण", "PDF, 211 KB"]];
  const setEvidence = (key: keyof Evidence) => update({ evidence: { ...state.evidence, [key]: !state.evidence[key] } });
  return <section className="stage-section"><StageHeader icon={FileArrowUp} language={state.language} title={en ? "Use generated evidence only" : "केवल बनाए गए नकली दस्तावेज उपयोग करें"} intro={en ? "Each button attaches a safe fixture already included in the prototype." : "हर बटन प्रोटोटाइप में मौजूद सुरक्षित नकली फाइल जोड़ता है।"} />
    <Notice tone="warning"><strong>{en ? "Never upload a real Aadhaar, PAN, licence or payment receipt." : "असली आधार, PAN, लाइसेंस या भुगतान रसीद कभी अपलोड न करें।"}</strong></Notice>
    <div className="evidence-list">{docs.map(([key, label, meta]) => <article className={state.evidence[key] ? "attached" : ""} key={key}><div className="file-icon">{state.evidence[key] ? <Check size={22} weight="bold" /> : <FileArrowUp size={22} />}</div><div><strong>{label}</strong><small>{state.evidence[key] ? `${meta} | Quality check passed` : "PDF or JPG, maximum 2 MB"}</small></div><button className="secondary-button" onClick={() => setEvidence(key)} type="button">{state.evidence[key] ? (en ? "Remove" : "हटाएं") : (en ? "Attach fixture" : "उदाहरण जोड़ें")}</button></article>)}</div>
    {error ? <p className="form-error" role="alert">{error}</p> : null}<button className="primary-button" onClick={onContinue} type="button">{en ? "Review fees" : "शुल्क देखें"}<ArrowRight size={18} weight="bold" /></button>
  </section>;
}

function PaymentStage({ state, onPay, onReconcile, onContinue }: { state: JourneyState; onPay: () => void; onReconcile: () => void; onContinue: () => void }) {
  const en = state.language === "en"; const status = state.caseData.payment.state;
  return <section className="stage-section"><StageHeader icon={Receipt} language={state.language} title={en ? "Review before simulated payment" : "नकली भुगतान से पहले जांचें"} intro={en ? "Payment and submission are separate, so a gateway delay cannot create a second application." : "भुगतान और आवेदन अलग हैं, इसलिए देरी से दूसरा आवेदन नहीं बनता।"} />
    <div className="fee-box"><div><span>{en ? "Application and test fee" : "आवेदन और टेस्ट शुल्क"}</span><strong>₹500</strong></div><div><span>{en ? "Card printing fixture" : "कार्ड प्रिंटिंग उदाहरण"}</span><strong>₹200</strong></div><div className="fee-total"><span>{en ? "Illustrative total" : "उदाहरण कुल"}</span><strong>₹700</strong></div><small>{en ? "Fees are mock values for this pilot fixture, not official guidance." : "यह शुल्क केवल नकली उदाहरण है, आधिकारिक जानकारी नहीं।"}</small></div>
    {status === "not_started" ? <><Notice><strong>{en ? "Demo scenario" : "डेमो स्थिति"}</strong><p>{en ? "The first callback times out. You will reconcile it safely without paying again." : "पहला जवाब समय पर नहीं आएगा। दोबारा भुगतान किए बिना इसे जांचें।"}</p></Notice><button className="primary-button" onClick={onPay} type="button">{en ? "Simulate payment" : "नकली भुगतान करें"}<ArrowRight size={18} /></button></> : null}
    {status === "pending" ? <><div className="status-panel pending"><CircleNotch aria-hidden="true" size={30} /><div><strong>{en ? "Payment confirmation pending" : "भुगतान की पुष्टि बाकी है"}</strong><p>{en ? "Do not pay again. Reference: MOCK-PAY-20260827-9912" : "दोबारा भुगतान न करें। संदर्भ: MOCK-PAY-20260827-9912"}</p></div><MockBadge language={state.language} /></div><button className="primary-button" onClick={onReconcile} type="button">{en ? "Check payment status" : "भुगतान की स्थिति देखें"}</button></> : null}
    {status === "paid" ? <><div className="status-panel success"><CheckCircle aria-hidden="true" size={32} weight="fill" /><div><strong>{en ? "Payment found and reconciled" : "भुगतान मिला और पुष्टि हुई"}</strong><p>{en ? "One attempt, one receipt. No duplicate charge was created." : "एक कोशिश, एक रसीद। दोबारा शुल्क नहीं लगा।"}</p></div></div><a className="download-button" download href={en ? "/licencepath-demo-payment-receipt.txt" : "/licencepath-demo-payment-receipt-hi.txt"}><Receipt size={18} />{en ? "Download accessible demo receipt" : "सुलभ डेमो रसीद डाउनलोड करें"}</a><button className="primary-button" onClick={onContinue} type="button">{en ? "Continue to submission" : "आवेदन जमा करें"}<ArrowRight size={18} /></button></> : null}
  </section>;
}

function SubmissionStage({ state, update, error, onSubmit, onContinue }: StageProps & { error: string; onSubmit: () => void; onContinue: () => void }) {
  const en = state.language === "en"; const submitted = state.caseData.submission.state === "submitted";
  return <section className="stage-section"><StageHeader icon={CalendarCheck} language={state.language} title={en ? "Submit once, then book the test" : "एक बार जमा करें, फिर टेस्ट बुक करें"} intro={en ? "Repeated taps return the same case and application reference." : "बार-बार दबाने पर वही केस और आवेदन नंबर मिलता है।"} />
    {!submitted ? <><div className="review-summary"><h2>{en ? "Plain-language review" : "आसान भाषा में जांच"}</h2><p><strong>Asha Verma</strong> is applying for a permanent LMV Driving Licence in the Delhi demo fixture.</p><p>{en ? "Payment is confirmed. Three generated evidence fixtures are attached. An in-person test is required." : "भुगतान की पुष्टि है। तीन नकली दस्तावेज जुड़े हैं। RTO में टेस्ट जरूरी है।"}</p></div><label className="notice-confirm"><input defaultChecked type="checkbox" /><span>{en ? "Asha confirms the information and submits this synthetic application." : "आशा जानकारी की पुष्टि करके यह नकली आवेदन जमा करती हैं।"}</span></label><button className="primary-button" onClick={onSubmit} type="button">{en ? "Submit demo application" : "डेमो आवेदन जमा करें"}<ShieldCheck size={18} /></button></> : null}
    {submitted ? <><Notice tone="success"><strong>{en ? "Application submitted once" : "आवेदन एक बार जमा हुआ"}</strong><p>{state.caseData.submission.applicationId} <MockBadge language={state.language} /></p></Notice><Field label={en ? "Choose a simulated driving test slot" : "नकली ड्राइविंग टेस्ट स्लॉट चुनें"} error={error}><select onChange={(e) => update({ slot: e.target.value })} value={state.slot}><option value="">{en ? "Select a slot" : "स्लॉट चुनें"}</option><option value="2026-09-04T11:30">4 Sep 2026, 11:30 AM</option><option value="2026-09-05T09:00">5 Sep 2026, 9:00 AM</option></select></Field><Notice><strong>{en ? "At RTO-TEST-01" : "RTO-TEST-01 पर"}</strong><p>{en ? "Carry the demo checklist and arrive 30 minutes early. No real appointment exists." : "डेमो चेकलिस्ट लाएं और 30 मिनट पहले पहुंचें। कोई असली अपॉइंटमेंट नहीं है।"}</p></Notice><button className="primary-button" onClick={onContinue} type="button">{en ? "Book and track" : "बुक करें और स्थिति देखें"}<ArrowRight size={18} /></button></> : null}
  </section>;
}

function TrackingStage({ state, update, reset }: StageProps & { reset: () => void }) {
  const en = state.language === "en"; const complete = state.outcomeIndex >= outcomeEvents.length - 1; const nextEvent = () => update({ outcomeIndex: Math.min(state.outcomeIndex + 1, outcomeEvents.length - 1) });
  return <section className="stage-section"><StageHeader icon={CheckCircle} language={state.language} title={complete ? (en ? "Licence delivered" : "लाइसेंस डिलीवर हुआ") : (en ? "Track one clear timeline" : "एक साफ टाइमलाइन में स्थिति देखें")} intro={complete ? (en ? "The complete citizen journey has reached a clear outcome." : "नागरिक की पूरी यात्रा स्पष्ट परिणाम तक पहुंच गई है।") : (en ? "Every event shows the owner, time and next action." : "हर घटना में जिम्मेदार व्यक्ति, समय और अगला काम दिखता है।")} />
    <div className="next-action"><span>{en ? "Next action" : "अगला काम"}</span><strong>{complete ? (en ? "No action needed" : "कोई काम बाकी नहीं") : (en ? "Advance the mock status event" : "नकली स्थिति आगे बढ़ाएं")}</strong><small>{complete ? (en ? "Case closed safely" : "केस सुरक्षित रूप से बंद") : (en ? "Owner: Mock service simulator" : "जिम्मेदार: नकली सेवा सिम्युलेटर")}</small></div>
    <ol className="timeline">{outcomeEvents.map((event, index) => <li className={index <= state.outcomeIndex ? "reached" : "future"} key={event.en}><span className="timeline-marker">{index <= state.outcomeIndex ? <Check size={15} weight="bold" /> : index + 1}</span><div><strong>{state.language === "en" ? event.en : event.hi}</strong><p>{event.owner} <span>|</span> {event.time}</p></div>{index <= state.outcomeIndex ? <MockBadge language={state.language} /> : null}</li>)}</ol>
    {!complete ? <button className="primary-button" onClick={nextEvent} type="button">{en ? "Advance mock event" : "नकली स्थिति आगे बढ़ाएं"}<ArrowRight size={18} /></button> : <div className="completion-box"><CheckCircle size={44} weight="fill" /><h2>{en ? "A complete and recoverable journey" : "पूरी और सुरक्षित यात्रा"}</h2><p>{en ? "Asha checked eligibility, recovered a pending payment, submitted once, booked the test and tracked delivery." : "आशा ने पात्रता जांची, रुका भुगतान पाया, एक बार आवेदन किया, टेस्ट बुक किया और डिलीवरी देखी।"}</p><div><button className="secondary-button" onClick={reset} type="button">{en ? "Restart demo" : "डेमो फिर शुरू करें"}</button><Link className="primary-link" href={en ? "/about" : "/about/hi"}>{en ? "See how it works" : "देखें यह कैसे काम करता है"}</Link></div></div>}
  </section>;
}
