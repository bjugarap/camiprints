import Link from "next/link";

/**
 * Site footer (handoff §Home): white, 1px top border, 8 links at 14.5/500
 * and a right-aligned © line.
 */
const FOOTER_LINKS = [
  { href: "/about", label: "About" },
  { href: "/how-it-works", label: "How It Works" },
  { href: "/accessibility", label: "Accessibility" },
  { href: "/parent-guidance", label: "Parent guidance" },
  { href: "/privacy", label: "Privacy" },
  { href: "/terms", label: "Terms" },
  { href: "/copyright", label: "Copyright" },
  { href: "/contact", label: "Contact" },
] as const;

export function Footer() {
  return (
    <footer className="mt-auto border-t border-line bg-card">
      <nav
        aria-label="Footer"
        className="flex flex-wrap items-center gap-x-6.5 gap-y-2 px-4 py-5.5 md:px-10"
      >
        {FOOTER_LINKS.map(({ href, label }) => (
          <Link
            key={href}
            href={href}
            className="flex min-h-11 items-center text-[14.5px] font-medium text-ink-60 hover:text-accent"
          >
            {label}
          </Link>
        ))}
        {/* ink-25 in the mock fails WCAG AA on white (2.77:1); AA wins. */}
        <span className="ml-auto flex min-h-11 items-center text-[14.5px] font-medium text-ink-60">
          © {new Date().getFullYear()} CamiPrints
        </span>
      </nav>
    </footer>
  );
}
