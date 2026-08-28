import Link from "next/link";
import {
  ArrowLeft,
  CheckCircle,
  CloudArrowUp,
  Flask,
  LockKey,
  Translate,
} from "@phosphor-icons/react/dist/ssr";

type AboutLanguage = "en" | "hi";

const copy = {
  en: {
    back: "Return to the citizen journey", switchLabel: "हिंदी में पढ़ें", switchHref: "/about/hi", chip: "Independent prototype",
    title: "A clearer path from Learner's Licence to Driving Licence",
    intro: "LicencePath replaces a fragmented, menu-first experience with one guided case that explains eligibility, prevents avoidable errors and recovers safely from failures.",
    problemTitle: "The problem", problem: "A first-time or low-tech citizen can miss the right date, bring the wrong evidence, repeat a payment or lose track of who acts next.",
    changedTitle: "What changed", changed: "Intent comes first. Eligibility appears before effort. One timeline always shows the next action, owner and recovery route.",
    boundaryTitle: "An honest build boundary",
    boundary: [
      { title: "Works in this prototype", items: ["Eligibility rules and guided checklist", "Autosaved case, form validation and review", "Payment reconciliation and idempotent submission", "Appointment, timeline, receipts and grievance flow"] },
      { title: "Clearly simulated", items: ["Identity and the displayed test OTP", "Sarathi record read and application write", "Payment, appointment, test and dispatch events", "Notifications and department grievance updates"] },
      { title: "Needed for production", items: ["Authorised government and identity integrations", "State-verified rules, fees and operating procedures", "Security, privacy, legal and accessibility reviews", "Department-owned support and incident response"] },
    ],
    scaleTitle: "How this could scale safely", scale: "A production service would place every government, payment and notification dependency behind a versioned adapter. Case state would live in PostgreSQL, uploads in protected object storage and retries in a durable queue.",
    architectureLabel: "Production architecture", architecture: ["Mobile-first web app", "API and case service", "Rules, documents, payment and grievances", "Authorised provider adapters"],
    safetyTitle: "Safety principles",
    safety: [["Minimum data:", "collect only what the selected service needs."], ["No silent failure:", "preserve acknowledged work and show who owns the next action."], ["No duplicate action:", "use idempotency and reconciliation for payment and submission."], ["Respect the citizen:", "support Hindi, assistive technology, slow networks and consented help."]],
    footer: "Built with Codex from a citizen-first product brief. No OpenAI model is used at runtime, and no live government system is contacted.", cta: "Try the complete demo",
  },
  hi: {
    back: "नागरिक यात्रा पर वापस जाएं", switchLabel: "Read in English", switchHref: "/about", chip: "स्वतंत्र प्रोटोटाइप",
    title: "लर्नर लाइसेंस से ड्राइविंग लाइसेंस तक साफ रास्ता",
    intro: "LicencePath बिखरे हुए मेनू की जगह एक निर्देशित केस देता है। यह पात्रता समझाता है, गलतियां रोकता है और परेशानी से सुरक्षित तरीके से उबरता है।",
    problemTitle: "समस्या", problem: "पहली बार आवेदन करने वाला या कम डिजिटल अनुभव वाला नागरिक सही तारीख, सही दस्तावेज, भुगतान की स्थिति या अगली जिम्मेदारी समझने में चूक सकता है।",
    changedTitle: "हमने क्या बदला", changed: "पहले जरूरत पूछी जाती है। मेहनत से पहले पात्रता दिखती है। एक टाइमलाइन अगला काम, जिम्मेदार व्यक्ति और मदद का रास्ता बताती है।",
    boundaryTitle: "ईमानदार बिल्ड सीमा",
    boundary: [
      { title: "इस प्रोटोटाइप में काम करता है", items: ["पात्रता नियम और निर्देशित चेकलिस्ट", "सेव किया केस, फॉर्म जांच और समीक्षा", "भुगतान की दोबारा जांच और एक बार आवेदन", "अपॉइंटमेंट, टाइमलाइन, रसीद और शिकायत"] },
      { title: "स्पष्ट रूप से नकली", items: ["पहचान और दिखाया गया टेस्ट OTP", "Sarathi रिकॉर्ड पढ़ना और आवेदन लिखना", "भुगतान, अपॉइंटमेंट, टेस्ट और डिलीवरी", "सूचनाएं और विभागीय शिकायत अपडेट"] },
      { title: "असल सेवा के लिए जरूरी", items: ["अधिकृत सरकारी और पहचान सेवाएं", "राज्य द्वारा जांचे नियम, शुल्क और प्रक्रिया", "सुरक्षा, गोपनीयता, कानूनी और सुलभता समीक्षा", "विभाग की सहायता और घटना प्रबंधन"] },
    ],
    scaleTitle: "इसे सुरक्षित रूप से कैसे बढ़ाया जा सकता है", scale: "असल सेवा हर सरकारी, भुगतान और सूचना व्यवस्था को संस्करण वाले अडैप्टर के पीछे रखेगी। केस PostgreSQL में, फाइल सुरक्षित स्टोरेज में और दोबारा कोशिश टिकाऊ क्यू में होगी।",
    architectureLabel: "असल सेवा की बनावट", architecture: ["मोबाइल-फर्स्ट वेब ऐप", "API और केस सेवा", "नियम, दस्तावेज, भुगतान और शिकायत", "अधिकृत सेवा अडैप्टर"],
    safetyTitle: "सुरक्षा सिद्धांत",
    safety: [["कम से कम जानकारी:", "केवल चुनी गई सेवा की जरूरी जानकारी लें।"], ["छिपी हुई असफलता नहीं:", "सेव काम बचाएं और अगली जिम्मेदारी साफ बताएं।"], ["दोबारा कार्रवाई नहीं:", "भुगतान और आवेदन के लिए इडेम्पोटेंसी और मिलान रखें।"], ["नागरिक का सम्मान:", "हिंदी, सहायक तकनीक, धीमा नेटवर्क और सहमति वाली मदद दें।"]],
    footer: "यह नागरिक-केंद्रित प्रोडक्ट ब्रीफ से Codex की मदद से बना है। चलते समय कोई OpenAI मॉडल या असली सरकारी सिस्टम उपयोग नहीं होता।", cta: "पूरा डेमो आजमाएं",
  },
} as const;

const boundaryIcons = [CheckCircle, Flask, CloudArrowUp];

export function AboutContent({ language }: { language: AboutLanguage }) {
  const t = copy[language];
  return <main className="about-page" lang={language}><div className="about-wrap">
    <div className="about-nav"><Link className="back-link" href="/"><ArrowLeft aria-hidden="true" size={18} weight="bold" />{t.back}</Link><Link className="back-link" href={t.switchHref}><Translate aria-hidden="true" size={18} />{t.switchLabel}</Link></div>
    <header className="about-hero"><span className="mock-chip">{t.chip}</span><h1>{t.title}</h1><p>{t.intro}</p></header>
    <section className="problem-grid" aria-labelledby="problem-heading"><div><h2 id="problem-heading">{t.problemTitle}</h2><p>{t.problem}</p></div><div><h2>{t.changedTitle}</h2><p>{t.changed}</p></div></section>
    <section aria-labelledby="boundary-heading"><h2 id="boundary-heading">{t.boundaryTitle}</h2><div className="boundary-grid">{t.boundary.map(({ title, items }, index) => { const Icon = boundaryIcons[index]; return <article className="boundary-block" key={title}><Icon aria-hidden="true" size={28} weight="duotone" /><h3>{title}</h3><ul>{items.map((item) => <li key={item}>{item}</li>)}</ul></article>; })}</div></section>
    <section className="scale-section" aria-labelledby="scale-heading"><div className="scale-copy"><LockKey aria-hidden="true" size={34} weight="duotone" /><h2 id="scale-heading">{t.scaleTitle}</h2><p>{t.scale}</p></div><ol className="architecture-flow" aria-label={t.architectureLabel}>{t.architecture.map((item) => <li key={item}>{item}</li>)}</ol></section>
    <section className="principles" aria-labelledby="principles-heading"><h2 id="principles-heading">{t.safetyTitle}</h2><div>{t.safety.map(([label, text]) => <p key={label}><strong>{label}</strong> {text}</p>)}</div></section>
    <footer className="about-footer"><p>{t.footer}</p><Link className="primary-link" href="/">{t.cta}</Link></footer>
  </div></main>;
}
