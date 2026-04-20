import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Database, ArrowLeft } from 'lucide-react';
import { store } from '../store';
import { api } from '../services/api';

export default function SuperAdminRoute() {
  const [isAuth, setIsAuth] = useState(Boolean(store.get('superadmin_token')));
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  if (isAuth) {
    return <Outlet />;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const result = await api.superadminLogin(password);
      store.set('superadmin_token', result.token);
      setIsAuth(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : '验证失败，请重新输入');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="h-screen w-screen flex flex-col items-center justify-center bg-bg-body p-6 relative font-sans text-text-main">
      <button onClick={() => window.location.href = '/'} className="absolute top-6 left-6 flex items-center gap-2 text-text-muted hover:text-text-main text-sm font-semibold transition-colors bg-bg-card border border-border px-4 py-2 rounded-lg">
        <ArrowLeft className="w-4 h-4"/>
        返回首页
      </button>
      <div className="bg-bg-card p-8 rounded-xl border border-border shadow-sm max-w-sm w-full">
        <div className="flex flex-col items-center mb-6 text-center">
          <div className="w-12 h-12 rounded-full bg-[#F3E8FF] text-[#9333EA] flex items-center justify-center border border-[#E9D5FF] mb-4">
            <Database className="w-6 h-6" />
          </div>
          <h2 className="text-lg font-semibold text-text-main">系统管理验证</h2>
          <p className="text-sm text-text-muted mt-1">请输入访问口令</p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <input 
              type="password" 
              value={password} 
              onChange={e => {setPassword(e.target.value); setError('');}} 
              className={`w-full bg-bg-body border ${error ? 'border-red-500 ring-1 ring-red-500' : 'border-border'} rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#9333EA]/50 text-text-main text-center tracking-widest`} 
              placeholder="******" 
            />
            {error && <p className="text-xs text-red-500 mt-2 text-center">{error}</p>}
          </div>
          <button disabled={loading} type="submit" className="w-full bg-[#9333EA] text-white font-semibold rounded-lg px-4 py-2.5 hover:opacity-90 transition-opacity disabled:opacity-50">{loading ? '验证中...' : '进入管理中心'}</button>
        </form>
      </div>
    </div>
  );
}
