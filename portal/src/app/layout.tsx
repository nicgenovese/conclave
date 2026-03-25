import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "@/components/layout/providers";
import { Sidebar } from "@/components/layout/sidebar";
import { MobileHeader } from "@/components/layout/mobile-header";

export const metadata: Metadata = {
  title: "Conclave | Moria Capital",
  description: "DeFi-native value investing portal",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">
        <Providers>
          <div className="flex min-h-screen">
            <Sidebar />
            <div className="flex-1 md:ml-60 flex flex-col min-h-screen">
              <MobileHeader />
              <main className="flex-1 overflow-y-auto p-5 sm:p-8 md:p-10">
                <div className="mx-auto max-w-6xl">{children}</div>
              </main>
            </div>
          </div>
        </Providers>
      </body>
    </html>
  );
}
