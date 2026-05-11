"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import { ThemeSwitcher } from "./ThemeSwitcher";
import { useState } from "react";

const navLinks = [
  { href: "/", label: "My Garden" },
  { href: "/feed", label: "Feed" },
  { href: "/library", label: "Plant Library" },
  { href: "/calendar", label: "Planting Calendar" },
  { href: "/settings", label: "Settings" },
];

export function Header() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <header className="bg-bg-header shadow-md">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-x-3 gap-y-2 px-3 py-3 sm:px-4">
        <Link href="/" aria-label="The Seed Feed – Home" className="flex items-center gap-2">
          <span aria-hidden="true" className="text-2xl">🌱</span>
          <span className="text-lg font-bold text-text-on-primary sm:text-xl">
            The Seed Feed
          </span>
        </Link>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2 sm:gap-4">
          <nav aria-label="Main navigation" className="flex flex-wrap items-center gap-x-3 gap-y-1 sm:gap-4">
            {navLinks.map(({ href, label }) => {
              const isActive = pathname === href;
              return (
                <Link
                  key={href}
                  href={href}
                  aria-current={isActive ? "page" : undefined}
                  className={`text-sm transition-colors rounded-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white ${
                    isActive
                      ? "font-semibold text-text-on-primary underline underline-offset-4"
                      : "font-medium text-text-on-primary/90 hover:text-text-on-primary hover:underline hover:underline-offset-4"
                  }`}
                >
                  {label}
                </Link>
              );
            })}
          </nav>
          <div
            className="border-l border-white/20 pl-3 sm:ml-2"
            role="group"
            aria-label="Theme selection"
          >
            <ThemeSwitcher />
          </div>

          {/* User menu */}
          {session?.user && (
            <div className="relative border-l border-white/20 pl-3">
              <button
                onClick={() => setMenuOpen(!menuOpen)}
                className="flex items-center gap-2 rounded-full focus-visible:outline focus-visible:outline-2 focus-visible:outline-white"
                aria-label="User menu"
              >
                {session.user.image ? (
                  <Image
                    src={session.user.image}
                    alt=""
                    width={32}
                    height={32}
                    className="rounded-full"
                  />
                ) : (
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white/20 text-sm font-bold text-text-on-primary">
                    {session.user.name?.[0]?.toUpperCase() || "?"}
                  </div>
                )}
              </button>
              {menuOpen && (
                <div className="absolute right-0 top-full z-50 mt-2 w-48 rounded-lg border border-border bg-bg-card py-1 shadow-lg">
                  <div className="border-b border-border px-4 py-2">
                    <p className="text-sm font-medium text-text-primary truncate">
                      {session.user.name}
                    </p>
                  </div>
                  <Link
                    href={`/users/${session.user.id}`}
                    className="block px-4 py-2 text-sm text-text-primary hover:bg-hover"
                    onClick={() => setMenuOpen(false)}
                  >
                    My Profile
                  </Link>
                  <button
                    onClick={() => signOut()}
                    className="block w-full px-4 py-2 text-left text-sm text-text-primary hover:bg-hover"
                  >
                    Sign Out
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
