"use client";

import { ArrowRight, LogOut, Menu, MessageSquare, Sparkles, UserCircle, X } from "lucide-react";
import { publicNavItems } from "@/lib/public/public-copy";
import { useEffect, useState } from "react";
import type { AppUser } from "@/lib/auth/app-user";

export function PublicNavbar({
  authLoaded,
  onExplore,
  onLogin,
  onStart,
  onSignOut,
  user,
}: {
  authLoaded: boolean;
  onExplore: () => void;
  onLogin: () => void;
  onStart: () => void;
  onSignOut: () => void;
  user: AppUser | null;
}) {
  const [scrolled, setScrolled] = useState(false);
  const [scrollProgress, setScrollProgress] = useState(0);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);

  useEffect(() => {
    function onScroll() {
      const y = window.scrollY;
      setScrolled(y > 48);
      const max =
        document.documentElement.scrollHeight - window.innerHeight;
      setScrollProgress(max > 0 ? (y / max) * 100 : 0);
    }
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  /* Close mobile menu on resize to lg */
  useEffect(() => {
    function onResize() {
      if (window.innerWidth >= 1024) setMobileOpen(false);
    }
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  function handleNavItem(item: string) {
    if (item === "Explore") onExplore();
    setMobileOpen(false);
  }

  function getUserInitial() {
    const source = user?.name ?? user?.email ?? "Rune";
    return source.trim().charAt(0).toUpperCase();
  }

  const displayName = user?.name ?? user?.email ?? "Rune user";

  return (
    <>
      {/* ── Scroll progress bar ───────────────────────────────────── */}
      <div
        aria-hidden="true"
        className="fixed left-0 top-0 z-50 h-[2px] origin-left bg-brand-500 transition-transform duration-100"
        style={{ transform: `scaleX(${scrollProgress / 100})`, width: "100%" }}
      />

      {/* ── Header ────────────────────────────────────────────────── */}
      <header
        className={[
          "sticky top-0 z-30 w-full transition-all duration-500 ease-out",
          scrolled
            ? "border-b border-white/[0.07] bg-[#0d0d0d]/86 shadow-[0_1px_0_rgba(255,255,255,0.04)] backdrop-blur-2xl"
            : "bg-transparent",
        ].join(" ")}
      >
        <div className="mx-auto flex h-[76px] max-w-[1560px] items-center justify-between px-5 sm:px-8 lg:px-10">
          {/* Logo */}
          <div className="flex shrink-0 items-center gap-3">
            <div className="relative flex h-8 w-8 items-center justify-center">
              <div className="absolute inset-0 rounded-lg bg-brand-500/20 blur-[8px]" />
              <div className="relative flex h-8 w-8 items-center justify-center rounded-lg border border-white/10 bg-[#171717] text-brand-300">
                <Sparkles className="h-3.5 w-3.5" />
              </div>
            </div>
            <span className="font-display text-[15px] font-bold uppercase tracking-[0.1em] text-white">
              Rune
            </span>
          </div>

          {/* Center nav – desktop */}
          <nav className="hidden items-center gap-10 lg:flex" aria-label="Site navigation">
            {publicNavItems.map((item) => (
              <button
                key={item}
                className="group relative text-[11px] font-semibold uppercase tracking-[0.14em] text-zinc-500 transition-colors duration-200 hover:text-white"
                onClick={() => handleNavItem(item)}
                type="button"
              >
                {item}
                <span className="absolute -bottom-0.5 left-0 h-px w-0 bg-brand-400/80 transition-all duration-300 group-hover:w-full" />
              </button>
            ))}
          </nav>

          {/* Right – desktop */}
          <div className="hidden items-center gap-4 lg:flex">
            {!authLoaded ? (
              <div className="h-10 w-28 rounded-full bg-white/[0.05]" aria-hidden="true" />
            ) : user ? (
              <>
                <button
                  className="group relative inline-flex h-10 items-center gap-2 overflow-hidden rounded-full bg-white px-5 text-[11px] font-bold uppercase tracking-[0.08em] text-black transition-all duration-300 hover:bg-zinc-200"
                  onClick={onStart}
                  type="button"
                >
                  Open chat
                  <ArrowRight className="h-3.5 w-3.5 transition-transform duration-300 group-hover:translate-x-0.5" />
                </button>
                <div className="relative">
                  <button
                    className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-full border border-white/10 bg-[#303030] text-sm font-semibold text-white transition hover:bg-[#3a3a3a]"
                    onClick={() => setAccountOpen((open) => !open)}
                    title={displayName}
                    type="button"
                  >
                    {user.avatarUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img alt="" className="h-full w-full object-cover" src={user.avatarUrl} />
                    ) : (
                      getUserInitial()
                    )}
                  </button>

                  {accountOpen ? (
                    <div className="absolute right-0 top-12 w-64 rounded-2xl border border-white/[0.09] bg-[#202020] p-2 shadow-2xl">
                      <div className="mb-1 px-3 py-2">
                        <p className="truncate text-sm font-medium text-white">{displayName}</p>
                        <p className="truncate text-xs text-zinc-500">{user.email ?? "Signed in"}</p>
                      </div>
                      <button
                        className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-zinc-200 transition hover:bg-white/[0.07]"
                        onClick={() => {
                          setAccountOpen(false);
                          onStart();
                        }}
                        type="button"
                      >
                        <MessageSquare className="h-4 w-4" />
                        Chat
                      </button>
                      <button className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-zinc-200 transition hover:bg-white/[0.07]">
                        <UserCircle className="h-4 w-4" />
                        Account
                      </button>
                      <button
                        className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-zinc-200 transition hover:bg-white/[0.07]"
                        onClick={() => {
                          setAccountOpen(false);
                          onSignOut();
                        }}
                        type="button"
                      >
                        <LogOut className="h-4 w-4" />
                        Sign out
                      </button>
                    </div>
                  ) : null}
                </div>
              </>
            ) : (
              <>
                <button
                  className="text-[11px] font-semibold uppercase tracking-[0.14em] text-zinc-400 transition-colors duration-200 hover:text-white"
                  onClick={onLogin}
                  type="button"
                >
                  Sign in
                </button>
                <button
                  className="group relative inline-flex h-10 items-center gap-2 overflow-hidden rounded-full bg-white px-6 text-[11px] font-bold uppercase tracking-[0.08em] text-black transition-all duration-300 hover:bg-zinc-200"
                  onClick={onStart}
                  type="button"
                >
                  Start now
                  <ArrowRight className="h-3.5 w-3.5 transition-transform duration-300 group-hover:translate-x-0.5" />
                </button>
              </>
            )}
          </div>

          {/* Mobile menu toggle */}
          <button
            aria-label={mobileOpen ? "Close menu" : "Open menu"}
            className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/[0.07] bg-white/[0.03] text-zinc-300 transition-all duration-200 hover:border-white/[0.12] hover:bg-white/[0.06] hover:text-white lg:hidden"
            onClick={() => setMobileOpen((v) => !v)}
            type="button"
          >
            {mobileOpen ? (
              <X className="h-5 w-5" />
            ) : (
              <Menu className="h-5 w-5" />
            )}
          </button>
        </div>

        {/* ── Mobile menu ──────────────────────────────────────────── */}
        <div
          className={[
            "overflow-hidden border-t border-white/[0.06] bg-[#0d0d0d]/96 backdrop-blur-2xl transition-all duration-400 ease-out lg:hidden",
            mobileOpen ? "max-h-[500px] opacity-100" : "max-h-0 opacity-0",
          ].join(" ")}
          aria-hidden={!mobileOpen}
        >
          <div className="mx-auto max-w-[1560px] space-y-1 px-5 py-6">
            {publicNavItems.map((item) => (
              <button
                key={item}
                className="flex w-full items-center justify-between rounded-xl px-4 py-3.5 text-sm font-medium text-zinc-300 transition-colors duration-150 hover:bg-white/[0.04] hover:text-white"
                onClick={() => handleNavItem(item)}
                type="button"
              >
                {item}
              </button>
            ))}
            <div className="mt-4 space-y-3 border-t border-white/[0.06] pt-4">
              {!authLoaded ? (
                <div className="h-11 rounded-xl bg-white/[0.04]" aria-hidden="true" />
              ) : user ? (
                <>
                  <div className="flex items-center gap-3 rounded-xl border border-white/[0.08] bg-white/[0.03] px-4 py-3">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full bg-[#303030] text-sm font-semibold text-white">
                      {user.avatarUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img alt="" className="h-full w-full object-cover" src={user.avatarUrl} />
                      ) : (
                        getUserInitial()
                      )}
                    </div>
                    <div className="min-w-0 text-left">
                      <p className="truncate text-sm font-medium text-white">{displayName}</p>
                      <p className="truncate text-xs text-zinc-500">{user.email ?? "Signed in"}</p>
                    </div>
                  </div>
                  <button
                    className="w-full rounded-xl bg-white px-4 py-3 text-sm font-bold text-black transition-colors duration-150 hover:bg-zinc-200"
                    onClick={() => {
                      onStart();
                      setMobileOpen(false);
                    }}
                    type="button"
                  >
                    Open chat
                  </button>
                  <button
                    className="w-full rounded-xl border border-white/[0.08] bg-white/[0.02] px-4 py-3 text-sm font-medium text-zinc-300 transition-colors duration-150 hover:bg-white/[0.05] hover:text-white"
                    onClick={() => {
                      onSignOut();
                      setMobileOpen(false);
                    }}
                    type="button"
                  >
                    Sign out
                  </button>
                </>
              ) : (
                <>
                  <button
                    className="w-full rounded-xl border border-white/[0.08] bg-white/[0.02] px-4 py-3 text-sm font-medium text-zinc-300 transition-colors duration-150 hover:bg-white/[0.05] hover:text-white"
                    onClick={() => {
                      onLogin();
                      setMobileOpen(false);
                    }}
                    type="button"
                  >
                    Sign in
                  </button>
                  <button
                    className="w-full rounded-xl bg-white px-4 py-3 text-sm font-bold text-black transition-colors duration-150 hover:bg-zinc-200"
                    onClick={() => {
                      onStart();
                      setMobileOpen(false);
                    }}
                    type="button"
                  >
                    Start now
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </header>
    </>
  );
}
