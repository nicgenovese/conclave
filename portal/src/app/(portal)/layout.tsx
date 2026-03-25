import "../globals.css";
import { Providers } from "@/components/layout/providers";
import { Sidebar } from "@/components/layout/sidebar";
import { MobileHeader } from "@/components/layout/mobile-header";

export default function PortalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <div className="copper-stripe" />
        <Providers>
          <div className="flex min-h-screen pt-[3px]">
            <Sidebar />
            <div className="flex-1 md:ml-60 flex flex-col min-h-screen">
              <MobileHeader />
              <main className="flex-1 overflow-y-auto px-5 sm:px-8 md:px-[72px] py-8 md:py-12">
                <div className="mx-auto max-w-6xl">{children}</div>
              </main>
            </div>
          </div>
        </Providers>
      </body>
    </html>
  );
}
