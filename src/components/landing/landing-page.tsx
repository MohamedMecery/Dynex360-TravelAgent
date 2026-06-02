"use client";

import Link from "next/link";
import { useState } from "react";
import {
  ArrowRight,
  Bot,
  Building2,
  CalendarCheck,
  ChevronDown,
  Globe2,
  Lock,
  MapPin,
  Package,
  Plane,
  Shield,
  Sparkles,
  Star,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { LanguageSwitcher } from "@/components/layout/language-switcher";
import { DashboardMockup } from "@/components/landing/dashboard-mockup";
import { SectionHeader } from "@/components/landing/section-header";
import { TrustMetricsSection } from "@/components/landing/trust-metrics-section";
import { useTranslation } from "@/i18n/locale-provider";
import { cn } from "@/lib/utils";

const NAV_LINKS = [
  { href: "#features", key: "landing.nav.features" },
  { href: "#solutions", key: "landing.nav.solutions" },
  { href: "#pricing", key: "landing.nav.pricing" },
  { href: "#faq", key: "landing.nav.faq" },
] as const;

export function LandingPage() {
  const { t, isRtl, dir } = useTranslation();
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  const audiences = [
    t("landing.hero.audienceAgencies"),
    t("landing.hero.audienceOperators"),
    t("landing.hero.audienceDmc"),
  ];

  const trustItems = [
    { icon: Shield, label: t("landing.trust.multiTenant") },
    { icon: Lock, label: t("landing.trust.rbac") },
    { icon: Globe2, label: t("landing.trust.rtl") },
    { icon: Building2, label: t("landing.trust.enterprise") },
  ];

  const featureCards = [
    { icon: CalendarCheck, title: t("landing.features.bookingsTitle"), desc: t("landing.features.bookingsDesc") },
    { icon: Package, title: t("landing.features.packagesTitle"), desc: t("landing.features.packagesDesc") },
    { icon: Users, title: t("landing.features.customersTitle"), desc: t("landing.features.customersDesc") },
    { icon: Bot, title: t("landing.features.aiTitle"), desc: t("landing.features.aiDesc") },
  ];

  const solutionSections = [
    {
      id: "booking",
      icon: CalendarCheck,
      title: t("landing.solutions.bookingTitle"),
      subtitle: t("landing.solutions.bookingSubtitle"),
      bullets: ["bookingB1", "bookingB2", "bookingB3", "bookingB4"] as const,
      accent: "from-teal-500/10 to-cyan-500/5",
    },
    {
      id: "packages",
      icon: Package,
      title: t("landing.solutions.packagesTitle"),
      subtitle: t("landing.solutions.packagesSubtitle"),
      bullets: ["packagesB1", "packagesB2", "packagesB3", "packagesB4"] as const,
      accent: "from-amber-500/10 to-orange-500/5",
      reverse: true,
    },
    {
      id: "customers",
      icon: Users,
      title: t("landing.solutions.customersTitle"),
      subtitle: t("landing.solutions.customersSubtitle"),
      bullets: ["customersB1", "customersB2", "customersB3", "customersB4"] as const,
      accent: "from-violet-500/10 to-purple-500/5",
    },
    {
      id: "ai",
      icon: Sparkles,
      title: t("landing.solutions.aiTitle"),
      subtitle: t("landing.solutions.aiSubtitle"),
      bullets: ["aiB1", "aiB2", "aiB3", "aiB4"] as const,
      accent: "from-landing-ocean/20 to-landing-teal/10",
      reverse: true,
      dark: true,
    },
  ];

  const plans = ["starter", "professional", "enterprise"] as const;

  const testimonials = ["t1", "t2", "t3"] as const;

  const faqKeys = ["q1", "q2", "q3", "q4", "q5", "q6"] as const;

  return (
    <div dir={dir} className="min-h-screen bg-background text-foreground">
      {/* Navigation */}
      <header className="sticky top-0 z-50 border-b border-border/60 bg-background/85 backdrop-blur-md">
        <div
          className={cn(
            "mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3 sm:px-6 lg:px-8",
            isRtl && "flex-row-reverse"
          )}
        >
          <Link href="/home" className={cn("flex items-center gap-2", isRtl && "flex-row-reverse")}>
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-landing-mesh text-white shadow-sm">
              <Plane className="h-4 w-4" />
            </span>
            <div className={isRtl ? "text-right" : "text-left"}>
              <p className="text-lg font-bold text-landing-deep">{t("app.name")}</p>
              <p className="text-[10px] text-muted-foreground">{t("landing.nav.tagline")}</p>
            </div>
          </Link>

          <nav
            className={cn(
              "hidden items-center gap-6 lg:flex",
              isRtl && "flex-row-reverse"
            )}
            aria-label={t("landing.nav.aria")}
          >
            {NAV_LINKS.map(({ href, key }) => (
              <a
                key={href}
                href={href}
                className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
              >
                {t(key)}
              </a>
            ))}
          </nav>

          <div className={cn("flex items-center gap-2 sm:gap-3", isRtl && "flex-row-reverse")}>
            <LanguageSwitcher />
            <Link href="/login" className="hidden sm:block">
              <Button variant="ghost" size="sm">
                {t("landing.signIn")}
              </Button>
            </Link>
            <Link href="/login">
              <Button size="sm" className="bg-landing-deep hover:bg-landing-ocean">
                {t("landing.getStarted")}
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden bg-landing-hero pb-16 pt-12 sm:pb-24 sm:pt-16 lg:pb-28">
        <div className="pointer-events-none absolute -end-32 top-20 h-96 w-96 rounded-full bg-landing-teal/10 blur-3xl" />
        <div className="pointer-events-none absolute -start-20 bottom-0 h-72 w-72 rounded-full bg-landing-gold/15 blur-3xl" />

        <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div
            className={cn(
              "grid items-center gap-12 lg:grid-cols-2 lg:gap-16",
              isRtl && "lg:[direction:rtl]"
            )}
          >
            <div className={cn("max-w-xl", isRtl ? "lg:ms-auto lg:text-right" : "lg:text-left")}>
              <div
                className={cn(
                  "mb-6 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-white/80 px-4 py-1.5 text-sm shadow-landing-soft backdrop-blur",
                  isRtl && "flex-row-reverse"
                )}
              >
                <MapPin className="h-4 w-4 text-primary" />
                <span className="font-medium text-landing-deep">{t("landing.badge")}</span>
              </div>

              <h1 className="text-4xl font-bold leading-[1.1] tracking-tight text-landing-deep sm:text-5xl lg:text-[3.25rem]">
                {t("landing.heroTitle")}
              </h1>
              <p className="mt-6 text-lg leading-relaxed text-muted-foreground sm:text-xl">
                {t("landing.heroSubtitle")}
              </p>

              <ul
                className={cn(
                  "mt-6 flex flex-wrap gap-2",
                  isRtl && "justify-end"
                )}
              >
                {audiences.map((label) => (
                  <li
                    key={label}
                    className="rounded-full border bg-white/90 px-3 py-1 text-xs font-medium text-landing-deep shadow-sm"
                  >
                    {label}
                  </li>
                ))}
              </ul>

              <div
                className={cn(
                  "mt-10 flex flex-wrap items-center gap-3",
                  isRtl && "justify-end"
                )}
              >
                <Link href="/login">
                  <Button size="lg" className="gap-2 bg-landing-deep shadow-landing-soft hover:bg-landing-ocean">
                    {t("landing.getStarted")}
                    <ArrowRight className={cn("h-4 w-4", isRtl && "rotate-180")} />
                  </Button>
                </Link>
                <a href="#showcase">
                  <Button size="lg" variant="outline" className="border-landing-deep/20 bg-white/80">
                    {t("landing.hero.ctaSecondary")}
                  </Button>
                </a>
              </div>

              <div
                className={cn(
                  "mt-12 grid grid-cols-2 gap-4 border-t border-border/60 pt-8 sm:grid-cols-4",
                  isRtl && "text-right"
                )}
              >
                {trustItems.map(({ icon: Icon, label }) => (
                  <div key={label} className={cn("flex gap-2", isRtl && "flex-row-reverse justify-end")}>
                    <Icon className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                    <span className="text-xs font-medium text-muted-foreground">{label}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="relative lg:pt-4">
              <div className="absolute -inset-4 rounded-3xl bg-gradient-to-br from-landing-teal/20 via-transparent to-landing-gold/20 blur-2xl" />
              <DashboardMockup className="relative" />
            </div>
          </div>
        </div>
      </section>

      <TrustMetricsSection />

      {/* Product showcase */}
      <section id="showcase" className="scroll-mt-24 border-y bg-landing-sand/50 py-20 sm:py-28">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <SectionHeader
            eyebrow={t("landing.showcase.eyebrow")}
            title={t("landing.showcase.title")}
            subtitle={t("landing.showcase.subtitle")}
          />
          <div className="mt-14">
            <DashboardMockup className="mx-auto max-w-5xl" />
          </div>
        </div>
      </section>

      {/* Features overview */}
      <section id="features" className="scroll-mt-24 py-20 sm:py-28">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <SectionHeader
            eyebrow={t("landing.features.eyebrow")}
            title={t("landing.features.title")}
            subtitle={t("landing.features.subtitle")}
          />
          <div className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {featureCards.map(({ icon: Icon, title, desc }) => (
              <article
                key={title}
                className="group rounded-2xl border bg-card p-6 shadow-landing-soft transition-shadow hover:shadow-landing"
              >
                <span className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-landing-teal/15 to-landing-ocean/10 text-primary transition-transform group-hover:scale-105">
                  <Icon className="h-6 w-6" />
                </span>
                <h3 className="text-lg font-semibold text-landing-deep">{title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{desc}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* Solution deep-dives */}
      <section id="solutions" className="scroll-mt-24">
        {solutionSections.map((section, index) => (
          <div
            key={section.id}
            id={section.id}
            className={cn(
              "py-20 sm:py-24",
              section.dark
                ? "bg-landing-mesh text-white"
                : index % 2 === 1
                  ? "bg-muted/40"
                  : "bg-background"
            )}
          >
            <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
              <div
                className={cn(
                  "grid items-center gap-12 lg:grid-cols-2 lg:gap-20",
                  isRtl && "lg:[direction:rtl]"
                )}
              >
                <div
                  className={cn(
                    section.reverse && "lg:order-2",
                    isRtl && "text-right"
                  )}
                >
                  <div
                    className={cn(
                      "mb-4 inline-flex h-12 w-12 items-center justify-center rounded-xl",
                      section.dark
                        ? "bg-white/15 text-landing-gold"
                        : cn("bg-gradient-to-br text-primary", section.accent)
                    )}
                  >
                    <section.icon className="h-6 w-6" />
                  </div>
                  <h2
                    className={cn(
                      "text-3xl font-bold tracking-tight sm:text-4xl",
                      section.dark ? "text-white" : "text-landing-deep"
                    )}
                  >
                    {section.title}
                  </h2>
                  <p
                    className={cn(
                      "mt-4 text-lg leading-relaxed",
                      section.dark ? "text-white/80" : "text-muted-foreground"
                    )}
                  >
                    {section.subtitle}
                  </p>
                  <ul className={cn("mt-8 space-y-3", isRtl && "text-right")}>
                    {section.bullets.map((bulletKey) => (
                      <li
                        key={bulletKey}
                        className={cn(
                          "flex gap-3 text-sm",
                          isRtl && "flex-row-reverse",
                          section.dark ? "text-white/90" : "text-foreground"
                        )}
                      >
                        <span
                          className={cn(
                            "mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full",
                            section.dark ? "bg-landing-gold" : "bg-primary"
                          )}
                        />
                        {t(`landing.solutions.${bulletKey}`)}
                      </li>
                    ))}
                  </ul>
                  <Link href="/login" className="mt-8 inline-block">
                    <Button
                      variant={section.dark ? "outline" : "default"}
                      className={cn(
                        section.dark &&
                          "border-white/30 bg-white/10 text-white hover:bg-white/20"
                      )}
                    >
                      {t("landing.solutions.cta")}
                    </Button>
                  </Link>
                </div>

                <div
                  className={cn(
                    section.reverse && "lg:order-1",
                    "rounded-2xl border p-8 shadow-landing-soft",
                    section.dark
                      ? "border-white/20 bg-white/5 backdrop-blur"
                      : cn("border-border/60 bg-gradient-to-br", section.accent)
                  )}
                >
                  {section.id === "ai" ? (
                    <div className="space-y-4">
                      <div
                        className={cn(
                          "rounded-xl border border-white/20 bg-white/10 p-4",
                          isRtl && "text-right"
                        )}
                      >
                        <p className="text-xs font-medium text-landing-gold">
                          {t("landing.solutions.aiPreviewLabel")}
                        </p>
                        <p className="mt-2 text-sm text-white/90">
                          {t("landing.solutions.aiPreviewUser")}
                        </p>
                      </div>
                      <div
                        className={cn(
                          "rounded-xl border border-primary/30 bg-landing-deep/40 p-4",
                          isRtl && "text-right"
                        )}
                      >
                        <p className="text-xs font-medium text-primary-foreground/70">
                          {t("landing.solutions.aiPreviewAgent")}
                        </p>
                        <p className="mt-2 text-sm text-white">{t("landing.solutions.aiPreviewReply")}</p>
                      </div>
                    </div>
                  ) : (
                    <DashboardMockup compact className="shadow-none" />
                  )}
                </div>
              </div>
            </div>
          </div>
        ))}
      </section>

      {/* Pricing */}
      <section id="pricing" className="scroll-mt-24 bg-landing-sand/40 py-20 sm:py-28">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <SectionHeader
            eyebrow={t("landing.pricing.eyebrow")}
            title={t("landing.pricing.title")}
            subtitle={t("landing.pricing.subtitle")}
          />
          <div className="mt-14 grid gap-8 lg:grid-cols-3">
            {plans.map((plan) => {
              const featured = plan === "professional";
              return (
                <article
                  key={plan}
                  className={cn(
                    "relative flex flex-col rounded-2xl border bg-card p-8 shadow-landing-soft",
                    featured && "border-primary shadow-landing ring-2 ring-primary/20 lg:scale-105"
                  )}
                >
                  {featured && (
                    <span className="absolute -top-3 start-1/2 -translate-x-1/2 rounded-full bg-landing-gold px-3 py-0.5 text-xs font-semibold text-landing-deep rtl:translate-x-1/2">
                      {t("landing.pricing.popular")}
                    </span>
                  )}
                  <h3 className="text-xl font-bold text-landing-deep">
                    {t(`landing.pricing.${plan}.name`)}
                  </h3>
                  <p className="mt-2 text-sm text-muted-foreground">
                    {t(`landing.pricing.${plan}.desc`)}
                  </p>
                  <p className="mt-6">
                    <span className="text-4xl font-bold text-landing-deep">
                      {t(`landing.pricing.${plan}.price`)}
                    </span>
                    <span className="text-muted-foreground">
                      {t(`landing.pricing.${plan}.period`)}
                    </span>
                  </p>
                  <ul className={cn("mt-8 flex-1 space-y-3", isRtl && "text-right")}>
                    {(["f1", "f2", "f3", "f4"] as const).map((f) => (
                      <li
                        key={f}
                        className={cn(
                          "flex gap-2 text-sm text-muted-foreground",
                          isRtl && "flex-row-reverse"
                        )}
                      >
                        <span className="text-primary">✓</span>
                        {t(`landing.pricing.${plan}.${f}`)}
                      </li>
                    ))}
                  </ul>
                  <Link href="/login" className="mt-8 block">
                    <Button
                      className={cn(
                        "w-full",
                        featured ? "bg-landing-deep hover:bg-landing-ocean" : ""
                      )}
                      variant={featured ? "default" : "outline"}
                    >
                      {t(`landing.pricing.${plan}.cta`)}
                    </Button>
                  </Link>
                </article>
              );
            })}
          </div>
          <p className="mt-10 text-center text-sm text-muted-foreground">
            {t("landing.pricing.note")}
          </p>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-20 sm:py-28">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <SectionHeader
            eyebrow={t("landing.testimonials.eyebrow")}
            title={t("landing.testimonials.title")}
            subtitle={t("landing.testimonials.subtitle")}
          />
          <div className="mt-14 grid gap-8 md:grid-cols-3">
            {testimonials.map((id) => (
              <blockquote
                key={id}
                className={cn(
                  "flex flex-col rounded-2xl border bg-card p-6 shadow-landing-soft",
                  isRtl && "text-right"
                )}
              >
                <div className={cn("mb-4 flex gap-0.5 text-landing-gold", isRtl && "justify-end")}>
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star key={i} className="h-4 w-4 fill-current" />
                  ))}
                </div>
                <p className="flex-1 text-sm leading-relaxed text-foreground">
                  &ldquo;{t(`landing.testimonials.${id}.quote`)}&rdquo;
                </p>
                <footer className={cn("mt-6 flex items-center gap-3 border-t pt-6", isRtl && "flex-row-reverse")}>
                  <span className="flex h-10 w-10 items-center justify-center rounded-full bg-landing-mesh text-sm font-bold text-white">
                    {t(`landing.testimonials.${id}.initials`)}
                  </span>
                  <div className={isRtl ? "text-right" : ""}>
                    <cite className="font-semibold not-italic text-landing-deep">
                      {t(`landing.testimonials.${id}.name`)}
                    </cite>
                    <p className="text-xs text-muted-foreground">
                      {t(`landing.testimonials.${id}.role`)}
                    </p>
                  </div>
                </footer>
              </blockquote>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="scroll-mt-24 border-t bg-muted/30 py-20 sm:py-28">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
          <SectionHeader title={t("landing.faq.title")} subtitle={t("landing.faq.subtitle")} />
          <div className="mt-12 space-y-3">
            {faqKeys.map((key, index) => {
              const isOpen = openFaq === index;
              return (
                <div key={key} className="overflow-hidden rounded-xl border bg-card shadow-sm">
                  <button
                    type="button"
                    onClick={() => setOpenFaq(isOpen ? null : index)}
                    className={cn(
                      "flex w-full items-center justify-between gap-4 px-5 py-4 text-start font-medium text-landing-deep transition-colors hover:bg-muted/50",
                      isRtl && "flex-row-reverse text-right"
                    )}
                    aria-expanded={isOpen}
                  >
                    {t(`landing.faq.${key}.question`)}
                    <ChevronDown
                      className={cn(
                        "h-5 w-5 shrink-0 text-muted-foreground transition-transform",
                        isOpen && "rotate-180"
                      )}
                    />
                  </button>
                  {isOpen && (
                    <div
                      className={cn(
                        "border-t px-5 pb-4 pt-2 text-sm leading-relaxed text-muted-foreground",
                        isRtl && "text-right"
                      )}
                    >
                      {t(`landing.faq.${key}.answer`)}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* CTA band */}
      <section className="bg-landing-mesh py-16 text-white sm:py-20">
        <div
          className={cn(
            "mx-auto flex max-w-4xl flex-col items-center px-4 text-center sm:px-6",
            isRtl && "text-center"
          )}
        >
          <h2 className="text-3xl font-bold sm:text-4xl">{t("landing.cta.title")}</h2>
          <p className="mt-4 text-lg text-white/85">{t("landing.cta.subtitle")}</p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Link href="/login">
              <Button size="lg" className="bg-white text-landing-deep hover:bg-white/90">
                {t("landing.getStarted")}
              </Button>
            </Link>
            <Link href="/login">
              <Button
                size="lg"
                variant="outline"
                className="border-white/40 bg-transparent text-white hover:bg-white/10"
              >
                {t("landing.signIn")}
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t bg-landing-deep text-white/80">
        <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
          <div
            className={cn(
              "grid gap-10 sm:grid-cols-2 lg:grid-cols-4",
              isRtl && "text-right"
            )}
          >
            <div className="sm:col-span-2 lg:col-span-1">
              <div className={cn("flex items-center gap-2", isRtl && "flex-row-reverse justify-end lg:justify-start")}>
                <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/15">
                  <Plane className="h-4 w-4" />
                </span>
                <span className="text-lg font-bold text-white">{t("app.name")}</span>
              </div>
              <p className="mt-3 max-w-xs text-sm text-white/65">{t("landing.footer.blurb")}</p>
            </div>
            <div>
              <p className="font-semibold text-white">{t("landing.footer.product")}</p>
              <ul className="mt-4 space-y-2 text-sm">
                <li><a href="#features" className="hover:text-white">{t("landing.nav.features")}</a></li>
                <li><a href="#solutions" className="hover:text-white">{t("landing.nav.solutions")}</a></li>
                <li><a href="#pricing" className="hover:text-white">{t("landing.nav.pricing")}</a></li>
              </ul>
            </div>
            <div>
              <p className="font-semibold text-white">{t("landing.footer.company")}</p>
              <ul className="mt-4 space-y-2 text-sm">
                <li><a href="#faq" className="hover:text-white">{t("landing.nav.faq")}</a></li>
                <li><Link href="/login" className="hover:text-white">{t("landing.signIn")}</Link></li>
              </ul>
            </div>
            <div>
              <p className="font-semibold text-white">{t("landing.footer.legal")}</p>
              <ul className="mt-4 space-y-2 text-sm text-white/50">
                <li>{t("landing.footer.privacyComingSoon")}</li>
                <li>{t("landing.footer.termsComingSoon")}</li>
              </ul>
            </div>
          </div>
          <div
            className={cn(
              "mt-12 flex flex-col items-center justify-between gap-4 border-t border-white/15 pt-8 text-xs sm:flex-row",
              isRtl && "sm:flex-row-reverse"
            )}
          >
            <p>{t("landing.footer.copyright")}</p>
            <LanguageSwitcher className="border-white/20 bg-white/10" />
          </div>
        </div>
      </footer>
    </div>
  );
}
