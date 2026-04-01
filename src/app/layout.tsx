import type { Metadata } from "next";
import "./globals.css";
import { Header } from "@/components/Header";
import { ThemeProvider } from "@/components/ThemeProvider";

export const metadata: Metadata = {
  title: "Kayla's Garden",
  description: "Track your plants, upload progress photos, and learn about gardening 🌱",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      data-theme="green"
      className="h-full antialiased"
    >
      <body className="min-h-full flex flex-col bg-bg-page text-text-primary">
        <ThemeProvider>
          <Header />
          <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6">
            {children}
          </main>
          <footer className="border-t border-border py-4 text-center text-sm text-text-secondary">
            🌱 Kayla&apos;s Garden &mdash; Happy Growing!
          </footer>
        </ThemeProvider>
      </body>
    </html>
  );
}
