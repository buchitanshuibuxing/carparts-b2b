import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Package, ShoppingCart, AlertTriangle, Warehouse, Plus, Trash2, Check, CheckCircle2, Clock, Tag, Calendar, MoreHorizontal, Edit3, Save, X, ChevronDown } from 'lucide-react';
import { StatCard } from '@/components/ui/StatCard';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import api from '@/lib/api';
import { useToast } from '@/components/ui/Toast';

const ORDER_STATUS_MAP: Record<string, { label: string; color: string }> = {
  pending: { label: '待确认', color: 'yellow' },
  confirmed: { label: '已确认', color: 'blue' },
  shipped: { label: '已发货', color: 'purple' },
  completed: { label: '已完成', color: 'green' },
  cancelled: { label: '已取消', color: 'gray' },
};

interface Todo {
  id: number;
  content: string;
  priority: string;
  isDone: boolean;
  dueDate?: string;
  tag?: string;
  createdAt: string;
  updatedAt: string;
}

// 相对时间函数
function timeAgo(dateStr: string): string {
  const now = new Date();
  const date = new Date(dateStr);
  const diff = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (diff < 60) return '刚刚';
  if (diff < 3600) return `${Math.floor(diff / 60)}分钟前`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}小时前`;
  if (diff < 2592000) return `${Math.floor(diff / 86400)}天前`;
  return date.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' });
}

// 标签颜色映射
const TAG_COLORS: Record<string, string> = {
  '采购': 'bg-blue-100 text-blue-700',
  '销售': 'bg-green-100 text-green-700',
  '物流': 'bg-purple-100 text-purple-700',
  '客服': 'bg-orange-100 text-orange-700',
  '其他': 'bg-gray-100 text-gray-700',
};

const TAG_OPTIONS = ['采购', '销售', '物流', '客服', '其他'];

function TodoList({ priority, title, accentColor }: { priority: string; title: string; accentColor: 'red' | 'amber' }) {
  const [todos, setTodos] = useState<Todo[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editContent, setEditContent] = useState('');
  const [showTagMenu, setShowTagMenu] = useState<number | null>(null);
  const [selectedTag, setSelectedTag] = useState<string>('');
  const [dueDate, setDueDate] = useState<string>('');
  const [showDatePicker, setShowDatePicker] = useState<number | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const editInputRef = useRef<HTMLInputElement>(null);
  const { error: showError, success } = useToast();

  const colorMap = {
    red: {
      border: 'border-l-red-500',
      bg: 'bg-red-50',
      text: 'text-red-700',
      btn: 'bg-red-500 hover:bg-red-600',
      check: 'text-red-500',
      badge: 'bg-red-100 text-red-700',
      ring: 'focus:ring-red-200',
      dot: 'bg-red-400',
      progress: 'bg-red-500',
    },
    amber: {
      border: 'border-l-amber-500',
      bg: 'bg-amber-50',
      text: 'text-amber-700',
      btn: 'bg-amber-500 hover:bg-amber-600',
      check: 'text-amber-500',
      badge: 'bg-amber-100 text-amber-700',
      ring: 'focus:ring-amber-200',
      dot: 'bg-amber-400',
      progress: 'bg-amber-500',
    },
  };
  const c = colorMap[accentColor];

  const fetchTodos = async () => {
    try {
      const res = await api.get(`/todos?priority=${priority}`);
      setTodos(Array.isArray(res.data) ? res.data : []);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchTodos(); }, [priority]);

  const addTodo = async () => {
    const content = input.trim();
    if (!content) return;
    try {
      const res = await api.post('/todos', {
        content,
        priority,
        tag: selectedTag || undefined,
        dueDate: dueDate || undefined,
      });
      setTodos(prev => [res.data, ...prev]);
      setInput('');
      setSelectedTag('');
      setDueDate('');
      inputRef.current?.focus();
      success('添加成功');
    } catch {
      showError('添加失败');
    }
  };

  const toggleDone = async (todo: Todo) => {
    try {
      const res = await api.patch(`/todos/${todo.id}`, { isDone: !todo.isDone });
      setTodos(prev => prev.map(t => t.id === todo.id ? res.data : t));
    } catch {
      showError('更新失败');
    }
  };

  const deleteTodo = async (id: number) => {
    try {
      await api.delete(`/todos/${id}`);
      setTodos(prev => prev.filter(t => t.id !== id));
      success('已删除');
    } catch {
      showError('删除失败');
    }
  };

  const startEdit = (todo: Todo) => {
    setEditingId(todo.id);
    setEditContent(todo.content);
    setTimeout(() => editInputRef.current?.focus(), 100);
  };

  const saveEdit = async (id: number) => {
    const content = editContent.trim();
    if (!content) return;
    try {
      const res = await api.patch(`/todos/${id}`, { content });
      setTodos(prev => prev.map(t => t.id === id ? res.data : t));
      setEditingId(null);
      success('已更新');
    } catch {
      showError('更新失败');
    }
  };

  const updateTag = async (id: number, tag: string) => {
    try {
      const res = await api.patch(`/todos/${id}`, { tag });
      setTodos(prev => prev.map(t => t.id === id ? res.data : t));
      setShowTagMenu(null);
    } catch {
      showError('更新失败');
    }
  };

  const updateDueDate = async (id: number, date: string) => {
    try {
      const res = await api.patch(`/todos/${id}`, { dueDate: date || null });
      setTodos(prev => prev.map(t => t.id === id ? res.data : t));
      setShowDatePicker(null);
    } catch {
      showError('更新失败');
    }
  };

  const clearDone = async () => {
    const doneTodos = todos.filter(t => t.isDone);
    if (doneTodos.length === 0) return;
    try {
      await Promise.all(doneTodos.map(t => api.delete(`/todos/${t.id}`)));
      setTodos(prev => prev.filter(t => !t.isDone));
      success(`已清除 ${doneTodos.length} 项`);
    } catch {
      showError('清除失败');
    }
  };

  const markAllDone = async () => {
    const pendingTodos = todos.filter(t => !t.isDone);
    if (pendingTodos.length === 0) return;
    try {
      const results = await Promise.all(pendingTodos.map(t => api.patch(`/todos/${t.id}`, { isDone: true })));
      setTodos(prev => prev.map(t => {
        const updated = results.find(r => r.data.id === t.id);
        return updated ? updated.data : t;
      }));
      success(`已完成 ${pendingTodos.length} 项`);
    } catch {
      showError('操作失败');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') addTodo();
  };

  const pending = todos.filter(t => !t.isDone);
  const done = todos.filter(t => t.isDone);
  const total = todos.length;
  const doneCount = done.length;
  const progress = total > 0 ? Math.round((doneCount / total) * 100) : 0;

  // 检查是否逾期
  const isOverdue = (dueDate?: string) => {
    if (!dueDate) return false;
    return new Date(dueDate) < new Date() && new Date(dueDate).toDateString() !== new Date().toDateString();
  };

  return (
    <div className="flex flex-col h-full">
      {/* 进度条 */}
      {total > 0 && (
        <div className="mb-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-gray-500">进度</span>
            <span className="text-xs font-medium text-gray-700">{doneCount}/{total} ({progress}%)</span>
          </div>
          <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
            <div
              className={`h-full ${c.progress} rounded-full transition-all duration-500 ease-out`}
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      )}

      {/* 输入区域 */}
      <div className="mb-4 space-y-2">
        <div className="flex gap-2">
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="添加新待办..."
            className={`flex-1 px-3 py-2.5 text-sm border border-gray-200 rounded-lg outline-none focus:ring-2 ${c.ring} focus:border-transparent transition-all placeholder:text-gray-400`}
          />
          <button
            onClick={addTodo}
            disabled={!input.trim()}
            className={`px-3 py-2.5 ${c.btn} text-white rounded-lg disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex items-center gap-1 text-sm font-medium`}
          >
            <Plus size={16} />
          </button>
        </div>

        {/* 标签和日期选择 */}
        <div className="flex gap-2">
          <select
            value={selectedTag}
            onChange={e => setSelectedTag(e.target.value)}
            className="flex-1 px-2 py-1.5 text-xs border border-gray-200 rounded-lg outline-none focus:ring-1 focus:ring-gray-200 bg-white"
          >
            <option value="">选择标签...</option>
            {TAG_OPTIONS.map(tag => (
              <option key={tag} value={tag}>{tag}</option>
            ))}
          </select>
          <input
            type="date"
            value={dueDate}
            onChange={e => setDueDate(e.target.value)}
            className="flex-1 px-2 py-1.5 text-xs border border-gray-200 rounded-lg outline-none focus:ring-1 focus:ring-gray-200"
          />
        </div>
      </div>

      {/* 批量操作 */}
      {total > 0 && (
        <div className="flex gap-2 mb-3">
          <button
            onClick={markAllDone}
            disabled={pending.length === 0}
            className="flex-1 px-2 py-1.5 text-xs text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            全部完成
          </button>
          <button
            onClick={clearDone}
            disabled={done.length === 0}
            className="flex-1 px-2 py-1.5 text-xs text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            清除已完成
          </button>
        </div>
      )}

      {/* 待办列表 */}
      {loading ? (
        <div className="flex-1 flex items-center justify-center text-gray-400 text-sm">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-gray-300 mr-2"></div>
          加载中...
        </div>
      ) : todos.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center text-gray-400 gap-3 py-8">
          <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center">
            <CheckCircle2 size={32} className="text-gray-300" />
          </div>
          <div className="text-center">
            <p className="text-sm font-medium text-gray-500">暂无待办事项</p>
            <p className="text-xs text-gray-400 mt-1">在上方输入框添加你的第一个待办</p>
          </div>
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto space-y-2 pr-1">
          {/* 待完成 */}
          {pending.map((todo, index) => (
            <div
              key={todo.id}
              className={`group relative flex items-start gap-3 px-3 py-3 rounded-xl border-l-3 ${c.border} bg-white hover:bg-gray-50 hover:shadow-sm transition-all duration-200 animate-fade-in`}
              style={{ animationDelay: `${index * 50}ms` }}
            >
              <button
                onClick={() => toggleDone(todo)}
                className={`mt-0.5 flex-shrink-0 w-5 h-5 rounded-full border-2 border-gray-300 hover:border-${accentColor}-500 transition-colors flex items-center justify-center`}
              >
              </button>
              <div className="flex-1 min-w-0">
                {editingId === todo.id ? (
                  <div className="flex gap-2">
                    <input
                      ref={editInputRef}
                      type="text"
                      value={editContent}
                      onChange={e => setEditContent(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && saveEdit(todo.id)}
                      className="flex-1 px-2 py-1 text-sm border border-gray-300 rounded-lg outline-none focus:ring-1 focus:ring-blue-200"
                    />
                    <button onClick={() => saveEdit(todo.id)} className="text-green-500 hover:text-green-700">
                      <Save size={16} />
                    </button>
                    <button onClick={() => setEditingId(null)} className="text-gray-400 hover:text-gray-600">
                      <X size={16} />
                    </button>
                  </div>
                ) : (
                  <>
                    <p className="text-sm text-gray-800 leading-relaxed break-words">{todo.content}</p>
                    <div className="flex items-center gap-2 mt-2 flex-wrap">
                      <span className="text-xs text-gray-400">
                        <Clock size={12} className="inline mr-1" />
                        {timeAgo(todo.createdAt)}
                      </span>
                      {todo.tag && (
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs ${TAG_COLORS[todo.tag] || TAG_COLORS['其他']}`}>
                          <Tag size={10} className="mr-1" />
                          {todo.tag}
                        </span>
                      )}
                      {todo.dueDate && (
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs ${isOverdue(todo.dueDate) ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'}`}>
                          <Calendar size={10} className="mr-1" />
                          {isOverdue(todo.dueDate) ? '已逾期' : new Date(todo.dueDate).toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' })}
                        </span>
                      )}
                    </div>
                  </>
                )}
              </div>
              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  onClick={() => startEdit(todo)}
                  className="p-1 text-gray-400 hover:text-blue-500 transition-colors"
                  title="编辑"
                >
                  <Edit3 size={14} />
                </button>
                <div className="relative">
                  <button
                    onClick={() => setShowTagMenu(showTagMenu === todo.id ? null : todo.id)}
                    className="p-1 text-gray-400 hover:text-purple-500 transition-colors"
                    title="标签"
                  >
                    <Tag size={14} />
                  </button>
                  {showTagMenu === todo.id && (
                    <div className="absolute right-0 top-8 z-10 bg-white border border-gray-200 rounded-lg shadow-lg p-2 min-w-[100px]">
                      {TAG_OPTIONS.map(tag => (
                        <button
                          key={tag}
                          onClick={() => updateTag(todo.id, tag)}
                          className={`block w-full text-left px-3 py-1.5 text-sm rounded hover:bg-gray-100 ${todo.tag === tag ? 'font-medium' : ''}`}
                        >
                          {tag}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                <div className="relative">
                  <button
                    onClick={() => setShowDatePicker(showDatePicker === todo.id ? null : todo.id)}
                    className="p-1 text-gray-400 hover:text-green-500 transition-colors"
                    title="截止日期"
                  >
                    <Calendar size={14} />
                  </button>
                  {showDatePicker === todo.id && (
                    <div className="absolute right-0 top-8 z-10 bg-white border border-gray-200 rounded-lg shadow-lg p-2">
                      <input
                        type="date"
                        value={todo.dueDate || ''}
                        onChange={e => updateDueDate(todo.id, e.target.value)}
                        className="px-2 py-1 text-sm border border-gray-300 rounded"
                      />
                    </div>
                  )}
                </div>
                <button
                  onClick={() => deleteTodo(todo.id)}
                  className="p-1 text-gray-400 hover:text-red-500 transition-colors"
                  title="删除"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))}

          {/* 已完成 */}
          {done.length > 0 && (
            <>
              <div className="flex items-center gap-2 pt-3 pb-2">
                <div className="h-px flex-1 bg-gray-200" />
                <span className="text-xs text-gray-400 px-2">已完成 ({done.length})</span>
                <div className="h-px flex-1 bg-gray-200" />
              </div>
              {done.map((todo, index) => (
                <div
                  key={todo.id}
                  className={`group flex items-start gap-3 px-3 py-3 rounded-xl bg-gray-50/50 hover:bg-gray-100/50 transition-all duration-200 animate-fade-in`}
                  style={{ animationDelay: `${index * 50}ms` }}
                >
                  <button
                    onClick={() => toggleDone(todo)}
                    className={`mt-0.5 flex-shrink-0 w-5 h-5 rounded-full ${c.check} flex items-center justify-center`}
                  >
                    <Check size={12} />
                  </button>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-400 line-through leading-relaxed break-words">{todo.content}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-xs text-gray-300">{timeAgo(todo.updatedAt)}</span>
                      {todo.tag && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs bg-gray-100 text-gray-400">
                          {todo.tag}
                        </span>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={() => deleteTodo(todo.id)}
                    className="flex-shrink-0 opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-500 transition-all p-1"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
            </>
          )}
        </div>
      )}
    </div>
  );
}

export default function Dashboard() {
  const { success, error, warning } = useToast();
  const navigate = useNavigate();
  const [orderStats, setOrderStats] = useState<any>(null);
  const [partsTotal, setPartsTotal] = useState(0);
  const [inventoryTotal, setInventoryTotal] = useState(0);
  const [lowStock, setLowStock] = useState<any[]>([]);
  const [recentOrders, setRecentOrders] = useState<any[]>([]);

  useEffect(() => {
    api.get('/orders/stats').then(r => setOrderStats(r.data.data || r.data)).catch(() => {});
    api.get('/parts?pageSize=1').then(r => setPartsTotal(r.data.total || 0)).catch(() => {});
    api.get('/inventory?pageSize=100').then(r => {
      const items = r.data.items || r.data.data || [];
      const total = items.reduce((sum: number, i: any) => sum + (i.quantity || 0), 0);
      setInventoryTotal(total);
    }).catch(() => {});
    api.get('/inventory/low-stock?limit=8').then(r => setLowStock(r.data.data || r.data || [])).catch(() => {});
    api.get('/orders?pageSize=5').then(r => setRecentOrders(r.data.items || r.data.data || [])).catch(() => {});
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">仪表盘</h1>
        <div className="text-sm text-gray-500">
          {new Date().toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' })}
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="总配件数" value={partsTotal} icon={<Package size={24} />} color="blue" />
        <StatCard title="总库存数" value={inventoryTotal} icon={<Warehouse size={24} />} color="green" />
        <StatCard title="本月订单" value={orderStats?.current_month_total ?? '-'} icon={<ShoppingCart size={24} />} color="yellow" />
        <StatCard title="待处理订单" value={orderStats?.pending_orders ?? '-'} icon={<AlertTriangle size={24} />} color="red" />
      </div>

      {/* Todo lists row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="flex flex-col overflow-hidden">
          <Card.Header className="bg-gradient-to-r from-red-50 to-red-100/50">
            <div className="flex items-center justify-between w-full">
              <h3 className="flex items-center gap-2 font-semibold text-red-800">
                <span className="w-3 h-3 rounded-full bg-red-500 animate-pulse" /> 紧急待办
              </h3>
              <Badge color="red">紧急</Badge>
            </div>
          </Card.Header>
          <Card.Body className="flex-1 flex flex-col min-h-[400px]">
            <TodoList priority="urgent" title="紧急待办" accentColor="red" />
          </Card.Body>
        </Card>

        <Card className="flex flex-col overflow-hidden">
          <Card.Header className="bg-gradient-to-r from-amber-50 to-amber-100/50">
            <div className="flex items-center justify-between w-full">
              <h3 className="flex items-center gap-2 font-semibold text-amber-800">
                <span className="w-3 h-3 rounded-full bg-amber-500" /> 普通待办
              </h3>
              <Badge color="yellow">普通</Badge>
            </div>
          </Card.Header>
          <Card.Body className="flex-1 flex flex-col min-h-[400px]">
            <TodoList priority="normal" title="普通待办" accentColor="amber" />
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

      {/* 动画样式 */}
      <style>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-fade-in {
          animation: fadeIn 0.3s ease-out forwards;
        }
      `}</style>
    </div>
  );
}
