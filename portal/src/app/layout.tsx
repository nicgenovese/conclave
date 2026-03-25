import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Conclave | Moria Capital",
  description: "DeFi-native value investing portal",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return children;
}
