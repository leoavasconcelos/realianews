import React from 'react';

interface LogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showText?: boolean;
  className?: string;
}

const Logo: React.FC<LogoProps> = ({ size = 'md', showText = true, className = '' }) => {
  const sizeClasses = {
    sm: 'w-8 h-8',
    md: 'w-10 h-10',
    lg: 'w-14 h-14',
    xl: 'w-20 h-20',
  };

  const textSizeClasses = {
    sm: 'text-lg',
    md: 'text-xl',
    lg: 'text-2xl',
    xl: 'text-4xl',
  };

  return (
    <div className={`flex items-center gap-3 ${className}`}>
      {/* Metallic Logo Icon */}
      <div className={`${sizeClasses[size]} relative`}>
        <div className="absolute inset-0 rounded-xl bg-gradient-hero opacity-90" />
        <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-white/20 to-transparent" />
        <div className="relative w-full h-full flex items-center justify-center">
          <svg
            viewBox="0 0 40 40"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className="w-3/4 h-3/4"
          >
            {/* Building/Real Estate Icon */}
            <path
              d="M8 32V16L20 8L32 16V32H24V24H16V32H8Z"
              fill="white"
              fillOpacity="0.95"
            />
            <path
              d="M18 18H22V22H18V18Z"
              fill="currentColor"
              className="text-navy"
            />
            {/* Metallic shine effect */}
            <path
              d="M8 16L20 8L32 16"
              stroke="white"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeOpacity="0.6"
            />
          </svg>
        </div>
        {/* Subtle metallic reflection */}
        <div className="absolute inset-0 rounded-xl bg-gradient-to-t from-transparent via-white/5 to-white/10 pointer-events-none" />
      </div>
      
      {showText && (
        <div className="flex flex-col">
          <span className={`font-bold tracking-tight text-foreground ${textSizeClasses[size]}`}>
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
};

export default Logo;
