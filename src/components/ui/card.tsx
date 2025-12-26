import { cn } from "@/lib/utils";
import Link from "next/link";

interface CardProps {
  href?: string;
  className?: string;
  children: React.ReactNode;
}

export function Card({ href, className, children }: CardProps) {
  const cardClasses = cn(
    "rounded-xl border border-border bg-card p-6 transition-all duration-300",
    href && "group hover:border-muted-foreground/30 hover:bg-card-hover cursor-pointer",
    className
  );

  if (href) {
    return (
      <Link href={href} className={cardClasses}>
        {children}
      </Link>
    );
  }

  return <div className={cardClasses}>{children}</div>;
}
