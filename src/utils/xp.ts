import { ClassType } from '../types';

export function calculateLevel(totalXp: number): number {
  return Math.floor(totalXp / 250) + 1;
}

export function calculateXpToNext(level: number, totalXp: number): number {
  return (level * 250) - totalXp;
}

export function getRankTitle(level: number): string {
  if (level <= 3) return "Rookie — The journey begins";
  if (level <= 7) return "Challenger — Finding your rhythm";
  if (level <= 12) return "Consistent — You show up daily";
  if (level <= 20) return "Elite — Top tier discipline";
  if (level <= 30) return "Legend — Most quit. You didn't.";
  return "Mythic — You became who you wanted to be";
}

export const XP_REWARDS = {
  HABIT_EASY: 10,
  HABIT_MEDIUM: 25,
  HABIT_HARD: 50,
  GOAL_LOW: 10,
  GOAL_MEDIUM: 25,
  GOAL_HIGH: 50,
  MONTHLY_EASY: 100,
  MONTHLY_MEDIUM: 200,
  MONTHLY_HARD: 300,
  NIGHT_CHECK_BONUS: 15,
  ALL_DAILY_GOALS_BONUS: 25,
  SEVEN_DAY_STREAK_BONUS: 50,
};

export function getRandomBonusXp(): number {
  // 1-in-5 chance for variable reward
  if (Math.random() < 0.2) {
    return Math.floor(Math.random() * 31) + 10; // +10 to +40 XP
  }
  return 0;
}
