import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { LogOut, User, X } from 'lucide-react';
import { useAuthStore } from '@/stores/useAuthStore';
import api from '@/lib/api';

import { useToast } from '@/components/ui/Toast';

// Profile Modal Component
function ProfileModal({ user, onClose }: { user: any; onClose: () => void }) {
  const { success, error } = useToast();
  const [tab, setTab] = useState<'profile' | 'password'>('profile');
  const [saving, setSaving] = useState(false);
  const emailRef = useRef<HTMLInputElement>(null);
  const displayNameRef = useRef<HTMLInputElement>(null);
  const currentPwdRef = useRef<HTMLInputElement>(null);
  const newPwdRef = useRef<HTMLInputElement>(null);
  const confirmPwdRef = useRef<HTMLInputElement>(null);

  const handleSaveProfile = async () => {
    setSaving(true);
    try {
      await api.put(`/users/${user.id}`, {
        email: emailRef.current?.value || '',
        display_name: displayNameRef.current?.value || '',
      });
      success('资料已更新');
    } catch (err: any) {
      error(err.response?.data?.message || '更新失败');
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = async () => {
    const newPwd = newPwdRef.current?.value || '';
    const confirmPwd = confirmPwdRef.current?.value || '';
    if (newPwd !== confirmPwd) { success('两次密码不一致'); return; }
    if (newPwd.length < 6) { success('密码至少6位'); return; }
    setSaving(true);
    try {
      await api.put(`/users/${user.id}`, {
        password: newPwd,
      });
      success('密码已修改');
      if (currentPwdRef.current) currentPwdRef.current.value = '';
      if (newPwdRef.current) newPwdRef.current.value = '';
      if (confirmPwdRef.current) confirmPwdRef.current.value = '';
    } catch (err: any) {
      error(err.response?.data?.message || '修改失败');
    } finally {
      setSaving(false);
    }
  };

  return createPortal(
    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 99999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
      <div style={{ position: 'absolute', inset: 0, backgroundColor: 'rgba(0,0,0,0.4)' }} onClick={onClose} />
      <div style={{ position: 'relative', backgroundColor: 'white', borderRadius: '16px', width: '100%', maxWidth: '448px', maxHeight: '90vh', overflow: 'auto', boxShadow: '0 20px 60px rgba(0,0,0,0.3)' }}>
        <div style={{ position: 'sticky', top: 0, backgroundColor: 'white', zIndex: 10, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 24px', borderBottom: '1px solid #e5e7eb', borderRadius: '16px 16px 0 0' }}>
          <h3 style={{ fontSize: '18px', fontWeight: 600, margin: 0 }}>个人资料</h3>
          <button onClick={onClose} style={{ padding: '4px', cursor: 'pointer', background: 'none', border: 'none' }}><X size={18} /></button>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', borderBottom: '1px solid #e5e7eb', position: 'sticky', top: '56px', backgroundColor: 'white', zIndex: 10 }}>
          <button onClick={() => setTab('profile')} style={{ flex: 1, padding: '12px', fontSize: '14px', fontWeight: 500, background: 'none', border: 'none', borderBottom: tab === 'profile' ? '2px solid #3b82f6' : 'none', color: tab === 'profile' ? '#2563eb' : '#6b7280', cursor: 'pointer' }}>资料修改</button>
          <button onClick={() => setTab('password')} style={{ flex: 1, padding: '12px', fontSize: '14px', fontWeight: 500, background: 'none', border: 'none', borderBottom: tab === 'password' ? '2px solid #3b82f6' : 'none', color: tab === 'password' ? '#2563eb' : '#6b7280', cursor: 'pointer' }}>修改密码</button>
        </div>

        <div style={{ padding: '24px' }}>
          {tab === 'profile' ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={{ fontSize: '14px', fontWeight: 500 }}>用户名</label>
                <input value={user?.username || ''} disabled style={{ width: '100%', marginTop: '4px', padding: '8px 12px', borderRadius: '8px', border: '1px solid #e5e7eb', backgroundColor: '#f3f4f6', fontSize: '14px' }} />
              </div>
              <div>
                <label style={{ fontSize: '14px', fontWeight: 500 }}>显示名称</label>
                <input ref={displayNameRef} defaultValue={user?.displayName || ''} style={{ width: '100%', marginTop: '4px', padding: '8px 12px', borderRadius: '8px', border: '1px solid #e5e7eb', fontSize: '14px' }} />
              </div>
              <div>
                <label style={{ fontSize: '14px', fontWeight: 500 }}>邮箱</label>
                <input ref={emailRef} type="email" defaultValue={user?.email || ''} style={{ width: '100%', marginTop: '4px', padding: '8px 12px', borderRadius: '8px', border: '1px solid #e5e7eb', fontSize: '14px' }} />
              </div>
              <div>
                <label style={{ fontSize: '14px', fontWeight: 500 }}>角色</label>
                <input value={user?.role || ''} disabled style={{ width: '100%', marginTop: '4px', padding: '8px 12px', borderRadius: '8px', border: '1px solid #e5e7eb', backgroundColor: '#f3f4f6', fontSize: '14px' }} />
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', paddingTop: '8px' }}>
                <button onClick={handleSaveProfile} disabled={saving} style={{ padding: '8px 16px', backgroundColor: '#3b82f6', color: 'white', borderRadius: '8px', fontSize: '14px', border: 'none', cursor: 'pointer' }}>
                  {saving ? '保存中...' : '保存'}
                </button>
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={{ fontSize: '14px', fontWeight: 500 }}>新密码</label>
                <input ref={newPwdRef} type="password" style={{ width: '100%', marginTop: '4px', padding: '8px 12px', borderRadius: '8px', border: '1px solid #e5e7eb', fontSize: '14px' }} placeholder="至少8位，含大小写字母和数字" />
              </div>
              <div>
                <label style={{ fontSize: '14px', fontWeight: 500 }}>确认密码</label>
                <input ref={confirmPwdRef} type="password" style={{ width: '100%', marginTop: '4px', padding: '8px 12px', borderRadius: '8px', border: '1px solid #e5e7eb', fontSize: '14px' }} />
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', paddingTop: '8px' }}>
                <button onClick={handleChangePassword} disabled={saving} style={{ padding: '8px 16px', backgroundColor: '#3b82f6', color: 'white', borderRadius: '8px', fontSize: '14px', border: 'none', cursor: 'pointer' }}>
                  {saving ? '修改中...' : '修改密码'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}

export function Header() {
  const { user, logout } = useAuthStore();
  const [showProfile, setShowProfile] = useState(false);

  return (
    <header className="h-16 bg-white/80 backdrop-blur-sm border-b border-gray-100/80 flex items-center justify-between px-6 sticky top-0 z-20">
      <div />
      <div className="flex items-center gap-4">
        <button onClick={() => setShowProfile(true)} className="flex items-center gap-2 hover:bg-gray-50 px-2 py-1 rounded-lg transition-colors">
          <span className="text-sm text-gray-600">{user?.displayName || user?.username}</span>
          <span className="text-xs px-2.5 py-1 bg-blue-50 text-blue-600 rounded-full font-medium">{user?.role}</span>
        </button>
        <button onClick={logout} className="flex items-center gap-1 text-sm text-gray-400 hover:text-red-500 transition-colors">
          <LogOut size={16} />
          退出
        </button>
      </div>
      {showProfile && <ProfileModal user={user} onClose={() => setShowProfile(false)} />}
    </header>
  );
}
