import React from 'react';
import { Construction } from 'lucide-react';

interface PlaceholderScreenProps {
  title: string;
  description: string;
  icon?: React.ReactNode;
}

const PlaceholderScreen = React.forwardRef<HTMLDivElement, PlaceholderScreenProps>(
  ({ title, description, icon }, ref) => {
    return (
      <div ref={ref} className="flex-1 flex flex-col items-center justify-center px-8 py-16 text-center">
        <div className="w-20 h-20 rounded-2xl bg-secondary flex items-center justify-center mb-6">
          {icon || <Construction className="w-10 h-10 text-muted-foreground" />}
        </div>
        <h2 className="text-xl font-bold text-foreground mb-2">{title}</h2>
        <p className="text-muted-foreground max-w-sm">{description}</p>
      </div>
    );
  }
);

PlaceholderScreen.displayName = 'PlaceholderScreen';

export default PlaceholderScreen;
