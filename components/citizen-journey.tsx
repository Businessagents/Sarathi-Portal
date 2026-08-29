"use client";

import Image from "next/image";
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

type Language = "en" | "hi" | "ta" | "mr" | "te" | "kn" | "bn";
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

const languageOptions: Array<{ code: Language; nativeName: string }> = [
  { code: "en", nativeName: "English" },
  { code: "hi", nativeName: "हिन्दी" },
  { code: "ta", nativeName: "தமிழ்" },
  { code: "mr", nativeName: "मराठी" },
  { code: "te", nativeName: "తెలుగు" },
  { code: "kn", nativeName: "ಕನ್ನಡ" },
  { code: "bn", nativeName: "বাংলা" },
];

// English remains the safe fallback for journey copy that has not yet been
// approved in a regional-language content review. Hindi has complete journey copy.
function usesEnglishFallback(language: Language) {
  return language !== "hi";
}

const serviceOrder: ServiceId[] = [
  "ll_to_dl",
  "duplicate",
  "name_change",
  "address_change",
  "mobile_update",
];

const serviceCopy: Record<ServiceId, { label: Record<Language, string>; description: Record<Language, string> }> = {
  ll_to_dl: {
    label: {
      en: "Learner's Licence to permanent DL", hi: "लर्नर लाइसेंस से स्थायी DL",
      ta: "பழகுநர் உரிமத்திலிருந்து நிரந்தர ஓட்டுநர் உரிமம்", mr: "शिकाऊ परवान्यापासून कायमस्वरूपी वाहनचालक परवाना",
      te: "లెర్నర్స్ లైసెన్స్ నుండి శాశ్వత డ్రైవింగ్ లైసెన్స్", kn: "ಕಲಿಕಾ ಪರವಾನಗಿಯಿಂದ ಶಾಶ್ವತ ಚಾಲನಾ ಪರವಾನಗಿ",
      bn: "লার্নার লাইসেন্স থেকে স্থায়ী ড্রাইভিং লাইসেন্স",
    },
    description: {
      en: "Check the waiting period, submit evidence, pay and book a driving test.", hi: "प्रतीक्षा अवधि जांचें, दस्तावेज दें, भुगतान करें और ड्राइविंग टेस्ट बुक करें।",
      ta: "காத்திருப்பு காலத்தைச் சரிபார்த்து, ஆவணங்களைச் சமர்ப்பித்து, கட்டணம் செலுத்தி ஓட்டுநர் தேர்வை முன்பதிவு செய்யுங்கள்.", mr: "प्रतीक्षा कालावधी तपासा, कागदपत्रे द्या, शुल्क भरा आणि वाहनचालक चाचणी नोंदवा.",
      te: "వేచి ఉండే కాలాన్ని తనిఖీ చేసి, పత్రాలు సమర్పించి, చెల్లింపు చేసి డ్రైవింగ్ పరీక్షను బుక్ చేయండి.", kn: "ಕಾಯುವ ಅವಧಿಯನ್ನು ಪರಿಶೀಲಿಸಿ, ದಾಖಲೆಗಳನ್ನು ಸಲ್ಲಿಸಿ, ಪಾವತಿಸಿ ಮತ್ತು ಚಾಲನಾ ಪರೀಕ್ಷೆಯನ್ನು ಕಾಯ್ದಿರಿಸಿ.",
      bn: "অপেক্ষার সময় যাচাই করুন, নথি দিন, অর্থ প্রদান করুন এবং ড্রাইভিং পরীক্ষার সময় নিন।",
    },
  },
  duplicate: {
    label: {
      en: "Replace a lost or damaged licence", hi: "खोया या खराब लाइसेंस बदलें", ta: "தொலைந்த அல்லது சேதமடைந்த உரிமத்தை மாற்றுங்கள்",
      mr: "हरवलेला किंवा खराब झालेला परवाना बदला", te: "పోయిన లేదా దెబ్బతిన్న లైసెన్స్‌ను భర్తీ చేయండి", kn: "ಕಳೆದುಹೋದ ಅಥವಾ ಹಾನಿಯಾದ ಪರವಾನಗಿಯನ್ನು ಬದಲಿಸಿ", bn: "হারানো বা ক্ষতিগ্রস্ত লাইসেন্স প্রতিস্থাপন করুন",
    },
    description: {
      en: "Record the reason, attach a safe fixture and track replacement scrutiny.", hi: "कारण बताएं, सुरक्षित उदाहरण जोड़ें और बदलाव की जांच देखें।",
      ta: "காரணத்தைப் பதிவு செய்து, பாதுகாப்பான மாதிரி ஆவணத்தை இணைத்து ஆய்வைக் கண்காணியுங்கள்.", mr: "कारण नोंदवा, सुरक्षित नमुना जोडा आणि पडताळणीचा मागोवा घ्या.",
      te: "కారణాన్ని నమోదు చేసి, సురక్షిత నమూనా పత్రాన్ని జోడించి పరిశీలనను ట్రాక్ చేయండి.", kn: "ಕಾರಣವನ್ನು ದಾಖಲಿಸಿ, ಸುರಕ್ಷಿತ ಮಾದರಿ ದಾಖಲೆಯನ್ನು ಸೇರಿಸಿ ಪರಿಶೀಲನೆಯನ್ನು ಹಿಂಬಾಲಿಸಿ.", bn: "কারণ লিখুন, নিরাপদ নমুনা নথি যুক্ত করুন এবং যাচাইয়ের অগ্রগতি দেখুন।",
    },
  },
  name_change: {
    label: { en: "Change name on the licence", hi: "लाइसेंस पर नाम बदलें", ta: "உரிமத்தில் பெயரை மாற்றுங்கள்", mr: "परवान्यावरील नाव बदला", te: "లైసెన్స్‌లో పేరు మార్చండి", kn: "ಪರವಾನಗಿಯಲ್ಲಿನ ಹೆಸರನ್ನು ಬದಲಿಸಿ", bn: "লাইসেন্সে নাম পরিবর্তন করুন" },
    description: { en: "Enter the corrected name and attach the demo change proof.", hi: "सही नाम भरें और बदलाव का डेमो प्रमाण जोड़ें।", ta: "திருத்திய பெயரை உள்ளிட்டு மாதிரி சான்றை இணைக்கவும்.", mr: "दुरुस्त नाव भरा आणि नमुना पुरावा जोडा.", te: "సరిచేసిన పేరును నమోదు చేసి నమూనా రుజువును జోడించండి.", kn: "ಸರಿಪಡಿಸಿದ ಹೆಸರನ್ನು ನಮೂದಿಸಿ ಮತ್ತು ಮಾದರಿ ಪುರಾವೆಯನ್ನು ಸೇರಿಸಿ.", bn: "সংশোধিত নাম লিখুন এবং নমুনা প্রমাণ যুক্ত করুন।" },
  },
  address_change: {
    label: { en: "Change address on the licence", hi: "लाइसेंस पर पता बदलें", ta: "உரிமத்தில் முகவரியை மாற்றுங்கள்", mr: "परवान्यावरील पत्ता बदला", te: "లైసెన్స్‌లో చిరునామా మార్చండి", kn: "ಪರವಾನಗಿಯಲ್ಲಿನ ವಿಳಾಸವನ್ನು ಬದಲಿಸಿ", bn: "লাইসেন্সে ঠিকানা পরিবর্তন করুন" },
    description: { en: "Give the new address once and add one combined address proof.", hi: "नया पता एक बार दें और एक संयुक्त पता प्रमाण जोड़ें।", ta: "புதிய முகவரியை ஒருமுறை அளித்து, ஒரே முகவரிச் சான்றை இணைக்கவும்.", mr: "नवीन पत्ता एकदाच द्या आणि एकत्रित पत्ता पुरावा जोडा.", te: "కొత్త చిరునామాను ఒకసారి ఇచ్చి, ఒక చిరునామా రుజువును జోడించండి.", kn: "ಹೊಸ ವಿಳಾಸವನ್ನು ಒಮ್ಮೆ ನೀಡಿ ಮತ್ತು ಒಂದು ವಿಳಾಸ ಪುರಾವೆಯನ್ನು ಸೇರಿಸಿ.", bn: "নতুন ঠিকানা একবার দিন এবং একটি ঠিকানার প্রমাণ যুক্ত করুন।" },
  },
  mobile_update: {
    label: { en: "Update registered mobile number", hi: "पंजीकृत मोबाइल नंबर बदलें", ta: "பதிவுசெய்யப்பட்ட மொபைல் எண்ணைப் புதுப்பிக்கவும்", mr: "नोंदणीकृत मोबाइल क्रमांक बदला", te: "నమోదిత మొబైల్ నంబర్‌ను నవీకరించండి", kn: "ನೋಂದಾಯಿತ ಮೊಬೈಲ್ ಸಂಖ್ಯೆಯನ್ನು ನವೀಕರಿಸಿ", bn: "নিবন্ধিত মোবাইল নম্বর হালনাগাদ করুন" },
    description: { en: "Verify a synthetic new number without uploading a document.", hi: "बिना दस्तावेज अपलोड किए नकली नए नंबर की पुष्टि करें।", ta: "ஆவணம் பதிவேற்றாமல் மாதிரி புதிய எண்ணைச் சரிபார்க்கவும்.", mr: "कागदपत्र अपलोड न करता नमुना नवीन क्रमांक पडताळा.", te: "పత్రాన్ని అప్‌లోడ్ చేయకుండా నమూనా కొత్త నంబర్‌ను ధృవీకరించండి.", kn: "ದಾಖಲೆಯನ್ನು ಅಪ್‌ಲೋಡ್ ಮಾಡದೆ ಮಾದರಿ ಹೊಸ ಸಂಖ್ಯೆಯನ್ನು ಪರಿಶೀಲಿಸಿ.", bn: "কোনও নথি আপলোড না করে নমুনা নতুন নম্বর যাচাই করুন।" },
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
    interactive: "Interactive demo",
    about: "About this prototype",
    english: "English",
    chooseLanguage: "Choose language",
    help: "Get help",
    saved: "Saved on this device",
    case: "Demo application case",
    yourCase: "Your case",
    requests: "service requests",
    rulePack: "Rule pack",
    payment: "Payment",
    application: "Application",
    notSubmitted: "Not submitted",
    audit: "Mock service audit",
    operations: "server-recorded operations",
    safety: "Nothing here reaches Sarathi.",
    mainJourney: "Your licence service plan",
    pilot: "Delhi demo rule pack",
    back: "Back",
    stages: ["Services", "Eligibility", "Identity", "Details", "Evidence", "Payment", "Submit", "Track"],
  },
  hi: {
    skip: "मुख्य सामग्री पर जाएं",
    banner: "यह स्वतंत्र और अनौपचारिक प्रोटोटाइप है। केवल नकली जानकारी का उपयोग करें।",
    mock: "नकली सेवा",
    interactive: "इंटरैक्टिव डेमो",
    about: "इस प्रोटोटाइप के बारे में",
    english: "English",
    chooseLanguage: "भाषा चुनें",
    help: "मदद लें",
    saved: "इस डिवाइस पर सेव है",
    case: "डेमो आवेदन केस",
    yourCase: "आपका केस",
    requests: "सेवा अनुरोध",
    rulePack: "नियम पैक",
    payment: "भुगतान",
    application: "आवेदन",
    notSubmitted: "जमा नहीं हुआ",
    audit: "नकली सेवा ऑडिट",
    operations: "सर्वर संचालन",
    safety: "यहां से कुछ भी Sarathi तक नहीं जाता।",
    mainJourney: "आपकी लाइसेंस सेवा योजना",
    pilot: "दिल्ली डेमो नियम पैक",
    back: "पीछे",
    stages: ["सेवाएं", "पात्रता", "पहचान", "जानकारी", "दस्तावेज", "भुगतान", "जमा करें", "स्थिति"],
  },
  ta: {
    skip: "முதன்மை உள்ளடக்கத்திற்குச் செல்லவும்", banner: "சுயாதீனமான, அதிகாரப்பூர்வமற்ற மாதிரி. மாதிரி தரவை மட்டும் பயன்படுத்தவும்.", mock: "மாதிரி சேவை", interactive: "செயல்படும் மாதிரி", about: "இந்த மாதிரி பற்றி", english: "English", chooseLanguage: "மொழியைத் தேர்ந்தெடுக்கவும்", help: "உதவி பெறுங்கள்", saved: "இந்தச் சாதனத்தில் சேமிக்கப்பட்டது", case: "மாதிரி விண்ணப்ப வழக்கு", yourCase: "உங்கள் வழக்கு", requests: "சேவை கோரிக்கைகள்", rulePack: "விதித் தொகுப்பு", payment: "கட்டணம்", application: "விண்ணப்பம்", notSubmitted: "சமர்ப்பிக்கப்படவில்லை", audit: "மாதிரி சேவைத் தணிக்கை", operations: "சேவையகத்தில் பதிவான செயல்பாடுகள்", safety: "இங்கிருந்து எதுவும் Sarathi-ஐ அடையாது.", mainJourney: "உங்கள் உரிம சேவைத் திட்டம்", pilot: "டெல்லி மாதிரி விதித் தொகுப்பு", back: "பின்னால்", stages: ["சேவைகள்", "தகுதி", "அடையாளம்", "விவரங்கள்", "ஆவணங்கள்", "கட்டணம்", "சமர்ப்பிப்பு", "நிலை"],
  },
  mr: {
    skip: "मुख्य मजकुराकडे जा", banner: "स्वतंत्र, अनधिकृत नमुना. फक्त कृत्रिम माहिती वापरा.", mock: "नमुना सेवा", interactive: "परस्परसंवादी नमुना", about: "या नमुन्याबद्दल", english: "English", chooseLanguage: "भाषा निवडा", help: "मदत मिळवा", saved: "या उपकरणावर जतन केले", case: "नमुना अर्ज प्रकरण", yourCase: "तुमचे प्रकरण", requests: "सेवा विनंत्या", rulePack: "नियम संच", payment: "देयक", application: "अर्ज", notSubmitted: "सादर केले नाही", audit: "नमुना सेवा तपासणी", operations: "सर्व्हरवर नोंदलेल्या क्रिया", safety: "येथून काहीही Sarathi पर्यंत पोहोचत नाही.", mainJourney: "तुमची परवाना सेवा योजना", pilot: "दिल्ली नमुना नियम संच", back: "मागे", stages: ["सेवा", "पात्रता", "ओळख", "तपशील", "कागदपत्रे", "देयक", "सादर करा", "स्थिती"],
  },
  te: {
    skip: "ప్రధాన విషయానికి వెళ్లండి", banner: "స్వతంత్ర, అనధికారిక నమూనా. నమూనా డేటాను మాత్రమే ఉపయోగించండి.", mock: "నమూనా సేవ", interactive: "పరస్పర నమూనా", about: "ఈ నమూనా గురించి", english: "English", chooseLanguage: "భాషను ఎంచుకోండి", help: "సహాయం పొందండి", saved: "ఈ పరికరంలో సేవ్ అయింది", case: "నమూనా దరఖాస్తు కేసు", yourCase: "మీ కేసు", requests: "సేవా అభ్యర్థనలు", rulePack: "నియమాల ప్యాక్", payment: "చెల్లింపు", application: "దరఖాస్తు", notSubmitted: "సమర్పించలేదు", audit: "నమూనా సేవా ఆడిట్", operations: "సర్వర్‌లో నమోదైన చర్యలు", safety: "ఇక్కడి నుంచి ఏదీ Sarathi కు చేరదు.", mainJourney: "మీ లైసెన్స్ సేవా ప్రణాళిక", pilot: "ఢిల్లీ నమూనా నియమాల ప్యాక్", back: "వెనుకకు", stages: ["సేవలు", "అర్హత", "గుర్తింపు", "వివరాలు", "పత్రాలు", "చెల్లింపు", "సమర్పణ", "స్థితి"],
  },
  kn: {
    skip: "ಮುಖ್ಯ ವಿಷಯಕ್ಕೆ ಹೋಗಿ", banner: "ಸ್ವತಂತ್ರ, ಅನಧಿಕೃತ ಮಾದರಿ. ಮಾದರಿ ದತ್ತಾಂಶವನ್ನು ಮಾತ್ರ ಬಳಸಿ.", mock: "ಮಾದರಿ ಸೇವೆ", interactive: "ಸಂವಾದಾತ್ಮಕ ಮಾದರಿ", about: "ಈ ಮಾದರಿಯ ಬಗ್ಗೆ", english: "English", chooseLanguage: "ಭಾಷೆಯನ್ನು ಆಯ್ಕೆಮಾಡಿ", help: "ಸಹಾಯ ಪಡೆಯಿರಿ", saved: "ಈ ಸಾಧನದಲ್ಲಿ ಉಳಿಸಲಾಗಿದೆ", case: "ಮಾದರಿ ಅರ್ಜಿ ಪ್ರಕರಣ", yourCase: "ನಿಮ್ಮ ಪ್ರಕರಣ", requests: "ಸೇವಾ ವಿನಂತಿಗಳು", rulePack: "ನಿಯಮಗಳ ಪ್ಯಾಕ್", payment: "ಪಾವತಿ", application: "ಅರ್ಜಿ", notSubmitted: "ಸಲ್ಲಿಸಲಾಗಿಲ್ಲ", audit: "ಮಾದರಿ ಸೇವಾ ಆಡಿಟ್", operations: "ಸರ್ವರ್‌ನಲ್ಲಿ ದಾಖಲಾದ ಕ್ರಮಗಳು", safety: "ಇಲ್ಲಿಂದ ಯಾವುದೂ Sarathi ತಲುಪುವುದಿಲ್ಲ.", mainJourney: "ನಿಮ್ಮ ಪರವಾನಗಿ ಸೇವಾ ಯೋಜನೆ", pilot: "ದೆಹಲಿ ಮಾದರಿ ನಿಯಮಗಳ ಪ್ಯಾಕ್", back: "ಹಿಂದೆ", stages: ["ಸೇವೆಗಳು", "ಅರ್ಹತೆ", "ಗುರುತು", "ವಿವರಗಳು", "ದಾಖಲೆಗಳು", "ಪಾವತಿ", "ಸಲ್ಲಿಕೆ", "ಸ್ಥಿತಿ"],
  },
  bn: {
    skip: "মূল বিষয়বস্তুতে যান", banner: "স্বতন্ত্র, অনানুষ্ঠানিক নমুনা। শুধু নমুনা তথ্য ব্যবহার করুন।", mock: "নমুনা পরিষেবা", interactive: "ইন্টার‌্যাকটিভ নমুনা", about: "এই নমুনা সম্পর্কে", english: "English", chooseLanguage: "ভাষা নির্বাচন করুন", help: "সহায়তা নিন", saved: "এই ডিভাইসে সংরক্ষিত", case: "নমুনা আবেদন কেস", yourCase: "আপনার কেস", requests: "পরিষেবার অনুরোধ", rulePack: "নিয়ম প্যাক", payment: "পেমেন্ট", application: "আবেদন", notSubmitted: "জমা হয়নি", audit: "নমুনা পরিষেবা অডিট", operations: "সার্ভারে নথিভুক্ত কাজ", safety: "এখান থেকে কিছুই Sarathi-তে পৌঁছায় না।", mainJourney: "আপনার লাইসেন্স পরিষেবা পরিকল্পনা", pilot: "দিল্লি নমুনা নিয়ম প্যাক", back: "পিছনে", stages: ["পরিষেবা", "যোগ্যতা", "পরিচয়", "বিবরণ", "নথি", "পেমেন্ট", "জমা", "স্থিতি"],
  },
} as const;

const startTranslations: Record<Language, {
  title: string; intro: string; comparison: string; risk: string; riskTitle: string; riskItems: string[]; hypothesis: string;
  focused: string; journey: string; journeyItems: string[]; completing: string; self: string; selfHint: string; assisted: string; assistedHint: string;
  assistedConsent: string; helper: string; scope: string; included: string; unavailable: string; future: string; summary: string; acknowledgement: string; start: string;
}> = {
  en: { title: "Get ready for the driving test — without guesswork", intro: "For a first-time applicant, LicencePath checks when an LL-to-DL application is eligible, what evidence is needed and what happens after payment.", comparison: "Current journey compared with LicencePath", risk: "Observed risk to test", riskTitle: "A failed visit can start before the RTO", riskItems: ["Eligibility is understood too late", "The evidence checklist is incomplete", "A timed-out payment looks unpaid", "The next owner or correction is unclear"], hypothesis: "This is a product hypothesis, not validated user research. See About for the evidence gap.", focused: "Focused prototype", journey: "One LL-to-DL journey", journeyItems: ["Check the number and date before effort", "Show the exact synthetic evidence list", "Reconcile one payment before retry", "Show owner, next action and recovery"], completing: "Who is completing this?", self: "I am applying", selfHint: "You control every confirmation.", assisted: "Someone is helping me", assistedHint: "The citizen still confirms consent, payment and submission.", assistedConsent: "I consent to assisted mode for 30 minutes.", helper: "Demo helper: Neha Verma, family member. Actions appear in the audit trail.", scope: "Prototype scope", included: "Included and interactive", unavailable: "Not included in this prototype.", future: "Future research", summary: "focused LL-to-DL request with eligibility, evidence, payment recovery, appointment and status exceptions.", acknowledgement: "I understand this is not an official service and I will use only the synthetic details provided.", start: "Start the LL-to-DL check" },
  hi: { title: "बिना अनुमान के ड्राइविंग टेस्ट की तैयारी करें", intro: "पहली बार आवेदन करने वाले के लिए LicencePath पात्रता, दस्तावेज और भुगतान के बाद की कार्रवाई स्पष्ट करता है।", comparison: "मौजूदा यात्रा और LicencePath की तुलना", risk: "जांचने योग्य जोखिम", riskTitle: "RTO से पहले ही यात्रा विफल हो सकती है", riskItems: ["पात्रता देर से समझ आती है", "दस्तावेज सूची अधूरी रहती है", "रुका भुगतान असफल लगता है", "अगली जिम्मेदारी या सुधार साफ नहीं"], hypothesis: "यह प्रोडक्ट परिकल्पना है, प्रमाणित यूज़र रिसर्च नहीं। प्रमाण की कमी About में देखें।", focused: "केंद्रित प्रोटोटाइप", journey: "एक LL से DL यात्रा", journeyItems: ["मेहनत से पहले नंबर और तारीख जांचें", "सटीक नकली दस्तावेज सूची दिखाएं", "दोबारा भुगतान से पहले जांचें", "जिम्मेदार, अगला काम और समाधान दिखाएं"], completing: "यह आवेदन कौन पूरा कर रहा है?", self: "मैं आवेदन कर रहा हूं", selfHint: "हर पुष्टि आपके नियंत्रण में है।", assisted: "कोई मेरी मदद कर रहा है", assistedHint: "नागरिक सहमति, भुगतान और आवेदन की पुष्टि खुद करता है।", assistedConsent: "मैं 30 मिनट के सहायता मोड की सहमति देता हूं।", helper: "डेमो सहायक: नेहा वर्मा, परिवार की सदस्य। हर कार्रवाई रिकॉर्ड होगी।", scope: "प्रोटोटाइप दायरा", included: "शामिल और इंटरैक्टिव", unavailable: "इस प्रोटोटाइप में शामिल नहीं।", future: "भविष्य शोध", summary: "पात्रता, दस्तावेज, भुगतान समाधान, अपॉइंटमेंट और स्थिति वाली केंद्रित LL से DL यात्रा।", acknowledgement: "मैं समझता हूं कि यह आधिकारिक सेवा नहीं है और केवल दी गई नकली जानकारी का उपयोग करूंगा।", start: "LL से DL जांच शुरू करें" },
  ta: { title: "ஊகமின்றி ஓட்டுநர் தேர்வுக்குத் தயாராகுங்கள்", intro: "முதல் முறை விண்ணப்பதாரருக்கு, LL-இலிருந்து DL விண்ணப்பத் தகுதி, தேவையான ஆவணங்கள் மற்றும் கட்டணத்திற்குப் பிறகான நடவடிக்கைகளை LicencePath தெளிவுபடுத்துகிறது.", comparison: "தற்போதைய பயணத்தையும் LicencePath-ஐயும் ஒப்பிடுதல்", risk: "சோதிக்க வேண்டிய அபாயம்", riskTitle: "RTO-க்கு செல்லும் முன்பே பயணம் தோல்வியடையலாம்", riskItems: ["தகுதி மிகவும் தாமதமாக புரிகிறது", "ஆவணப் பட்டியல் முழுமையில்லை", "நேரம் முடிந்த கட்டணம் செலுத்தப்படாததாகத் தெரிகிறது", "அடுத்த பொறுப்பாளர் அல்லது திருத்தம் தெளிவில்லை"], hypothesis: "இது ஒரு தயாரிப்பு கருதுகோள்; சரிபார்க்கப்பட்ட பயனர் ஆய்வு அல்ல. ஆதார இடைவெளிக்கு ‘இந்த மாதிரி பற்றி’ பகுதியைப் பார்க்கவும்.", focused: "மையப்படுத்தப்பட்ட மாதிரி", journey: "ஒரே LL முதல் DL பயணம்", journeyItems: ["முயற்சிக்கு முன் எண்ணையும் தேதியையும் சரிபார்க்கவும்", "சரியான மாதிரி ஆவணப் பட்டியலைக் காட்டவும்", "மீண்டும் செலுத்தும் முன் கட்டணத்தைச் சரிபார்க்கவும்", "பொறுப்பாளர், அடுத்த நடவடிக்கை மற்றும் மீட்பைக் காட்டவும்"], completing: "இதை யார் நிரப்புகிறார்?", self: "நான் விண்ணப்பிக்கிறேன்", selfHint: "ஒவ்வொரு உறுதிப்படுத்தலும் உங்கள் கட்டுப்பாட்டில் உள்ளது.", assisted: "ஒருவர் எனக்கு உதவுகிறார்", assistedHint: "ஒப்புதல், கட்டணம் மற்றும் சமர்ப்பிப்பை குடிமகனே உறுதிப்படுத்துகிறார்.", assistedConsent: "30 நிமிட உதவி முறைக்கு நான் ஒப்புக்கொள்கிறேன்.", helper: "மாதிரி உதவியாளர்: குடும்ப உறுப்பினர் நேஹா வர்மா. நடவடிக்கைகள் தணிக்கைப் பதிவில் தோன்றும்.", scope: "மாதிரியின் வரம்பு", included: "சேர்க்கப்பட்டு செயல்படுகிறது", unavailable: "இந்த மாதிரியில் சேர்க்கப்படவில்லை.", future: "எதிர்கால ஆய்வு", summary: "தகுதி, ஆவணங்கள், கட்டண மீட்பு, நேரமுன்பதிவு மற்றும் நிலை விதிவிலக்குகள் கொண்ட மையப்படுத்தப்பட்ட LL முதல் DL கோரிக்கை.", acknowledgement: "இது அதிகாரப்பூர்வ சேவை அல்ல என்பதையும் வழங்கப்பட்ட மாதிரி விவரங்களை மட்டுமே பயன்படுத்துவேன் என்பதையும் புரிந்துகொள்கிறேன்.", start: "LL முதல் DL சரிபார்ப்பைத் தொடங்குங்கள்" },
  mr: { title: "अंदाज न लावता वाहनचालक चाचणीची तयारी करा", intro: "पहिल्यांदा अर्ज करणाऱ्यासाठी LicencePath LL ते DL अर्जाची पात्रता, आवश्यक कागदपत्रे आणि देयकानंतरची प्रक्रिया स्पष्ट करते.", comparison: "सध्याच्या प्रवासाची LicencePath सोबत तुलना", risk: "तपासायचा धोका", riskTitle: "RTO ला जाण्यापूर्वीच प्रक्रिया अयशस्वी होऊ शकते", riskItems: ["पात्रता उशिरा समजते", "कागदपत्रांची यादी अपूर्ण असते", "वेळ संपलेले देयक न भरल्यासारखे दिसते", "पुढील जबाबदार व्यक्ती किंवा दुरुस्ती स्पष्ट नसते"], hypothesis: "ही उत्पादन कल्पना आहे; प्रमाणित वापरकर्ता संशोधन नाही. पुराव्यातील त्रुटीसाठी ‘या नमुन्याबद्दल’ पहा.", focused: "केंद्रित नमुना", journey: "एक LL ते DL प्रवास", journeyItems: ["प्रयत्नापूर्वी क्रमांक आणि तारीख तपासा", "अचूक नमुना कागदपत्र यादी दाखवा", "पुन्हा भरण्यापूर्वी देयक पडताळा", "जबाबदार व्यक्ती, पुढील कृती आणि उपाय दाखवा"], completing: "हे कोण पूर्ण करत आहे?", self: "मी अर्ज करत आहे", selfHint: "प्रत्येक पुष्टी तुमच्या नियंत्रणात आहे.", assisted: "कोणी मला मदत करत आहे", assistedHint: "नागरिक स्वतः संमती, देयक आणि अर्जाची पुष्टी करतो.", assistedConsent: "मी 30 मिनिटांच्या सहाय्यक मोडला संमती देतो.", helper: "नमुना सहाय्यक: नेहा वर्मा, कुटुंबातील सदस्य. कृती तपासणी नोंदीत दिसतील.", scope: "नमुन्याची व्याप्ती", included: "समाविष्ट आणि परस्परसंवादी", unavailable: "या नमुन्यात समाविष्ट नाही.", future: "भविष्यातील संशोधन", summary: "पात्रता, कागदपत्रे, देयक पुनर्प्राप्ती, भेट आणि स्थिती अपवादांसह केंद्रित LL ते DL विनंती.", acknowledgement: "ही अधिकृत सेवा नाही आणि मी फक्त दिलेली कृत्रिम माहिती वापरेन हे मला समजले आहे.", start: "LL ते DL तपासणी सुरू करा" },
  te: { title: "ఊహాగానాలు లేకుండా డ్రైవింగ్ పరీక్షకు సిద్ధం అవ్వండి", intro: "మొదటిసారి దరఖాస్తుదారునికి LL నుండి DL దరఖాస్తు అర్హత, అవసరమైన పత్రాలు మరియు చెల్లింపు తర్వాత జరిగే చర్యలను LicencePath స్పష్టంగా చూపిస్తుంది.", comparison: "ప్రస్తుత ప్రయాణాన్ని LicencePath తో పోల్చడం", risk: "పరీక్షించాల్సిన ప్రమాదం", riskTitle: "RTO కు వెళ్లకముందే ప్రయాణం విఫలం కావచ్చు", riskItems: ["అర్హత ఆలస్యంగా తెలుస్తుంది", "పత్రాల జాబితా అసంపూర్ణంగా ఉంటుంది", "సమయం ముగిసిన చెల్లింపు చెల్లించనట్టుగా కనిపిస్తుంది", "తదుపరి బాధ్యత లేదా సవరణ స్పష్టంగా ఉండదు"], hypothesis: "ఇది ఉత్పత్తి ఊహ మాత్రమే; ధృవీకరించిన వినియోగదారు పరిశోధన కాదు. ఆధారాల లోటుకు ‘ఈ నమూనా గురించి’ చూడండి.", focused: "కేంద్రీకృత నమూనా", journey: "ఒక LL నుండి DL ప్రయాణం", journeyItems: ["ప్రయత్నానికి ముందు నంబర్, తేదీ తనిఖీ చేయండి", "ఖచ్చితమైన నమూనా పత్రాల జాబితాను చూపండి", "మళ్లీ చెల్లించే ముందు చెల్లింపును సరిచూడండి", "బాధ్యత, తదుపరి చర్య, పరిష్కారం చూపండి"], completing: "దీనిని ఎవరు పూర్తి చేస్తున్నారు?", self: "నేను దరఖాస్తు చేస్తున్నాను", selfHint: "ప్రతి నిర్ధారణ మీ నియంత్రణలో ఉంటుంది.", assisted: "ఎవరో నాకు సహాయం చేస్తున్నారు", assistedHint: "సమ్మతి, చెల్లింపు, సమర్పణను పౌరుడే నిర్ధారిస్తారు.", assistedConsent: "30 నిమిషాల సహాయక విధానానికి నేను సమ్మతిస్తున్నాను.", helper: "నమూనా సహాయకురాలు: కుటుంబ సభ్యురాలు నేహా వర్మ. చర్యలు ఆడిట్ రికార్డులో కనిపిస్తాయి.", scope: "నమూనా పరిధి", included: "చేర్చబడింది, పనిచేస్తుంది", unavailable: "ఈ నమూనాలో చేర్చబడలేదు.", future: "భవిష్యత్ పరిశోధన", summary: "అర్హత, పత్రాలు, చెల్లింపు పరిష్కారం, అపాయింట్‌మెంట్ మరియు స్థితి మినహాయింపులతో కూడిన LL నుండి DL అభ్యర్థన.", acknowledgement: "ఇది అధికారిక సేవ కాదని, ఇచ్చిన నమూనా వివరాలను మాత్రమే ఉపయోగిస్తానని అర్థం చేసుకున్నాను.", start: "LL నుండి DL తనిఖీ ప్రారంభించండి" },
  kn: { title: "ಊಹೆಯಿಲ್ಲದೆ ಚಾಲನಾ ಪರೀಕ್ಷೆಗೆ ಸಿದ್ಧರಾಗಿ", intro: "ಮೊದಲ ಬಾರಿಗೆ ಅರ್ಜಿ ಸಲ್ಲಿಸುವವರಿಗೆ LL ಇಂದ DL ಅರ್ಜಿಯ ಅರ್ಹತೆ, ಅಗತ್ಯ ದಾಖಲೆಗಳು ಮತ್ತು ಪಾವತಿಯ ನಂತರದ ಕ್ರಮಗಳನ್ನು LicencePath ಸ್ಪಷ್ಟಪಡಿಸುತ್ತದೆ.", comparison: "ಪ್ರಸ್ತುತ ಪ್ರಯಾಣ ಮತ್ತು LicencePath ಹೋಲಿಕೆ", risk: "ಪರಿಶೀಲಿಸಬೇಕಾದ ಅಪಾಯ", riskTitle: "RTO ತಲುಪುವ ಮೊದಲೇ ಪ್ರಕ್ರಿಯೆ ವಿಫಲವಾಗಬಹುದು", riskItems: ["ಅರ್ಹತೆ ತಡವಾಗಿ ಅರ್ಥವಾಗುತ್ತದೆ", "ದಾಖಲೆಗಳ ಪಟ್ಟಿ ಅಪೂರ್ಣವಾಗಿರುತ್ತದೆ", "ಸಮಯ ಮೀರಿದ ಪಾವತಿ ಪಾವತಿಸದಂತೆ ಕಾಣುತ್ತದೆ", "ಮುಂದಿನ ಜವಾಬ್ದಾರಿ ಅಥವಾ ತಿದ್ದುಪಡಿ ಸ್ಪಷ್ಟವಾಗಿಲ್ಲ"], hypothesis: "ಇದು ಉತ್ಪನ್ನದ ಊಹೆ; ದೃಢೀಕರಿಸಿದ ಬಳಕೆದಾರ ಸಂಶೋಧನೆ ಅಲ್ಲ. ಸಾಕ್ಷ್ಯದ ಕೊರತೆಗೆ ‘ಈ ಮಾದರಿಯ ಬಗ್ಗೆ’ ನೋಡಿ.", focused: "ಕೇಂದ್ರೀಕೃತ ಮಾದರಿ", journey: "ಒಂದು LL ಇಂದ DL ಪ್ರಯಾಣ", journeyItems: ["ಪ್ರಯತ್ನಕ್ಕೂ ಮೊದಲು ಸಂಖ್ಯೆ ಮತ್ತು ದಿನಾಂಕ ಪರಿಶೀಲಿಸಿ", "ನಿಖರವಾದ ಮಾದರಿ ದಾಖಲೆ ಪಟ್ಟಿ ತೋರಿಸಿ", "ಮತ್ತೆ ಪಾವತಿಸುವ ಮೊದಲು ಪಾವತಿ ಪರಿಶೀಲಿಸಿ", "ಜವಾಬ್ದಾರಿ, ಮುಂದಿನ ಕ್ರಮ ಮತ್ತು ಪರಿಹಾರ ತೋರಿಸಿ"], completing: "ಇದನ್ನು ಯಾರು ಪೂರ್ಣಗೊಳಿಸುತ್ತಿದ್ದಾರೆ?", self: "ನಾನು ಅರ್ಜಿ ಸಲ್ಲಿಸುತ್ತಿದ್ದೇನೆ", selfHint: "ಪ್ರತಿ ದೃಢೀಕರಣವೂ ನಿಮ್ಮ ನಿಯಂತ್ರಣದಲ್ಲಿದೆ.", assisted: "ಯಾರೋ ನನಗೆ ಸಹಾಯ ಮಾಡುತ್ತಿದ್ದಾರೆ", assistedHint: "ಒಪ್ಪಿಗೆ, ಪಾವತಿ ಮತ್ತು ಸಲ್ಲಿಕೆಯನ್ನು ನಾಗರಿಕರೇ ದೃಢೀಕರಿಸುತ್ತಾರೆ.", assistedConsent: "30 ನಿಮಿಷಗಳ ಸಹಾಯ ಮೋಡ್‌ಗೆ ನಾನು ಒಪ್ಪುತ್ತೇನೆ.", helper: "ಮಾದರಿ ಸಹಾಯಕಿ: ಕುಟುಂಬದ ಸದಸ್ಯೆ ನೇಹಾ ವರ್ಮಾ. ಕ್ರಮಗಳು ಆಡಿಟ್ ದಾಖಲೆಯಲ್ಲಿ ಕಾಣಿಸುತ್ತವೆ.", scope: "ಮಾದರಿಯ ವ್ಯಾಪ್ತಿ", included: "ಸೇರಿಸಲಾಗಿದೆ ಮತ್ತು ಕಾರ್ಯನಿರ್ವಹಿಸುತ್ತದೆ", unavailable: "ಈ ಮಾದರಿಯಲ್ಲಿ ಸೇರಿಸಲಾಗಿಲ್ಲ.", future: "ಭವಿಷ್ಯದ ಸಂಶೋಧನೆ", summary: "ಅರ್ಹತೆ, ದಾಖಲೆಗಳು, ಪಾವತಿ ಪರಿಹಾರ, ನೇಮಕಾತಿ ಮತ್ತು ಸ್ಥಿತಿ ವಿನಾಯಿತಿಗಳೊಂದಿಗೆ ಕೇಂದ್ರೀಕೃತ LL ಇಂದ DL ವಿನಂತಿ.", acknowledgement: "ಇದು ಅಧಿಕೃತ ಸೇವೆಯಲ್ಲ ಮತ್ತು ನೀಡಿದ ಮಾದರಿ ವಿವರಗಳನ್ನು ಮಾತ್ರ ಬಳಸುತ್ತೇನೆ ಎಂದು ನನಗೆ ತಿಳಿದಿದೆ.", start: "LL ಇಂದ DL ಪರಿಶೀಲನೆ ಆರಂಭಿಸಿ" },
  bn: { title: "অনুমান ছাড়াই ড্রাইভিং পরীক্ষার প্রস্তুতি নিন", intro: "প্রথমবারের আবেদনকারীর জন্য LicencePath দেখায় কখন LL থেকে DL আবেদন যোগ্য, কোন নথি প্রয়োজন এবং পেমেন্টের পরে কী হয়।", comparison: "বর্তমান যাত্রার সঙ্গে LicencePath-এর তুলনা", risk: "পরীক্ষার জন্য চিহ্নিত ঝুঁকি", riskTitle: "RTO-তে যাওয়ার আগেই প্রক্রিয়া ব্যর্থ হতে পারে", riskItems: ["যোগ্যতা অনেক দেরিতে বোঝা যায়", "নথির তালিকা অসম্পূর্ণ থাকে", "সময় শেষ হওয়া পেমেন্টকে অপরিশোধিত মনে হয়", "পরবর্তী দায়িত্ব বা সংশোধন স্পষ্ট নয়"], hypothesis: "এটি একটি পণ্য-অনুমান, যাচাই করা ব্যবহারকারী গবেষণা নয়। প্রমাণের ঘাটতির জন্য ‘এই নমুনা সম্পর্কে’ দেখুন।", focused: "কেন্দ্রীভূত নমুনা", journey: "একটি LL থেকে DL যাত্রা", journeyItems: ["চেষ্টা করার আগে নম্বর ও তারিখ যাচাই করুন", "সঠিক নমুনা নথির তালিকা দেখান", "আবার পেমেন্টের আগে আগের পেমেন্ট মিলিয়ে নিন", "দায়িত্ব, পরবর্তী কাজ ও সমাধান দেখান"], completing: "এটি কে পূরণ করছেন?", self: "আমি আবেদন করছি", selfHint: "প্রতিটি নিশ্চিতকরণ আপনার নিয়ন্ত্রণে।", assisted: "কেউ আমাকে সাহায্য করছেন", assistedHint: "সম্মতি, পেমেন্ট ও জমা নাগরিক নিজেই নিশ্চিত করেন।", assistedConsent: "আমি ৩০ মিনিটের সহায়তা মোডে সম্মতি দিচ্ছি।", helper: "নমুনা সহায়তাকারী: পরিবারের সদস্য নেহা ভার্মা। কাজগুলো অডিট নথিতে দেখা যাবে।", scope: "নমুনার পরিধি", included: "অন্তর্ভুক্ত ও কার্যকর", unavailable: "এই নমুনায় অন্তর্ভুক্ত নয়।", future: "ভবিষ্যৎ গবেষণা", summary: "যোগ্যতা, নথি, পেমেন্ট পুনরুদ্ধার, অ্যাপয়েন্টমেন্ট ও স্থিতির ব্যতিক্রমসহ কেন্দ্রীভূত LL থেকে DL অনুরোধ।", acknowledgement: "আমি বুঝি এটি সরকারি পরিষেবা নয় এবং আমি শুধু দেওয়া নমুনা তথ্য ব্যবহার করব।", start: "LL থেকে DL যাচাই শুরু করুন" },
};

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
    grievanceCategory: "",
    grievanceEvidence: false,
    scenario: "eligible",
    auditEvents: [],
  };
}

function serviceLabel(serviceId: ServiceId, language: Language) {
  return serviceCopy[serviceId].label[language];
}

function serviceRequestCount(count: number) {
  return `${count} service request${count === 1 ? "" : "s"}`;
}

function paymentLabel(state: DemoCase["payment"]["state"], language: Language) {
  const labels = {
    en: { not_started: "Not started", pending: "Pending", paid: "Confirmed", failed: "Failed" },
    hi: { not_started: "शुरू नहीं हुआ", pending: "पुष्टि बाकी", paid: "पुष्टि हुई", failed: "असफल" },
    ta: { not_started: "தொடங்கவில்லை", pending: "நிலுவையில்", paid: "உறுதிசெய்யப்பட்டது", failed: "தோல்வி" },
    mr: { not_started: "सुरू नाही", pending: "प्रलंबित", paid: "पुष्टी झाली", failed: "अयशस्वी" },
    te: { not_started: "ప్రారంభం కాలేదు", pending: "పెండింగ్", paid: "నిర్ధారించబడింది", failed: "విఫలమైంది" },
    kn: { not_started: "ಪ್ರಾರಂಭವಾಗಿಲ್ಲ", pending: "ಬಾಕಿಯಿದೆ", paid: "ದೃಢೀಕರಿಸಲಾಗಿದೆ", failed: "ವಿಫಲವಾಗಿದೆ" },
    bn: { not_started: "শুরু হয়নি", pending: "অপেক্ষমাণ", paid: "নিশ্চিত", failed: "ব্যর্থ" },
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
      <div><MockBadge language={language} label={translations[language].interactive} /><h1>{title}</h1><p>{intro.replace("1 service requests", "1 service request")}</p></div>
    </header>
  );
}

function buildOutcomeEvents(selectedServices: ServiceId[], language: Language, scenario: DemoScenario) {
  const en = usesEnglishFallback(language);
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
    if (!hydrated) return;
    document.documentElement.lang = state.language;
  }, [hydrated, state.language]);

  useEffect(() => {
    if (!hydrated || resumeCandidate) return;
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
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
      setError(usesEnglishFallback(state.language) ? "Choose at least one service to build your journey." : "अपनी यात्रा बनाने के लिए कम से कम एक सेवा चुनें।");
      return;
    }
    if (!state.acceptedNotice) {
      setError(usesEnglishFallback(state.language) ? "Confirm that you will use demo data only." : "पुष्टि करें कि आप केवल डेमो जानकारी का उपयोग करेंगे।");
      return;
    }
    if (state.mode === "assisted" && !state.helperConsent) {
      setError(usesEnglishFallback(state.language) ? "Citizen consent is required for assisted mode." : "सहायता मोड के लिए नागरिक की सहमति जरूरी है।");
      return;
    }
    go(1);
  };

  const confirmEligibility = () => {
    if (!/^LL-DL99-2026-\d{6}$/.test(state.caseData.llNumber) || state.scenario === "invalid_record") {
      setError(usesEnglishFallback(state.language) ? "This synthetic Learner's Licence number was not found. Check the format or load a reviewer scenario; no case or payment was created." : "यह नकली लर्नर लाइसेंस नंबर नहीं मिला। प्रारूप जांचें; कोई केस या भुगतान नहीं बना।");
      return;
    }
    if (state.selectedServices.includes("ll_to_dl") && !eligibility.eligible) {
      const message = eligibility.expired
        ? `This demo Learner's Licence expired on ${eligibility.expiryDate}. Start a new LL journey; payment is blocked.`
        : `The LL-to-DL request becomes eligible on ${eligibility.earliestDate}. No payment is needed today.`;
      setError(usesEnglishFallback(state.language) ? message : `यह अनुरोध अभी आगे नहीं बढ़ सकता। डेमो नियम की तारीखें देखें; आज भुगतान न करें।`);
      return;
    }
    setState((current) => ({ ...current, stage: 2, caseData: { ...current.caseData, issueDate: current.issueDate } }));
    setError("");
  };

  const verifyIdentity = () => {
    if (state.scenario === "identity_mismatch") {
      setError(usesEnglishFallback(state.language) ? "The retrieved name does not match this synthetic licence. Stop and review the record; nothing has been submitted." : "मिला नाम इस नकली लाइसेंस से मेल नहीं खाता। रिकॉर्ड जांचें; कुछ जमा नहीं हुआ।");
      return;
    }
    if (!state.identityConsent || state.otp !== "482916") {
      setError(usesEnglishFallback(state.language) ? "Give consent and enter the displayed 6-digit test OTP." : "सहमति दें और दिखाया गया 6 अंकों का टेस्ट OTP दर्ज करें।");
      return;
    }
    go(3);
  };

  const continueDetails = () => {
    const en = usesEnglishFallback(state.language);
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
      setError(usesEnglishFallback(state.language) ? "Attach every generated fixture in your combined checklist." : "संयुक्त चेकलिस्ट के सभी नकली दस्तावेज जोड़ें।");
      return;
    }
    if (state.scenario === "unreadable_document") {
      setError(usesEnglishFallback(state.language) ? "The address fixture is unreadable. Remove it and choose ‘Mark replacement readable’ in Demo controls before continuing." : "पता दस्तावेज पढ़ा नहीं जा सकता। इसे हटाएं और डेमो कंट्रोल से पठनीय उदाहरण चुनें।");
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
      setError(usesEnglishFallback(state.language) ? "Choose one simulated driving test slot." : "एक नकली ड्राइविंग टेस्ट स्लॉट चुनें।");
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
    <div className="app-shell">
      <a className="skip-link" href="#main-content">{t.skip}</a>
      <div className="prototype-banner" role="note"><Info aria-hidden="true" size={18} weight="fill" /><strong>{usesEnglishFallback(state.language) ? "Important information" : "महत्वपूर्ण जानकारी"}</strong><span>{t.banner}</span><MockBadge language={state.language} /></div>

      <header className="site-header">
        <div className="site-identity"><span className="tricolour-mark" aria-hidden="true"><i /><i /><i /></span><div className="brand-wrap"><Link className="brand" href="/" aria-label="LicencePath home"><span className="brand-mark" aria-hidden="true">LP</span><span><strong>LicencePath</strong><small>{usesEnglishFallback(state.language) ? "Citizen transport services" : "नागरिक परिवहन सेवाएं"}</small></span></Link><span className="pilot-label">{t.pilot}</span></div></div>
        <nav className="header-actions" aria-label="Language and portal information">
          <label className="language-picker">
            <Translate aria-hidden="true" size={19} />
            <span className="sr-only">{t.chooseLanguage}</span>
            <select aria-label={t.chooseLanguage} onChange={(event) => update({ language: event.target.value as Language })} value={state.language}>
              {languageOptions.map((language) => <option key={language.code} lang={language.code} value={language.code}>{language.nativeName}</option>)}
            </select>
          </label>
          <Link aria-label={t.about} className="utility-link" href={state.language === "hi" ? "/about/hi" : "/about"}><Info aria-hidden="true" size={19} weight="duotone" /><span>{t.about}</span></Link>
          <button aria-label={t.help} className="utility-button" onClick={() => setHelpOpen(true)} type="button"><Lifebuoy aria-hidden="true" size={19} weight="duotone" /><span>{t.help}</span></button>
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
          {resumeFound && state.stage > 0 ? <Notice tone="success"><strong>{usesEnglishFallback(state.language) ? "Your demo was restored." : "आपका डेमो फिर से खुल गया है।"}</strong><p>{usesEnglishFallback(state.language) ? "Continue without entering the same information again." : "वही जानकारी दोबारा भरे बिना आगे बढ़ें।"}</p></Notice> : null}

          {resumeCandidate ? <ResumeGate language={state.language} saved={resumeCandidate} onContinue={continueSavedDemo} onFresh={startFreshDemo} /> : <>
            {state.stage === 0 ? <StartStage state={state} update={update} error={error} onContinue={begin} /> : null}
            {state.stage === 1 ? <EligibilityStage state={state} eligibility={eligibility} error={error} update={update} onContinue={confirmEligibility} /> : null}
            {state.stage === 2 ? <IdentityStage state={state} update={update} error={error} onContinue={verifyIdentity} /> : null}
            {state.stage === 3 ? <DetailsStage state={state} update={update} error={error} onContinue={continueDetails} /> : null}
            {state.stage === 4 ? <EvidenceStage state={state} update={update} required={evidenceRequirements} error={error} onContinue={continueEvidence} /> : null}
            {state.stage === 5 ? <PaymentStage state={state} fees={fees} error={error} busy={serviceBusy} onPay={pay} onReconcile={reconcile} onConfirmZeroFee={confirmZeroFee} onContinue={() => go(6)} /> : null}
            {state.stage === 6 ? <SubmissionStage state={state} update={update} requiresAppointment={requiresAppointment} error={error} busy={serviceBusy} onSubmit={submit} onContinue={continueAfterSubmission} onResolveSlots={() => update({ scenario: "eligible" })} /> : null}
            {state.stage === 7 ? <TrackingStage state={state} reset={resetDemo} onAdvance={() => update({ outcomeIndex: state.outcomeIndex + 1 })} onComplete={() => update({ outcomeIndex: buildOutcomeEvents(state.selectedServices, state.language, state.scenario).length - 1 })} /> : null}
          </>}

          {state.stage > 0 && state.stage < 7 ? <button className="back-button" onClick={() => go(state.stage - 1)} type="button"><ArrowLeft aria-hidden="true" size={18} />{t.back}</button> : null}
          <DemoControls state={state} applyScenario={applyScenario} onFillIdentity={() => update({ otp: "482916", address: "18, Demo Lane, New Delhi 110001" })} onAdvance={() => update({ outcomeIndex: state.outcomeIndex + 1 })} />
        </main>

        <aside className="context-panel" aria-label="Current case summary">
          <h2>{t.yourCase}</h2>
          <p className="context-count">{state.language === "en" ? serviceRequestCount(state.selectedServices.length) : `${state.selectedServices.length} ${t.requests}`}</p>
          <ul className="case-service-list">{state.selectedServices.map((serviceId) => <li key={serviceId}><span>{serviceLabel(serviceId, state.language)}</span><small>{state.caseData.serviceRequests.find((request) => request.serviceId === serviceId)?.requestId}</small></li>)}</ul>
          <dl><div><dt>{t.rulePack}</dt><dd>{DEMO_RULE_PACK.id}</dd></div><div><dt>{t.payment}</dt><dd>{paymentLabel(state.caseData.payment.state, state.language)}</dd></div><div><dt>{t.application}</dt><dd>{state.caseData.submission.applicationId ?? t.notSubmitted}</dd></div></dl>
          <div className="audit-summary"><strong>{t.audit}</strong><span>{state.auditEvents.length} {t.operations}</span>{state.auditEvents.slice(-3).map((event, index) => <small key={`${event.eventId}-${index}`}>{event.operation}: {event.result}</small>)}</div>
          <Notice><strong>{t.safety}</strong></Notice>
        </aside>
      </div>

      {helpOpen ? <div className="modal-backdrop" role="presentation" onMouseDown={() => setHelpOpen(false)}><section aria-labelledby="help-title" aria-modal="true" className="help-modal" role="dialog" onMouseDown={(event) => event.stopPropagation()}><div className="modal-head"><div><MockBadge language={state.language} /><h2 id="help-title">{state.language === "en" ? "Get help with this step" : "इस चरण में मदद लें"}</h2></div><button aria-label="Close help" onClick={() => setHelpOpen(false)} type="button">×</button></div>{state.grievanceId ? <Notice tone="success"><strong>{state.grievanceId}</strong><p>{state.language === "en" ? "Open, Owner: mock service desk, updates will appear in this case history." : "खुली, जिम्मेदार: नकली सेवा डेस्क, अपडेट केस इतिहास में दिखेंगे।"}</p></Notice> : <><p>{state.language === "en" ? "Create a synthetic grievance with a visible category, owner and reference. No response time is promised in this prototype." : "श्रेणी, जिम्मेदार और संदर्भ वाली नकली शिकायत बनाएं। इस प्रोटोटाइप में जवाब का समय तय नहीं है।"}</p><Field label={state.language === "en" ? "Issue category" : "समस्या श्रेणी"}><select value={state.grievanceCategory} onChange={(event) => update({ grievanceCategory: event.target.value as JourneyState["grievanceCategory"] })}><option value="">Choose a category</option><option value="payment">Payment</option><option value="appointment">Appointment</option><option value="documents">Documents</option><option value="status">Status or dispatch</option></select></Field><Field label={state.language === "en" ? "What went wrong?" : "क्या समस्या हुई?"} hint={state.language === "en" ? "Do not enter personal information." : "कोई निजी जानकारी न लिखें।"}><textarea value={grievanceText} onChange={(event) => setGrievanceText(event.target.value)} rows={4} /></Field><label className="check-row"><input checked={state.grievanceEvidence} onChange={(event) => update({ grievanceEvidence: event.target.checked })} type="checkbox" /><span><strong>{state.language === "en" ? "Attach generated case-history fixture" : "नकली केस इतिहास जोड़ें"}</strong><small>{state.language === "en" ? "No real document is uploaded." : "कोई असली दस्तावेज अपलोड नहीं होता।"}</small></span></label><button className="primary-button" disabled={!state.grievanceCategory || grievanceText.trim().length < 8} onClick={createGrievance} type="button">{state.language === "en" ? "Create demo grievance" : "डेमो शिकायत बनाएं"}</button></>}</section></div> : null}
    </div>
  );
}

function ResumeGate({ language, saved, onContinue, onFresh }: { language: Language; saved: JourneyState; onContinue: () => void; onFresh: () => void }) {
  const en = usesEnglishFallback(language);
  return <section className="stage-section"><StageHeader icon={ClockCountdown} language={language} title={en ? "A saved synthetic demo is in this browser" : "इस ब्राउज़र में सेव नकली डेमो है"} intro={en ? "Choose deliberately so one review run never contaminates the next." : "जानबूझकर चुनें ताकि एक समीक्षा अगली समीक्षा को प्रभावित न करे।"} /><Notice tone="warning"><strong>{saved.caseData.caseId}</strong><p>{en ? `Saved at step ${saved.stage + 1} of ${translations.en.stages.length}. This is browser-only synthetic data, not another citizen's record.` : `चरण ${saved.stage + 1} पर सेव। यह केवल ब्राउज़र की नकली जानकारी है, किसी नागरिक का रिकॉर्ड नहीं।`}</p></Notice><div className="resume-actions"><button className="primary-button" onClick={onContinue} type="button">{en ? "Continue saved demo" : "सेव डेमो जारी रखें"}</button><button className="secondary-button" onClick={onFresh} type="button">{en ? "Start new demo and clear saved data" : "नया डेमो शुरू करें और सेव डेटा हटाएं"}</button></div></section>;
}

function DemoControls({ state, applyScenario, onFillIdentity, onAdvance }: { state: JourneyState; applyScenario: (scenario: DemoScenario) => void; onFillIdentity: () => void; onAdvance: () => void }) {
  const en = usesEnglishFallback(state.language);
  return <details className="demo-controls"><summary><Flask aria-hidden="true" size={17} />{en ? "Reviewer demo controls" : "समीक्षक डेमो कंट्रोल"}</summary><div><p>{en ? "These controls are outside the citizen journey. Load a condition, then observe the citizen-facing recovery path." : "ये कंट्रोल नागरिक यात्रा से अलग हैं। स्थिति चुनें और समाधान मार्ग देखें।"}</p><label><span>{en ? "Scenario" : "स्थिति"}</span><select value={state.scenario} onChange={(event) => applyScenario(event.target.value as DemoScenario)}><option value="eligible">Eligible, payment timeout</option><option value="too_early">Waiting period not complete</option><option value="expired">Learner's Licence expired</option><option value="invalid_record">Invalid LL number</option><option value="identity_mismatch">Retrieved person mismatch</option><option value="unreadable_document">Unreadable evidence</option><option value="no_slots">No appointment slots</option><option value="test_failed">Driving test not cleared</option><option value="correction_required">Returned for correction</option><option value="dispatch_failed">Dispatch failed</option></select></label><button className="secondary-button" onClick={() => applyScenario(state.scenario)} type="button">{en ? "Reload selected scenario inputs" : "चुनी स्थिति फिर लोड करें"}</button>{state.stage === 2 ? <button className="secondary-button" onClick={onFillIdentity} type="button">{en ? "Fill synthetic identity inputs" : "नकली पहचान जानकारी भरें"}</button> : null}{state.scenario === "unreadable_document" ? <button className="secondary-button" onClick={() => applyScenario("eligible")} type="button">{en ? "Mark replacement readable" : "नया दस्तावेज पठनीय मानें"}</button> : null}{state.stage === 7 ? <button className="secondary-button" onClick={onAdvance} type="button">{en ? "Send next provider event" : "अगला सेवा इवेंट भेजें"}</button> : null}<small>{en ? "All values, events and outcomes are synthetic." : "सभी जानकारी, इवेंट और परिणाम नकली हैं।"}</small></div></details>;
}

function StartStage({ state, update, error, onContinue }: StageProps & { error: string; onContinue: () => void }) {
  const t = startTranslations[state.language];
  const en = usesEnglishFallback(state.language);
  return (
    <section className="stage-section start-stage">
      <StageHeader icon={ShieldCheck} language={state.language} title={t.title} intro={t.intro} />

      <figure className="preparation-visual">
        <Image alt={en ? "A citizen reviewing sample driving licence documents before starting an online service" : "ऑनलाइन सेवा शुरू करने से पहले नमूना ड्राइविंग लाइसेंस दस्तावेज देखते नागरिक"} height={820} priority sizes="(max-width: 700px) 100vw, 320px" src="/images/licencepath-preparation.png" width={1200} />
        <figcaption>
          <span>{en ? "Before you begin" : "शुरू करने से पहले"}</span>
          <strong>{en ? "Keep three things ready" : "तीन चीजें तैयार रखें"}</strong>
          <ol>
            <li><b>1</b>{en ? "Your synthetic Learner's Licence details" : "आपके नकली लर्नर लाइसेंस का विवरण"}</li>
            <li><b>2</b>{en ? "The demo mobile number and test credential" : "डेमो मोबाइल नंबर और टेस्ट जानकारी"}</li>
            <li><b>3</b>{en ? "Generated fixtures only — never real documents" : "केवल बनाए गए उदाहरण — असली दस्तावेज कभी नहीं"}</li>
          </ol>
        </figcaption>
      </figure>

      <div className="system-compare" aria-label={t.comparison}>
        <article><span>{t.risk}</span><h2>{t.riskTitle}</h2><ol>{t.riskItems.map((item) => <li key={item}>{item}</li>)}</ol><small>{t.hypothesis}</small></article>
        <article className="proposed-flow"><span>{t.focused}</span><h2>{t.journey}</h2><ol>{t.journeyItems.map((item) => <li key={item}>{item}</li>)}</ol></article>
      </div>

      <fieldset className="choice-group"><legend>{t.completing}</legend><div className="choice-grid two"><label className={`choice-card ${state.mode === "self" ? "selected" : ""}`}><input checked={state.mode === "self"} name="mode" onChange={() => update({ mode: "self" })} type="radio" /><LockKey aria-hidden="true" size={26} weight="duotone" /><span><strong>{t.self}</strong><small>{t.selfHint}</small></span></label><label className={`choice-card ${state.mode === "assisted" ? "selected" : ""}`}><input checked={state.mode === "assisted"} name="mode" onChange={() => update({ mode: "assisted" })} type="radio" /><HandHeart aria-hidden="true" size={26} weight="duotone" /><span><strong>{t.assisted}</strong><small>{t.assistedHint}</small></span></label></div></fieldset>
      {state.mode === "assisted" ? <Notice><label className="check-row"><input checked={state.helperConsent} onChange={(event) => update({ helperConsent: event.target.checked })} type="checkbox" /><span><strong>{t.assistedConsent}</strong><small>{t.helper}</small></span></label></Notice> : null}

      <section className="choice-group" aria-labelledby="scope-title"><h2 id="scope-title">{t.scope}</h2><div className="service-grid"><article className="service-choice selected"><span><strong>{serviceCopy.ll_to_dl.label[state.language]}</strong><small>{serviceCopy.ll_to_dl.description[state.language]}</small><em>{t.included}</em></span><CheckCircle aria-hidden="true" size={24} weight="fill" /></article>{serviceOrder.filter((id) => id !== "ll_to_dl").map((serviceId) => { const copy = serviceCopy[serviceId]; return <article aria-disabled="true" className="service-choice unavailable" key={serviceId}><span><strong>{copy.label[state.language]}</strong><small>{t.unavailable}</small><em>{t.future}</em></span></article>; })}</div></section>
      <div className="selection-summary" aria-live="polite"><strong>1</strong><span>{t.summary}</span></div>
      <label className="notice-confirm"><input checked={state.acceptedNotice} onChange={(event) => update({ acceptedNotice: event.target.checked })} type="checkbox" /><span>{t.acknowledgement}</span></label>
      {error ? <p className="form-error" role="alert">{error}</p> : null}
      <button className="primary-button" onClick={onContinue} type="button">{t.start}<ArrowRight aria-hidden="true" size={18} weight="bold" /></button>
    </section>
  );
}

function EligibilityStage({ state, eligibility, error, update, onContinue }: StageProps & { eligibility: ReturnType<typeof evaluateEligibility>; error: string; onContinue: () => void }) {
  const en = usesEnglishFallback(state.language);
  return (
    <section className="stage-section">
      <StageHeader icon={ClockCountdown} language={state.language} title={en ? "Check the licence and date before collecting evidence" : "दस्तावेज लेने से पहले लाइसेंस और तारीख जांचें"} intro={en ? "Enter the supplied synthetic details. Your inputs now determine whether the journey can continue." : "दी गई नकली जानकारी भरें। आपकी जानकारी तय करेगी कि यात्रा आगे बढ़ सकती है या नहीं।"} />
      <Notice tone="warning"><strong>{en ? "Delhi was chosen only as a bounded test fixture" : "दिल्ली केवल सीमित टेस्ट उदाहरण है"}</strong><p>{DEMO_RULE_PACK.id}, {en ? "unverified illustrative rules. A transport authority must approve every source, effective date and change before production." : "असत्यापित उदाहरण नियम। असल सेवा से पहले परिवहन अधिकारी हर स्रोत, तारीख और बदलाव मंजूर करेगा।"}</p></Notice>
      {state.selectedServices.includes("ll_to_dl") ? <><div className="form-grid"><Field label={en ? "Synthetic Learner's Licence number" : "नकली लर्नर लाइसेंस नंबर"} hint={en ? "Expected demo format: LL-DL99-2026-000123" : "डेमो प्रारूप: LL-DL99-2026-000123"}><input onChange={(event) => update({ caseData: { ...state.caseData, llNumber: event.target.value.toUpperCase() } })} value={state.caseData.llNumber} /></Field><Field label={en ? "Learner's Licence issue date" : "लर्नर लाइसेंस जारी होने की तारीख"}><input max={TODAY} onChange={(event) => update({ issueDate: event.target.value })} type="date" value={state.issueDate} /></Field></div>{state.issueDate ? <div className={`eligibility-result ${eligibility.eligible ? "eligible" : "not-eligible"}`} aria-live="polite"><span>{eligibility.eligible ? <CheckCircle size={30} weight="fill" /> : <ClockCountdown size={30} weight="fill" />}</span><div><strong>{eligibility.eligible ? (en ? "Eligible in this test fixture" : "इस टेस्ट उदाहरण में पात्र") : eligibility.expired ? (en ? "This test licence has expired" : "यह टेस्ट लाइसेंस समाप्त है") : (en ? "The waiting period is not complete" : "प्रतीक्षा अवधि पूरी नहीं हुई")}</strong><p>{en ? `Held for ${eligibility.daysHeld} days. Earliest: ${eligibility.earliestDate}; fixture expiry: ${eligibility.expiryDate}.` : `${eligibility.daysHeld} दिन। पहली तारीख: ${eligibility.earliestDate}; समाप्ति: ${eligibility.expiryDate}.`}</p></div></div> : <Notice><strong>{en ? "Enter a date to calculate the result" : "परिणाम के लिए तारीख भरें"}</strong></Notice>}</> : null}
      <div className="request-checks">{state.selectedServices.filter((id) => id !== "ll_to_dl").map((serviceId) => <article key={serviceId}><CheckCircle aria-hidden="true" size={22} weight="fill" /><div><strong>{serviceLabel(serviceId, state.language)}</strong><p>{en ? "Available in this demo rule pack. Details and evidence are checked next." : "इस डेमो नियम पैक में उपलब्ध। आगे जानकारी और दस्तावेज जांचे जाएंगे।"}</p></div><MockBadge language={state.language} label={en ? "Configured rule" : "सेट नियम"} /></article>)}</div>
      {error ? <p className="form-error" role="alert">{error}</p> : null}<button className="primary-button" onClick={onContinue} type="button">{en ? "Continue to identity" : "पहचान पर जाएं"}<ArrowRight size={18} weight="bold" /></button>
    </section>
  );
}

function IdentityStage({ state, update, error, onContinue }: StageProps & { error: string; onContinue: () => void }) {
  const en = usesEnglishFallback(state.language);
  return <section className="stage-section"><StageHeader icon={LockKey} language={state.language} title={en ? "Retrieve the synthetic profile with explicit consent" : "स्पष्ट सहमति से नकली प्रोफाइल पाएं"} intro={en ? "Use the supplied test credential. No real identity provider or mobile number is contacted." : "दी गई टेस्ट जानकारी का उपयोग करें। किसी असली पहचान सेवा या मोबाइल नंबर से संपर्क नहीं होता।"} /><Notice><strong>{en ? "Mock identity adapter" : "नकली पहचान सेवा"}</strong><p>{en ? "No SMS is sent. Use the demo credential below to continue the review." : "कोई SMS नहीं भेजा जाता। समीक्षा जारी रखने के लिए नीचे डेमो जानकारी उपयोग करें।"}</p></Notice><Field label={en ? "Demo mobile number" : "डेमो मोबाइल नंबर"}><div className="input-with-badge"><input readOnly value="+91 90000 00000" /><MockBadge language={state.language} label="Mock identity" /></div></Field><label className="notice-confirm"><input checked={state.identityConsent} onChange={(event) => update({ identityConsent: event.target.checked })} type="checkbox" /><span>{en ? "I consent to retrieve Asha Verma's synthetic profile and licence record for this demo." : "मैं इस डेमो के लिए आशा वर्मा की नकली प्रोफाइल और लाइसेंस रिकॉर्ड देखने की सहमति देता हूं।"}</span></label><Field label={en ? "6-digit test credential" : "6 अंकों की टेस्ट जानकारी"} hint={en ? "Demo value: 482916" : "डेमो जानकारी: 482916"} error={error}><input autoComplete="one-time-code" inputMode="numeric" maxLength={6} onChange={(event) => update({ otp: event.target.value.replace(/\D/g, "") })} value={state.otp} /></Field><button className="secondary-button" onClick={() => update({ otp: "482916" })} type="button">{en ? "Use demo credential" : "डेमो जानकारी उपयोग करें"}</button><button className="primary-button" onClick={onContinue} type="button">{en ? "Retrieve demo record" : "डेमो रिकॉर्ड पाएं"}<MagnifyingGlass size={18} weight="bold" /></button></section>;
}

function DetailsStage({ state, update, error, onContinue }: StageProps & { error: string; onContinue: () => void }) {
  const en = usesEnglishFallback(state.language);
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
  const en = usesEnglishFallback(state.language);
  const setEvidence = (evidenceId: EvidenceId) => update({ evidence: { ...state.evidence, [evidenceId]: !state.evidence[evidenceId] } });
  return <section className="stage-section"><StageHeader icon={FileArrowUp} language={state.language} title={en ? "Attach and check each required fixture" : "हर जरूरी उदाहरण जोड़ें और जांचें"} intro={en ? "The citizen must complete the checklist; the demo can also return a document as unreadable." : "नागरिक चेकलिस्ट पूरी करता है; डेमो दस्तावेज को अपठनीय भी लौटा सकता है।"} /><Notice tone="warning"><strong>{en ? "Never upload a real Aadhaar, PAN, licence or payment receipt." : "असली आधार, PAN, लाइसेंस या भुगतान रसीद कभी अपलोड न करें।"}</strong><p>{en ? "Every button below attaches a generated fixture already included in the demo." : "नीचे हर बटन डेमो में पहले से मौजूद नकली फाइल जोड़ता है।"}</p></Notice>{required.length > 0 ? <div className="evidence-list">{required.map((evidenceId) => { const copy = evidenceCopy[evidenceId]; const attached = Boolean(state.evidence[evidenceId]); const rejected = attached && state.scenario === "unreadable_document" && evidenceId === "address_proof"; return <article className={attached && !rejected ? "attached" : rejected ? "rejected" : ""} key={evidenceId}><div className="file-icon">{attached && !rejected ? <Check size={22} weight="bold" /> : <FileArrowUp size={22} />}</div><div><strong>{en ? copy.en : copy.hi}</strong><small>{rejected ? (en ? "Quality check failed, text is unreadable" : "गुणवत्ता जांच असफल, टेक्स्ट पढ़ा नहीं जा सकता") : attached ? `${copy.meta}, ${en ? "Quality check passed" : "गुणवत्ता जांच पास"}` : "PDF or JPG, maximum 2 MB"}</small></div><button className="secondary-button" onClick={() => setEvidence(evidenceId)} type="button">{attached ? (en ? "Remove" : "हटाएं") : (en ? "Attach fixture" : "उदाहरण जोड़ें")}</button></article>; })}</div> : null}{error ? <p className="form-error" role="alert">{error}</p> : null}<button className="primary-button" onClick={onContinue} type="button">{en ? "Review illustrative fees" : "उदाहरण शुल्क देखें"}<ArrowRight size={18} weight="bold" /></button></section>;
}

function PaymentStage({ state, fees, error, busy, onPay, onReconcile, onConfirmZeroFee, onContinue }: { state: JourneyState; fees: ReturnType<typeof feeBreakdown>; error: string; busy: DemoOperation | null; onPay: () => void; onReconcile: () => void; onConfirmZeroFee: () => void; onContinue: () => void }) {
  const en = usesEnglishFallback(state.language);
  const status = state.caseData.payment.state;
  return <section className="stage-section"><StageHeader icon={Receipt} language={state.language} title={en ? "Recover one uncertain payment - do not pay twice" : "अनिश्चित भुगतान जांचें - दो बार भुगतान न करें"} intro={en ? "This visible sequence calls the mock case API and records every operation in the audit panel." : "यह क्रम नकली केस API को कॉल करता है और हर कार्रवाई ऑडिट पैनल में दर्ज करता है।"} /><div className="fee-box">{fees.lines.map((line) => <div key={line.serviceId}><span>{serviceLabel(line.serviceId, state.language)}</span><strong>₹{line.amount}</strong></div>)}<div className="fee-total"><span>{en ? "Illustrative total" : "उदाहरण कुल"}</span><strong>₹{fees.total}</strong></div><small>{en ? `Source: ${DEMO_RULE_PACK.id}. Synthetic, not an official fee.` : `स्रोत: ${DEMO_RULE_PACK.id}। नकली, आधिकारिक शुल्क नहीं।`}</small></div>{status === "not_started" && fees.total > 0 ? <><ol className="recovery-steps"><li>{en ? "Start one mock payment" : "एक नकली भुगतान शुरू करें"}</li><li>{en ? "Gateway response times out" : "गेटवे जवाब रुकता है"}</li><li>{en ? "Reconcile the same reference" : "उसी संदर्भ की जांच करें"}</li></ol><button className="primary-button" disabled={busy !== null} onClick={onPay} type="button">{busy === "begin_payment" ? (en ? "Starting…" : "शुरू…") : (en ? "Start mock payment" : "नकली भुगतान शुरू करें")}<ArrowRight size={18} /></button></> : null}{status === "not_started" && fees.total === 0 ? <button className="primary-button" onClick={onConfirmZeroFee} type="button">{en ? "Confirm no payment due" : "कोई भुगतान नहीं की पुष्टि करें"}</button> : null}{status === "pending" ? <><div className="status-panel pending"><CircleNotch aria-hidden="true" size={30} /><div><strong>{en ? "Money debited; confirmation timed out" : "राशि कटी; पुष्टि रुक गई"}</strong><p>{en ? `Do not pay again. ${state.caseData.payment.gatewayReference}, attempt ${state.caseData.payment.attempts}` : `दोबारा भुगतान न करें। ${state.caseData.payment.gatewayReference}`}</p></div><MockBadge language={state.language} label="Mock API" /></div><button className="primary-button" disabled={busy !== null} onClick={onReconcile} type="button">{busy === "reconcile_payment" ? (en ? "Checking…" : "जांच…") : (en ? "Check existing payment" : "मौजूदा भुगतान जांचें")}</button></> : null}{status === "paid" ? <><div className="status-panel success"><CheckCircle aria-hidden="true" size={32} weight="fill" /><div><strong>{en ? "Existing payment found; no second charge" : "मौजूदा भुगतान मिला; दूसरी कटौती नहीं"}</strong><p>{en ? `One attempt remains recorded. Audit events: ${state.auditEvents.length}.` : `एक कोशिश दर्ज है। ऑडिट इवेंट: ${state.auditEvents.length}.`}</p></div></div><a className="download-button" download href={en ? "/licencepath-demo-payment-receipt.txt" : "/licencepath-demo-payment-receipt-hi.txt"}><Receipt size={18} />{en ? "Download accessible demo receipt" : "सुलभ डेमो रसीद डाउनलोड करें"}</a><button className="primary-button" onClick={onContinue} type="button">{en ? "Continue to submission" : "आवेदन जमा करें"}<ArrowRight size={18} /></button></> : null}{error ? <p className="form-error" role="alert">{error}</p> : null}</section>;
}

function SubmissionStage({ state, update, requiresAppointment, error, busy, onSubmit, onContinue, onResolveSlots }: StageProps & { requiresAppointment: boolean; error: string; busy: DemoOperation | null; onSubmit: () => void; onContinue: () => void; onResolveSlots: () => void }) {
  const en = usesEnglishFallback(state.language);
  const submitted = state.caseData.submission.state === "submitted";
  return <section className="stage-section"><StageHeader icon={CalendarCheck} language={state.language} title={en ? "Retry safely, then choose an appointment" : "सुरक्षित दोबारा कोशिश करें, फिर अपॉइंटमेंट चुनें"} intro={en ? "The mock case API exposes the idempotency key and returns the same application reference on retry." : "नकली केस API इडेम्पोटेंसी कुंजी दिखाता है और दोबारा कोशिश पर वही आवेदन संदर्भ देता है।"} />{!submitted ? <><div className="review-summary"><h2>{en ? "Plain-language review" : "आसान भाषा में जांच"}</h2><p>{en ? "Asha Verma is submitting one synthetic LL-to-DL request." : "आशा वर्मा एक नकली LL से DL अनुरोध जमा कर रही हैं।"}</p><p><strong>{en ? "Idempotency key:" : "इडेम्पोटेंसी कुंजी:"}</strong> licencepath-demo-submit-v3</p></div><button className="primary-button" disabled={busy !== null} onClick={onSubmit} type="button">{busy === "submit_application" ? (en ? "Submitting…" : "जमा…") : (en ? "Submit through mock case API" : "नकली केस API से जमा करें")}<ShieldCheck size={18} /></button></> : null}{submitted ? <><Notice tone="success"><strong>{en ? "Application created once" : "आवेदन एक बार बना"}</strong><p>{state.caseData.submission.applicationId}, {en ? "safe retries return this reference" : "सुरक्षित दोबारा कोशिश यही संदर्भ लौटाती है"} <MockBadge language={state.language} label="Mock API" /></p></Notice><button className="secondary-button" disabled={busy !== null} onClick={onSubmit} type="button">{en ? "Simulate interrupted connection and retry" : "रुका कनेक्शन और दोबारा कोशिश दिखाएं"}</button>{state.auditEvents.filter((event) => event.operation === "submit_application").length > 1 ? <Notice><strong>{en ? "Duplicate prevented" : "डुप्लिकेट रोका गया"}</strong><p>{en ? `Both calls used the same key and returned ${state.caseData.submission.applicationId}.` : `दोनों कॉल ने वही कुंजी उपयोग की और ${state.caseData.submission.applicationId} लौटाया।`}</p></Notice> : null}<Link className="case-link" href={`/case/${state.caseData.caseId}`}>{en ? "Open this addressable demo case" : "यह पता योग्य डेमो केस खोलें"}</Link><small className="case-link-note">{en ? "The URL is bookmarkable, but this prototype can recover details only from this browser. Production requires authenticated server storage." : "URL बुकमार्क हो सकता है, लेकिन विवरण केवल इसी ब्राउज़र से मिलेंगे। असल सेवा में सुरक्षित सर्वर स्टोरेज चाहिए।"}</small>{requiresAppointment && state.scenario === "no_slots" ? <Notice tone="warning"><strong>{en ? "No test slots are available" : "कोई टेस्ट स्लॉट उपलब्ध नहीं"}</strong><p>{en ? "The submitted application remains saved. Check another date or RTO; do not submit again." : "जमा आवेदन सेव है। दूसरी तारीख या RTO देखें; दोबारा जमा न करें।"}<button className="text-button" onClick={onResolveSlots} type="button">{en ? "Load later availability" : "बाद की उपलब्धता लोड करें"}</button></p></Notice> : requiresAppointment ? <><Field label={en ? "Choose a simulated driving test slot" : "नकली ड्राइविंग टेस्ट स्लॉट चुनें"} error={error}><select onChange={(event) => update({ slot: event.target.value })} value={state.slot}><option value="">{en ? "Select a slot" : "स्लॉट चुनें"}</option><option value="2026-09-04T11:30">4 Sep 2026, 11:30 AM, 6 places</option><option value="2026-09-05T09:00">5 Sep 2026, 9:00 AM, accessible assistance</option></select></Field><Notice><strong>{en ? "RTO-TEST-01, arrive 30 minutes early" : "RTO-TEST-01, 30 मिनट पहले पहुंचें"}</strong><p>{en ? "Bring the synthetic appointment receipt and original demo LL fixture. Rescheduling preserves the application reference." : "नकली अपॉइंटमेंट रसीद और मूल डेमो LL उदाहरण लाएं। तारीख बदलने पर आवेदन संदर्भ वही रहेगा।"}</p></Notice></> : null}{state.scenario !== "no_slots" ? <button className="primary-button" onClick={onContinue} type="button">{en ? "Book and open status" : "बुक करें और स्थिति खोलें"}<ArrowRight size={18} /></button> : null}</> : null}{error ? <p className="form-error" role="alert">{error}</p> : null}</section>;
}

function TrackingStage({ state, reset, onAdvance, onComplete }: { state: JourneyState; reset: () => void; onAdvance: () => void; onComplete: () => void }) {
  const en = usesEnglishFallback(state.language);
  const events = buildOutcomeEvents(state.selectedServices, state.language, state.scenario);
  const complete = state.outcomeIndex >= events.length - 1;
  const visibleIndex = Math.min(state.outcomeIndex, events.length - 1);
  const citizenActionScenario = ["test_failed", "correction_required", "dispatch_failed"].includes(state.scenario);
  return <section className="stage-section"><StageHeader icon={citizenActionScenario ? Warning : CheckCircle} language={state.language} title={citizenActionScenario ? (en ? "The case needs attention — it is not lost" : "केस पर ध्यान चाहिए — यह खोया नहीं") : complete ? (en ? "The LL-to-DL request is complete" : "LL से DL अनुरोध पूरा हुआ") : (en ? "Status with an owner and next action" : "जिम्मेदार और अगले काम के साथ स्थिति")} intro={en ? "In production, provider updates arrive automatically or through authorised staff. The controls below only play that synthetic timeline." : "असल सेवा में अपडेट अपने आप या अधिकृत कर्मचारी से आते हैं। नीचे के कंट्रोल केवल नकली टाइमलाइन चलाते हैं।"} /><div className="next-action"><span>{en ? "Next action" : "अगला काम"}</span><strong>{events[visibleIndex + 1]?.label ?? (citizenActionScenario ? events[visibleIndex]?.label : (en ? "No action needed" : "कोई काम बाकी नहीं"))}</strong><small>{`${en ? "Owner" : "जिम्मेदार"}: ${events[visibleIndex + 1]?.owner ?? events[visibleIndex]?.owner}`}</small></div><ol className="timeline">{events.map((event, index) => <li className={index <= visibleIndex ? "reached" : "future"} key={`${event.label}-${index}`}><span className="timeline-marker">{index <= visibleIndex ? <Check size={15} weight="bold" /> : index + 1}</span><div><strong>{event.label}</strong><p>{event.owner} <span>·</span> {event.time}</p></div>{index <= visibleIndex ? <MockBadge language={state.language} /> : null}</li>)}</ol>{!complete ? <div className="timeline-actions" aria-label={en ? "Synthetic timeline controls" : "नकली टाइमलाइन कंट्रोल"}><div><strong>{en ? "Demo timeline" : "डेमो टाइमलाइन"}</strong><p>{en ? "These actions only reveal synthetic provider events; a citizen would never approve their own outcome." : "ये कार्रवाई केवल नकली सेवा इवेंट दिखाती हैं; नागरिक अपना परिणाम खुद मंजूर नहीं करेगा।"}</p></div><button className="secondary-button" onClick={onAdvance} type="button">{en ? "Show next update" : "अगला अपडेट दिखाएं"}</button><button className="primary-button" onClick={onComplete} type="button">{en ? "Play remaining demo updates" : "बाकी डेमो अपडेट चलाएं"}</button></div> : null}{complete && !citizenActionScenario ? <div className="completion-box"><CheckCircle size={44} weight="fill" /><h2>{en ? "Journey complete" : "यात्रा पूरी"}</h2><p>{en ? "The focused demo reached a clear outcome without hiding payment, submission or status recovery." : "केंद्रित डेमो ने भुगतान, आवेदन या स्थिति समाधान छिपाए बिना साफ परिणाम दिखाया।"}</p><button className="secondary-button" onClick={reset} type="button">{en ? "Start a fresh demo" : "नया डेमो शुरू करें"}</button></div> : null}</section>;
}
