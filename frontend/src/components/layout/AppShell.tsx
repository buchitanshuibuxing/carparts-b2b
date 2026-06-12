import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { useUiStore } from '@/stores/useUiStore';

export function AppShell() {
  const { sidebarCollapsed } = useUiStore();
  return (
    <div className="flex h-screen bg-[#f0f4f8]">
      <Sidebar />
      <div className={`flex-1 flex flex-col transition-all duration-200 ${sidebarCollapsed ? 'ml-16' : 'ml-64'}`}>
        <Header />
        <main className="flex-1 overflow-auto p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
