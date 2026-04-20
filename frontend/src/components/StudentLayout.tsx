import { Outlet, NavLink } from 'react-router-dom';
import { MessageCircleHeart, BookHeart, Wind, LogOut, User } from 'lucide-react';
import { cn } from '../lib/utils';
import { store } from '../store';

export default function StudentLayout() {
  const profile = store.get('student_profile');

  const navItems = [
    { to: '/student/chat', icon: MessageCircleHeart, label: '心理对话' },
    { to: '/student/diary', icon: BookHeart, label: '情绪日记' },
    { to: '/student/meditation', icon: Wind, label: '呼吸训练' },
  ];

  const handleLogout = () => {
    store.set('student_profile', null);
    store.set('student_token', null);
    window.location.href = '/';
  };

  return (
    <div className="flex h-screen w-screen bg-bg-body text-text-main font-sans">
      <aside className="w-64 bg-bg-card border-r border-border flex flex-col">
        <div className="p-6 pb-2">
          <div className="flex justify-between items-start mb-4">
            <div className="inline-flex items-center gap-2 text-[10px] font-bold tracking-widest text-[#64748B] uppercase border border-border bg-bg-body px-2 py-1 rounded">
              学生端
            </div>
          </div>
          <h1 className="text-xl font-bold text-primary flex items-center gap-2">
            <MessageCircleHeart className="w-6 h-6" />
            澄心守望
          </h1>
          {profile && (
            <div className="mt-5 p-3 bg-primary-light border border-primary/20 rounded-lg">
              <div className="flex items-center gap-2 mb-1">
                <div className="w-6 h-6 rounded-full bg-primary text-white flex items-center justify-center shrink-0">
                  <User size={14} />
                </div>
                <span className="text-sm font-semibold text-text-main truncate">{profile.name}</span>
              </div>
              <p className="text-xs text-text-muted mt-1 ml-8 font-mono">{profile.studentId}</p>
            </div>
          )}
        </div>
        
        <nav className="flex-1 px-4 space-y-1 mt-6">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-3 px-4 py-3 rounded-lg transition-colors text-sm',
                  isActive 
                    ? 'bg-primary-light text-primary font-semibold' 
                    : 'text-text-muted hover:bg-bg-body'
                )
              }
            >
              <item.icon className="w-5 h-5" />
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="p-4 border-t border-border mt-auto">
          <button 
            onClick={handleLogout} 
            className="w-full flex items-center justify-center gap-2 text-sm text-warning hover:text-red-600 font-semibold hover:bg-[#FEF2F2] py-2.5 rounded-lg transition-colors border border-transparent hover:border-[#FECACA]"
          >
            <LogOut className="w-4 h-4" /> 安全退出
          </button>
        </div>
      </aside>

      <main className="flex-1 overflow-hidden flex flex-col">
        <Outlet />
      </main>
    </div>
  );
}
