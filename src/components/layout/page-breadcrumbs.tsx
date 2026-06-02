"use client";

import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { useTranslation } from "@/i18n/locale-provider";
import { cn } from "@/lib/utils";

export interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface PageBreadcrumbsProps {
  items: BreadcrumbItem[];
  className?: string;
}

export function PageBreadcrumbs({ items, className }: PageBreadcrumbsProps) {
  const { dir, isRtl } = useTranslation();

  if (items.length === 0) return null;

  return (
    <nav aria-label="Breadcrumb" dir={dir} className={cn("mb-4", className)}>
      <ol
        className={cn(
          "flex flex-wrap items-center gap-1 text-sm text-muted-foreground",
          isRtl && "flex-row-reverse justify-end"
        )}
      >
        {items.map((item, index) => {
          const isLast = index === items.length - 1;
          return (
            <li
              key={`${item.label}-${index}`}
              className={cn("flex items-center gap-1", isRtl && "flex-row-reverse")}
            >
              {index > 0 && (
                <ChevronRight
                  className={cn("h-3.5 w-3.5 shrink-0 opacity-50", isRtl && "rotate-180")}
                  aria-hidden
                />
              )}
              {item.href && !isLast ? (
                <Link href={item.href} className="hover:text-foreground transition-colors">
                  {item.label}
                </Link>
              ) : (
                <span className={cn(isLast && "font-medium text-foreground")}>{item.label}</span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
