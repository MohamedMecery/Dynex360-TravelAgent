import Link from "next/link";
import { Button } from "@/components/ui/button";

interface GridActionButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  href?: string;
  variant?: "default" | "outline" | "destructive" | "ghost";
  size?: "sm" | "md" | "lg";
}

/** Grid row action: navigates when enabled, stays visible but disabled when not. */
export function GridActionButton({
  href,
  disabled,
  children,
  ...props
}: GridActionButtonProps) {
  if (!disabled && href) {
    return (
      <Link href={href}>
        <Button {...props}>{children}</Button>
      </Link>
    );
  }

  return (
    <Button {...props} disabled={disabled ?? !href}>
      {children}
    </Button>
  );
}
