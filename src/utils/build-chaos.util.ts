/**
 * Generates random integer within range (inclusive)
 *
 * @param min Minimum value (inclusive)
 * @param max Maximum value (inclusive)
 * @returns Random integer in specified range
 */
export default function chaosBuilder(min: number, max: number): number {
  // Normalize input values
  const low = Math.ceil(min);
  const high = Math.floor(max);

  // Generate random value in range
  return Math.floor(Math.random() * (high - low + 1)) + low;
}
