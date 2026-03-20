import React, { useState, useEffect, Component, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Home, 
  CheckCircle2, 
  Target, 
  Zap, 
  User, 
  Plus, 
  Flame, 
  Trophy,
  ChevronRight,
  PlusCircle,
  X,
  Loader2,
  Sparkles,
  LogOut,
  Bell,
  Moon,
  Play,
  AlertCircle,
  Clock,
  Trash2,
  Image as ImageIcon,
  Frown,
  Meh,
  Smile,
  Laugh,
  Heart,
  Settings,
  ArrowRight,
  Camera,
  Calendar,
  Coins,
  ShoppingBag,
  ShieldCheck,
  Zap as ZapIcon
} from 'lucide-react';
import { cn } from './lib/utils';
import { UserProfile, Habit, Goal, Skill, ClassType } from './types';
import confetti from 'canvas-confetti';
import { getMotivationalQuote, suggestHabits } from './services/gemini';
import { generateCelebrationVideo, pollVideoStatus } from './services/veo';
import { startAlarmEngine, dismissReminder } from './services/reminders';
import NightCheck from './components/NightCheck';
import Reminders from './components/Reminders';
import SettingsScreen from './components/SettingsScreen';
import GoldScreen from './components/GoldScreen';
import { XPGain, LevelUpOverlay } from './components/Feedback';
import { getLevel, getRankTitle, calculateLevel, XP_REWARDS, GOLD_REWARDS } from './xp';

declare global {
  interface Window {
    aistudio: {
      hasSelectedApiKey: () => Promise<boolean>;
      openSelectKey: () => Promise<void>;
    };
  }
}

// --- Constants & Initial Data ---
const CLASSES: { type: ClassType; emoji: string; description: string }[] = [
  { type: 'Warrior', emoji: '⚔️', description: 'Strength and discipline' },
  { type: 'Mage', emoji: '🔮', description: 'Knowledge and focus' },
  { type: 'Rogue', emoji: '🗡️', description: 'Agility and stealth' },
  { type: 'Paladin', emoji: '🛡️', description: 'Honor and resilience' },
];

const INITIAL_SKILLS: Skill[] = [
  { name: 'Body', level: 1, xp: 0, maxXp: 100, emoji: '💪', category: 'Body' },
  { name: 'Mind', level: 1, xp: 0, maxXp: 100, emoji: '🧠', category: 'Mind' },
  { name: 'Wealth', level: 1, xp: 0, maxXp: 100, emoji: '💰', category: 'Wealth' },
  { name: 'Creativity', level: 1, xp: 0, maxXp: 100, emoji: '🎨', category: 'Creativity' },
  { name: 'Social', level: 1, xp: 0, maxXp: 100, emoji: '🤝', category: 'Social' },
];

import { 
  auth, 
  db, 
  googleProvider, 
  signInWithPopup, 
  onAuthStateChanged, 
  handleFirestoreError, 
  OperationType,
  User as FirebaseUser
} from './firebase';
import { 
  doc, 
  setDoc, 
  updateDoc, 
  collection, 
  onSnapshot, 
  query, 
  where, 
  deleteDoc,
  getDoc,
  writeBatch
} from 'firebase/firestore';
import { signOut } from 'firebase/auth';

// --- Main App Component ---
export default function App() {
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [loginError, setLoginError] = useState<string | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [habits, setHabits] = useState<Habit[]>([]);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [skills, setSkills] = useState<Skill[]>(INITIAL_SKILLS);
  const [activeTab, setActiveTab] = useState('home');
  const [showNightCheck, setShowNightCheck] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [activeAlarm, setActiveAlarm] = useState<any>(null);
  const [completedGoal, setCompletedGoal] = useState<Goal | null>(null);
  const [xpGains, setXpGains] = useState<{ id: number; amount: number; isBonus: boolean }[]>([]);
  const [showLevelUp, setShowLevelUp] = useState<{ level: number; rank: string } | null>(null);
  const [notifications, setNotifications] = useState<{ id: number; title: string; body: string }[]>([]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setFirebaseUser(user);
      if (!user) {
        setUserProfile(null);
        setLoading(false);
      }
    });
    return unsubscribe;
  }, []);

  useEffect(() => {
    if (!firebaseUser) return;

    // Listen to profile
    const profileRef = doc(db, 'users', firebaseUser.uid);
    const unsubProfile = onSnapshot(profileRef, (doc) => {
      if (doc.exists()) {
        setUserProfile(doc.data() as UserProfile);
      }
      setLoading(false);
    }, (err) => {
      handleFirestoreError(err, OperationType.GET, `users/${firebaseUser.uid}`);
    });

    // Listen to habits
    const habitsRef = collection(db, 'users', firebaseUser.uid, 'habits');
    const unsubHabits = onSnapshot(habitsRef, (snap) => {
      setHabits(snap.docs.map(d => ({ id: d.id, ...d.data() } as Habit)));
    });

    // Listen to goals
    const goalsRef = collection(db, 'users', firebaseUser.uid, 'goals');
    const unsubGoals = onSnapshot(goalsRef, (snap) => {
      setGoals(snap.docs.map(d => ({ id: d.id, ...d.data() } as Goal)));
    });

    // Listen to skills
    const skillsRef = collection(db, 'users', firebaseUser.uid, 'skills');
    const unsubSkills = onSnapshot(skillsRef, (snap) => {
      if (!snap.empty) {
        setSkills(snap.docs.map(d => d.data() as Skill));
      }
    });

    // Start Alarm Engine
    const stopAlarm = startAlarmEngine((reminder) => {
      setActiveAlarm(reminder);
    });

    // Request Notification Permission
    if ("Notification" in window && Notification.permission === "default") {
      Notification.requestPermission();
    }

    // Scheduled Notifications
    const interval = setInterval(() => {
      const now = new Date();
      const hours = now.getHours();
      const minutes = now.getMinutes();

      // Morning (8AM)
      if (hours === 8 && minutes === 0 && userProfile?.settings?.morningReminder !== false) {
        const pendingHabits = habits.filter(h => h.lastCompleted !== now.toISOString().split('T')[0]).length;
        if (pendingHabits > 0) {
          sendNotification(`Good morning, ${userProfile?.name} ⚡`, `You have ${pendingHabits} habits waiting. Let's go.`);
        }
      }

      // Streak Danger (8PM)
      if (hours === 20 && minutes === 0 && userProfile?.settings?.streakDangerAlert !== false) {
        const doneToday = habits.some(h => h.lastCompleted === now.toISOString().split('T')[0]);
        if (!doneToday && userProfile?.streak && userProfile.streak > 0) {
          sendNotification(`⚠️ Your 🔥${userProfile.streak} streak is at risk`, "Complete your check-in before midnight to keep it.");
        }
      }

      // Night Check (8:30PM)
      if (hours === 20 && minutes === 30 && userProfile?.settings?.nightCheckReminder !== false) {
        sendNotification(`🌙 Time for your night check-in, ${userProfile?.name}`, "How was your day? Your review is ready.");
      }
    }, 60000);

    return () => {
      unsubProfile();
      unsubHabits();
      unsubGoals();
      unsubSkills();
      stopAlarm();
      clearInterval(interval);
    };
  }, [firebaseUser, userProfile?.uid]);

  const sendNotification = (title: string, body: string) => {
    if ("Notification" in window && Notification.permission === "granted") {
      new Notification(title, { body, icon: "🌙" });
    } else {
      setNotifications(prev => [...prev, { id: Date.now(), title, body }]);
    }
  };

  const handleLogin = async () => {
    setLoginError(null);
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (err: any) {
      console.error("Login Error:", err);
      setLoginError(err.message || "An unknown error occurred during login.");
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch (err) {
      console.error("Logout Error:", err);
    }
  };

  const handleNightCheckComplete = async (xp: number, mood: string, rating: number) => {
    if (!firebaseUser || !userProfile) return;
    try {
      const userRef = doc(db, 'users', firebaseUser.uid);
      await updateDoc(userRef, {
        xp: userProfile.xp + xp,
        lastNightCheck: new Date().toISOString(),
        lastActive: new Date().toISOString()
      });
      setShowNightCheck(false);
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `users/${firebaseUser.uid}`);
    }
  };

  const handleDismissAlarm = async () => {
    if (firebaseUser && activeAlarm) {
      await dismissReminder(firebaseUser.uid, activeAlarm.id);
      setActiveAlarm(null);
    }
  };

  const handleOnboardingComplete = async (profile: UserProfile) => {
    if (!firebaseUser) return;
    try {
      const userRef = doc(db, 'users', firebaseUser.uid);
      await setDoc(userRef, profile);
      
      // Initialize skills
      const batch = writeBatch(db);
      INITIAL_SKILLS.forEach(skill => {
        const skillRef = doc(db, 'users', firebaseUser.uid, 'skills', skill.name);
        batch.set(skillRef, skill);
      });
      await batch.commit();
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, `users/${firebaseUser.uid}`);
    }
  };

  const addXp = async (amount: number, category: string) => {
    if (!firebaseUser || !userProfile) return;
    
    // Variable Bonus
    const isBonus = Math.random() > 0.8;
    const bonusAmount = isBonus ? Math.floor(Math.random() * 20) + 10 : 0;
    const totalAmount = amount + bonusAmount;

    // Gold Reward
    let goldReward = 0;
    if (amount === XP_REWARDS.HABIT_COMPLETE.Normal) goldReward = GOLD_REWARDS.HABIT_COMPLETE.Normal;
    else if (amount === XP_REWARDS.HABIT_COMPLETE.Hard) goldReward = GOLD_REWARDS.HABIT_COMPLETE.Hard;
    else if (amount === XP_REWARDS.HABIT_COMPLETE.Legendary) goldReward = GOLD_REWARDS.HABIT_COMPLETE.Legendary;
    else if (amount === XP_REWARDS.GOAL_COMPLETE) goldReward = GOLD_REWARDS.GOAL_COMPLETE;
    else goldReward = GOLD_REWARDS.NIGHT_CHECK;

    setXpGains(prev => [...prev, { id: Date.now(), amount: totalAmount, isBonus }]);

    const newXp = userProfile.xp + totalAmount;
    const newGold = (userProfile.gold || 0) + goldReward;
    const level = getLevel(newXp);
    
    try {
      const userRef = doc(db, 'users', firebaseUser.uid);
      const updates: any = {
        xp: newXp,
        gold: newGold,
        lastActive: new Date().toISOString()
      };

      if (level > userProfile.level) {
        updates.level = level;
        updates.rank = getRankTitle(level);
        setShowLevelUp({ level, rank: updates.rank });
      }

      await updateDoc(userRef, updates);

      // Update skill XP
      const skillRef = doc(db, 'users', firebaseUser.uid, 'skills', category);
      const skillDoc = await getDoc(skillRef);
      if (skillDoc.exists()) {
        const skillData = skillDoc.data() as Skill;
        const newSkillXp = skillData.xp + amount;
        const newSkillLevel = Math.floor(newSkillXp / 100) + 1;
        await updateDoc(skillRef, {
          xp: newSkillXp,
          level: newSkillLevel,
          maxXp: newSkillLevel * 100
        });
      }
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `users/${firebaseUser.uid}`);
    }
  };

  const handleDeleteHabit = async (habitId: string) => {
    if (!firebaseUser) return;
    try {
      const habitRef = doc(db, 'users', firebaseUser.uid, 'habits', habitId);
      await deleteDoc(habitRef);
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `users/${firebaseUser.uid}/habits/${habitId}`);
    }
  };

  const handleDeleteGoal = async (goalId: string) => {
    if (!firebaseUser) return;
    try {
      const goalRef = doc(db, 'users', firebaseUser.uid, 'goals', goalId);
      await deleteDoc(goalRef);
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `users/${firebaseUser.uid}/goals/${goalId}`);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="animate-spin text-primary" size={40} />
      </div>
    );
  }

  if (!firebaseUser) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-10 text-center space-y-10">
        <div className="space-y-2">
          <h1 className="text-5xl font-orbitron font-black text-primary">LifeXP</h1>
          <p className="text-text-secondary tracking-widest uppercase text-sm">Level up your reality</p>
        </div>
        <div className="w-full max-w-xs space-y-4">
          <button 
            onClick={handleLogin}
            className="w-full h-14 bg-white text-black font-bold rounded-2xl flex items-center justify-center gap-3 active:scale-95 transition-all"
          >
            <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" className="w-6 h-6" alt="Google" />
            Sign in with Google
          </button>
          {loginError && (
            <div className="p-4 bg-red-500/20 border border-red-500/50 rounded-2xl text-red-200 text-xs text-center">
              {loginError}
            </div>
          )}
        </div>
      </div>
    );
  }

  if (!userProfile) {
    return <Onboarding onComplete={handleOnboardingComplete} uid={firebaseUser.uid} />;
  }

  const pageVariants = {
    initial: { x: '100%', opacity: 0 },
    animate: { x: 0, opacity: 1 },
    exit: { x: '-30%', opacity: 0 }
  };

  const pageTransition: any = {
    duration: 0.25,
    ease: "easeOut"
  };

  return (
    <div className="flex justify-center min-h-screen bg-background">
      <div className="w-full max-w-[390px] pb-24 relative overflow-x-hidden">
        {/* In-app Notifications */}
        <div className="fixed top-4 left-1/2 -translate-x-1/2 w-full max-w-[350px] z-[1000] space-y-2">
          <AnimatePresence>
            {notifications.map(n => (
              <motion.div
                key={n.id}
                initial={{ y: -50, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: -50, opacity: 0 }}
                className="bg-accent p-4 rounded-2xl shadow-2xl border border-white/10 flex items-start gap-4"
              >
                <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center text-white">
                  <Bell size={20} />
                </div>
                <div className="flex-1">
                  <h4 className="font-bold text-sm text-white">{n.title}</h4>
                  <p className="text-xs text-white/80">{n.body}</p>
                </div>
                <button onClick={() => setNotifications(prev => prev.filter(x => x.id !== n.id))} className="text-white/40">
                  <X size={16} />
                </button>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>

        <AnimatePresence mode="wait">
          {activeTab === 'home' && (
            <motion.div 
              key="home"
              variants={pageVariants}
              initial="initial"
              animate="animate"
              exit="exit"
              transition={pageTransition}
            >
              <Dashboard user={userProfile} habits={habits} goals={goals} onOpenSettings={() => setShowSettings(true)} />
            </motion.div>
          )}
          {activeTab === 'habits' && (
            <motion.div 
              key="habits"
              variants={pageVariants}
              initial="initial"
              animate="animate"
              exit="exit"
              transition={pageTransition}
            >
              <HabitsScreen 
                habits={habits} 
                onComplete={(h) => addXp(XP_REWARDS.HABIT_COMPLETE[h.difficulty], h.category)}
                onDelete={handleDeleteHabit}
                userId={firebaseUser.uid}
              />
            </motion.div>
          )}
          {activeTab === 'goals' && (
            <motion.div 
              key="goals"
              variants={pageVariants}
              initial="initial"
              animate="animate"
              exit="exit"
              transition={pageTransition}
            >
              <GoalsScreen 
                goals={goals} 
                onComplete={(g) => {
                  addXp(XP_REWARDS.GOAL_COMPLETE, g.category);
                  setCompletedGoal(g);
                }}
                onDelete={handleDeleteGoal}
                userId={firebaseUser.uid}
              />
            </motion.div>
          )}
          {activeTab === 'reminders' && (
            <motion.div 
              key="reminders"
              variants={pageVariants}
              initial="initial"
              animate="animate"
              exit="exit"
              transition={pageTransition}
            >
              <Reminders userId={firebaseUser.uid} />
            </motion.div>
          )}
          {activeTab === 'profile' && (
            <motion.div 
              key="profile"
              variants={pageVariants}
              initial="initial"
              animate="animate"
              exit="exit"
              transition={pageTransition}
            >
              <ProfileScreen 
                user={userProfile} 
                onLogout={handleLogout}
                habits={habits} 
                goals={goals}
                userId={firebaseUser.uid}
              />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Bottom Nav */}
        <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[390px] bg-surface/90 backdrop-blur-md border-t border-white/5 h-20 flex items-center justify-around px-2 z-50">
          <NavTab icon={<Home size={24} />} label="Home" active={activeTab === 'home'} onClick={() => setActiveTab('home')} />
          <NavTab icon={<CheckCircle2 size={24} />} label="Habits" active={activeTab === 'habits'} onClick={() => setActiveTab('habits')} />
          <NavTab icon={<Target size={24} />} label="Goals" active={activeTab === 'goals'} onClick={() => setActiveTab('goals')} />
          <NavTab icon={<Bell size={24} />} label="Reminders" active={activeTab === 'reminders'} onClick={() => setActiveTab('reminders')} />
          <NavTab icon={<User size={24} />} label="Profile" active={activeTab === 'profile'} onClick={() => setActiveTab('profile')} />
        </nav>

        {/* Floating Night Check Trigger */}
        <button 
          onClick={() => setShowNightCheck(true)}
          className="fixed bottom-28 left-6 w-14 h-14 glass rounded-2xl flex flex-col items-center justify-center text-[#8888FF] shadow-2xl border border-[#8888FF]/20 active:scale-90 transition-all z-40"
        >
          <Moon size={24} />
          <span className="text-[6px] font-black uppercase tracking-widest mt-1">Ritual</span>
        </button>

        {/* Overlays */}
        <AnimatePresence>
          {xpGains.map(gain => (
            <XPGain 
              key={gain.id} 
              amount={gain.amount} 
              isBonus={gain.isBonus} 
              onComplete={() => setXpGains(prev => prev.filter(x => x.id !== gain.id))} 
            />
          ))}
          {showLevelUp && (
            <LevelUpOverlay 
              level={showLevelUp.level} 
              rank={showLevelUp.rank} 
              onClose={() => setShowLevelUp(null)} 
            />
          )}
          {showSettings && (
            <SettingsScreen 
              user={userProfile} 
              onClose={() => setShowSettings(false)} 
              onLogout={handleLogout} 
            />
          )}
          {completedGoal && (
            <CelebrationOverlay 
              goal={completedGoal} 
              onClose={() => setCompletedGoal(null)} 
            />
          )}
          {showNightCheck && (
            <NightCheck 
              habits={habits} 
              onComplete={handleNightCheckComplete} 
              onClose={() => setShowNightCheck(false)} 
            />
          )}
          {activeAlarm && (
            <AlarmOverlay 
              reminder={activeAlarm} 
              onDismiss={handleDismissAlarm} 
            />
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

function AlarmOverlay({ reminder, onDismiss }: { reminder: any, onDismiss: () => void }) {
  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      className="fixed inset-0 z-[500] bg-black/90 flex flex-col items-center justify-center p-8 text-center backdrop-blur-xl"
    >
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-primary/20 blur-[150px] rounded-full animate-pulse" />
      </div>

      <motion.div 
        animate={{ 
          rotate: [0, -2, 2, -2, 2, 0],
          scale: [1, 1.05, 1]
        }}
        transition={{ duration: 0.5, repeat: Infinity }}
        className="w-24 h-24 bg-primary rounded-[32px] flex items-center justify-center mx-auto shadow-2xl glow-primary mb-8"
      >
        <Bell size={48} className="text-white" />
      </motion.div>

      <div className="space-y-2 mb-12">
        <h2 className="text-4xl font-orbitron font-black text-white tracking-tighter">REMINDER</h2>
        <p className="text-primary font-bold uppercase tracking-[0.4em] text-sm">Action Required</p>
      </div>

      <div className="glass-dark rounded-[40px] p-8 border border-white/10 w-full max-w-sm space-y-6 mb-12">
        {reminder.imageUrl && (
          <img src={reminder.imageUrl} className="w-full aspect-video rounded-2xl object-cover mb-4" alt="" />
        )}
        <h3 className="text-2xl font-bold text-white">{reminder.title}</h3>
        {reminder.note && <p className="text-text-secondary text-sm leading-relaxed">{reminder.note}</p>}
      </div>

      <div className="flex flex-col gap-4 w-full max-w-sm">
        <button 
          onClick={onDismiss}
          className="w-full h-20 bg-primary text-white rounded-3xl font-black text-xl uppercase tracking-widest glow-primary active:scale-95 transition-all"
        >
          Dismiss
        </button>
        <button 
          onClick={onDismiss}
          className="w-full h-16 glass rounded-3xl font-bold text-text-secondary uppercase tracking-widest text-xs active:scale-95 transition-all"
        >
          Snooze 5m
        </button>
      </div>
    </motion.div>
  );
}

function CelebrationOverlay({ goal, onClose }: { goal: Goal, onClose: () => void }) {
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const handleGenerateVideo = async () => {
    setLoading(true);
    setError(null);
    try {
      // Check if user has selected an API key (required for Veo)
      if (typeof window.aistudio !== 'undefined') {
        const hasKey = await window.aistudio.hasSelectedApiKey();
        if (!hasKey) {
          await window.aistudio.openSelectKey();
          // After selecting key, we retry
          handleGenerateVideo();
          return;
        }
      }

      const operation = await generateCelebrationVideo(goal.name);
      
      // Poll for completion
      const checkStatus = async () => {
        try {
          const status = await pollVideoStatus(operation);
          if (status.done && status.response?.generatedVideos?.[0]?.video?.uri) {
            setVideoUrl(status.response.generatedVideos[0].video.uri);
            setLoading(false);
          } else {
            setTimeout(checkStatus, 5000);
          }
        } catch (err: any) {
          if (err.message === 'API_KEY_ERROR') {
            if (typeof window.aistudio !== 'undefined') {
              await window.aistudio.openSelectKey();
              handleGenerateVideo();
            }
          } else {
            setError('Failed to generate celebration video.');
            setLoading(false);
          }
        }
      };

      checkStatus();
    } catch (err: any) {
      if (err.message === 'API_KEY_ERROR') {
        if (typeof window.aistudio !== 'undefined') {
          await window.aistudio.openSelectKey();
          handleGenerateVideo();
        }
      } else {
        setError('Failed to start video generation.');
        setLoading(false);
      }
    }
  };

  useEffect(() => {
    handleGenerateVideo();
    
    confetti({
      particleCount: 150,
      spread: 70,
      origin: { y: 0.6 },
      colors: ['#F27D26', '#FFD700', '#FFFFFF']
    });
  }, []);

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="fixed inset-0 z-[200] bg-black/95 flex flex-col items-center justify-center p-8 text-center"
    >
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-accent/20 blur-[120px] rounded-full animate-pulse" />
      </div>

      <motion.div 
        initial={{ scale: 0.8, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        className="z-10 space-y-8 max-w-sm"
      >
        <div className="space-y-4">
          <div className="w-24 h-24 bg-accent rounded-[32px] flex items-center justify-center mx-auto shadow-2xl glow-accent">
            <Trophy size={48} className="text-white" />
          </div>
          <h2 className="text-4xl font-orbitron font-black text-white leading-tight">CONQUEST COMPLETE</h2>
          <p className="text-accent font-bold uppercase tracking-[0.3em] text-sm">{goal.name}</p>
        </div>

        <div className="aspect-video w-full glass rounded-3xl border border-white/10 overflow-hidden flex items-center justify-center relative">
          {loading ? (
            <div className="flex flex-col items-center gap-4">
              <Loader2 className="animate-spin text-accent" size={32} />
              <p className="text-xs text-text-secondary uppercase tracking-widest animate-pulse">Generating Cinematic Celebration...</p>
            </div>
          ) : videoUrl ? (
            <div className="w-full h-full flex flex-col items-center justify-center p-6 space-y-4">
              <Play size={48} className="text-accent" />
              <p className="text-xs text-white/60">Cinematic video ready at:<br/><span className="text-[10px] break-all opacity-40">{videoUrl}</span></p>
              <p className="text-[10px] text-text-secondary italic">(Note: Video playback requires API authentication)</p>
            </div>
          ) : (
            <div className="p-6">
              <AlertCircle size={32} className="text-danger mx-auto mb-2" />
              <p className="text-xs text-danger">{error || 'Celebration video unavailable'}</p>
            </div>
          )}
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="glass p-4 rounded-2xl border border-white/5">
            <div className="text-xl font-orbitron font-black text-accent">+500</div>
            <div className="text-[8px] font-bold text-text-secondary uppercase tracking-widest">XP Reward</div>
          </div>
          <div className="glass p-4 rounded-2xl border border-white/5">
            <div className="text-xl font-orbitron font-black text-accent">RANK UP</div>
            <div className="text-[8px] font-bold text-text-secondary uppercase tracking-widest">New Title Unlocked</div>
          </div>
        </div>

        <button 
          onClick={onClose}
          className="w-full h-16 bg-accent text-white rounded-2xl font-bold uppercase tracking-widest glow-accent active:scale-95 transition-all"
        >
          Claim Rewards
        </button>
      </motion.div>
    </motion.div>
  );
}

// --- Sub-components ---

function NavTab({ icon, label, active, onClick }: { icon: React.ReactNode, label: string, active: boolean, onClick: () => void }) {
  return (
    <button 
      onClick={onClick}
      className={cn(
        "flex flex-col items-center justify-center gap-1 transition-all duration-300",
        active ? "text-primary scale-110" : "text-text-secondary"
      )}
    >
      {icon}
      <span className="text-[10px] font-bold uppercase tracking-wider">{label}</span>
    </button>
  );
}

function Onboarding({ onComplete, uid }: { onComplete: (p: UserProfile) => void, uid: string }) {
  const [step, setStep] = useState(1);
  const [name, setName] = useState('');
  const [selectedClass, setSelectedClass] = useState<ClassType | null>(null);

  const handleNext = () => setStep(s => s + 1);

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-8">
      <div className="w-full max-w-xs space-y-10">
        <div className="flex justify-center gap-2">
          {[1, 2, 3].map(i => (
            <div key={i} className={cn("h-1 w-8 rounded-full transition-all", step >= i ? "bg-primary" : "bg-white/10")} />
          ))}
        </div>

        <AnimatePresence mode="wait">
          {step === 1 && (
            <motion.div 
              key="step1"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6"
            >
              <h2 className="text-3xl font-orbitron font-black leading-tight">What should we call you?</h2>
              <input 
                type="text" 
                placeholder="Enter your name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full h-16 bg-surface rounded-2xl px-6 text-white outline-none border border-white/5 focus:border-primary/50 transition-all font-bold"
              />
              <button 
                onClick={handleNext}
                disabled={!name}
                className="w-full h-16 bg-primary rounded-2xl font-bold uppercase tracking-widest text-white disabled:opacity-50 active:scale-95 transition-all"
              >
                Begin Journey
              </button>
            </motion.div>
          )}

          {step === 2 && (
            <motion.div 
              key="step2"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="w-full flex flex-col items-center"
            >
              <h2 className="text-2xl font-orbitron font-bold mb-2 text-center">Select Class</h2>
              <p className="text-text-secondary text-xs mb-10 text-center">This defines your starting skills</p>
              <div className="grid grid-cols-2 gap-4 w-full">
                {CLASSES.map((c) => (
                  <button
                    key={c.type}
                    onClick={() => setSelectedClass(c.type)}
                    className={cn(
                      "flex flex-col items-center justify-center p-6 glass rounded-3xl gap-3 border-2 transition-all active:scale-95",
                      selectedClass === c.type ? "border-primary bg-primary/10 glow-primary" : "border-transparent"
                    )}
                  >
                    <span className="text-4xl drop-shadow-lg">{c.emoji}</span>
                    <span className="font-bold text-sm tracking-wide">{c.type}</span>
                  </button>
                ))}
              </div>
              <button 
                onClick={handleNext}
                disabled={!selectedClass}
                className="w-full h-16 bg-primary rounded-2xl font-bold uppercase tracking-widest text-white mt-12 disabled:opacity-50 active:scale-95 transition-all shadow-xl glow-primary"
              >
                Confirm Class
              </button>
            </motion.div>
          )}

          {step === 3 && (
            <motion.div 
              key="step3"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="w-full flex flex-col items-center text-center"
            >
              <h2 className="text-3xl font-orbitron font-bold mb-10">You're ready!</h2>
              
              <div className="relative mb-10">
                <div className="w-32 h-32 rounded-full bg-accent/20 flex items-center justify-center border-4 border-accent animate-pulse">
                  <span className="text-accent font-orbitron text-4xl font-black">LV.1</span>
                </div>
                <div className="absolute -bottom-2 -right-2 bg-primary w-10 h-10 rounded-full flex items-center justify-center text-xl">
                  {CLASSES.find(c => c.type === selectedClass)?.emoji}
                </div>
              </div>

              <p className="text-xl font-bold mb-1">{name}</p>
              <p className="text-text-secondary mb-12 uppercase tracking-widest text-sm">{selectedClass}</p>

              <button 
                onClick={() => onComplete({
                  uid,
                  name,
                  class: selectedClass!,
                  level: 1,
                  xp: 0,
                  gold: 0,
                  rank: 'Rookie',
                  streak: 0,
                  lastActive: new Date().toISOString(),
                  skills: INITIAL_SKILLS.map(s => s.name),
                  achievements: []
                })}
                className="w-full h-14 bg-primary rounded-2xl font-bold uppercase tracking-widest text-white active:scale-95 transition-all"
              >
                Start Playing
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

function Dashboard({ user, habits, goals, onOpenSettings }: { user: UserProfile, habits: Habit[], goals: Goal[], onOpenSettings: () => void }) {
  const habitsDone = habits.filter(h => h.lastCompleted === new Date().toISOString().split('T')[0]).length;
  const activeGoals = goals.filter(g => g.progress < 100).length;
  const streak = user.streak;
  const [quote, setQuote] = useState("Loading inspiration...");
  const { xpToNext, progress } = calculateLevel(user.xp);

  useEffect(() => {
    getMotivationalQuote(user.class).then(setQuote);
  }, [user.class]);

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="p-5 pt-10 space-y-6 max-w-md mx-auto"
    >
      <header className="flex justify-between items-end">
        <div>
          <h1 className="text-2xl font-orbitron font-black tracking-tighter">Hey, {user.name}</h1>
          <p className="text-text-secondary text-[10px] font-bold uppercase tracking-[0.2em] opacity-60">
            {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
          </p>
        </div>
        <button 
          onClick={onOpenSettings}
          className="w-10 h-10 glass rounded-xl flex items-center justify-center border border-white/10 active:rotate-90 transition-all duration-500"
        >
          <Settings size={20} className="text-text-secondary" />
        </button>
      </header>

      {/* Player Card */}
      <motion.div 
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.1 }}
        className="glass rounded-[32px] p-6 shadow-2xl relative overflow-hidden border border-white/10"
      >
        <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 blur-[60px] rounded-full -mr-16 -mt-16" />
        <div className="absolute bottom-0 left-0 w-24 h-24 bg-secondary/10 blur-[40px] rounded-full -ml-12 -mb-12" />
        
        <div className="flex justify-between items-start mb-8 relative z-10">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl glass-dark flex items-center justify-center text-3xl border border-white/10 glow-secondary overflow-hidden">
              {user.photoURL ? (
                <img src={user.photoURL} className="w-full h-full object-cover" alt="" />
              ) : (
                CLASSES.find(c => c.type === user.class)?.emoji
              )}
            </div>
            <div>
              <h3 className="font-orbitron font-bold text-lg tracking-tight">{user.name}</h3>
              <div className="flex items-center gap-2">
                <span className="text-primary text-[10px] font-black uppercase tracking-widest px-2 py-0.5 bg-primary/10 rounded-full border border-primary/20">{user.class}</span>
                <div className="flex items-center gap-1 text-yellow-500 text-[10px] font-black bg-yellow-500/10 px-2 py-0.5 rounded-full border border-yellow-500/20">
                  <Coins size={10} />
                  {user.gold || 0}
                </div>
              </div>
            </div>
          </div>
          <div className="w-16 h-16 rounded-2xl glass-dark border-2 border-accent flex flex-col items-center justify-center relative z-10 glow-accent">
            <span className="text-[9px] font-black text-accent uppercase tracking-tighter">Level</span>
            <span className="text-2xl font-orbitron font-black text-accent leading-none">{user.level}</span>
          </div>
        </div>

        <div className="space-y-3 relative z-10">
          <div className="flex justify-between text-[9px] font-black uppercase tracking-[0.15em] text-text-secondary">
            <span>XP Progress</span>
            <span className="text-primary">{xpToNext} <span className="opacity-40">XP TO NEXT LEVEL</span></span>
          </div>
          <div className="h-4 bg-black/40 rounded-full overflow-hidden p-1 border border-white/5">
            <motion.div 
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              className="h-full bg-gradient-to-r from-primary to-accent rounded-full glow-primary relative"
            >
              <div className="absolute inset-0 bg-white/20 animate-pulse" />
            </motion.div>
          </div>
        </div>
      </motion.div>

      {/* Stats Bento Grid */}
      <motion.div 
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.2 }}
        className="grid grid-cols-2 gap-3"
      >
        <div className="grid grid-cols-1 gap-3">
          <StatCard value={habitsDone.toString()} label="Done" icon={<CheckCircle2 size={16} className="text-success" />} color="success" />
          <StatCard value={activeGoals.toString()} label="Goals" icon={<Target size={16} className="text-accent" />} color="accent" />
        </div>
        <div className="glass rounded-3xl p-5 flex flex-col items-center justify-center gap-2 border border-white/10 glow-primary">
          <div className="w-12 h-12 glass-dark rounded-full flex items-center justify-center text-primary mb-1">
            <Flame size={24} className="animate-pulse" />
          </div>
          <span className="text-3xl font-orbitron font-black leading-none">{streak}</span>
          <span className="text-[10px] font-black text-text-secondary uppercase tracking-[0.2em]">Day Streak</span>
        </div>
      </motion.div>

      {/* Hero Attributes */}
      <motion.div 
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.25 }}
        className="glass rounded-[32px] p-6 border border-white/10 space-y-4"
      >
        <div className="flex items-center gap-2">
          <ShieldCheck size={16} className="text-primary" />
          <h3 className="font-orbitron font-black text-xs uppercase tracking-[0.2em]">Hero Attributes</h3>
        </div>
        <div className="grid grid-cols-3 gap-4">
          <Attribute icon="💪" label="STR" value={user.level * 2 + 10} />
          <Attribute icon="🧠" label="INT" value={user.level * 3 + 5} />
          <Attribute icon="🗡️" label="AGI" value={user.level * 1 + 15} />
        </div>
      </motion.div>

      {/* Daily Quest Briefing */}
      <motion.div 
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.3 }}
        className="glass rounded-[32px] p-6 border border-white/10 relative overflow-hidden"
      >
        <div className="absolute top-0 left-0 w-1 h-full bg-accent/50" />
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center gap-2">
            <Zap size={16} className="text-accent" />
            <h3 className="font-orbitron font-black text-xs uppercase tracking-[0.2em]">Mission Briefing</h3>
          </div>
          <span className="text-[9px] font-black text-accent bg-accent/10 px-3 py-1 rounded-full border border-accent/20 tracking-widest">+50 XP BONUS</span>
        </div>
        <div className="space-y-4">
          {habits.slice(0, 3).map(h => (
            <div key={h.id} className="flex items-center gap-4 group cursor-pointer">
              <div className={cn(
                "w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all duration-300", 
                h.lastCompleted ? "bg-success border-success glow-success" : "border-white/10 group-hover:border-white/30"
              )}>
                {h.lastCompleted && <CheckCircle2 size={14} className="text-white" />}
              </div>
              <div className="flex-1">
                <span className={cn(
                  "text-sm font-bold transition-all duration-300", 
                  h.lastCompleted ? "text-text-secondary line-through opacity-50" : "text-white"
                )}>
                  {h.name}
                </span>
                {!h.lastCompleted && <div className="h-0.5 w-0 group-hover:w-full bg-primary/30 transition-all duration-300" />}
              </div>
            </div>
          ))}
          {habits.length === 0 && (
            <div className="py-4 text-center">
              <p className="text-text-secondary text-[10px] font-bold uppercase tracking-widest opacity-40">No active missions</p>
            </div>
          )}
        </div>
      </motion.div>

      <footer className="pt-4 pb-12 text-center relative">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-12 h-px bg-white/10" />
        <p className="text-text-secondary text-[10px] font-bold uppercase tracking-[0.2em] opacity-40 italic px-12 leading-relaxed">
          "{quote}"
        </p>
      </footer>
    </motion.div>
  );
}

function Attribute({ icon, label, value }: { icon: string, label: string, value: number }) {
  return (
    <div className="flex flex-col items-center gap-1">
      <span className="text-xl">{icon}</span>
      <span className="text-[8px] font-black text-text-secondary uppercase tracking-widest">{label}</span>
      <span className="text-sm font-orbitron font-black text-white">{value}</span>
    </div>
  );
}

function StatCard({ icon, label, value, color, isAtRisk }: { icon: React.ReactNode, label: string, value: string, color: string, isAtRisk?: boolean }) {
  const colors: any = {
    danger: 'text-danger bg-danger/10 border-danger/20',
    success: 'text-success bg-success/10 border-success/20',
    primary: 'text-primary bg-primary/10 border-primary/20',
    accent: 'text-accent bg-accent/10 border-accent/20'
  };

  return (
    <div className={cn("glass p-4 rounded-3xl border space-y-3", colors[color])}>
      <div className="flex items-center justify-between">
        <div className="opacity-80">{icon}</div>
        <ChevronRight size={14} className="opacity-20" />
      </div>
      <div>
        <div className="text-[10px] font-bold uppercase tracking-widest opacity-60">{label}</div>
        <div className={cn("text-lg font-orbitron font-black", isAtRisk && "animate-[pulse-danger_3s_ease-in-out_infinite]")}>{value}</div>
      </div>
    </div>
  );
}

function EmptyState({ icon, title, actionLabel, onAction }: { icon: React.ReactNode, title: string, actionLabel: string, onAction: () => void }) {
  return (
    <div className="py-20 text-center space-y-6">
      <div className="w-20 h-20 bg-surface rounded-[32px] flex items-center justify-center mx-auto shadow-xl border border-white/5 text-4xl">
        {icon}
      </div>
      <div className="space-y-2">
        <p className="text-text-secondary text-sm font-medium max-w-[200px] mx-auto leading-relaxed">{title}</p>
      </div>
      <button 
        onClick={onAction}
        className="px-6 h-12 glass rounded-2xl text-xs font-bold uppercase tracking-widest text-primary border border-primary/20 active:scale-95 transition-all"
      >
        {actionLabel}
      </button>
    </div>
  );
}

function HabitsScreen({ habits, onComplete, onDelete, userId }: { habits: Habit[], onComplete: (h: Habit) => void, onDelete: (id: string) => void, userId: string }) {
  const [showAdd, setShowAdd] = useState(false);
  const [pendingHabit, setPendingHabit] = useState<Habit | null>(null);

  const handleToggle = async (habit: Habit) => {
    if (habit.lastCompleted === new Date().toISOString().split('T')[0]) return;
    
    if ((habit.difficulty === 'Hard' || habit.difficulty === 'Legendary') && !pendingHabit) {
      setPendingHabit(habit);
      return;
    }

    try {
      const habitRef = doc(db, 'users', userId, 'habits', habit.id);
      const today = new Date().toISOString().split('T')[0];
      await updateDoc(habitRef, {
        lastCompleted: today,
        streak: habit.streak + 1
      });
      onComplete(habit);
      confetti({
        particleCount: 30,
        spread: 50,
        origin: { y: 0.8 },
        colors: ['#E94560', '#F5A623']
      });
      setPendingHabit(null);
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `users/${userId}/habits/${habit.id}`);
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="p-5 pt-10 space-y-6"
    >
      <header className="flex justify-between items-center">
        <h1 className="text-2xl font-orbitron font-bold">Habits</h1>
        <button 
          onClick={() => setShowAdd(true)}
          className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center text-white glow-primary"
        >
          <Plus size={24} />
        </button>
      </header>

      <div className="space-y-4">
        {habits.map((h) => (
          <HabitCard key={h.id} habit={h} onToggle={() => handleToggle(h)} onDelete={() => onDelete(h.id)} />
        ))}
        {habits.length === 0 && (
          <EmptyState 
            icon="🎯" 
            title="Champions start with one habit." 
            actionLabel="Add your first →" 
            onAction={() => setShowAdd(true)} 
          />
        )}
      </div>

      <AnimatePresence>
        {showAdd && (
          <AddHabitModal onClose={() => setShowAdd(false)} userId={userId} />
        )}
        {pendingHabit && (
          <ConfirmationModal 
            habit={pendingHabit} 
            onConfirm={() => handleToggle(pendingHabit)} 
            onCancel={() => setPendingHabit(null)} 
          />
        )}
      </AnimatePresence>
    </motion.div>
  );
}

function ConfirmationModal({ habit, onConfirm, onCancel }: { habit: Habit, onConfirm: () => void, onCancel: () => void }) {
  const xp = XP_REWARDS.HABIT_COMPLETE[habit.difficulty];
  const gold = GOLD_REWARDS.HABIT_COMPLETE[habit.difficulty];

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[200] flex items-center justify-center bg-black/80 backdrop-blur-md p-6"
    >
      <motion.div 
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.9, y: 20 }}
        className="w-full max-w-sm bg-surface rounded-[32px] p-8 border border-white/10 shadow-2xl space-y-6 text-center"
      >
        <div className="w-20 h-20 bg-primary/20 rounded-full flex items-center justify-center mx-auto text-primary animate-pulse">
          <Flame size={40} />
        </div>
        
        <div className="space-y-2">
          <h2 className="text-xl font-orbitron font-bold">Challenge Accepted?</h2>
          <p className="text-text-secondary text-sm">
            Completing this <span className="text-primary font-bold">{habit.difficulty}</span> habit will grant you:
          </p>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="bg-background rounded-2xl p-4 border border-white/5">
            <div className="text-primary font-black text-xl">+{xp}</div>
            <div className="text-[10px] uppercase tracking-widest text-text-secondary">XP</div>
          </div>
          <div className="bg-background rounded-2xl p-4 border border-white/5">
            <div className="text-accent font-black text-xl">+{gold}</div>
            <div className="text-[10px] uppercase tracking-widest text-text-secondary">Gold</div>
          </div>
        </div>

        <div className="flex flex-col gap-3">
          <button 
            onClick={onConfirm}
            className="w-full h-14 bg-primary rounded-2xl font-bold uppercase tracking-widest text-white glow-primary active:scale-95 transition-all"
          >
            Confirm Completion
          </button>
          <button 
            onClick={onCancel}
            className="w-full h-14 bg-white/5 rounded-2xl font-bold uppercase tracking-widest text-text-secondary hover:bg-white/10 active:scale-95 transition-all"
          >
            Not yet
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

function HabitCard({ habit, onToggle, onDelete }: { habit: Habit, onToggle: () => void, onDelete: () => void }) {
  const isDone = habit.lastCompleted === new Date().toISOString().split('T')[0];

  return (
    <motion.div 
      whileTap={{ scale: 0.98 }}
      className={cn(
        "glass rounded-2xl p-4 flex items-center justify-between transition-all border border-white/5",
        isDone ? "bg-success/5 border-success/20 opacity-60" : "hover:border-white/20"
      )}
    >
      <div className="flex items-center gap-4">
        <div className="w-12 h-12 bg-surface rounded-xl flex items-center justify-center text-2xl">
          {habit.category === 'Body' && '💪'}
          {habit.category === 'Mind' && '🧠'}
          {habit.category === 'Wealth' && '💰'}
          {habit.category === 'Creativity' && '🎨'}
          {habit.category === 'Social' && '🤝'}
        </div>
        <div>
          <h3 className={cn("font-bold text-sm", isDone && "line-through opacity-50")}>{habit.name}</h3>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 text-danger">
              <Flame size={10} />
              <motion.span 
                animate={isDone ? { scale: [1, 1.3, 1] } : {}}
                className="text-[10px] font-black"
              >
                {habit.streak}
              </motion.span>
            </div>
            <span className="text-text-secondary text-[10px] uppercase tracking-widest">{habit.difficulty}</span>
          </div>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <button 
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
          className="w-10 h-10 rounded-xl flex items-center justify-center text-danger hover:bg-danger/10 transition-all"
        >
          <Trash2 size={18} />
        </button>
        <button 
          onClick={onToggle}
          disabled={isDone}
          className={cn(
            "w-12 h-12 rounded-xl flex items-center justify-center transition-all border-2",
            isDone 
              ? "bg-success border-success text-white scale-90" 
              : "border-primary text-primary hover:bg-primary/10"
          )}
        >
          {isDone ? (
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: [0, 1.4, 0.9, 1] }}
              transition={{ duration: 0.4 }}
            >
              <CheckCircle2 size={24} />
            </motion.div>
          ) : <Plus size={24} />}
        </button>
      </div>
    </motion.div>
  );
}

function AddHabitModal({ onClose, userId }: { onClose: () => void, userId: string }) {
  const [name, setName] = useState('');
  const [category, setCategory] = useState('Mind');
  const [difficulty, setDifficulty] = useState<'Normal' | 'Hard' | 'Legendary'>('Normal');

  const handleAdd = async () => {
    if (!name) return;
    const id = Math.random().toString(36).substr(2, 9);
    const newHabit: Habit = {
      id,
      name,
      category,
      difficulty,
      streak: 0,
      lastCompleted: ""
    };

    try {
      const habitRef = doc(db, 'users', userId, 'habits', id);
      await setDoc(habitRef, newHabit);
      onClose();
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, `users/${userId}/habits/${id}`);
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] flex items-end justify-center bg-black/80 backdrop-blur-sm"
    >
      <motion.div 
        initial={{ y: "100%" }}
        animate={{ y: 0 }}
        exit={{ y: "100%" }}
        className="w-full max-w-[390px] bg-surface rounded-t-[40px] p-8 space-y-8"
      >
        <div className="flex justify-between items-center">
          <h2 className="text-xl font-orbitron font-bold">New Habit</h2>
          <button onClick={onClose} className="w-10 h-10 bg-background rounded-full flex items-center justify-center text-text-secondary">
            <X size={20} />
          </button>
        </div>

        <div className="space-y-6">
          <div className="space-y-2">
            <label className="text-[10px] font-bold text-text-secondary uppercase tracking-widest">Habit Name</label>
            <input 
              type="text" 
              placeholder="e.g. Morning Meditation"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full h-14 bg-background rounded-2xl px-5 text-white outline-none border border-white/5 focus:border-primary/50"
            />
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-bold text-text-secondary uppercase tracking-widest">Category</label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { id: 'Body', emoji: '💪' },
                { id: 'Mind', emoji: '🧠' },
                { id: 'Wealth', emoji: '💰' },
                { id: 'Creativity', emoji: '🎨' },
                { id: 'Social', emoji: '🤝' }
              ].map(c => (
                <button
                  key={c.id}
                  onClick={() => setCategory(c.id)}
                  className={cn(
                    "h-12 rounded-xl font-bold text-[10px] uppercase tracking-widest border transition-all flex flex-col items-center justify-center gap-1",
                    category === c.id 
                      ? "bg-primary border-primary text-white" 
                      : "bg-background border-white/5 text-text-secondary"
                  )}
                >
                  <span className="text-lg">{c.emoji}</span>
                  <span>{c.id}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-bold text-text-secondary uppercase tracking-widest">Difficulty</label>
            <div className="grid grid-cols-3 gap-2">
              {(['Normal', 'Hard', 'Legendary'] as const).map(d => (
                <button
                  key={d}
                  onClick={() => setDifficulty(d)}
                  className={cn(
                    "h-12 rounded-xl font-bold text-[10px] uppercase tracking-widest border transition-all",
                    difficulty === d ? "bg-accent border-accent text-white" : "bg-background border-white/5 text-text-secondary"
                  )}
                >
                  {d}
                </button>
              ))}
            </div>
          </div>

          <button 
            onClick={handleAdd}
            className="w-full h-14 bg-primary rounded-2xl font-bold uppercase tracking-widest text-white active:scale-95 transition-all"
          >
            Add Habit
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

function GoalsScreen({ goals, onComplete, onDelete, userId }: { goals: Goal[], onComplete: (g: Goal) => void, onDelete: (id: string) => void, userId: string }) {
  const [showAdd, setShowAdd] = useState(false);

  const handleUpdate = async (goal: Goal, progress: number) => {
    try {
      const goalRef = doc(db, 'users', userId, 'goals', goal.id);
      const isCompleted = progress >= 100;
      await updateDoc(goalRef, {
        progress,
      });

      if (isCompleted && goal.progress < 100) {
        onComplete(goal);
      }
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `users/${userId}/goals/${goal.id}`);
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="p-5 pt-10 space-y-6"
    >
      <header className="flex justify-between items-center">
        <h1 className="text-2xl font-orbitron font-bold">Missions</h1>
        <button 
          onClick={() => setShowAdd(true)}
          className="w-10 h-10 bg-accent rounded-xl flex items-center justify-center text-white glow-accent"
        >
          <Plus size={24} />
        </button>
      </header>

      <div className="space-y-4">
        {goals.map((g) => (
          <GoalCard key={g.id} goal={g} onUpdate={(p) => handleUpdate(g, p)} onDelete={() => onDelete(g.id)} />
        ))}
        {goals.length === 0 && (
          <EmptyState 
            icon="🏔️" 
            title="No mountain climbed itself." 
            actionLabel="Set this month's mission →" 
            onAction={() => setShowAdd(true)} 
          />
        )}
      </div>

      <AnimatePresence>
        {showAdd && (
          <AddGoalModal onClose={() => setShowAdd(false)} userId={userId} />
        )}
      </AnimatePresence>
    </motion.div>
  );
}

function GoalCard({ goal, onUpdate, onDelete }: { goal: Goal, onUpdate: (p: number) => void, onDelete: () => void }) {
  return (
    <div className={cn(
      "glass rounded-2xl p-5 space-y-4 transition-all border border-white/5",
      goal.progress >= 100 ? "opacity-50" : ""
    )}>
      <div className="flex justify-between items-start">
        <div className="space-y-1">
          <h3 className="font-bold">{goal.name}</h3>
          <p className="text-text-secondary text-[10px] uppercase tracking-widest">{goal.category} {goal.deadline ? `• ${goal.deadline}` : ''}</p>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
            }}
            className="text-danger opacity-40 hover:opacity-100 transition-all"
          >
            <Trash2 size={16} />
          </button>
          <span className="text-accent font-orbitron text-xs">{goal.progress}%</span>
        </div>
      </div>

      <div className="space-y-2">
        <div className="h-2 bg-black/40 rounded-full overflow-hidden border border-white/5">
          <motion.div 
            initial={{ width: 0 }}
            animate={{ width: `${goal.progress}%` }}
            className="h-full bg-primary glow-primary"
          />
        </div>
        {goal.progress < 100 && (
          <input 
            type="range" 
            min="0" 
            max="100" 
            value={goal.progress}
            onChange={(e) => onUpdate(parseInt(e.target.value))}
            className="w-full h-1 bg-white/10 rounded-lg appearance-none cursor-pointer accent-primary"
          />
        )}
      </div>
    </div>
  );
}

function AddGoalModal({ onClose, userId }: { onClose: () => void, userId: string }) {
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('Mind');
  const [days, setDays] = useState('30');

  const handleAdd = async () => {
    if (!title) return;
    const id = Math.random().toString(36).substr(2, 9);
    const newGoal: Goal = {
      id,
      name: title,
      category,
      progress: 0,
      deadline: new Date(Date.now() + parseInt(days) * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      rewards: ['+500 XP', 'New Rank Title']
    };

    try {
      const goalRef = doc(db, 'users', userId, 'goals', id);
      await setDoc(goalRef, newGoal);
      onClose();
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, `users/${userId}/goals/${id}`);
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] flex items-end justify-center bg-black/80 backdrop-blur-sm"
    >
      <motion.div 
        initial={{ y: "100%" }}
        animate={{ y: 0 }}
        exit={{ y: "100%" }}
        className="w-full max-w-[390px] bg-surface rounded-t-[40px] p-8 space-y-8"
      >
        <div className="flex justify-between items-center">
          <h2 className="text-xl font-orbitron font-bold">New Goal</h2>
          <button onClick={onClose} className="w-10 h-10 bg-background rounded-full flex items-center justify-center text-text-secondary">
            <X size={20} />
          </button>
        </div>

        <div className="space-y-6">
          <div className="space-y-2">
            <label className="text-[10px] font-bold text-text-secondary uppercase tracking-widest">Goal Title</label>
            <input 
              type="text" 
              placeholder="e.g. Run a Marathon"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full h-14 bg-background rounded-2xl px-5 text-white outline-none border border-white/5 focus:border-primary/50"
            />
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-bold text-text-secondary uppercase tracking-widest">Category</label>
            <div className="flex flex-wrap gap-2">
              {(['Body', 'Mind', 'Wealth', 'Creativity', 'Social'] as const).map(c => (
                <button
                  key={c}
                  onClick={() => setCategory(c)}
                  className={cn(
                    "px-4 h-10 rounded-full font-bold text-[10px] uppercase tracking-wider transition-all",
                    category === c ? "bg-accent text-white" : "bg-background text-text-secondary"
                  )}
                >
                  {c}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-bold text-text-secondary uppercase tracking-widest">Target Days</label>
            <input 
              type="number" 
              value={days}
              onChange={(e) => setDays(e.target.value)}
              className="w-full h-14 bg-background rounded-2xl px-5 text-white outline-none border border-white/5 focus:border-primary/50"
            />
          </div>

          <button 
            onClick={handleAdd}
            className="w-full h-14 bg-primary rounded-2xl font-bold uppercase tracking-widest text-white active:scale-95 transition-all"
          >
            Add Goal
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

function SkillsScreen({ skills }: { skills: Skill[], key?: string }) {
  const [expanded, setExpanded] = useState<string | null>(null);

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="p-5 pt-10 space-y-8"
    >
      <header className="flex justify-between items-center">
        <h1 className="text-2xl font-orbitron font-bold">Skill Tree</h1>
        <div className="w-10 h-10 glass rounded-xl flex items-center justify-center text-primary border border-primary/20">
          <ZapIcon size={20} />
        </div>
      </header>

      <div className="space-y-4">
        {skills.map((s, idx) => (
          <motion.div 
            key={s.name} 
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: idx * 0.05 }}
            className={cn(
              "glass rounded-[32px] overflow-hidden transition-all border border-white/5",
              expanded === s.name ? "ring-2 ring-primary/50" : ""
            )}
          >
            <button 
              onClick={() => setExpanded(expanded === s.name ? null : s.name)}
              className="w-full p-6 flex items-center justify-between"
            >
              <div className="flex items-center gap-5 flex-1">
                <div className="w-14 h-14 glass-dark rounded-2xl flex items-center justify-center text-3xl shadow-2xl border border-white/10">
                  {s.emoji}
                </div>
                <div className="flex-1 text-left">
                  <div className="flex justify-between items-center mb-2">
                    <span className="font-orbitron font-bold text-sm tracking-tight">{s.name}</span>
                    <span className="text-[10px] font-black text-primary bg-primary/10 px-2 py-0.5 rounded-full border border-primary/20">Lv. {s.level}</span>
                  </div>
                  <div className="h-2 bg-black/40 rounded-full overflow-hidden p-0.5 border border-white/5">
                    <motion.div 
                      initial={{ width: 0 }}
                      animate={{ width: `${(s.xp / s.maxXp) * 100}%` }}
                      className="h-full bg-gradient-to-r from-primary to-accent rounded-full glow-primary"
                    />
                  </div>
                </div>
              </div>
            </button>
            
            <AnimatePresence>
              {expanded === s.name && (
                <motion.div 
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="px-6 pb-6 border-t border-white/5 pt-5 space-y-6"
                >
                  <div className="grid grid-cols-2 gap-3">
                    <div className="glass-dark p-3 rounded-2xl border border-white/5">
                      <div className="text-[8px] font-black text-text-secondary uppercase tracking-widest mb-1">Current Bonus</div>
                      <div className="text-xs font-bold text-white">+{(s.level - 1) * 2}% Efficiency</div>
                    </div>
                    <div className="glass-dark p-3 rounded-2xl border border-white/5">
                      <div className="text-[8px] font-black text-text-secondary uppercase tracking-widest mb-1">Next Perk</div>
                      <div className="text-xs font-bold text-primary">Mastery Unlock</div>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between text-[10px] font-black uppercase tracking-widest text-text-secondary">
                      <span>Progression</span>
                      <span className="text-primary">{s.xp} / {s.maxXp} XP</span>
                    </div>
                    <p className="text-xs text-text-secondary italic leading-relaxed">"The path to mastery in {s.name.toLowerCase()} is long, but every step counts."</p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
}

function ProfileScreen({ user, onLogout, habits, goals }: { user: UserProfile, onLogout: () => void, habits: Habit[], goals: Goal[], userId: string }) {
  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="p-5 pt-10 space-y-10"
    >
      <header className="flex flex-col items-center text-center space-y-4">
        <div className="relative">
          <div className="w-24 h-24 rounded-full bg-surface flex items-center justify-center text-4xl border-4 border-primary glow-primary">
            {CLASSES.find(c => c.type === user.class)?.emoji}
          </div>
          <div className="absolute -bottom-2 -right-2 bg-accent w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold">
            {user.level}
          </div>
        </div>
        <div>
          <h2 className="text-2xl font-orbitron font-black">{user.name}</h2>
          <p className="text-text-secondary text-sm uppercase tracking-widest">{user.rank}</p>
        </div>
      </header>

      <div className="grid grid-cols-2 gap-4">
        <div className="glass rounded-2xl p-4 text-center">
          <p className="text-2xl font-orbitron font-bold text-primary">{habits.length}</p>
          <p className="text-[10px] font-bold text-text-secondary uppercase tracking-widest">Active Habits</p>
        </div>
        <div className="glass rounded-2xl p-4 text-center">
          <p className="text-2xl font-orbitron font-bold text-accent">{goals.filter(g => g.progress >= 100).length}</p>
          <p className="text-[10px] font-bold text-text-secondary uppercase tracking-widest">Goals Crushed</p>
        </div>
      </div>

      <div className="space-y-4">
        <h3 className="text-xs font-bold uppercase tracking-[0.2em] text-text-secondary">Account Settings</h3>
        <div className="space-y-2">
          <button 
            onClick={onLogout}
            className="w-full h-14 glass rounded-2xl flex items-center justify-between px-6 text-danger hover:bg-danger/10 transition-all"
          >
            <span className="font-bold">Sign Out</span>
            <LogOut size={20} />
          </button>
        </div>
      </div>

      <footer className="text-center">
        <p className="text-[10px] text-text-secondary uppercase tracking-widest opacity-30">LifeXP v1.0.0 • Last Active {new Date(user.lastActive).toLocaleDateString()}</p>
      </footer>
    </motion.div>
  );
}
