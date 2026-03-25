import "../globals.css";
import { Providers } from "@/components/layout/providers";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body style={{ margin: 0, padding: 0 }}>
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            height: "3px",
            background: "#6B3620",
            zIndex: 100,
          }}
        />
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
