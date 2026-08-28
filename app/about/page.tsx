import type { Metadata } from "next";
import { AboutContent } from "@/components/about-content";

export const metadata: Metadata = {
  title: "About LicencePath | Citizen-first driving licence prototype",
  description:
    "Learn what LicencePath demonstrates, what is simulated and what an authorised production driving licence service would require.",
};

export default function AboutPage() {
  return <AboutContent language="en" />;
}
