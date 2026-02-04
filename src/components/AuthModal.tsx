import React from 'react';
import { X } from 'lucide-react';
import { Button } from './ui/button';
import Logo from './Logo';
import AuthModalContent from './AuthModalContent';

interface AuthModalProps {
  onClose: () => void;
}

const AuthModal: React.FC<AuthModalProps> = ({ onClose }) => {
  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-card rounded-2xl w-full max-w-md shadow-xl animate-scale-in">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border">
          <Logo size="sm" />
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="w-5 h-5" />
          </Button>
        </div>

        {/* Content */}
        <div className="p-6">
          <AuthModalContent onSuccess={onClose} />
        </div>
      </div>
    </div>
  );
};

export default AuthModal;
