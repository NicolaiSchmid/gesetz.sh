import "@/styles/globals.css";

import { type Metadata } from "next";
import { Geist } from "next/font/google";

import { TRPCReactProvider } from "@/trpc/react";
import Link from "next/link";

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
            <div className="relative z-50 bg-white shadow">
              <div className="mx-auto max-w-7xl px-4 sm:px-6">
                <div className="flex items-center justify-between py-3 md:justify-start md:space-x-10">
                  <div className="flex w-0 flex-1">
                    <Link
                      href="/"
                      className="text-xl font-bold tracking-tight text-gray-900"
                    >
                      Gesetze 2.0
                    </Link>
                  </div>
                </div>
              </div>
            </div>
            <div>{children}</div>
          </div>
        </TRPCReactProvider>
      </body>
    </html>
  );
}
