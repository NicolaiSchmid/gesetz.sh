import "@/styles/globals.css";

import { type Metadata } from "next";
import { Geist } from "next/font/google";

import { TRPCReactProvider } from "@/trpc/react";
import { Header } from "./_components/Header";

export const metadata: Metadata = {
  title: {
    default: "Gesetz.sh - Deutsche Gesetze schnell durchsuchen",
    template: "%s | Gesetz.sh",
  },
  description:
    "Alle deutschen Gesetze und Verordnungen schnell durchsuchbar. BGB, StGB, HGB und über 6.800 weitere Gesetze mit Keyboard-Navigation.",
  keywords: [
    "deutsche Gesetze",
    "BGB",
    "StGB",
    "HGB",
    "Grundgesetz",
    "Gesetze online",
    "Rechtsnormen",
    "Verordnungen",
  ],
  authors: [{ name: "Nicolai Schmid" }],
  openGraph: {
    type: "website",
    locale: "de_DE",
    url: "https://gesetz.sh",
    siteName: "Gesetz.sh",
    title: "Gesetz.sh - Deutsche Gesetze schnell durchsuchen",
    description:
      "Alle deutschen Gesetze und Verordnungen schnell durchsuchbar. BGB, StGB, HGB und über 6.800 weitere Gesetze.",
  },
  twitter: {
    card: "summary_large_image",
    title: "Gesetz.sh - Deutsche Gesetze schnell durchsuchen",
    description:
      "Alle deutschen Gesetze und Verordnungen schnell durchsuchbar.",
  },
  robots: {
    index: true,
    follow: true,
  },
};

const geist = Geist({
  subsets: ["latin"],
  variable: "--font-geist-sans",
});

const Flag = () => {
  /* Germany strip */
  return (
    <div className="sticky top-0 flex h-2 w-full justify-evenly">
      <div className="h-full w-full bg-black" />
      <div className="h-full w-full bg-red-600" />
      <div className="h-full w-full bg-yellow-400" />
    </div>
  );
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="de" className={`${geist.variable}`}>
      <body>
        <TRPCReactProvider>
          <div className="min-h-screen min-w-screen">
            <Flag />
            <Header />
            <div>{children}</div>
          </div>
        </TRPCReactProvider>
      </body>
    </html>
  );
}
