/**
 * Password complexity rules for Phantom Messenger
 * Minimum 12 characters, at least 1 uppercase, 1 lowercase, 1 digit, 1 symbol
 */

const PASSWORD_RULES = [
  { key: 'length', test: (p) => p.length >= 12, label: 'At least 12 characters' },
  { key: 'upper', test: (p) => /[A-Z]/.test(p), label: 'One uppercase letter' },
  { key: 'lower', test: (p) => /[a-z]/.test(p), label: 'One lowercase letter' },
  { key: 'digit', test: (p) => /[0-9]/.test(p), label: 'One number' },
  { key: 'symbol', test: (p) => /[^A-Za-z0-9]/.test(p), label: 'One special character' },
];

/**
 * Validate password against all complexity rules.
 * Returns null if valid, or an error message string if invalid.
 */
export function validatePassword(password) {
  if (!password) return 'Password is required';
  for (const rule of PASSWORD_RULES) {
    if (!rule.test(password)) return rule.label;
  }
  return null;
}

/**
 * Get the pass/fail status of each rule for a given password.
 * Returns array of { key, label, passed } objects.
 */
export function getPasswordRuleStatus(password) {
  return PASSWORD_RULES.map((rule) => ({
    key: rule.key,
    label: rule.label,
    passed: password ? rule.test(password) : false,
  }));
}

/**
 * Calculate password strength score (0-4).
 * 0 = empty, 1 = weak, 2 = fair, 3 = good, 4 = strong
 */
export function getPasswordStrength(password) {
  if (!password) return 0;
  const passed = PASSWORD_RULES.filter((r) => r.test(password)).length;
  if (passed <= 1) return 1;
  if (passed <= 2) return 2;
  if (passed <= 4) return 3;
  return 4;
}

export const STRENGTH_LABELS = ['', 'Weak', 'Fair', 'Good', 'Strong'];
export const STRENGTH_COLORS = ['', '#ef4444', '#f59e0b', '#3b82f6', '#22c55e'];
