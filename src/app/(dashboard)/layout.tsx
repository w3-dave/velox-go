import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { MobileNav } from "@/components/dashboard/mobile-nav";
import Link from "next/link";

const navLinks = [
  { href: "/dashboard", label: "Apps" },
  { href: "/org", label: "Organization" },
  { href: "/billing", label: "Billing" },
  { href: "/account", label: "Account" },
];

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="border-b border-border bg-card/50 sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-14 sm:h-16">
            <Link href="/dashboard" className="text-xl font-bold tracking-tight">
              Velox<span className="text-accent">Labs</span>
            </Link>

            {/* Desktop nav */}
            <nav className="hidden md:flex items-center gap-6">
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="text-sm text-muted hover:text-foreground transition-colors"
                >
                  {link.label}
                </Link>
              ))}
            </nav>

            {/* Desktop user menu */}
            <div className="hidden md:flex items-center gap-4">
              <span className="text-sm text-muted truncate max-w-[180px]">
                {session.user.email}
              </span>
              <form action="/api/auth/signout" method="POST">
                <button
                  type="submit"
                  className="text-sm text-muted hover:text-foreground transition-colors"
                >
                  Sign out
                </button>
              </form>
            </div>

            {/* Mobile nav */}
            <MobileNav email={session.user.email || ""} links={navLinks} />
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1 py-6 sm:py-8">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">{children}</div>
      </main>
    </div>
  );
}
