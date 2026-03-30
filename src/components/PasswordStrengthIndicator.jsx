import { motion } from 'framer-motion';
import { Check, X } from 'lucide-react';
import { getPasswordRuleStatus, getPasswordStrength, STRENGTH_LABELS, STRENGTH_COLORS } from '../utils/passwordValidation';

export default function PasswordStrengthIndicator({ password }) {
  if (!password) return null;

  const rules = getPasswordRuleStatus(password);
  const strength = getPasswordStrength(password);
  const color = STRENGTH_COLORS[strength];
  const label = STRENGTH_LABELS[strength];

  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: 'auto' }}
      exit={{ opacity: 0, height: 0 }}
      className="mt-2 space-y-2"
    >
      {/* Strength bar */}
      <div className="flex items-center gap-2">
        <div className="flex-1 flex gap-1">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="h-1.5 flex-1 rounded-full transition-colors duration-200"
              style={{ backgroundColor: i <= strength ? color : '#e5e7eb' }}
            />
          ))}
        </div>
        <span className="text-xs font-medium" style={{ color }}>{label}</span>
      </div>

      {/* Rule checklist */}
      <div className="grid grid-cols-1 gap-0.5">
        {rules.map((rule) => (
          <div key={rule.key} className="flex items-center gap-1.5">
            {rule.passed ? (
              <Check className="w-3 h-3 text-green-500 flex-shrink-0" />
            ) : (
              <X className="w-3 h-3 text-phantom-gray-300 flex-shrink-0" />
            )}
            <span className={`text-[11px] ${rule.passed ? 'text-green-600' : 'text-phantom-gray-400'}`}>
              {rule.label}
            </span>
          </div>
        ))}
      </div>
    </motion.div>
  );
}
