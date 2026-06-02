"use client";

import { Input, Label } from "@/components/ui/input";

interface PasswordFieldsProps {
  passwordId?: string;
  confirmId?: string;
  passwordLabel: string;
  confirmLabel: string;
  password: string;
  confirmPassword: string;
  onPasswordChange: (value: string) => void;
  onConfirmChange: (value: string) => void;
  passwordError?: string;
  confirmError?: string;
  minLengthHint?: string;
  disabled?: boolean;
}

export function PasswordFields({
  passwordId = "password",
  confirmId = "confirm-password",
  passwordLabel,
  confirmLabel,
  password,
  confirmPassword,
  onPasswordChange,
  onConfirmChange,
  passwordError,
  confirmError,
  minLengthHint,
  disabled,
}: PasswordFieldsProps) {
  return (
    <>
      <div>
        <Label htmlFor={passwordId}>{passwordLabel}</Label>
        <Input
          id={passwordId}
          type="password"
          autoComplete="new-password"
          value={password}
          onChange={(e) => onPasswordChange(e.target.value)}
          required
          minLength={8}
          disabled={disabled}
        />
        {minLengthHint && (
          <p className="mt-1 text-xs text-muted-foreground">{minLengthHint}</p>
        )}
        {passwordError && (
          <p className="mt-1 text-xs text-red-600" role="alert">
            {passwordError}
          </p>
        )}
      </div>
      <div>
        <Label htmlFor={confirmId}>{confirmLabel}</Label>
        <Input
          id={confirmId}
          type="password"
          autoComplete="new-password"
          value={confirmPassword}
          onChange={(e) => onConfirmChange(e.target.value)}
          required
          minLength={8}
          disabled={disabled}
        />
        {confirmError && (
          <p className="mt-1 text-xs text-red-600" role="alert">
            {confirmError}
          </p>
        )}
      </div>
    </>
  );
}
