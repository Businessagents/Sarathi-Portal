import type { Metadata } from "next";
import { AboutContent } from "@/components/about-content";

export const metadata: Metadata = {
  title: "LicencePath के बारे में | नागरिक-केंद्रित लाइसेंस प्रोटोटाइप",
  description:
    "जानें कि LicencePath क्या दिखाता है, क्या नकली है और अधिकृत असली ड्राइविंग लाइसेंस सेवा के लिए क्या जरूरी होगा।",
};

export default function HindiAboutPage() {
  return <AboutContent language="hi" />;
}
