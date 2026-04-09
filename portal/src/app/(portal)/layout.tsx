import { Sidebar } from "@/components/layout/sidebar";
import { MobileHeader } from "@/components/layout/mobile-header";

export default function PortalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <div className="copper-stripe" />
      <div className="flex min-h-screen pt-[3px] bg-[#FAFAF8]">
        <Sidebar />
        <div className="flex-1 md:ml-60 flex flex-col min-h-screen">
          <MobileHeader />
          <main className="flex-1 overflow-y-auto px-4 sm:px-6 md:px-10 lg:px-[72px] py-5 sm:py-8 md:py-12">
            <div className="mx-auto max-w-6xl">{children}</div>
          </main>
        </div>
      </div>
    </>
  );
}
