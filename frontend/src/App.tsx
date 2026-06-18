import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useEffect } from 'react';
import { useAuthStore } from '@/stores/useAuthStore';
import { ProtectedRoute } from '@/components/layout/ProtectedRoute';
import { AppShell } from '@/components/layout/AppShell';
import { ErrorBoundary } from '@/components/ui/ErrorBoundary';
import { ToastProvider } from '@/components/ui/Toast';
import { ConfirmProvider } from '@/components/ui/ConfirmDialog';
import api from '@/lib/api';
import Login from '@/pages/Login';
import Dashboard from '@/pages/Dashboard';
import PartsCatalog from '@/pages/PartsCatalog';
import PartDetail from '@/pages/PartDetail';
import Inventory from '@/pages/Inventory';
import Suppliers from '@/pages/Suppliers';
import Customers from '@/pages/Customers';
import Orders from '@/pages/Orders';
import OrderDetail from '@/pages/OrderDetail';
import Pricing from '@/pages/Pricing';
import Quotations from '@/pages/Quotations';
import PaymentAccounts from '@/pages/PaymentAccounts';
import Assets from '@/pages/Assets';
import Facebook from '@/pages/Facebook';
import ImportData from '@/pages/ImportData';
import Settings from '@/pages/Settings';
import UserManagement from '@/pages/UserManagement';
import NotFound from '@/pages/NotFound';

function useSiteSettings() {
  useEffect(() => {
    const loadSettings = async () => {
      try {
        const { data } = await api.get('/settings');
        const settings = data.data || data || {};

        // 设置页面标题
        const companyName = settings.company_name;
        if (companyName) {
          document.title = companyName;
        }

        // 设置 favicon
        const logoUrl = settings.company_logo_url;
        if (logoUrl) {
          let link = document.querySelector("link[rel~='icon']") as HTMLLinkElement;
          if (!link) {
            link = document.createElement('link');
            link.rel = 'icon';
            document.head.appendChild(link);
          }
          link.href = logoUrl;
        }
      } catch {
        // 忽略错误，使用默认值
      }
    };
    loadSettings();
  }, []);
}

function App() {
  const checkAuth = useAuthStore((s) => s.checkAuth);
  const isLoading = useAuthStore((s) => s.isLoading);

  useSiteSettings();

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
      </div>
    );
  }

  return (
    <ErrorBoundary>
      <ToastProvider>
        <ConfirmProvider>
          <BrowserRouter>
            <Routes>
              <Route path="/login" element={<Login />} />
              <Route element={<ProtectedRoute />}>
                <Route element={<AppShell />}>
                  <Route index element={<Navigate to="/dashboard" replace />} />
                  <Route path="dashboard" element={<Dashboard />} />
                  <Route path="parts" element={<PartsCatalog />} />
                  <Route path="parts/:id" element={<PartDetail />} />
                  <Route path="inventory" element={<Inventory />} />
                  <Route path="suppliers" element={<Suppliers />} />
                  <Route path="customers" element={<Customers />} />
                  <Route path="orders" element={<Orders />} />
                  <Route path="orders/:id" element={<OrderDetail />} />
                  <Route path="pricing" element={<Pricing />} />
                  <Route path="quotations" element={<Quotations />} />
                  <Route path="payment-accounts" element={<PaymentAccounts />} />
                  <Route path="assets" element={<Assets />} />
                  <Route path="facebook" element={<Facebook />} />
                  <Route path="import" element={<ImportData />} />
                  <Route path="settings" element={<Settings />} />
                  <Route path="users" element={<UserManagement />} />
                </Route>
              </Route>
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </ConfirmProvider>
      </ToastProvider>
    </ErrorBoundary>
  );
}

export default App;
