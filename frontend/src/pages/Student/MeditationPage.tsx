import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Play, Pause, Wind } from 'lucide-react';

export default function MeditationPage() {
  const [isActive, setIsActive] = useState(false);
  const [phase, setPhase] = useState<'吸气' | '屏息' | '呼气'>('吸气');

  useEffect(() => {
    if (!isActive) return;

    let timeout: NodeJS.Timeout;
    
    const cycle = () => {
      setPhase('吸气');
      timeout = setTimeout(() => {
        setPhase('屏息');
        timeout = setTimeout(() => {
          setPhase('呼气');
          timeout = setTimeout(cycle, 4000);
        }, 2000);
      }, 4000);
    };

    cycle();

    return () => clearTimeout(timeout);
  }, [isActive]);

  const getScale = () => {
    if (!isActive) return 1;
    switch (phase) {
      case '吸气': return 1.5;
      case '屏息': return 1.5;
      case '呼气': return 1;
      default: return 1;
    }
  };

  const getDuration = () => {
    switch (phase) {
      case '吸气': return 4;
      case '屏息': return 2;
      case '呼气': return 4;
      default: return 1;
    }
  };

  return (
    <div className="flex flex-col h-full bg-bg-body">
      <header className="bg-bg-card border-b border-border px-6 py-4">
        <h2 className="text-base font-semibold text-text-main">呼吸训练</h2>
        <p className="text-sm text-text-muted">跟随节奏，放松身心</p>
      </header>

      <div className="flex-1 flex flex-col items-center justify-center p-6">
        <div className="relative w-64 h-64 flex items-center justify-center mb-12">
          <motion.div
            className="absolute inset-0 bg-primary-light rounded-full opacity-50"
            animate={{ scale: getScale() }}
            transition={{ duration: getDuration(), ease: "easeInOut" }}
          />
          <motion.div
            className="absolute inset-4 bg-[#DBEAFE] rounded-full opacity-60"
            animate={{ scale: getScale() }}
            transition={{ duration: getDuration(), ease: "easeInOut", delay: 0.1 }}
          />
          <div className="absolute inset-8 bg-primary rounded-full flex flex-col items-center justify-center text-white shadow-lg z-10">
            <Wind className="w-8 h-8 mb-2 opacity-80" />
            <span className="text-xl font-medium">{isActive ? phase : '准备'}</span>
          </div>
        </div>

        <div className="text-center mb-8">
          <h3 className="text-xl font-semibold text-text-main mb-2">4-2-4 呼吸训练</h3>
          <p className="text-sm text-text-muted">吸气4秒，屏息2秒，呼气4秒</p>
        </div>

        <button
          onClick={() => setIsActive(!isActive)}
          className="bg-primary text-white px-6 py-3 rounded-lg flex items-center gap-2 hover:opacity-90 transition-opacity font-semibold text-sm border-none"
        >
          {isActive ? (
            <>
              <Pause className="w-4 h-4" /> 结束训练
            </>
          ) : (
            <>
              <Play className="w-4 h-4" /> 开始训练
            </>
          )}
        </button>
      </div>
    </div>
  );
}
