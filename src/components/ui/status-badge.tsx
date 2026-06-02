"use client";

import { Badge } from "@/components/ui/badge";
import { useTranslation } from "@/i18n/locale-provider";

interface StatusBadgeProps {
  namespace: string;
  value: string;
}

export function StatusBadge({ namespace, value }: StatusBadgeProps) {
  const { t } = useTranslation();
  const label = t(`${namespace}.${value}`);
  return <Badge variant={value}>{label}</Badge>;
}
