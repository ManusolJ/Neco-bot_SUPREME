/**
 * @file Utility function to generate a random integer within a specified range.
 *
 * @param min - The minimum integer value (inclusive).
 * @param max - The maximum integer value (inclusive).
 * @returns A random integer between `min` and `max`.
 */
export default function chaosBuilder(min: number, max: number): number {
  const low = Math.ceil(min);
  const high = Math.floor(max);
  return Math.floor(Math.random() * (high - low + 1)) + low;
}
