/**
 * @file
 * Provides an in‑memory locking mechanism to prevent concurrent operations
 * on the same Discord user. Useful for ensuring that only one async task
 * modifies a user’s state at a time.
 */

/** @private Tracks lock state per user ID (`true` = locked). */
const userLocks = new Map<string, boolean>();

/**
 * Checks if a given user is currently locked.
 *
 * @param id - The Discord user ID to check.
 * @returns `true` if the user is locked (i.e. an operation is in progress), otherwise `false`.
 */
export function isUserLocked(id: string): boolean {
  return userLocks.get(id) === true;
}

/**
 * Locks a user to prevent any other concurrent operation from proceeding.
 *
 * @param id - The Discord user ID to lock.
 * @remarks
 * After calling this, `isUserLocked(id)` will return `true` until `unlockUser(id)` is called.
 */
export function lockUser(id: string): void {
  userLocks.set(id, true);
}

/**
 * Unlocks a previously locked user, allowing new operations to proceed.
 *
 * @param id - The Discord user ID to unlock.
 * @remarks
 * If the user was not locked, this is a no‑op.
 */
export function unlockUser(id: string): void {
  userLocks.delete(id);
}

/**
 * Clears all locks, allowing all users to be unlocked.
 */
export function clearAllLocks(): void {
  userLocks.clear();
}
