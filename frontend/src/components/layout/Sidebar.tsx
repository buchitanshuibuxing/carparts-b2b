import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard, Package, Warehouse, Users, UserCircle,
  DollarSign, ShoppingCart, FileText, CreditCard, Image, Share2, Upload, Settings, ChevronLeft, ChevronRight
} from 'lucide-react';
import { useUiStore } from '@/stores/useUiStore';
import { useAuthStore } from '@/stores/useAuthStore';

const navItems = [
  { to: '/', icon: LayoutDashboard, label: '仪表盘', module: null },
  { to: '/assets', icon: Image, label: '素材管理', module: 'assets' },
  { to: '/parts', icon: Package, label: '配件目录', module: 'parts' },
  { to: '/inventory', icon: Warehouse, label: '库存管理', module: 'inventory' },
  { to: '/suppliers', icon: Users, label: '供应商', module: 'suppliers' },
  { to: '/customers', icon: UserCircle, label: '客户', module: 'customers' },
  { to: '/pricing', icon: DollarSign, label: '价格管理', module: 'prices' },
  { to: '/orders', icon: ShoppingCart, label: '订单', module: 'orders' },
  { to: '/quotations', icon: FileText, label: '报价', module: 'quotations' },
  { to: '/payment-accounts', icon: CreditCard, label: '付款信息', module: null },
  { to: '/facebook', icon: Share2, label: 'Facebook', module: null },
  { to: '/import', icon: Upload, label: '数据导入', module: null },
  { to: '/settings', icon: Settings, label: '设置', module: 'settings' },
];

export function Sidebar() {
  const { sidebarCollapsed, toggleSidebar } = useUiStore();
  const { user } = useAuthStore();
  const isAdmin = user?.role === 'admin';

  // Check if user has view permission for a module
  const hasViewPermission = (module: string | null) => {
    if (!module) return true; // No permission required
    if (isAdmin) return true; // Admin has all permissions
    if (!user?.permissions) return false; // No permissions loaded
    const perm = user.permissions.find(p => p.module === module);
    return perm?.can_view === true;
  };

  // Filter nav items based on permissions
  const visibleNavItems = navItems.filter(item => hasViewPermission(item.module));

  return (
    <aside className={`fixed left-0 top-0 h-full bg-white text-gray-900 shadow-[1px_0_8px_rgba(0,0,0,0.04)] transition-all duration-200 z-30 ${sidebarCollapsed ? 'w-16' : 'w-64'}`}>
      <div className="flex items-center justify-between h-16 px-4 border-b border-gray-100/80">
        {!sidebarCollapsed && <span className="text-lg font-bold bg-gradient-to-r from-blue-600 to-blue-500 bg-clip-text text-transparent">CarParts B2B</span>}
        <button onClick={toggleSidebar} className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-400 hover:text-gray-600 transition-colors">
          {sidebarCollapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
        </button>
      </div>
      <nav className="mt-4 px-2 space-y-0.5">
        {visibleNavItems.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to} to={to} end={to === '/'}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all duration-150 ${
                isActive ? 'bg-blue-50 text-blue-600 font-medium shadow-sm' : 'text-gray-500 hover:bg-gray-50 hover:text-gray-700'
              }`
            }
          >
            <Icon size={20} />
            {!sidebarCollapsed && <span>{label}</span>}
          </NavLink>
        ))}
        {isAdmin && (
          <NavLink
            to="/users"
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all duration-150 ${
                isActive ? 'bg-blue-50 text-blue-600 font-medium shadow-sm' : 'text-gray-500 hover:bg-gray-50 hover:text-gray-700'
              }`
            }
          >
            <Settings size={20} />
            {!sidebarCollapsed && <span>用户管理</span>}
          </NavLink>
        )}
      </nav>
    </aside>
  );
}
