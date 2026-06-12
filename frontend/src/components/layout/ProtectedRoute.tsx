import { Navigate, Outlet } from 'react-router-dom';
import { useAuthStore } from '@/stores/useAuthStore';

export function ProtectedRoute() {
  const { isLoggedIn, isLoading } = useAuthStore();
  if (isLoading) return <div className="flex items-center justify-center h-screen">加载中...</div>;
  if (!isLoggedIn) return <Navigate to="/login" replace />;
  return <Outlet />;
}
