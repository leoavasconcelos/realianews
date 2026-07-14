import React from 'react';
import Logo from './Logo';
import { Bell, Search } from 'lucide-react';
import { Button } from './ui/button';

interface FeedHeaderProps {
  onSearchClick?: () => void;
  onNotificationsClick?: () => void;
  onLogoClick?: () => void;
  unreadCount?: number;
}

const EDITION_DATE = new Intl.DateTimeFormat('pt-BR', {
  weekday: 'long',
  day: 'numeric',
  month: 'long',
}).format(new Date());

const FeedHeader: React.FC<FeedHeaderProps> = ({ onSearchClick, onNotificationsClick, onLogoClick, unreadCount = 0 }) => {
  return (
    <header className="sticky top-0 bg-background/95 backdrop-blur-lg z-40">
      <div className="flex items-center justify-between px-4 pt-3 pb-1">
        <button
          onClick={onLogoClick}
          className="focus:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-md"
          aria-label="Recarregar feed"
        >
          <Logo size="sm" showText={true} useGradientText />
        </button>
        
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            onClick={onSearchClick}
            className="h-9 w-9"
            aria-label="Buscar notícias"
          >
            <Search className="w-5 h-5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={onNotificationsClick}
            className="h-9 w-9 relative"
            aria-label="Notificações"
          >
            <Bell className="w-5 h-5" />
            {unreadCount > 0 && (
              <span className="absolute top-1 right-1 min-w-[16px] h-4 px-1 rounded-full bg-accent text-[10px] font-bold text-accent-foreground flex items-center justify-center">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </Button>
        </div>
      </div>
      {/* Edition line — a print-masthead convention: dateline above the rule */}
      <div className="px-4 pb-2">
        <p className="text-[11px] text-muted-foreground tracking-wide capitalize">
          {EDITION_DATE}
        </p>
      </div>
      {/* Accent rule */}
      <div className="accent-line" />
    </header>
  );
};

export default FeedHeader;