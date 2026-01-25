import "@/styles/globals.css";

import { type Metadata } from "next";
import { Geist } from "next/font/google";

import { TRPCReactProvider } from "@/trpc/react";
import { Header } from "./_components/Header";

export const metadata: Metadata = {
  title: "Gesetze im Internet 2.0",
  description: "Gesetze im Internet 2.0 - Nur angenehmer!",
  // icons: [{ rel: "icon", url: "/favicon.ico" }],
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
