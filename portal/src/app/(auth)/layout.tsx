import "../globals.css";
import { Providers } from "@/components/layout/providers";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <div className="copper-stripe" />
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
