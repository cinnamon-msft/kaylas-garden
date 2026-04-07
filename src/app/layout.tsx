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
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-primary focus:px-4 focus:py-2 focus:text-text-on-primary focus:outline-none"
        >
          Skip to main content
        </a>
        <ThemeProvider>
          <Header />
          <main id="main-content" className="mx-auto w-full max-w-6xl flex-1 px-4 py-6">
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
