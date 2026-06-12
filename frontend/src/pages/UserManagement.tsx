import { useEffect, useState, useRef } from 'react';
import { Plus, Edit, Trash2 } from 'lucide-react';
import api from '@/lib/api';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import { ROLES } from '@/lib/constants';

import { useToast } from '@/components/ui/Toast';
import { useConfirm } from '@/components/ui/ConfirmDialog';
// Create User Modal Component
function CreateUserModal({ onCreated, onClose }: { onCreated: () => void; onClose: () => void }) {
  const { success, error } = useToast();
  const usernameRef = useRef<HTMLInputElement>(null);
  const emailRef = useRef<HTMLInputElement>(null);
  const passwordRef = useRef<HTMLInputElement>(null);
  const departmentRef = useRef<HTMLInputElement>(null);
  const [role, setRole] = useState('operator');
  const [saving, setSaving] = useState(false);

  const roleOptions = Object.entries(ROLES).map(([key, label]) => ({ value: key, label }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.post('/users', {
        username: usernameRef.current?.value || '',
        email: emailRef.current?.value || '',
        password: passwordRef.current?.value || '',
        role,
        department: departmentRef.current?.value || '',
      });
      onCreated();
    } catch (err: any) {
      error(err.response?.data?.message || '创建失败');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal isOpen={true} onClose={onClose} title="新建用户" size="sm">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="text-sm font-medium">用户名</label>
          <input ref={usernameRef} required className="w-full mt-1 px-3 py-2 rounded-lg border border-gray-200 text-sm" />
        </div>
        <div>
          <label className="text-sm font-medium">邮箱</label>
          <input ref={emailRef} type="email" required className="w-full mt-1 px-3 py-2 rounded-lg border border-gray-200 text-sm" />
        </div>
        <div>
          <label className="text-sm font-medium">密码</label>
          <input ref={passwordRef} type="password" required className="w-full mt-1 px-3 py-2 rounded-lg border border-gray-200 text-sm" />
        </div>
        <div>
          <label className="text-sm font-medium">角色</label>
          <select value={role} onChange={(e) => setRole(e.target.value)}
            className="w-full mt-1 px-3 py-2 rounded-lg border border-gray-200 text-sm">
            {roleOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>
        <div>
          <label className="text-sm font-medium">部门</label>
          <input ref={departmentRef} className="w-full mt-1 px-3 py-2 rounded-lg border border-gray-200 text-sm" placeholder="如：销售部、技术部" />
        </div>
        <div className="flex justify-end gap-2">
          <Button variant="secondary" type="button" onClick={onClose}>取消</Button>
          <Button type="submit" disabled={saving}>{saving ? '创建中...' : '创建'}</Button>
        </div>
      </form>
    </Modal>
  );
}

// Edit User Modal Component
function EditUserModal({ user, onSaved, onClose }: { user: any; onSaved: () => void; onClose: () => void }) {
  const { success, error } = useToast();
  const emailRef = useRef<HTMLInputElement>(null);
  const passwordRef = useRef<HTMLInputElement>(null);
  const departmentRef = useRef<HTMLInputElement>(null);
  const [role, setRole] = useState(user.role || 'operator');
  const [saving, setSaving] = useState(false);

  const roleOptions = Object.entries(ROLES).map(([key, label]) => ({ value: key, label }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const body: Record<string, any> = {
        email: emailRef.current?.value || '',
        role,
        department: departmentRef.current?.value || '',
      };
      if (passwordRef.current?.value) body.password = passwordRef.current.value;
      await api.put(`/users/${user.id}`, body);
      onSaved();
    } catch (err: any) {
      error(err.response?.data?.message || '更新失败');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal isOpen={true} onClose={onClose} title="编辑用户" size="sm">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="text-sm font-medium">用户名</label>
          <input value={user.username} disabled className="w-full mt-1 px-3 py-2 rounded-lg border border-gray-200 bg-gray-100 text-sm" />
        </div>
        <div>
          <label className="text-sm font-medium">邮箱</label>
          <input ref={emailRef} type="email" defaultValue={user.email} required className="w-full mt-1 px-3 py-2 rounded-lg border border-gray-200 text-sm" />
        </div>
        <div>
          <label className="text-sm font-medium">新密码（留空不修改）</label>
          <input ref={passwordRef} type="password" className="w-full mt-1 px-3 py-2 rounded-lg border border-gray-200 text-sm" />
        </div>
        <div>
          <label className="text-sm font-medium">部门</label>
          <input ref={departmentRef} defaultValue={user.department || ''} className="w-full mt-1 px-3 py-2 rounded-lg border border-gray-200 text-sm" />
        </div>
        <div>
          <label className="text-sm font-medium">角色</label>
          <select value={role} onChange={(e) => setRole(e.target.value)}
            className="w-full mt-1 px-3 py-2 rounded-lg border border-gray-200 text-sm">
            {roleOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>
        <div className="flex justify-end gap-2">
          <Button variant="secondary" type="button" onClick={onClose}>取消</Button>
          <Button type="submit" disabled={saving}>{saving ? '保存中...' : '保存'}</Button>
        </div>
      </form>
    </Modal>
  );
}

interface User {
  id: number;
  username: string;
  email: string;
  role: string;
  department?: string;
  isActive: boolean;
  lastLoginAt?: string;
  createdAt: string;
}

export default function UserManagement() {
  const { success, error, warning } = useToast();
  const { confirm } = useConfirm();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [editUser, setEditUser] = useState<User | null>(null);
  const [loginLogs, setLoginLogs] = useState<any[]>([]);
  const [showLogs, setShowLogs] = useState(false);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [showAudit, setShowAudit] = useState(false);
  const [permissions, setPermissions] = useState<any[]>([]);
  const [showPerms, setShowPerms] = useState(false);
  const [permRole, setPermRole] = useState('operator');
  const MODULE_NAMES: Record<string, string> = {
    parts: '配件目录', inventory: '库存管理', orders: '订单管理', customers: '客户管理',
    suppliers: '供应商', quotations: '报价单', prices: '价格管理', assets: '素材管理',
    users: '用户管理', settings: '系统设置',
  };

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/users');
      setUsers(data.items || data.data || (Array.isArray(data) ? data : []));
    } catch { setUsers([]); }
    finally { setLoading(false); }
  };

  const fetchLoginLogs = async () => {
    try {
      const { data } = await api.get('/users/login-logs?limit=50');
      setLoginLogs(Array.isArray(data) ? data : data.items || []);
    } catch { setLoginLogs([]); }
  };

  const fetchAuditLogs = async () => {
    try {
      const { data } = await api.get('/users/audit-logs?limit=50');
      setAuditLogs(Array.isArray(data) ? data : data.items || []);
    } catch { setAuditLogs([]); }
  };

  const fetchPermissions = async (role: string) => {
    try {
      const { data } = await api.get(`/users/permissions?role=${role}`);
      setPermissions(Array.isArray(data) ? data : []);
    } catch { setPermissions([]); }
  };

  const updatePermission = async (module: string, field: string, value: boolean) => {
    try {
      const perm = permissions.find(p => p.module === module) || {};
      await api.put(`/users/permissions/${permRole}/${module}`, { ...perm, [field]: value });
      fetchPermissions(permRole);
    } catch (err: any) { error(err.response?.data?.message || '更新失败'); }
  };

  useEffect(() => { fetchUsers(); }, []);

  const handleDelete = async (id: number) => {
    const confirmed = await confirm({ message: '确定删除此用户？', variant: 'danger' });
      if (!confirmed) return;
    try {
      await api.delete(`/users/${id}`);
      fetchUsers();
    } catch (err: any) {
      error(err.response?.data?.message || '删除失败');
    }
  };

  const toggleActive = async (user: User) => {
    const newValue = !user.isActive;
    // Update local state immediately
    setUsers(prev => prev.map(u => u.id === user.id ? { ...u, isActive: newValue } : u));
    try {
      await api.put(`/users/${user.id}`, { is_active: newValue });
    } catch (err: any) {
      // Revert on error
      setUsers(prev => prev.map(u => u.id === user.id ? { ...u, isActive: !newValue } : u));
      error(err.response?.data?.message || '更新失败');
    }
  };

  const openEdit = (user: User) => {
    setEditUser(user);
  };

  const roleColors: Record<string, string> = {
    admin: 'red',
    manager: 'blue',
    operator: 'green',
    viewer: 'gray',
  };

  const roleOptions = Object.entries(ROLES).map(([key, label]) => ({ value: key, label }));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">用户管理</h1>
        <Button onClick={() => setShowCreate(true)}>
          <Plus className="mr-1 h-4 w-4" /> 新建用户
        </Button>
      </div>

      <Card>
        <Card.Header>
          <span className="text-sm text-gray-500">共 {users.length} 个用户</span>
        </Card.Header>
        <Card.Body>
          {loading ? (
            <div className="flex justify-center py-12">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
            </div>
          ) : users.length === 0 ? (
            <p className="py-12 text-center text-gray-500">暂无用户</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left">
                  <th className="pb-3 font-medium">用户名</th>
                  <th className="pb-3 font-medium">邮箱</th>
                  <th className="pb-3 font-medium">部门</th>
                  <th className="pb-3 font-medium">角色</th>
                  <th className="pb-3 font-medium">状态</th>
                  <th className="pb-3 font-medium">最后登录</th>
                  <th className="pb-3 font-medium">创建时间</th>
                  <th className="pb-3 font-medium">操作</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.id} className="border-b last:border-0">
                    <td className="py-3 font-medium">{u.username}</td>
                    <td className="py-3">{u.email}</td>
                    <td className="py-3 text-gray-500">{u.department || '-'}</td>
                    <td className="py-3">
                      <Badge color={roleColors[u.role] || 'gray'}>
                        {ROLES[u.role] || u.role}
                      </Badge>
                    </td>
                    <td className="py-3">
                      <button
                        onClick={(e) => { e.stopPropagation(); toggleActive(u); }}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors cursor-pointer ${u.isActive ? 'bg-green-500' : 'bg-gray-300'}`}
                        title={u.isActive ? '点击禁用' : '点击启用'}
                      >
                        <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${u.isActive ? 'translate-x-6' : 'translate-x-1'}`} />
                      </button>
                    </td>
                    <td className="py-3 text-sm text-gray-500">
                      {u.lastLoginAt ? new Date(u.lastLoginAt).toLocaleString('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }) : '-'}
                    </td>
                    <td className="py-3">{u.createdAt?.slice(0, 10)}</td>
                    <td className="py-3">
                      <div className="flex gap-2">
                        <Button variant="ghost" size="sm" onClick={() => openEdit(u)}>
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => handleDelete(u.id)}>
                          <Trash2 className="h-4 w-4 text-red-500" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Card.Body>
      </Card>

      {/* Login Logs */}
      <Card>
        <Card.Header>
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">登录日志</h2>
            <Button variant="secondary" size="sm" onClick={() => { setShowLogs(!showLogs); if (!showLogs) fetchLoginLogs(); }}>
              {showLogs ? '隐藏' : '查看日志'}
            </Button>
          </div>
        </Card.Header>
        {showLogs && (
          <Card.Body>
            <div className="max-h-64 overflow-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left">
                    <th className="pb-2 font-medium">用户名</th>
                    <th className="pb-2 font-medium">状态</th>
                    <th className="pb-2 font-medium">时间</th>
                  </tr>
                </thead>
                <tbody>
                  {loginLogs.map((log) => (
                    <tr key={log.id} className="border-b last:border-0">
                      <td className="py-2">{log.username}</td>
                      <td className="py-2">
                        <Badge color={log.status === 'success' ? 'green' : 'red'}>
                          {log.status === 'success' ? '成功' : '失败'}
                        </Badge>
                      </td>
                      <td className="py-2 text-gray-500">
                        {new Date(log.createdAt).toLocaleString('zh-CN')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card.Body>
        )}
      </Card>

      {/* Audit Logs */}
      <Card>
        <Card.Header>
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">操作日志</h2>
            <Button variant="secondary" size="sm" onClick={() => { setShowAudit(!showAudit); if (!showAudit) fetchAuditLogs(); }}>
              {showAudit ? '隐藏' : '查看日志'}
            </Button>
          </div>
        </Card.Header>
        {showAudit && (
          <Card.Body>
            <div className="max-h-64 overflow-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left">
                    <th className="pb-2 font-medium">用户</th>
                    <th className="pb-2 font-medium">操作</th>
                    <th className="pb-2 font-medium">对象</th>
                    <th className="pb-2 font-medium">时间</th>
                  </tr>
                </thead>
                <tbody>
                  {auditLogs.map((log) => (
                    <tr key={log.id} className="border-b last:border-0">
                      <td className="py-2">{log.username || (log.user_id ? `用户#${log.user_id}` : '系统')}</td>
                      <td className="py-2">
                        <Badge color={log.action === 'delete' ? 'red' : log.action === 'create' ? 'green' : 'blue'}>
                          {log.action === 'delete' ? '删除' : log.action === 'create' ? '创建' : log.action === 'update' ? '更新' : log.action}
                        </Badge>
                      </td>
                      <td className="py-2 text-gray-500">
                        {(() => {
                          try {
                            const raw = log.new_value || log.old_value;
                            const val = typeof raw === 'string' ? JSON.parse(raw) : raw;
                            const name = val?.username || val?.company_name || val?.order_number || val?.name;
                            return name || `${log.entity_type} #${log.entity_id}`;
                          } catch { return `${log.entity_type} #${log.entity_id}`; }
                        })()}
                      </td>
                      <td className="py-2 text-gray-500">
                        {new Date(log.created_at).toLocaleString('zh-CN')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card.Body>
        )}
      </Card>

      {/* Permissions Management */}
      <Card>
        <Card.Header>
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">权限管理</h2>
            <div className="flex items-center gap-2">
              <select value={permRole} onChange={(e) => { setPermRole(e.target.value); fetchPermissions(e.target.value); }}
                className="px-3 py-1.5 rounded-lg border border-gray-200 text-sm">
                <option value="admin">管理员</option>
                <option value="manager">经理</option>
                <option value="operator">操作员</option>
                <option value="viewer">查看者</option>
              </select>
              <Button variant="secondary" size="sm" onClick={() => { setShowPerms(!showPerms); if (!showPerms) fetchPermissions(permRole); }}>
                {showPerms ? '隐藏' : '管理权限'}
              </Button>
            </div>
          </div>
        </Card.Header>
        {showPerms && (
          <Card.Body>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left">
                  <th className="pb-2 font-medium">模块</th>
                  <th className="pb-2 font-medium text-center">查看</th>
                  <th className="pb-2 font-medium text-center">新增</th>
                  <th className="pb-2 font-medium text-center">编辑</th>
                  <th className="pb-2 font-medium text-center">删除</th>
                </tr>
              </thead>
              <tbody>
                {permissions.map((perm) => (
                  <tr key={perm.module} className="border-b last:border-0">
                    <td className="py-2 font-medium">{MODULE_NAMES[perm.module] || perm.module}</td>
                    {['can_view', 'can_create', 'can_edit', 'can_delete'].map(field => (
                      <td key={field} className="py-2 text-center">
                        <input type="checkbox" checked={perm[field]} onChange={(e) => updatePermission(perm.module, field, e.target.checked)}
                          className="rounded w-4 h-4 cursor-pointer" />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </Card.Body>
        )}
      </Card>

      {showCreate && (
        <CreateUserModal
          onCreated={() => { setShowCreate(false); fetchUsers(); }}
          onClose={() => setShowCreate(false)}
        />
      )}

      {editUser && (
        <EditUserModal
          user={editUser}
          onSaved={() => { setEditUser(null); fetchUsers(); }}
          onClose={() => setEditUser(null)}
        />
      )}
    </div>
  );
}
