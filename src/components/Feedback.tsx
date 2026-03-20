import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Trophy, Star, Sparkles, Loader2 } from 'lucide-react';
import confetti from 'canvas-confetti';

// --- XP Gain Animation ---
interface XPGainProps {
  amount: number;
  isBonus?: boolean;
  onComplete: () => void;
}

export function XPGain({ amount, isBonus, onComplete }: XPGainProps) {
  return (
    <motion.div
      initial={{ y: 0, opacity: 0, scale: 0.5 }}
      animate={{ y: -60, opacity: [0, 1, 1, 0], scale: isBonus ? [0.5, 1.2, 1.2, 1] : [0.5, 1, 1, 0.8] }}
      transition={{ duration: isBonus ? 1.2 : 0.8, ease: "easeOut" }}
      onAnimationComplete={onComplete}
      className="fixed z-[1000] pointer-events-none font-orbitron font-black flex items-center gap-2"
      style={{ 
        left: '50%', 
        top: '40%', 
        transform: 'translateX(-50%)',
        color: isBonus ? '#FFD700' : '#F5A623',
        fontSize: isBonus ? '20px' : '16px',
        textShadow: '0 0 10px rgba(0,0,0,0.5)'
      }}
    >
      {isBonus && <span className="text-xl">🎲 Bonus</span>}
      +{amount} XP
    </motion.div>
  );
}

// --- Level Up Overlay ---
interface LevelUpOverlayProps {
  level: number;
  rank: string;
  onClose: () => void;
}

export function LevelUpOverlay({ level, rank, onClose }: LevelUpOverlayProps) {
  useEffect(() => {
    // CSS Confetti
    const duration = 3 * 1000;
    const animationEnd = Date.now() + duration;
    const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 0 };

    function randomInRange(min: number, max: number) {
      return Math.random() * (max - min) + min;
    }

    const interval: any = setInterval(function() {
      const timeLeft = animationEnd - Date.now();

      if (timeLeft <= 0) {
        return clearInterval(interval);
      }

      const particleCount = 50 * (timeLeft / duration);
      confetti({ ...defaults, particleCount, origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 } });
      confetti({ ...defaults, particleCount, origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 } });
    }, 250);

    return () => clearInterval(interval);
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[1000] flex items-center justify-center text-center overflow-hidden"
    >
      {/* Frame 1: White Flash */}
      <motion.div
        initial={{ opacity: 1 }}
        animate={{ opacity: 0 }}
        transition={{ duration: 0.1 }}
        className="absolute inset-0 bg-white z-[1002]"
      />

      {/* Frame 2: Dark Overlay */}
      <div className="absolute inset-0 bg-black/95 z-[1001]" />

      <div className="relative z-[1001] space-y-8 p-10">
        <motion.div
          initial={{ y: 50, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.2, duration: 0.5 }}
          className="space-y-2"
        >
          <Sparkles className="text-primary mx-auto mb-4" size={48} />
          <h2 className="text-4xl font-orbitron font-black text-white tracking-tighter">LEVEL UP ⚡</h2>
        </motion.div>

        <motion.div
          initial={{ scale: 0.5, opacity: 0 }}
          animate={{ scale: [0.5, 1.2, 1], opacity: 1 }}
          transition={{ delay: 0.5, duration: 0.6 }}
          className="text-8xl font-orbitron font-black text-accent glow-accent leading-none"
        >
          {level}
        </motion.div>

        <motion.div
          initial={{ x: 100, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={{ delay: 0.8, duration: 0.5 }}
          className="text-xl font-bold text-[#8888FF] uppercase tracking-[0.3em]"
        >
          {rank}
        </motion.div>

        <motion.button
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 1.2 }}
          onClick={onClose}
          className="px-10 h-16 bg-primary rounded-2xl font-bold uppercase tracking-widest text-white glow-primary active:scale-95 transition-all"
        >
          Keep going →
        </motion.button>
      </div>
    </motion.div>
  );
}
