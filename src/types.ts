export type ClassType = 'Warrior' | 'Mage' | 'Rogue' | 'Paladin';

export interface UserProfile {
  uid: string;
  name: string;
  photoURL?: string;
  class: ClassType;
  level: number;
  xp: number;
  gold: number;
  inventory?: any[];
  rank: string;
  streak: number;
  lastActive: string;
  lastNightCheck?: string;
  skills: string[];
  achievements: string[];
  settings?: {
    morningReminder: boolean;
    streakDangerAlert: boolean;
    nightCheckReminder: boolean;
    showWaterTracker: boolean;
    showSleepTracker: boolean;
  };
}

export interface Habit {
  id: string;
  name: string;
  category: string;
  difficulty: 'Normal' | 'Hard' | 'Legendary';
  streak: number;
  lastCompleted: string; // ISO date YYYY-MM-DD
}

export interface Goal {
  id: string;
  name: string;
  category: string;
  progress: number; // 0 to 100
  deadline?: string;
  rewards?: string[];
}

export interface Skill {
  name: string;
  level: number;
  xp: number;
  maxXp: number;
  emoji: string;
  category: string;
}

export interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: string;
  unlocked: boolean;
}
