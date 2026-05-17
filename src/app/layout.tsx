import type { Metadata } from "next";
import { Rubik } from "next/font/google";
import { AuthProvider } from "@/components/AuthProvider";
import "./globals.css";

const rubik = Rubik({
  subsets: ["hebrew", "latin"],
  weight: ["400", "500", "700", "900"],
  variable: "--font-rubik",
});

export const metadata: Metadata = {
  title: "לשרוד את היום",
  description: "המשחק היומי של ישראל",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="he" dir="rtl" className={rubik.variable}>
      <body className="font-rubik bg-white text-ink min-h-screen">
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
