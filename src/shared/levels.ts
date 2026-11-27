/**
 * Shared level curve used by both the server and the client UI.
 * Formula for L >= 1: 25 * (L - 1) * (L + 2)
 *   L=1 -> 0
 *   L=2 -> 100
 *   L=3 -> 250
 *   L=4 -> 450
 *   L=5 -> 700
 */
export function xpRequiredForLevel(level: number): number {
  if (level <= 1) return 0;
  return 25 * (level - 1) * (level + 2);
}

/** XP needed to advance from `level` to `level + 1`. */
export function xpToNextLevel(level: number): number {
  return xpRequiredForLevel(level + 1) - xpRequiredForLevel(level);
}
