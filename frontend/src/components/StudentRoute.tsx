import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { ArrowLeft, CheckCircle2, Shield, User } from 'lucide-react';
import { api } from '../services/api';
import { store } from '../store';

export default function StudentRoute() {
  const [profile, setProfile] = useState(store.get('student_profile'));
  const [formData, setFormData] = useState({ name: '', studentId: '', major: '' });
  const [agreed, setAgreed] = useState(false);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  if (profile && store.get('student_token')) {
    return <Outlet />;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      name: formData.name.trim(),
      studentId: formData.studentId.trim(),
      major: formData.major.trim(),
    };

    if (!payload.name || !payload.studentId || !payload.major) {
      setError('请完整填写学号、姓名和专业班级');
      return;
    }
    if (!agreed) {
      setError('请先确认使用说明与隐私提示');
      return;
    }

    setSubmitting(true);
    setError('');
    try {
      const result = await api.studentLogin(payload);
      store.set('student_profile', result.profile);
      store.set('student_token', result.token);
      setProfile(result.profile);
    } catch (err) {
      setError(err instanceof Error ? err.message : '登录失败');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen w-screen flex flex-col items-center justify-center bg-bg-body p-6 relative">
      <button onClick={() => window.location.href = '/'} className="absolute top-6 left-6 flex items-center gap-2 text-text-muted hover:text-text-main text-sm font-semibold transition-colors bg-bg-card border border-border px-4 py-2 rounded-lg">
        <ArrowLeft className="w-4 h-4" />
        返回首页
      </button>
      <div className="max-w-4xl w-full grid grid-cols-1 lg:grid-cols-[1.1fr_0.9fr] gap-6">
        <div className="bg-bg-card p-8 rounded-2xl border border-border shadow-sm">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-full bg-primary-light text-primary flex items-center justify-center shrink-0">
              <User className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-text-main">学生身份核验</h2>
              <p className="text-sm text-text-muted mt-1">完成基本信息登记后进入学生端</p>
            </div>
          </div>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-text-main mb-1.5">学号</label>
              <input required type="text" value={formData.studentId} onChange={(e) => { setFormData({ ...formData, studentId: e.target.value }); setError(''); }} className="w-full bg-bg-body border border-border rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 text-text-main" placeholder="请输入学号" />
            </div>
            <div>
              <label className="block text-sm font-semibold text-text-main mb-1.5">真实姓名</label>
              <input required type="text" value={formData.name} onChange={(e) => { setFormData({ ...formData, name: e.target.value }); setError(''); }} className="w-full bg-bg-body border border-border rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 text-text-main" placeholder="请输入姓名" />
            </div>
            <div>
              <label className="block text-sm font-semibold text-text-main mb-1.5">专业班级</label>
              <input required type="text" value={formData.major} onChange={(e) => { setFormData({ ...formData, major: e.target.value }); setError(''); }} className="w-full bg-bg-body border border-border rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 text-text-main" placeholder="例如：计算机科学与技术1班" />
            </div>
            <label className="flex items-start gap-3 rounded-lg border border-border bg-bg-body px-4 py-3 text-sm text-text-muted cursor-pointer">
              <input type="checkbox" checked={agreed} onChange={(e) => setAgreed(e.target.checked)} className="mt-0.5" />
              <span>我已知悉平台仅用于校园心理陪伴与风险预警辅助，高风险情形将触发人工关注流程。</span>
            </label>
            {error && <p className="text-xs text-red-500 -mt-1">{error}</p>}
            <button disabled={submitting} type="submit" className="w-full bg-primary text-white font-semibold rounded-lg px-4 py-2.5 mt-2 hover:opacity-90 transition-opacity disabled:opacity-50">
              {submitting ? '正在进入...' : '进入学生端'}
            </button>
          </form>
        </div>

        <div className="space-y-4">
          <div className="bg-bg-card p-6 rounded-2xl border border-border shadow-sm">
            <div className="flex items-center gap-2 mb-4 text-primary">
              <Shield className="w-5 h-5" />
              <h3 className="text-base font-semibold text-text-main">使用边界说明</h3>
            </div>
            <ul className="space-y-3 text-sm text-text-muted leading-6">
              <li className="flex gap-2"><CheckCircle2 className="w-4 h-4 mt-1 text-success shrink-0" /><span>用于日常心理陪伴、情绪记录与风险预警辅助。</span></li>
              <li className="flex gap-2"><CheckCircle2 className="w-4 h-4 mt-1 text-success shrink-0" /><span>平台默认执行最小化展示与脱敏保护，不向无关人员开放个人记录。</span></li>
              <li className="flex gap-2"><CheckCircle2 className="w-4 h-4 mt-1 text-success shrink-0" /><span>若检测到明显危险信号，系统将提示尽快联系可信任的人、学校心理中心或紧急援助渠道。</span></li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
