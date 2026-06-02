import { cn } from "@/lib/utils";

export function Badge({ className, variant = "default", ...props }: React.HTMLAttributes<HTMLSpanElement> & { variant?: string }) {
  const variants: Record<string, string> = {
    default: "bg-primary/10 text-primary",
    draft: "bg-gray-100 text-gray-700",
    published: "bg-green-100 text-green-700",
    confirmed: "bg-blue-100 text-blue-700",
    completed: "bg-green-100 text-green-700",
    cancelled: "bg-red-100 text-red-700",
    unpaid: "bg-yellow-100 text-yellow-700",
    partial: "bg-orange-100 text-orange-700",
    paid: "bg-green-100 text-green-700",
    active: "bg-green-100 text-green-700",
    inactive: "bg-gray-100 text-gray-500",
    pending: "bg-yellow-100 text-yellow-800",
    issued: "bg-blue-100 text-blue-700",
    partially_paid: "bg-orange-100 text-orange-700",
    void: "bg-gray-100 text-gray-500",
    individual: "bg-primary/10 text-primary",
    corporate: "bg-purple-100 text-purple-700",
  };
  return (
    <span className={cn("inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium", variants[variant] ?? variants.default, className)} {...props} />
  );
}
