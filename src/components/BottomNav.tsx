import React from 'react';
import { Home, Compass, Bookmark, Users, GraduationCap, User } from 'lucide-react';

interface NavItem {
  id: string;
  label: string;
  icon: React.ReactNode;
}

interface BottomNavProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

const navItems: NavItem[] = [
  { id: 'mercado', label: 'Mercado', icon: <Home className="w-5 h-5" /> },
  { id: 'explorar', label: 'Explorar', icon: <Compass className="w-5 h-5" /> },
  { id: 'salvos', label: 'Salvos', icon: <Bookmark className="w-5 h-5" /> },
  { id: 'comunidade', label: 'Comunidade', icon: <Users className="w-5 h-5" /> },
  { id: 'academia', label: 'Academia', icon: <GraduationCap className="w-5 h-5" /> },
  { id: 'perfil', label: 'Perfil', icon: <User className="w-5 h-5" /> },
];

const BottomNav: React.FC<BottomNavProps> = ({ activeTab, onTabChange }) => {
  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-card/95 backdrop-blur-lg z-50">
      {/* Brass accent hairline at top */}
      <div className="accent-line" />
      <div className="max-w-lg mx-auto">
        <div className="flex items-center justify-around py-2 px-2">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => onTabChange(item.id)}
              className={`bottom-nav-item relative flex-1 ${activeTab === item.id ? 'active' : ''}`}
            >
              <div className={`transition-transform duration-200 ${activeTab === item.id ? 'scale-110' : ''}`}>
                {item.icon}
              </div>
              <span className={`text-[10px] leading-tight ${activeTab === item.id ? 'font-semibold' : 'font-medium'}`}>
                {item.label}
              </span>
              {activeTab === item.id && (
                <div className="absolute -bottom-1 w-5 h-[2.5px] rounded-full bg-accent" />
              )}
            </button>
          ))}
        </div>
      </div>
      {/* Safe area for mobile */}
      <div className="h-safe-area-inset-bottom bg-card" />
    </nav>
  );
};

export default BottomNav;