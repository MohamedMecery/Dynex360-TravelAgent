import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface AnalyticsKpiCardProps {
  label: string;
  value: string;
  hint?: string;
  className?: string;
}

export function AnalyticsKpiCard({ label, value, hint, className }: AnalyticsKpiCardProps) {
  return (
    <Card className={cn(className)}>
      <CardHeader>
        <p className="text-sm text-muted-foreground">{label}</p>
        <p className="text-3xl font-bold">{value}</p>
        {hint ? <p className="text-xs text-muted-foreground mt-1">{hint}</p> : null}
      </CardHeader>
    </Card>
  );
}
