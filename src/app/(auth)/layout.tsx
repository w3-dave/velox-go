import Link from "next/link";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="p-6">
        <Link href="/" className="text-xl font-bold tracking-tight">
          Velox<span className="text-accent">Labs</span>
        </Link>
      </header>

      {/* Main content */}
      <main className="flex-1 flex items-center justify-center px-4 pb-20">
        {children}
      </main>

      {/* Footer */}
      <footer className="p-6 text-center text-sm text-muted">
        &copy; {new Date().getFullYear()} Velox Labs. All rights reserved.
      </footer>
    </div>
  );
}
