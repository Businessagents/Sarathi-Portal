import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle,
  CloudArrowUp,
  Flask,
  GithubLogo,
  LockKey,
  Translate,
} from "@phosphor-icons/react/dist/ssr";

type AboutLanguage = "en" | "hi";

const copy = {
  en: {
    back: "Return to the citizen journey", switchLabel: "हिंदी में पढ़ें", switchHref: "/about/hi", chip: "Independent prototype",
    title: "Help first-time applicants reach the driving test prepared.",
    intro: "LicencePath is now a focused LL-to-DL prototype: check eligibility and evidence early, recover an uncertain payment and keep the next owner visible.",
    demoCta: "Try the complete demo", sourceCta: "View the GitHub source",
    problemTitle: "The primary problem", problem: "First-time applicants may not reliably determine when they are eligible, what evidence to bring and whether a timed-out payment is already acknowledged. The result can be avoidable rework, a failed visit or a duplicate payment.",
    changedTitle: "The product claim", changed: "A guided LL-to-DL case can surface eligibility and evidence before payment, reconcile ambiguous transactions and show the owner of every next action.",
    aboutTitle: "About LicencePath",
    about: "LicencePath demonstrates one end-to-end LL-to-DL journey with deliberate success and failure scenarios. Replacement, name, address and mobile changes remain visible only as future research—not working services.",
    facts: [
      ["Intended for", "First-time applicants, low-tech citizens and consented helpers"],
      ["Interactive journey", "One LL-to-DL request with ten reviewer scenarios"],
      ["Demo fixture", "Delhi-labelled, illustrative and not authority-verified"],
      ["Data mode", "Synthetic case in browser storage; operations through a mock API"],
    ],
    boundaryTitle: "An honest build boundary",
    boundary: [
      { title: "Works in this prototype", items: ["Editable LL number and eligibility inputs", "Missing and unreadable evidence paths", "API-backed payment reconciliation and idempotent retry", "No-slot, failed-test, correction, dispatch and grievance paths"] },
      { title: "Clearly simulated", items: ["Identity, OTP and synthetic Asha Verma record", "Mock API and browser-only case persistence", "Payment, appointment, test and dispatch events", "Notifications and grievance ownership"] },
      { title: "Needed for production", items: ["Authorised government and identity integrations", "State-verified rules, fees and operating procedures", "Security, privacy, legal and accessibility reviews", "Department-owned support and incident response"] },
    ],
    scaleTitle: "How this could scale safely", scale: "A production service would place every government, payment and notification dependency behind a versioned adapter. Case state would live in PostgreSQL, uploads in protected object storage and retries in a durable queue.",
    architectureLabel: "Production architecture", architecture: ["Mobile-first web app", "API and case service", "Rules, documents, payment and grievances", "Authorised provider adapters"],
    safetyTitle: "Safety principles",
    safety: [["Minimum data:", "collect only what the selected service needs."], ["No silent failure:", "preserve acknowledged work and show who owns the next action."], ["No duplicate action:", "use idempotency and reconciliation for payment and submission."], ["Respect the citizen:", "support Hindi, assistive technology, slow networks and consented help."]],
    evidenceTitle: "What we know—and do not know",
    evidence: ["No applicant interviews have been completed for this prototype.", "No production Sarathi journey has been instrumented or audited here.", "No failure-rate, visit-failure or duplicate-payment statistic is claimed.", "The next discovery step is 5–8 observed first-time-applicant sessions using the current Delhi flow, followed by a comparative test of this prototype."],
    compareTitle: "Before/after hypothesis to validate",
    compare: [["Current-flow risk to observe", "LicencePath behavior"], ["Eligibility may be discovered after effort", "Date is checked before evidence or payment"], ["A gateway timeout may invite a retry", "Citizen is told not to repay; the same reference is reconciled"], ["Status may not explain responsibility", "Every event names an owner and next action"], ["A rejected step may trigger a restart", "The saved case points to correction or grievance"]],
    governanceTitle: "Rule governance, not a hard-coded Delhi claim",
    governance: "Each rule pack needs a jurisdiction and RTO scope, source URL or circular, effective date, version, authority reviewer, approval status and superseded version. A scheduled review detects source changes; conflicting central and State guidance is escalated to the owning transport authority, and the affected journey is paused rather than guessed.",
    footer: "Built with Codex from a citizen-first product brief. No OpenAI model is used at runtime, and no live government system is contacted.",
  },
  hi: {
    back: "नागरिक यात्रा पर वापस जाएं", switchLabel: "Read in English", switchHref: "/about", chip: "स्वतंत्र प्रोटोटाइप",
    title: "पहली बार आवेदन करने वाले को ड्राइविंग टेस्ट के लिए तैयार पहुंचाएं।",
    intro: "LicencePath अब केंद्रित LL से DL प्रोटोटाइप है: पात्रता और दस्तावेज पहले जांचें, अनिश्चित भुगतान सुलझाएं और अगली जिम्मेदारी साफ रखें।",
    demoCta: "पूरा डेमो आजमाएं", sourceCta: "GitHub सोर्स देखें",
    problemTitle: "समस्या", problem: "पहली बार आवेदन करने वाला या कम डिजिटल अनुभव वाला नागरिक सही तारीख, सही दस्तावेज, भुगतान की स्थिति या अगली जिम्मेदारी समझने में चूक सकता है।",
    changedTitle: "हमने क्या बदला", changed: "पहले जरूरत पूछी जाती है। मेहनत से पहले पात्रता दिखती है। एक टाइमलाइन अगला काम, जिम्मेदार व्यक्ति और मदद का रास्ता बताती है।",
    aboutTitle: "LicencePath के बारे में",
    about: "LicencePath एक पूरी LL से DL यात्रा और सफलता-असफलता की स्थितियां दिखाता है। दूसरी सेवाएं केवल भविष्य शोध के रूप में दिखती हैं।",
    facts: [
      ["किसके लिए", "पहली बार आवेदन करने वाले, कम डिजिटल अनुभव वाले नागरिक और सहमति वाले सहायक"],
      ["इंटरैक्टिव यात्रा", "दस समीक्षक स्थितियों वाला एक LL से DL अनुरोध"],
      ["डेमो व्यवस्था", "दिल्ली लेबल वाला, उदाहरण और अधिकारी द्वारा असत्यापित"],
      ["डेटा", "ब्राउज़र में नकली केस; नकली API से संचालन"],
    ],
    boundaryTitle: "ईमानदार बिल्ड सीमा",
    boundary: [
      { title: "इस प्रोटोटाइप में काम करता है", items: ["चुनी जा सकने वाली कई सेवाएं और निर्देशित जानकारी", "संयुक्त दस्तावेज चेकलिस्ट और फॉर्म जांच", "भुगतान की दोबारा जांच और एक बार आवेदन", "जरूरत के अनुसार अपॉइंटमेंट, शाखा टाइमलाइन और शिकायत"] },
      { title: "स्पष्ट रूप से नकली", items: ["पहचान और दिखाया गया टेस्ट OTP", "Sarathi रिकॉर्ड पढ़ना और आवेदन लिखना", "भुगतान, अपॉइंटमेंट, टेस्ट और डिलीवरी", "सूचनाएं और विभागीय शिकायत अपडेट"] },
      { title: "असल सेवा के लिए जरूरी", items: ["अधिकृत सरकारी और पहचान सेवाएं", "राज्य द्वारा जांचे नियम, शुल्क और प्रक्रिया", "सुरक्षा, गोपनीयता, कानूनी और सुलभता समीक्षा", "विभाग की सहायता और घटना प्रबंधन"] },
    ],
    scaleTitle: "इसे सुरक्षित रूप से कैसे बढ़ाया जा सकता है", scale: "असल सेवा हर सरकारी, भुगतान और सूचना व्यवस्था को संस्करण वाले अडैप्टर के पीछे रखेगी। केस PostgreSQL में, फाइल सुरक्षित स्टोरेज में और दोबारा कोशिश टिकाऊ क्यू में होगी।",
    architectureLabel: "असल सेवा की बनावट", architecture: ["मोबाइल-फर्स्ट वेब ऐप", "API और केस सेवा", "नियम, दस्तावेज, भुगतान और शिकायत", "अधिकृत सेवा अडैप्टर"],
    safetyTitle: "सुरक्षा सिद्धांत",
    safety: [["कम से कम जानकारी:", "केवल चुनी गई सेवा की जरूरी जानकारी लें।"], ["छिपी हुई असफलता नहीं:", "सेव काम बचाएं और अगली जिम्मेदारी साफ बताएं।"], ["दोबारा कार्रवाई नहीं:", "भुगतान और आवेदन के लिए इडेम्पोटेंसी और मिलान रखें।"], ["नागरिक का सम्मान:", "हिंदी, सहायक तकनीक, धीमा नेटवर्क और सहमति वाली मदद दें।"]],
    evidenceTitle: "हम क्या जानते हैं—और क्या नहीं",
    evidence: ["इस प्रोटोटाइप के लिए कोई आवेदक इंटरव्यू पूरा नहीं हुआ।", "यहां असली Sarathi यात्रा का ऑडिट नहीं हुआ।", "विफलता या दोहरे भुगतान का कोई आंकड़ा दावा नहीं किया गया।", "अगला कदम मौजूदा दिल्ली प्रवाह पर 5–8 पहली बार आवेदकों के सत्र और फिर तुलना टेस्ट है।"],
    compareTitle: "जांचने योग्य पहले/बाद की परिकल्पना",
    compare: [["मौजूदा जोखिम", "LicencePath व्यवहार"], ["पात्रता देर से पता चल सकती है", "दस्तावेज या भुगतान से पहले तारीख जांच"], ["गेटवे रुकने पर दोबारा भुगतान", "दोबारा भुगतान रोककर उसी संदर्भ की जांच"], ["स्थिति में जिम्मेदार साफ नहीं", "हर इवेंट में जिम्मेदार और अगला काम"], ["अस्वीकृति पर फिर शुरुआत", "सेव केस सुधार या शिकायत बताता है"]],
    governanceTitle: "नियम संचालन, दिल्ली का कठोर दावा नहीं",
    governance: "हर नियम पैक में राज्य/RTO दायरा, स्रोत, लागू तारीख, संस्करण, अधिकारी समीक्षक और मंजूरी स्थिति चाहिए। केंद्रीय और राज्य निर्देश के टकराव पर जिम्मेदार परिवहन अधिकारी निर्णय करेगा; तब तक यात्रा रोकी जाएगी, अनुमान नहीं लगाया जाएगा।",
    footer: "यह नागरिक-केंद्रित प्रोडक्ट ब्रीफ से Codex की मदद से बना है। चलते समय कोई OpenAI मॉडल या असली सरकारी सिस्टम उपयोग नहीं होता।",
  },
} as const;

const boundaryIcons = [CheckCircle, Flask, CloudArrowUp];

export function AboutContent({ language }: { language: AboutLanguage }) {
  const t = copy[language];
  return <main className="about-page" lang={language}><div className="about-wrap">
    <div className="about-nav"><Link className="back-link" href="/"><ArrowLeft aria-hidden="true" size={18} weight="bold" />{t.back}</Link><Link className="back-link" href={t.switchHref}><Translate aria-hidden="true" size={18} />{t.switchLabel}</Link></div>
    <header className="about-hero"><span className="mock-chip">{t.chip}</span><h1>{t.title}</h1><p>{t.intro}</p><div className="about-hero-actions"><Link className="primary-link" href="/">{t.demoCta}<ArrowRight aria-hidden="true" size={18} weight="bold" /></Link><a className="source-link" href="https://github.com/Businessagents/Sarathi-Portal" rel="noreferrer" target="_blank"><GithubLogo aria-hidden="true" size={19} weight="bold" />{t.sourceCta}</a></div></header>
    <section className="problem-grid" aria-labelledby="problem-heading"><div><h2 id="problem-heading">{t.problemTitle}</h2><p>{t.problem}</p></div><div><h2>{t.changedTitle}</h2><p>{t.changed}</p></div></section>
    <section className="evidence-section" aria-labelledby="evidence-heading"><div><span className="section-index">01</span><h2 id="evidence-heading">{t.evidenceTitle}</h2></div><ul>{t.evidence.map((item) => <li key={item}>{item}</li>)}</ul></section>
    <section className="comparison-section" aria-labelledby="comparison-heading"><h2 id="comparison-heading">{t.compareTitle}</h2><div className="comparison-table" role="table">{t.compare.map(([current, proposed], index) => <div className={index === 0 ? "comparison-head" : "comparison-row"} key={current} role="row"><span role={index === 0 ? "columnheader" : "cell"}>{current}</span><span role={index === 0 ? "columnheader" : "cell"}>{proposed}</span></div>)}</div><small>{language === "en" ? "This comparison is a research hypothesis, not an audited statement about every State portal." : "यह तुलना शोध परिकल्पना है, हर राज्य पोर्टल का ऑडिट दावा नहीं।"}</small></section>
    <section className="portal-overview" aria-labelledby="about-licencepath-heading"><div className="overview-copy"><h2 id="about-licencepath-heading">{t.aboutTitle}</h2><p>{t.about}</p></div><dl className="portal-facts">{t.facts.map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl></section>
    <section aria-labelledby="boundary-heading"><h2 id="boundary-heading">{t.boundaryTitle}</h2><div className="boundary-grid">{t.boundary.map(({ title, items }, index) => { const Icon = boundaryIcons[index]; return <article className="boundary-block" key={title}><Icon aria-hidden="true" size={28} weight="duotone" /><h3>{title}</h3><ul>{items.map((item) => <li key={item}>{item}</li>)}</ul></article>; })}</div></section>
    <section className="scale-section" aria-labelledby="scale-heading"><div className="scale-copy"><LockKey aria-hidden="true" size={34} weight="duotone" /><h2 id="scale-heading">{t.scaleTitle}</h2><p>{t.scale}</p></div><ol className="architecture-flow" aria-label={t.architectureLabel}>{t.architecture.map((item) => <li key={item}>{item}</li>)}</ol></section>
    <section className="governance-section" aria-labelledby="governance-heading"><span className="section-index">02</span><h2 id="governance-heading">{t.governanceTitle}</h2><p>{t.governance}</p><dl><div><dt>{language === "en" ? "Current pack" : "मौजूदा पैक"}</dt><dd>delhi-demo-2026-08-28-v2</dd></div><div><dt>{language === "en" ? "Approval" : "मंजूरी"}</dt><dd>{language === "en" ? "Illustrative · unverified" : "उदाहरण · असत्यापित"}</dd></div><div><dt>{language === "en" ? "Production owner" : "असल जिम्मेदार"}</dt><dd>{language === "en" ? "Relevant State Transport Department" : "संबंधित राज्य परिवहन विभाग"}</dd></div></dl></section>
    <section className="principles" aria-labelledby="principles-heading"><h2 id="principles-heading">{t.safetyTitle}</h2><div>{t.safety.map(([label, text]) => <p key={label}><strong>{label}</strong> {text}</p>)}</div></section>
    <footer className="about-footer"><p>{t.footer}</p><a className="source-link" href="https://github.com/Businessagents/Sarathi-Portal" rel="noreferrer" target="_blank"><GithubLogo aria-hidden="true" size={19} weight="bold" />{t.sourceCta}</a></footer>
  </div></main>;
}
