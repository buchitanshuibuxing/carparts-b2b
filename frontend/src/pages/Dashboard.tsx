import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Package, ShoppingCart, AlertTriangle, Warehouse, TrendingUp, PieChart as PieChartIcon } from 'lucide-react';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { StatCard } from '@/components/ui/StatCard';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import api from '@/lib/api';

import { useToast } from '@/components/ui/Toast';
const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16'];

const ORDER_STATUS_MAP: Record<string, { label: string; color: string }> = {
  pending: { label: '待确认', color: 'yellow' },
  confirmed: { label: '已确认', color: 'blue' },
  shipped: { label: '已发货', color: 'purple' },
  completed: { label: '已完成', color: 'green' },
  cancelled: { label: '已取消', color: 'gray' },
};

export default function Dashboard() {
  const { success, error, warning } = useToast();
  const navigate = useNavigate();
  const [orderStats, setOrderStats] = useState<any>(null);
  const [partsTotal, setPartsTotal] = useState(0);
  const [inventoryTotal, setInventoryTotal] = useState(0);
  const [lowStock, setLowStock] = useState<any[]>([]);
  const [recentOrders, setRecentOrders] = useState<any[]>([]);
  const [categories, setCategories] = useState<{ name: string; count: number }[]>([]);
  const [salesTrend, setSalesTrend] = useState<any[]>([]);

  useEffect(() => {
    // Order stats
    api.get('/orders/stats').then(r => setOrderStats(r.data.data || r.data)).catch(() => {});
    // Parts total count
    api.get('/parts?pageSize=1').then(r => setPartsTotal(r.data.total || 0)).catch(() => {});
    // Inventory total (sum of all quantities)
    api.get('/inventory?pageSize=100').then(r => {
      const items = r.data.items || r.data.data || [];
      const total = items.reduce((sum: number, i: any) => sum + (i.quantity || 0), 0);
      setInventoryTotal(total);
    }).catch(() => {});
    // Low stock alerts
    api.get('/inventory/low-stock?limit=8').then(r => setLowStock(r.data.data || r.data || [])).catch(() => {});
    // Recent orders
    api.get('/orders?pageSize=5').then(r => setRecentOrders(r.data.items || r.data.data || [])).catch(() => {});
    // Categories distribution
    api.get('/inventory?pageSize=200').then(r => {
      const items = r.data.items || r.data.data || [];
      const catMap: Record<string, number> = {};
      items.forEach((i: any) => {
        const cat = i.part?.category || i.category || '未分类';
        catMap[cat] = (catMap[cat] || 0) + (i.quantity || 0);
      });
      setCategories(Object.entries(catMap)
        .map(([name, count]) => ({ name, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 8)
      );
    }).catch(() => {});
    // Sales trend (recent orders grouped by month)
    api.get('/orders?pageSize=100').then(r => {
      const items = r.data.items || r.data.data || [];
      const monthMap: Record<string, { orders: number; revenue: number }> = {};
      items.forEach((o: any) => {
        const d = new Date(o.orderDate || o.createdAt);
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        if (!monthMap[key]) monthMap[key] = { orders: 0, revenue: 0 };
        monthMap[key].orders += 1;
        monthMap[key].revenue += Number(o.totalAmount) || 0;
      });
      const trend = Object.entries(monthMap)
        .sort(([a], [b]) => a.localeCompare(b))
        .slice(-6)
        .map(([month, data]) => ({ month: month.slice(5), ...data }));
      setSalesTrend(trend);
    }).catch(() => {});
  }, []);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">仪表盘</h1>

      {/* Stats row */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="总配件数" value={partsTotal} icon={<Package size={24} />} color="blue" />
        <StatCard title="总库存数" value={inventoryTotal} icon={<Warehouse size={24} />} color="green" />
        <StatCard title="本月订单" value={orderStats?.current_month_total ?? '-'} icon={<ShoppingCart size={24} />} color="yellow" />
        <StatCard title="待处理订单" value={orderStats?.pending_orders ?? '-'} icon={<AlertTriangle size={24} />} color="red" />
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <Card.Header>
            <h3 className="flex items-center gap-2 font-semibold">
              <TrendingUp size={18} /> 销售趋势
            </h3>
          </Card.Header>
          <Card.Body>
            {salesTrend.length > 0 ? (
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={salesTrend}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                  <YAxis yAxisId="left" tick={{ fontSize: 12 }} />
                  <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 12 }} />
                  <Tooltip />
                  <Legend />
                  <Bar yAxisId="left" dataKey="orders" name="订单数" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                  <Bar yAxisId="right" dataKey="revenue" name="营收" fill="#10b981" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-[280px] text-gray-400">暂无数据</div>
            )}
          </Card.Body>
        </Card>

        <Card>
          <Card.Header>
            <h3 className="flex items-center gap-2 font-semibold">
              <PieChartIcon size={18} /> 配件品类分布
            </h3>
          </Card.Header>
          <Card.Body>
            {categories.length > 0 ? (
              <ResponsiveContainer width="100%" height={280}>
                <PieChart>
                  <Pie data={categories} dataKey="count" nameKey="name" cx="50%" cy="50%"
                    outerRadius={100} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                    {categories.map((_, i) => (
                      <Cell key={i} fill={COLORS[i % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-[280px] text-gray-400">暂无数据</div>
            )}
          </Card.Body>
        </Card>
      </div>

      {/* Bottom row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <Card.Header>
            <div className="flex items-center justify-between w-full">
              <h3 className="flex items-center gap-2 font-semibold">
                <AlertTriangle size={18} className="text-red-500" /> 低库存预警
              </h3>
              {lowStock.length > 0 && (
                <Badge color="red">{lowStock.length} 项</Badge>
              )}
            </div>
          </Card.Header>
          <Card.Body>
            {lowStock.length === 0 ? (
              <p className="py-8 text-center text-gray-400">库存充足</p>
            ) : (
              <div className="divide-y divide-gray-100">
                {lowStock.map((item: any, i: number) => (
                  <div key={i} className="flex items-center justify-between py-3">
                    <div>
                      <p className="text-sm font-medium">{item.oe_number || item.part?.oe_number || '-'}</p>
                      <p className="text-xs text-gray-500">{item.part_name_cn || item.part?.part_name_cn || ''}</p>
                    </div>
                    <div className="text-right">
                      <span className="text-sm font-bold text-red-600">{item.quantity}</span>
                      <span className="text-xs text-gray-400"> / {item.min_stock || item.minStock || 0}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card.Body>
        </Card>

        <Card>
          <Card.Header>
            <div className="flex items-center justify-between w-full">
              <h3 className="flex items-center gap-2 font-semibold">
                <ShoppingCart size={18} /> 最近订单
              </h3>
              <button onClick={() => navigate('/orders')} className="text-sm text-blue-600 hover:underline">
                查看全部
              </button>
            </div>
          </Card.Header>
          <Card.Body>
            {recentOrders.length === 0 ? (
              <p className="py-8 text-center text-gray-400">暂无订单</p>
            ) : (
              <div className="divide-y divide-gray-100">
                {recentOrders.map((order: any) => {
                  const st = ORDER_STATUS_MAP[order.status] || { label: order.status, color: 'gray' };
                  return (
                    <div key={order.id} className="flex items-center justify-between py-3">
                      <div>
                        <p className="text-sm font-medium">{order.orderNumber || order.order_number || `#${order.id}`}</p>
                        <p className="text-xs text-gray-500">
                          {new Date(order.orderDate || order.createdAt).toLocaleDateString('zh-CN')}
                        </p>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-sm font-medium">
                          {order.currency || 'USD'} {Number(order.totalAmount || 0).toLocaleString()}
                        </span>
                        <Badge color={st.color}>{st.label}</Badge>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </Card.Body>
        </Card>
      </div>
    </div>
  );
}
