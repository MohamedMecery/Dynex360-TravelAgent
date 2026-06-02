"use client";

import { useEffect, useRef, useState } from "react";
import { Activity, Building2, CalendarCheck, Globe2, type LucideIcon } from "lucide-react";
import { useTranslation } from "@/i18n/locale-provider";
import { useCountUp, usePrefersReducedMotion } from "@/lib/hooks/use-count-up";
import { cn } from "@/lib/utils";

interface MetricConfig {
  id: string;
  value: number;
  prefix?: string;
  suffix?: string;
  decimals?: number;
  labelKey: string;
  ariaKey: string;
  icon: LucideIcon;
}

function MetricCounter({
  config,
  animate,
}: {
  config: MetricConfig;
  animate: boolean;
}) {
  const { t } = useTranslation();
  const display = useCountUp(config.value, {
    enabled: animate,
    decimals: config.decimals ?? 0,
  });
  const Icon = config.icon;

  const formatted = `${config.prefix ?? ""}${display}${config.suffix ?? ""}`;

  return (
    <div className="text-center">
      <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
        <Icon className="h-5 w-5" aria-hidden />
      </div>
      <p
        className="text-4xl font-bold tracking-tight text-landing-deep sm:text-5xl"
        aria-label={t(config.ariaKey)}
      >
        {formatted}
      </p>
      <p className="mt-2 text-sm text-muted-foreground">{t(config.labelKey)}</p>
    </div>
  );
}

export function TrustMetricsSection() {
  const { t } = useTranslation();
  const sectionRef = useRef<HTMLElement>(null);
  const [inView, setInView] = useState(false);
  const prefersReducedMotion = usePrefersReducedMotion();
  const shouldAnimate = inView && !prefersReducedMotion;

  useEffect(() => {
    const el = sectionRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          setInView(true);
          observer.disconnect();
        }
      },
      { threshold: 0.25, rootMargin: "0px 0px -40px 0px" }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const metrics: MetricConfig[] = [
    {
      id: "bookings",
      value: 50000,
      prefix: "+",
      labelKey: "landing.metrics.bookings.label",
      ariaKey: "landing.metrics.bookings.aria",
      icon: CalendarCheck,
    },
    {
      id: "agencies",
      value: 200,
      prefix: "+",
      labelKey: "landing.metrics.agencies.label",
      ariaKey: "landing.metrics.agencies.aria",
      icon: Building2,
    },
    {
      id: "countries",
      value: 20,
      prefix: "+",
      labelKey: "landing.metrics.countries.label",
      ariaKey: "landing.metrics.countries.aria",
      icon: Globe2,
    },
    {
      id: "uptime",
      value: 99.9,
      suffix: "%",
      decimals: 1,
      labelKey: "landing.metrics.uptime.label",
      ariaKey: "landing.metrics.uptime.aria",
      icon: Activity,
    },
  ];

  return (
    <section
      ref={sectionRef}
      id="metrics"
      className="scroll-mt-24 border-y border-border/40 bg-landing-sand/60 py-12 sm:py-16"
      aria-labelledby="trust-metrics-heading"
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <p
          id="trust-metrics-heading"
          className="text-center text-sm font-semibold uppercase tracking-wider text-primary"
        >
          {t("landing.metrics.eyebrow")}
        </p>
        <div className={cn("mt-8 grid grid-cols-2 gap-8 lg:grid-cols-4 lg:gap-6")}>
          {metrics.map((metric) => (
            <MetricCounter key={metric.id} config={metric} animate={shouldAnimate} />
          ))}
        </div>
      </div>
    </section>
  );
}
