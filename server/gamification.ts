import type {QuestType} from '../src/shared/types.ts';

/**
 * Configurable level curve:
 * Level 1: 0 XP
 * Level 2: 100 XP
 * Level 3: 250 XP
 * Level 4: 450 XP
 * Level 5: 700 XP
 * Formula for L >= 1: 25 * (L - 1) * (L + 2)
 *   L=1 -> 0
 *   L=2 -> 25 * 1 * 4 = 100
 *   L=3 -> 25 * 2 * 5 = 250
 *   L=4 -> 25 * 3 * 6 = 450
 *   L=5 -> 25 * 4 * 7 = 700
 */
export function xpRequiredForLevel(level: number): number {
  if (level <= 1) return 0;
  return 25 * (level - 1) * (level + 2);
}

export function calculateLevelFromXp(xp: number): number {
  const safeXp = Math.max(0, Math.floor(xp));
  let level = 1;
  while (xpRequiredForLevel(level + 1) <= safeXp && level < 100) {
    level += 1;
  }
  return level;
}

export interface LevelProgress {
  level: number;
  currentXp: number;
  currentLevelFloorXp: number;
  nextLevelXp: number;
  xpIntoLevel: number;
  xpNeededForNext: number;
  progressPercent: number;
}

export function getLevelProgress(xp: number): LevelProgress {
  const safeXp = Math.max(0, Math.floor(xp));
  const level = calculateLevelFromXp(safeXp);
  const currentLevelFloorXp = xpRequiredForLevel(level);
  const nextLevelXp = xpRequiredForLevel(level + 1);
  const xpIntoLevel = safeXp - currentLevelFloorXp;
  const xpNeededForNext = Math.max(1, nextLevelXp - currentLevelFloorXp);
  const progressPercent = Math.min(100, Math.round((xpIntoLevel / xpNeededForNext) * 100));

  return {
    level,
    currentXp: safeXp,
    currentLevelFloorXp,
    nextLevelXp,
    xpIntoLevel,
    xpNeededForNext,
    progressPercent,
  };
}

export function getUtcDateString(date = new Date()): string {
  return date.toISOString().slice(0, 10);
}

export function getUtcIsoWeekKey(date = new Date()): string {
  const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  return `${d.getUTCFullYear()}-W${String(weekNo).padStart(2, '0')}`;
}

export function getUtcPeriodKey(questType: QuestType, date = new Date()): string {
  switch (questType) {
    case 'daily':
      return getUtcDateString(date);
    case 'weekly':
      return getUtcIsoWeekKey(date);
    case 'one_time':
      return 'once';
    case 'special':
      return 'event';
  }
}

/**
 * Computes next streak using UTC midnight resets with a 1-day grace period:
 * - Same UTC date: keep streak unchanged
 * - Yesterday (diff = 1) or 1 missed UTC day grace (diff = 2): increment streak
 * - More than 1 missed UTC day (diff >= 3) or first completion: reset to 1
 */
export function computeNextStreak(
  lastQuestDate: string | null,
  currentStreak: number,
  longestStreak: number,
  todayUtc = getUtcDateString(),
): {current_streak: number; longest_streak: number; last_quest_date: string} {
  if (!lastQuestDate) {
    return {
      current_streak: 1,
      longest_streak: Math.max(1, longestStreak),
      last_quest_date: todayUtc,
    };
  }

  const lastMs = Date.parse(`${lastQuestDate}T00:00:00.000Z`);
  const todayMs = Date.parse(`${todayUtc}T00:00:00.000Z`);
  const diffDays = Math.round((todayMs - lastMs) / 86400000);

  if (diffDays <= 0) {
    return {
      current_streak: Math.max(1, currentStreak),
      longest_streak: Math.max(longestStreak, currentStreak, 1),
      last_quest_date: lastQuestDate,
    };
  }

  if (diffDays === 1 || diffDays === 2) {
    const next = Math.max(0, currentStreak) + 1;
    return {
      current_streak: next,
      longest_streak: Math.max(longestStreak, next),
      last_quest_date: todayUtc,
    };
  }

  return {
    current_streak: 1,
    longest_streak: Math.max(longestStreak, 1),
    last_quest_date: todayUtc,
  };
}
