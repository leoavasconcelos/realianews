import React from 'react';
import { Bell, CheckCheck, Trash2, UserCog, Newspaper, KeyRound, LogIn, Loader2 } from 'lucide-react';
import { useNotifications, useMarkNotificationRead, useMarkAllRead, useClearNotifications, UserNotification } from '@/hooks/useNotifications';
import { Button } from './ui/button';
import { ScrollArea } from './ui/scroll-area';

interface NotificationCenterProps {
  userId: string;
}

const typeIcons: Record<string, React.ReactNode> = {
  news_alert: <Newspaper className="w-4 h-4 text-primary" />,
  profile_updated: <UserCog className="w-4 h-4 text-accent" />,
  password_changed: <KeyRound className="w-4 h-4 text-destructive" />,
  account_login: <LogIn className="w-4 h-4 text-muted-foreground" />,
};

const formatDate = (iso: string) => {
  const d = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return 'Agora';
  if (diffMin < 60) return `${diffMin}min atrás`;
  const diffH = Math.floor(diffMin / 60);
  if (diffH < 24) return `${diffH}h atrás`;
  const diffD = Math.floor(diffH / 24);
  if (diffD === 1) return 'Ontem';
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
};

const NotificationCenter: React.FC<NotificationCenterProps> = ({ userId }) => {
  const { data: notifications, isLoading, unreadCount } = useNotifications(userId);
  const markRead = useMarkNotificationRead();
  const markAll = useMarkAllRead();
  const clearAll = useClearNotifications();

  const handleMarkRead = (n: UserNotification) => {
    if (!n.is_read) {
      markRead.mutate({ id: n.id, userId });
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Actions bar */}
      {notifications && notifications.length > 0 && (
        <div className="flex items-center justify-between px-1 pb-3 border-b border-border">
          <span className="text-xs text-muted-foreground">
            {unreadCount > 0 ? `${unreadCount} não lida${unreadCount > 1 ? 's' : ''}` : 'Tudo lido'}
          </span>
          <div className="flex gap-1">
            {unreadCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                className="text-xs h-7"
                onClick={() => markAll.mutate(userId)}
                disabled={markAll.isPending}
              >
                <CheckCheck className="w-3.5 h-3.5 mr-1" />
                Marcar tudo
              </Button>
            )}
            <Button
              variant="ghost"
              size="sm"
              className="text-xs h-7 text-destructive hover:text-destructive"
              onClick={() => clearAll.mutate(userId)}
              disabled={clearAll.isPending}
            >
              <Trash2 className="w-3.5 h-3.5 mr-1" />
              Limpar
            </Button>
          </div>
        </div>
      )}

      {/* List */}
      <ScrollArea className="flex-1 max-h-[400px]">
        {!notifications || notifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-3">
              <Bell className="w-6 h-6 text-primary" />
            </div>
            <p className="text-sm font-medium text-foreground">Nenhuma notificação</p>
            <p className="text-xs text-muted-foreground mt-1">
              Você será notificado sobre novas notícias e atividade da conta.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {notifications.map((n) => (
              <button
                key={n.id}
                onClick={() => handleMarkRead(n)}
                className={`w-full flex items-start gap-3 px-2 py-3 text-left transition-colors hover:bg-secondary/50 rounded-lg ${
                  !n.is_read ? 'bg-primary/5' : ''
                }`}
              >
                <div className="mt-0.5 shrink-0">
                  {typeIcons[n.type] || <Bell className="w-4 h-4 text-muted-foreground" />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className={`text-sm truncate ${!n.is_read ? 'font-semibold text-foreground' : 'text-foreground'}`}>
                      {n.title}
                    </p>
                    {!n.is_read && (
                      <span className="w-2 h-2 rounded-full bg-primary shrink-0" />
                    )}
                  </div>
                  {n.body && (
                    <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">{n.body}</p>
                  )}
                  <p className="text-[10px] text-muted-foreground mt-1">
                    {formatDate(n.created_at)}
                  </p>
                </div>
              </button>
            ))}
          </div>
        )}
      </ScrollArea>
    </div>
  );
};

export default NotificationCenter;
