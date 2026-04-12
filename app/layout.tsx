import type { Metadata } from "next";
import "./globals.css";
import { ClerkProvider } from "@clerk/nextjs";
import FeedbackWidget from "@/app/components/FeedbackWidget";

export const metadata: Metadata = {
  title: "Formulens",
  description: "Clinical herb-drug interaction checker for licensed TCM and acupuncture practitioners. NCCAOM standard. Evidence-based.",
  keywords: [
    "TCM", "herb drug interactions", "acupuncture",
    "NCCAOM", "traditional chinese medicine",
    "clinical decision support"
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">
        <ClerkProvider>
          {children}
          <FeedbackWidget />
        </ClerkProvider>
      </body>
    </html>
  );
}
