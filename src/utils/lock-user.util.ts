// In-memory map to track user locks
const userLocks = new Map<string, boolean>();

/**
 * Determines whether a user is currently locked.
 *
 * @param id - The Discord user ID to check.
 * @returns `true` if the user is locked; otherwise `false`.
 */
export function isUserLocked(id: string): boolean {
  return userLocks.get(id) === true;
}

/**
 * Locks a user to prevent concurrent operations.
 *
 * @param id - The Discord user ID to lock.
 */
export function lockUser(id: string): void {
  userLocks.set(id, true);
}

/**
 * Releases the lock for a user, allowing further operations.
 *
 * @param id - The Discord user ID to unlock.
 */
export function unlockUser(id: string): void {
  userLocks.delete(id);
}
