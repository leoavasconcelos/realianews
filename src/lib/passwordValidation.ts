import { z } from 'zod';

export const passwordSchema = z
  .string()
  .min(8, 'A senha deve ter pelo menos 8 caracteres')
  .regex(/[a-zA-Z]/, 'A senha deve conter pelo menos uma letra')
  .regex(/[0-9]/, 'A senha deve conter pelo menos um número');

export type PasswordStrength = 'weak' | 'medium' | 'strong';

export interface PasswordValidation {
  isValid: boolean;
  strength: PasswordStrength;
  errors: string[];
  checks: {
    minLength: boolean;
    hasLetter: boolean;
    hasNumber: boolean;
    hasSpecial: boolean;
  };
}

export const validatePassword = (password: string): PasswordValidation => {
  const checks = {
    minLength: password.length >= 8,
    hasLetter: /[a-zA-Z]/.test(password),
    hasNumber: /[0-9]/.test(password),
    hasSpecial: /[!@#$%^&*(),.?":{}|<>]/.test(password),
  };

  const errors: string[] = [];
  
  if (!checks.minLength) {
    errors.push('Mínimo 8 caracteres');
  }
  if (!checks.hasLetter) {
    errors.push('Pelo menos uma letra');
  }
  if (!checks.hasNumber) {
    errors.push('Pelo menos um número');
  }

  const passedChecks = Object.values(checks).filter(Boolean).length;
  
  let strength: PasswordStrength = 'weak';
  if (passedChecks >= 4) {
    strength = 'strong';
  } else if (passedChecks >= 3) {
    strength = 'medium';
  }

  const isValid = checks.minLength && checks.hasLetter && checks.hasNumber;

  return {
    isValid,
    strength,
    errors,
    checks,
  };
};

export const getStrengthLabel = (strength: PasswordStrength): string => {
  switch (strength) {
    case 'strong':
      return 'Forte';
    case 'medium':
      return 'Média';
    case 'weak':
      return 'Fraca';
  }
};

export const getStrengthColor = (strength: PasswordStrength): string => {
  switch (strength) {
    case 'strong':
      return 'bg-green-500';
    case 'medium':
      return 'bg-yellow-500';
    case 'weak':
      return 'bg-red-500';
  }
};
