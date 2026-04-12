import { useMemo } from 'react';

interface PasswordStrengthProps {
  password: string;
}

interface StrengthCheck {
  label: string;
  met: boolean;
}

export default function PasswordStrengthIndicator({ password }: PasswordStrengthProps) {
  const checks: StrengthCheck[] = useMemo(() => [
    { label: 'At least 8 characters', met: password.length >= 8 },
    { label: 'Uppercase letter', met: /[A-Z]/.test(password) },
    { label: 'Lowercase letter', met: /[a-z]/.test(password) },
    { label: 'Number', met: /[0-9]/.test(password) },
    { label: 'Special character', met: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password) },
  ], [password]);

  const metCount: number = checks.filter((c: StrengthCheck) => c.met).length;

  const strengthLabel = (): string => {
    if (metCount === 0) return '';
    if (metCount <= 2) return 'Weak';
    if (metCount <= 4) return 'Medium';
    return 'Strong';
  };

  const strengthColor = (): string => {
    if (metCount <= 2) return 'bg-red-500';
    if (metCount <= 4) return 'bg-amber-500';
    return 'bg-emerald-500';
  };

  if (!password) return null;

  return (
    <div className="mt-2">
      <div className="flex gap-1 mb-2">
        {[1, 2, 3, 4, 5].map((i: number) => (
          <div
            key={i}
            className={`h-1 flex-1 rounded ${i <= metCount ? strengthColor() : 'bg-slate-600'}`}
          />
        ))}
      </div>
      <p className={`text-xs ${metCount <= 2 ? 'text-red-400' : metCount <= 4 ? 'text-amber-400' : 'text-emerald-400'}`}>
        {strengthLabel()}
      </p>
      <ul className="mt-1 space-y-0.5">
        {checks.map((check: StrengthCheck) => (
          <li key={check.label} className={`text-xs ${check.met ? 'text-emerald-400' : 'text-slate-500'}`}>
            {check.met ? '\u2713' : '\u2717'} {check.label}
          </li>
        ))}
      </ul>
    </div>
  );
}
