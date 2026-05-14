"use client";

import { useEffect, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { AuthModal, type AuthMode } from "@/components/auth/auth-modal";
import { HeroShowcase } from "@/components/public/hero-showcase";
import { PublicNavbar } from "@/components/public/public-navbar";
import {
  EditorialProofBar,
  ManifestoSection,
  TransformationSection,
  ModulesIndexSection,
  UseCaseSpreadsSection,
  ProcessSection,
  ToolEcosystemSection,
  FinalCtaSection
} from "@/components/public/landing-sections";
import { getReadableAuthError } from "@/lib/auth/auth-error-copy";
import { getAppUser, type AppUser } from "@/lib/auth/app-user";
import { createClient } from "@/lib/supabase/client";

function getRequestedAuthMode(value: string | null): AuthMode {
  return value === "login" ? "login" : "signup";
}

function shouldAutoOpenAuth(value: string | null) {
  return value === "signup" || value === "login" || value === "otp";
}

export default function LandingPage() {
  const [authMode, setAuthMode] = useState<AuthMode>("signup");
  const [authOpen, setAuthOpen] = useState(false);
  const [initialError, setInitialError] = useState<string | null>(null);
  const [user, setUser] = useState<AppUser | null>(null);
  const [authLoaded, setAuthLoaded] = useState(false);

  function updateUser(nextUser: User | null) {
    setUser(nextUser ? getAppUser(nextUser) : null);
  }

  useEffect(() => {
    const supabase = createClient();
    const params = new URLSearchParams(window.location.search);
    const authParam = params.get("auth");
    const incomingError = getReadableAuthError(params.get("error"));
    const requestedMode = getRequestedAuthMode(authParam);
    const shouldOpen = Boolean(incomingError) || shouldAutoOpenAuth(authParam);

    let mounted = true;

    async function loadUser() {
      const {
        data: { user: activeUser }
      } = await supabase.auth.getUser();

      if (!mounted) return;

      updateUser(activeUser);
      setAuthLoaded(true);

      if (activeUser && shouldOpen && !incomingError) {
        window.history.replaceState(null, "", window.location.pathname);
        setAuthOpen(false);
        return;
      }

      setAuthMode(incomingError ? "login" : requestedMode);
      setInitialError(incomingError);
      setAuthOpen(!activeUser && shouldOpen);
    }

    void loadUser();

    const {
      data: { subscription }
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!mounted) return;
      updateUser(session?.user ?? null);
      setAuthLoaded(true);
      if (session?.user) {
        setAuthOpen(false);
        setInitialError(null);
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  function openAuth(mode: AuthMode) {
    if (user) {
      window.location.assign("/chat");
      return;
    }
    setAuthMode(mode);
    setInitialError(null);
    setAuthOpen(true);
  }

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    setUser(null);
    setAuthOpen(false);
  }

  function scrollToModules() {
    document.getElementById("workflows")?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  return (
    <main className="min-h-dvh overflow-x-hidden bg-[#0d0d0d] text-white">
      <div className="relative">
        <PublicNavbar
          authLoaded={authLoaded}
          onExplore={scrollToModules}
          onLogin={() => openAuth("login")}
          onStart={() => openAuth("signup")}
          onSignOut={() => void handleSignOut()}
          user={user}
        />

        <HeroShowcase onExplore={scrollToModules} onStart={() => openAuth("signup")} />

        <EditorialProofBar />
        <ManifestoSection />
        <TransformationSection />
        <ModulesIndexSection onStart={() => openAuth("signup")} />
        <UseCaseSpreadsSection />
        <ProcessSection />
        <ToolEcosystemSection />
        <FinalCtaSection onStart={() => openAuth("signup")} />

        <footer className="mx-auto flex w-full max-w-[1560px] flex-col gap-3 border-t border-white/[0.04] px-5 py-8 text-[11px] text-zinc-600 sm:flex-row sm:items-center sm:justify-between sm:px-8 lg:px-10">
          <span>Rune - Professional Creative Direction System</span>
          <span>Build here. Execute anywhere.</span>
        </footer>
      </div>

      <AuthModal
        initialError={initialError}
        mode={authMode}
        onClose={() => {
          setAuthOpen(false);
          setInitialError(null);
        }}
        open={authOpen}
      />
    </main>
  );
}
