import { Database, ShieldAlert, User } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const capabilityTags = ['智能陪伴', '情绪识别', '分级预警', '隐私保护'];

export default function PortalPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen w-screen bg-bg-body flex flex-col items-center justify-center p-6 text-text-main font-sans overflow-y-auto">
      <div className="max-w-5xl w-full text-center mb-10">
        <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary-light px-4 py-1.5 text-xs font-semibold text-primary mb-5">
          高校心理健康场景智能体平台
        </div>
        <h1 className="text-4xl font-bold text-primary mb-4 tracking-tight">澄心守望</h1>
        <p className="text-text-muted text-base max-w-3xl mx-auto leading-7">
          面向高校心理健康教育场景，提供心理陪伴、情绪记录、风险预警与干预留痕的一体化平台，支持学生端、辅导员工作台与系统治理中心协同运行。
        </p>
        <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
          {capabilityTags.map((tag) => (
            <span key={tag} className="rounded-full border border-border bg-bg-card px-3 py-1.5 text-xs font-semibold text-text-main shadow-sm">
              {tag}
            </span>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl w-full">
        <button
          onClick={() => navigate('/student')}
          className="bg-bg-card border border-border p-8 rounded-2xl flex flex-col items-center gap-5 hover:shadow-lg hover:border-primary/40 transition-all text-center group"
        >
          <div className="w-20 h-20 bg-primary-light text-primary rounded-full flex items-center justify-center group-hover:scale-105 transition-transform">
            <User size={36} strokeWidth={2.5} />
          </div>
          <div>
            <h2 className="text-xl font-bold mb-2">学生端</h2>
            <p className="text-sm text-text-muted leading-relaxed">心理对话、情绪日记、呼吸训练与个体陪伴</p>
          </div>
        </button>

        <button
          onClick={() => navigate('/admin')}
          className="bg-bg-card border border-border p-8 rounded-2xl flex flex-col items-center gap-5 hover:shadow-lg hover:border-warning/40 transition-all text-center group"
        >
          <div className="w-20 h-20 bg-[#FEF2F2] text-warning rounded-full flex items-center justify-center group-hover:scale-105 transition-transform border border-[#FECACA]">
            <ShieldAlert size={36} strokeWidth={2.5} />
          </div>
          <div>
            <h2 className="text-xl font-bold mb-2">心理辅导工作台</h2>
            <p className="text-sm text-text-muted leading-relaxed">风险研判、个案跟进、群体画像与干预留痕</p>
          </div>
        </button>

        <button
          onClick={() => navigate('/superadmin')}
          className="bg-bg-card border border-border p-8 rounded-2xl flex flex-col items-center gap-5 hover:shadow-lg hover:border-[#9333EA]/40 transition-all text-center group"
        >
          <div className="w-20 h-20 bg-[#F3E8FF] text-[#9333EA] rounded-full flex items-center justify-center group-hover:scale-105 transition-transform border border-[#E9D5FF]">
            <Database size={36} strokeWidth={2.5} />
          </div>
          <div>
            <h2 className="text-xl font-bold mb-2">系统管理中心</h2>
            <p className="text-sm text-text-muted leading-relaxed">平台总览、数据治理、导入导出与运行维护</p>
          </div>
        </button>
      </div>

      <div className="max-w-5xl w-full mt-8 rounded-2xl border border-border bg-bg-card p-5 text-left shadow-sm">
        <h3 className="text-sm font-semibold text-text-main mb-2">使用说明</h3>
        <p className="text-sm leading-6 text-text-muted">
          本平台用于校园心理陪伴与风险预警辅助，不替代专业医学诊断与治疗。系统在识别到明显风险信号时，将启动人工关注与分级处置流程。
        </p>
      </div>
    </div>
  );
}
