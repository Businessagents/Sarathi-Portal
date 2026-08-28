import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "LicencePath | Citizen-first driving licence prototype",
  description:
    "An independent, unofficial prototype for a clearer Learner's Licence to Driving Licence journey in India.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f5f7f2" },
    { media: "(prefers-color-scheme: dark)", color: "#131714" },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
