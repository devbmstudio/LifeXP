import { Habit } from './types';

export const XP_REWARDS = {
  HABIT_COMPLETE: {
    Normal: 25,
    Hard: 50,
    Legendary: 100
  },
  GOAL_COMPLETE: 500,
  NIGHT_CHECK: 15
};

export const GOLD_REWARDS = {
  HABIT_COMPLETE: {
    Normal: 10,
    Hard: 25,
    Legendary: 60
  },
  GOAL_COMPLETE: 250,
  NIGHT_CHECK: 10
};

export function getLevel(xp: number) {
  return Math.floor(xp / 500) + 1;
}

export function calculateLevel(xp: number) {
  const level = getLevel(xp);
  const xpInCurrentLevel = xp % 500;
  const xpToNext = 500 - xpInCurrentLevel;
  const progress = (xpInCurrentLevel / 500) * 100;

  return { level, xpToNext, progress };
}

export function getRankTitle(level: number): string {
  if (level < 5) return 'Novice';
  if (level < 10) return 'Apprentice';
  if (level < 20) return 'Journeyman';
  if (level < 35) return 'Expert';
  if (level < 50) return 'Master';
  if (level < 75) return 'Grandmaster';
  return 'Legend';
}
