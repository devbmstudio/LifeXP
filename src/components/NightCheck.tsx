import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Moon, 
  CheckCircle2, 
  Star, 
  ChevronRight, 
  X, 
  Zap, 
  Smile, 
  Frown, 
  Meh, 
  Laugh, 
  Heart
} from 'lucide-react';
import { cn } from '../lib/utils';
import { Habit } from '../types';
import confetti from 'canvas-confetti';

interface NightCheckProps {
  habits: Habit[];
  onComplete: (xp: number, mood: string, rating: number) => void;
  onClose: () => void;
}

export default function NightCheck({ habits, onComplete, onClose }: NightCheckProps) {
  const [step, setStep] = useState(1);
  const [mood, setMood] = useState<string | null>(null);
  const [rating, setRating] = useState(5);
  const [wins, setWins] = useState(['', '', '']);
  const [gratitude, setGratitude] = useState('');
  const [tomorrowPlan, setTomorrowPlan] = useState('');
  const [isFinishing, setIsFinishing] = useState(false);

  const handleNext = () => setStep(s => s + 1);

  const handleFinish = () => {
    setIsFinishing(true);
    setTimeout(() => {
      onComplete(15, mood || '🙂', rating);
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#8888FF', '#4A4AFF']
      });
    }, 1500);
  };

  return (
    <div className="fixed inset-0 z-[300] bg-gradient-to-b from-[#050510] to-[#0A0A2A] overflow-y-auto">
      <StarBackground isFinishing={isFinishing} />
      
      <div className="max-w-[390px] mx-auto min-h-screen p-8 flex flex-col items-center justify-center space-y-12 relative">
        <div className="flex justify-center gap-2 w-full max-w-[200px]">
          {[1, 2, 3, 4, 5].map(i => (
            <div key={i} className={cn("h-1 flex-1 rounded-full transition-all", step >= i ? "bg-[#8888FF]" : "bg-white/10")} />
          ))}
        </div>

        <AnimatePresence mode="wait">
          {step === 1 && (
            <motion.div 
              key="step1"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="w-full space-y-8"
            >
              <div className="text-center space-y-2">
                <Moon size={48} className="text-[#8888FF] mx-auto animate-pulse" />
                <h2 className="text-2xl font-orbitron font-black">What did you conquer today?</h2>
                <p className="text-[#8888FF]/60 text-xs uppercase tracking-widest">Review your habits</p>
              </div>

              <div className="space-y-3">
                {habits.map(h => (
                  <div key={h.id} className="glass-dark rounded-2xl p-4 flex items-center justify-between border border-[#8888FF]/10">
                    <span className="font-bold">{h.name}</span>
                    <div className={cn(
                      "w-8 h-8 rounded-full flex items-center justify-center border-2",
                      h.lastCompleted === new Date().toISOString().split('T')[0] 
                        ? "bg-[#4A4AFF] border-[#4A4AFF] text-white" 
                        : "border-white/10 text-white/20"
                    )}>
                      <CheckCircle2 size={16} />
                    </div>
                  </div>
                ))}
              </div>

              <button 
                onClick={handleNext}
                className="w-full h-16 bg-[#4A4AFF] rounded-2xl font-bold uppercase tracking-widest text-white shadow-xl shadow-[#4A4AFF]/20 active:scale-95 transition-all"
              >
                Continue →
              </button>
            </motion.div>
          )}

          {step === 2 && (
            <motion.div 
              key="step2"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="w-full space-y-10"
            >
              <div className="text-center space-y-2">
                <h2 className="text-2xl font-orbitron font-black">How was your day, honestly?</h2>
                <p className="text-[#8888FF]/60 text-xs uppercase tracking-widest">Mood & Rating</p>
              </div>

              <div className="flex justify-around">
                {[
                  { icon: <Frown size={32} />, label: '😞' },
                  { icon: <Meh size={32} />, label: '😐' },
                  { icon: <Smile size={32} />, label: '🙂' },
                  { icon: <Laugh size={32} />, label: '😄' },
                  { icon: <Heart size={32} />, label: '🤩' },
                ].map((m, i) => (
                  <button 
                    key={i}
                    onClick={() => setMood(m.label)}
                    className={cn(
                      "transition-all duration-300",
                      mood === m.label ? "scale-125 text-[#8888FF]" : "opacity-40 scale-90"
                    )}
                  >
                    {m.icon}
                  </button>
                ))}
              </div>

              <div className="space-y-4">
                <div className="flex justify-between items-end">
                  <span className="text-4xl font-orbitron font-black text-[#8888FF]">{rating}</span>
                  <span className="text-[#8888FF]/60 text-[10px] uppercase tracking-widest">Day Rating</span>
                </div>
                <input 
                  type="range" 
                  min="1" 
                  max="10" 
                  value={rating}
                  onChange={(e) => setRating(parseInt(e.target.value))}
                  className="w-full h-2 bg-white/10 rounded-lg appearance-none cursor-pointer accent-[#4A4AFF]"
                />
              </div>

              <button 
                onClick={handleNext}
                disabled={!mood}
                className="w-full h-16 bg-[#4A4AFF] rounded-2xl font-bold uppercase tracking-widest text-white disabled:opacity-50 active:scale-95 transition-all"
              >
                Continue →
              </button>
            </motion.div>
          )}

          {step === 3 && (
            <motion.div 
              key="step3"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="w-full space-y-8"
            >
              <div className="text-center space-y-2">
                <h2 className="text-2xl font-orbitron font-black">What are your 3 wins today?</h2>
                <p className="text-[#8888FF]/60 text-xs uppercase tracking-widest">Big or small. Everything counts.</p>
              </div>

              <div className="space-y-4">
                {wins.map((w, i) => (
                  <div key={i} className="relative">
                    <Star size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-accent" />
                    <input 
                      type="text" 
                      placeholder={`Win #${i + 1}`}
                      value={w}
                      onChange={(e) => {
                        const newWins = [...wins];
                        newWins[i] = e.target.value;
                        setWins(newWins);
                      }}
                      className="w-full h-14 bg-white/5 rounded-2xl pl-12 pr-6 text-white outline-none border border-white/5 focus:border-[#8888FF]/50 transition-all font-bold"
                    />
                  </div>
                ))}
              </div>

              <button 
                onClick={handleNext}
                className="w-full h-16 bg-[#4A4AFF] rounded-2xl font-bold uppercase tracking-widest text-white active:scale-95 transition-all"
              >
                Continue →
              </button>
            </motion.div>
          )}

          {step === 4 && (
            <motion.div 
              key="step4"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full space-y-8"
            >
              <div className="text-center space-y-2">
                <h2 className="text-2xl font-orbitron font-black">What are you grateful for?</h2>
                <p className="text-[#8888FF]/60 text-xs uppercase tracking-widest">Even one small thing shifts your brain.</p>
              </div>

              <textarea 
                rows={5}
                placeholder="Tonight, I'm grateful for..."
                value={gratitude}
                onChange={(e) => setGratitude(e.target.value)}
                className="w-full bg-white/5 rounded-3xl p-6 text-white outline-none border border-white/5 focus:border-[#8888FF]/50 transition-all font-bold resize-none"
              />

              <button 
                onClick={handleNext}
                className="w-full h-16 bg-[#4A4AFF] rounded-2xl font-bold uppercase tracking-widest text-white active:scale-95 transition-all"
              >
                Continue →
              </button>
            </motion.div>
          )}

          {step === 5 && (
            <motion.div 
              key="step5"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="w-full space-y-8"
            >
              <div className="text-center space-y-2">
                <h2 className="text-2xl font-orbitron font-black">What matters most tomorrow?</h2>
                <p className="text-[#8888FF]/60 text-xs uppercase tracking-widest">One decision made now = willpower saved.</p>
              </div>

              <div className="space-y-6">
                <input 
                  type="text" 
                  placeholder="My ONE thing tomorrow is..."
                  value={tomorrowPlan}
                  onChange={(e) => setTomorrowPlan(e.target.value)}
                  className="w-full h-16 bg-white/5 rounded-2xl px-6 text-white outline-none border border-white/5 focus:border-[#8888FF]/50 transition-all font-bold"
                />
                
                <div className="grid grid-cols-3 gap-3">
                  {['🔴 Urgent', '🟡 Normal', '🟢 Soft'].map((p, i) => (
                    <button key={i} className="h-12 glass-dark rounded-xl text-[10px] font-bold uppercase tracking-widest border border-white/5">
                      {p}
                    </button>
                  ))}
                </div>
              </div>

              <button 
                onClick={handleFinish}
                className="w-full h-16 bg-[#4A4AFF] rounded-2xl font-bold uppercase tracking-widest text-white shadow-xl glow-primary active:scale-95 transition-all"
              >
                Finish my day →
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        <button 
          onClick={onClose}
          className="absolute top-8 right-8 w-10 h-10 glass-dark rounded-full flex items-center justify-center text-white/40"
        >
          <X size={20} />
        </button>
      </div>
    </div>
  );
}

function StarBackground({ isFinishing }: { isFinishing: boolean }) {
  const [stars, setStars] = useState<{ x: number; y: number; size: number; delay: number }[]>([]);

  useEffect(() => {
    const newStars = Array.from({ length: 80 }).map(() => ({
      x: Math.random() * 100,
      y: Math.random() * 100,
      size: Math.random() * 2 + 1,
      delay: Math.random() * 5
    }));
    setStars(newStars);
  }, []);

  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden">
      {stars.map((s, i) => (
        <motion.div 
          key={i}
          initial={{ opacity: 0.3 }}
          animate={isFinishing ? {
            opacity: [0.3, 1, 0.3],
            scale: [1, 2, 1],
          } : {
            opacity: [0.3, 0.8, 0.3],
          }}
          transition={{
            duration: isFinishing ? 0.3 : 2 + Math.random() * 3,
            repeat: Infinity,
            delay: s.delay
          }}
          className="absolute bg-white rounded-full"
          style={{
            left: `${s.x}%`,
            top: `${s.y}%`,
            width: `${s.size}px`,
            height: `${s.size}px`,
          }}
        />
      ))}
    </div>
  );
}
