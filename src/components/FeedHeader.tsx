import React from 'react';
import Logo from './Logo';
import { Bell, Search } from 'lucide-react';
import { Button } from './ui/button';

interface FeedHeaderProps {
  onSearchClick?: () => void;
  onNotificationsClick?: () => void;
}

const FeedHeader: React.FC<FeedHeaderProps> = ({ onSearchClick, onNotificationsClick }) => {
  return (
    <header className="sticky top-0 bg-background/95 backdrop-blur-lg border-b border-border z-40">
      <div className="flex items-center justify-between px-4 py-3">
        <Logo size="sm" showText={true} />
        
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            onClick={onSearchClick}
            className="h-9 w-9"
          >
            <Search className="w-5 h-5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={onNotificationsClick}
            className="h-9 w-9 relative"
          >
            <Bell className="w-5 h-5" />
            {/* Notification dot */}
            <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-accent" />
          </Button>
        </div>
      </div>
    </header>
  );
};

export default FeedHeader;
