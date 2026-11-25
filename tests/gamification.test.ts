import assert from 'node:assert/strict';
import {describe, it} from 'node:test';
import {
  calculateLevelFromXp,
  computeNextStreak,
  getLevelProgress,
  getUtcDateString,
  getUtcIsoWeekKey,
  getUtcPeriodKey,
  xpRequiredForLevel,
} from '../server/gamification.ts';

describe('XP & Level progression', () => {
  it('computes expected XP thresholds for levels 1-5', () => {
    assert.equal(xpRequiredForLevel(0), 0);
    assert.equal(xpRequiredForLevel(1), 0);
    assert.equal(xpRequiredForLevel(2), 100);
    assert.equal(xpRequiredForLevel(3), 250);
    assert.equal(xpRequiredForLevel(4), 450);
    assert.equal(xpRequiredForLevel(5), 700);
  });

  it('calculates level from XP accurately at boundaries', () => {
    assert.equal(calculateLevelFromXp(-10), 1);
    assert.equal(calculateLevelFromXp(0), 1);
    assert.equal(calculateLevelFromXp(99), 1);
    assert.equal(calculateLevelFromXp(100), 2);
    assert.equal(calculateLevelFromXp(249), 2);
    assert.equal(calculateLevelFromXp(250), 3);
    assert.equal(calculateLevelFromXp(700), 5);
  });

  it('computes level progress percentages', () => {
    const p1 = getLevelProgress(50);
    assert.equal(p1.level, 1);
    assert.equal(p1.currentLevelFloorXp, 0);
    assert.equal(p1.nextLevelXp, 100);
    assert.equal(p1.xpIntoLevel, 50);
    assert.equal(p1.xpNeededForNext, 100);
    assert.equal(p1.progressPercent, 50);

    const p2 = getLevelProgress(175);
    assert.equal(p2.level, 2);
    assert.equal(p2.currentLevelFloorXp, 100);
    assert.equal(p2.nextLevelXp, 250);
    assert.equal(p2.xpIntoLevel, 75);
    assert.equal(p2.xpNeededForNext, 150);
    assert.equal(p2.progressPercent, 50);
  });
});

describe('UTC period keys', () => {
  it('formats UTC date and ISO week keys', () => {
    const d = new Date('2026-04-15T23:59:59.000Z');
    assert.equal(getUtcDateString(d), '2026-04-15');
    assert.equal(getUtcIsoWeekKey(d), '2026-W16');
  });

  it('returns period keys for each quest type', () => {
    const d = new Date('2026-04-15T12:00:00.000Z');
    assert.equal(getUtcPeriodKey('daily', d), '2026-04-15');
    assert.equal(getUtcPeriodKey('weekly', d), '2026-W16');
    assert.equal(getUtcPeriodKey('one_time', d), 'once');
    assert.equal(getUtcPeriodKey('special', d), 'event');
  });
});

describe('UTC streak calculation with 1-day grace period', () => {
  it('starts streak at 1 on first completion', () => {
    assert.deepEqual(computeNextStreak(null, 0, 0, '2026-04-15'), {
      current_streak: 1,
      longest_streak: 1,
      last_quest_date: '2026-04-15',
    });
  });

  it('keeps streak unchanged on the same UTC day', () => {
    assert.deepEqual(computeNextStreak('2026-04-15', 4, 6, '2026-04-15'), {
      current_streak: 4,
      longest_streak: 6,
      last_quest_date: '2026-04-15',
    });
  });

  it('increments streak on consecutive UTC day (diff = 1)', () => {
    assert.deepEqual(computeNextStreak('2026-04-14', 4, 4, '2026-04-15'), {
      current_streak: 5,
      longest_streak: 5,
      last_quest_date: '2026-04-15',
    });
  });

  it('increments streak within 1-day grace period (diff = 2)', () => {
    assert.deepEqual(computeNextStreak('2026-04-13', 3, 5, '2026-04-15'), {
      current_streak: 4,
      longest_streak: 5,
      last_quest_date: '2026-04-15',
    });
  });

  it('resets streak to 1 after missing 2+ full UTC days (diff >= 3)', () => {
    assert.deepEqual(computeNextStreak('2026-04-12', 7, 7, '2026-04-15'), {
      current_streak: 1,
      longest_streak: 7,
      last_quest_date: '2026-04-15',
    });
  });
});
