import React from 'react';
import { Check, X } from 'lucide-react';
import { validatePassword, getStrengthLabel, getStrengthColor } from '@/lib/passwordValidation';
import { cn } from '@/lib/utils';

interface PasswordStrengthIndicatorProps {
  password: string;
  showRequirements?: boolean;
}

const PasswordStrengthIndicator: React.FC<PasswordStrengthIndicatorProps> = ({
  password,
  showRequirements = true,
}) => {
  const validation = validatePassword(password);
  
  if (!password) return null;

  return (
    <div className="space-y-2 text-sm">
      {/* Strength Bar */}
      <div className="flex items-center gap-2">
        <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
          <div
            className={cn(
              'h-full transition-all duration-300',
              getStrengthColor(validation.strength)
            )}
            style={{
              width:
                validation.strength === 'strong'
                  ? '100%'
                  : validation.strength === 'medium'
                  ? '66%'
                  : '33%',
            }}
          />
        </div>
        <span
          className={cn(
            'text-xs font-medium',
            validation.strength === 'strong' && 'text-green-600 dark:text-green-400',
            validation.strength === 'medium' && 'text-yellow-600 dark:text-yellow-400',
            validation.strength === 'weak' && 'text-red-600 dark:text-red-400'
          )}
        >
          {getStrengthLabel(validation.strength)}
        </span>
      </div>

      {/* Requirements List */}
      {showRequirements && (
        <div className="grid grid-cols-2 gap-1">
          <RequirementItem
            met={validation.checks.minLength}
            text="8+ caracteres"
          />
          <RequirementItem
            met={validation.checks.hasLetter}
            text="Uma letra"
          />
          <RequirementItem
            met={validation.checks.hasNumber}
            text="Um número"
          />
          <RequirementItem
            met={validation.checks.hasSpecial}
            text="Especial (opcional)"
            optional
          />
        </div>
      )}
    </div>
  );
};

interface RequirementItemProps {
  met: boolean;
  text: string;
  optional?: boolean;
}

const RequirementItem: React.FC<RequirementItemProps> = ({ met, text, optional }) => (
  <div
    className={cn(
      'flex items-center gap-1 text-xs',
      met ? 'text-green-600 dark:text-green-400' : optional ? 'text-muted-foreground' : 'text-muted-foreground'
    )}
  >
    {met ? (
      <Check className="w-3 h-3" />
    ) : (
      <X className={cn('w-3 h-3', optional && 'opacity-50')} />
    )}
    <span className={optional && !met ? 'opacity-50' : ''}>{text}</span>
  </div>
);

export default PasswordStrengthIndicator;
