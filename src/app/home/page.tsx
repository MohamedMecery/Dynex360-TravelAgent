"use client";

import { LandingPage } from "@/components/landing/landing-page";

/** Public marketing site — accessible while logged in (unlike `/`, which redirects to dashboard). */
export default function MarketingHomePage() {
  return <LandingPage />;
}
