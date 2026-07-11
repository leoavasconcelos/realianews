import React from 'react';
import realiaLogo from '@/assets/realia-logo.png';

interface LogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showText?: boolean;
  useGradientText?: boolean;
  className?: string;
}

const Logo = React.forwardRef<HTMLDivElement, LogoProps>(
  ({ size = 'md', showText = true, useGradientText = false, className = '' }, ref) => {
    const sizeClasses = {
      sm: 'w-10 h-10',
      md: 'w-12 h-12',
      lg: 'w-16 h-16',
      xl: 'w-24 h-24',
    };

    const textSizeClasses = {
      sm: 'text-lg',
      md: 'text-xl',
      lg: 'text-2xl',
      xl: 'text-4xl',
    };

    return (
      <div ref={ref} className={`flex items-center gap-3 ${className}`}>
        <img
          src={realiaLogo}
          alt="REalia"
          className={`${sizeClasses[size]} object-contain`}
        />

        {showText && (
          <div className="flex flex-col">
            <span className={`font-serif font-semibold tracking-tight ${textSizeClasses[size]} ${useGradientText ? 'text-gradient-brand' : 'text-foreground'}`}>
              REalia
            </span>
            {size !== 'sm' && (
              <span className="text-xs text-muted-foreground font-medium tracking-wide">
                Inteligência Imobiliária
              </span>
            )}
          </div>
        )}
      </div>
    );
  }
);

Logo.displayName = 'Logo';

export default Logo;