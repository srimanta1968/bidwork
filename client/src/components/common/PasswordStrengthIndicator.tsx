import { useMemo } from 'react';

interface PasswordStrengthProps {
  password: string;
}

export default function PasswordStrengthIndicator({ password }: PasswordStrengthProps) {
  const checks = useMemo(() => [
    { label: 'At least 8 characters', met: password.length >= 8 },
    { label: 'Uppercase letter', met: /[A-Z]/.test(password) },
    { label: 'Lowercase letter', met: /[a-z]/.test(password) },
    { label: 'Number', met: /[0-9]/.test(password) },
    { label: 'Special character', met: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password) },
  ], [password]);

  const metCount = checks.filter((c) => c.met).length;

  if (!password) return null;

  const barColor = metCount <= 2 ? '#ef4444' : metCount <= 4 ? '#f59e0b' : '#22c55e';
  const label = metCount <= 2 ? 'Weak' : metCount <= 4 ? 'Medium' : 'Strong';

  return (
    <div style={{ marginTop: 10 }}>
      <div style={{ display: 'flex', gap: 4, marginBottom: 6 }}>
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} style={{ height: 4, flex: 1, borderRadius: 2, background: i <= metCount ? barColor : '#e2e8f0', transition: 'background 0.3s' }} />
        ))}
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
        <span style={{ fontSize: 12, fontWeight: 600, color: barColor }}>{label}</span>
      </div>
      <ul style={{ listStyle: 'none', padding: 0 }}>
        {checks.map((check) => (
          <li key={check.label} style={{ fontSize: 12, color: check.met ? '#22c55e' : '#94a3b8', marginBottom: 2, display: 'flex', alignItems: 'center', gap: 6 }}>
            {check.met ? '\u2713' : '\u2717'} {check.label}
          </li>
        ))}
      </ul>
    </div>
  );
}
