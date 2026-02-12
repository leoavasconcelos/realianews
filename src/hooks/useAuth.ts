// Re-export from AuthContext for backward compatibility
// All auth state is now managed by a single AuthProvider instance
export { useAuthContext as useAuth } from '@/contexts/AuthContext';
export type { Profile } from '@/contexts/AuthContext';
