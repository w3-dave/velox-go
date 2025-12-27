"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";

interface NavLink {
  href: string;
  label: string;
}

interface MobileNavProps {
  email: string;
  links: NavLink[];
}

export function MobileNav({ email, links }: MobileNavProps) {
  const [isOpen, setIsOpen] = useState(false);
  const pathname = usePathname();

  return (
    <div className="md:hidden">
      {/* Hamburger button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="p-2 text-muted hover:text-foreground transition-colors"
        aria-label="Toggle menu"
      >
        {isOpen ? (
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        ) : (
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        )}
      </button>

      {/* Mobile menu overlay */}
      {isOpen && (
        <>
          <div
            className="fixed inset-0 bg-black/50 z-40"
            onClick={() => setIsOpen(false)}
          />
          <div className="fixed top-14 left-0 right-0 bg-background border-b border-border z-50 shadow-lg">
            <nav className="flex flex-col p-4 space-y-1">
              {links.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setIsOpen(false)}
                  className={`px-4 py-3 rounded-lg text-sm transition-colors ${
                    pathname === link.href
                      ? "bg-accent/10 text-accent font-medium"
                      : "text-foreground hover:bg-card"
                  }`}
                >
                  {link.label}
                </Link>
              ))}

              <div className="border-t border-border mt-2 pt-3">
                <div className="px-4 py-2 text-sm text-muted truncate">
                  {email}
                </div>
                <button
                  onClick={() => signOut({ callbackUrl: "/login" })}
                  className="w-full px-4 py-3 rounded-lg text-sm text-left text-error hover:bg-error/10 transition-colors"
                >
                  Sign out
                </button>
              </div>
            </nav>
          </div>
        </>
      )}
    </div>
  );
}
