"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

import { useCalmMode } from "@/features/calm-mode/use-calm-mode";
import { cn } from "@/lib/utils";
import { Toggle } from "@/shared/toggle";

/**
 * Site header (handoff §Header): white, 1px bottom border, brand block, the
 * same four nav links on every public route (active = teal with a 2.5px teal
 * underline), a 44px pill search field on paper, and the Calm Mode pill.
 * Calm Mode removes the search field. Mobile collapses to brand + 44px
 * search and menu buttons.
 */
const NAV_LINKS = [
  { href: "/coloring-pages", label: "Browse" },
  { href: "/categories", label: "Categories" },
  { href: "/create", label: "Create Your Own" },
  { href: "/how-it-works", label: "How It Works" },
] as const;

export function Brand({ boxClassName, textClassName }: { boxClassName?: string; textClassName?: string }) {
  return (
    <Link href="/" className="flex shrink-0 items-center gap-2.5 rounded-md">
      <span
        aria-hidden
        className={cn(
          "flex size-[34px] items-center justify-center rounded-[11px] bg-accent font-display text-[17px] font-extrabold text-white",
          boxClassName,
        )}
      >
        C
      </span>
      <span className={cn("text-wordmark text-ink", textClassName)}>
        CamiPrints
      </span>
    </Link>
  );
}

export function Header() {
  const pathname = usePathname();
  const { calm, setCalm } = useCalmMode();
  const [menuOpen, setMenuOpen] = useState(false);

  const isActive = (href: string) =>
    pathname === href || pathname.startsWith(`${href}/`);

  return (
    <header className="border-b border-line bg-card">
      <div className="flex items-center gap-7 px-4 py-3.5 md:px-10">
        <Brand />

        {/* Desktop nav — the same four links, always. */}
        <nav
          aria-label="Main"
          className="hidden items-center gap-[22px] md:flex"
        >
          {NAV_LINKS.map(({ href, label }) => (
            <Link
              key={href}
              href={href}
              aria-current={isActive(href) ? "page" : undefined}
              className={cn(
                "border-b-[2.5px] pb-0.5 text-base font-semibold",
                isActive(href)
                  ? "border-accent text-accent"
                  : "border-transparent text-ink hover:text-accent",
              )}
            >
              {label}
            </Link>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-3">
          {/* Desktop search — a pill on paper; removed in Calm Mode. */}
          <form
            action="/search"
            role="search"
            className="hidden not-calm:md:flex"
          >
            <div className="flex h-11 w-[220px] items-center gap-2 rounded-full border-[1.5px] border-line bg-paper px-4 focus-within:border-accent">
              <span aria-hidden className="text-sm text-ink-25">
                ⌕
              </span>
              <input
                type="search"
                name="q"
                aria-label="Search pages"
                placeholder="Search pages"
                className="w-full bg-transparent text-[15px] text-ink outline-none placeholder:text-ink-25"
              />
            </div>
          </form>

          {/* Mobile search button. */}
          <Link
            href="/search"
            aria-label="Search pages"
            className="flex size-11 items-center justify-center rounded-full border-[1.5px] border-line bg-card text-ink-60 md:hidden"
          >
            <span aria-hidden>⌕</span>
          </Link>

          {/* Calm Mode pill. */}
          <div
            className={cn(
              "hidden h-11 items-center gap-2 rounded-full border-[1.5px] px-3.5 min-[480px]:flex",
              calm
                ? "border-accent-tint-line bg-accent-tint text-accent"
                : "border-line bg-card text-ink",
            )}
          >
            <span className="text-[14.5px] font-semibold">
              {calm ? "Calm Mode on" : "Calm Mode"}
            </span>
            <Toggle
              size="sm"
              checked={calm}
              onCheckedChange={setCalm}
              label="Calm Mode"
            />
          </div>

          {/* Mobile menu button. */}
          <button
            type="button"
            aria-label="Menu"
            aria-expanded={menuOpen}
            aria-controls="mobile-menu"
            onClick={() => setMenuOpen((open) => !open)}
            className="flex size-11 cursor-pointer items-center justify-center rounded-full border-[1.5px] border-line bg-card text-ink-60 md:hidden"
          >
            <span aria-hidden>☰</span>
          </button>
        </div>
      </div>

      {/* Mobile menu: a plain list below the header bar. Nothing floats. */}
      {menuOpen ? (
        <nav
          id="mobile-menu"
          aria-label="Main"
          className="border-t border-line md:hidden"
        >
          <ul className="flex flex-col px-4 py-2">
            {NAV_LINKS.map(({ href, label }) => (
              <li key={href}>
                <Link
                  href={href}
                  aria-current={isActive(href) ? "page" : undefined}
                  onClick={() => setMenuOpen(false)}
                  className={cn(
                    "flex min-h-11 items-center text-base font-semibold",
                    isActive(href) ? "text-accent" : "text-ink",
                  )}
                >
                  {label}
                </Link>
              </li>
            ))}
            <li className="flex min-h-11 items-center justify-between min-[480px]:hidden">
              <span className="text-base font-semibold text-ink">
                Calm Mode
              </span>
              <Toggle
                size="sm"
                checked={calm}
                onCheckedChange={setCalm}
                label="Calm Mode"
              />
            </li>
          </ul>
        </nav>
      ) : null}
    </header>
  );
}
