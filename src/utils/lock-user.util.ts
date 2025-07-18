// In-memory lock store for user operations
const userLocks = new Map<string, boolean>();

/**
 * Checks if a user is currently locked
 *
 * @param id User's Discord ID
 * @returns Lock status
 */
export function isUserLocked(id: string): boolean {
  return userLocks.get(id) === true;
}

/**
 * Locks a user to prevent concurrent operations
 *
 * @param id User's Discord ID
 */
export function lockUser(id: string): void {
  userLocks.set(id, true);
}

/**
 * Releases lock for a user
 *
 * @param id User's Discord ID
 */
export function unlockUser(id: string): void {
  userLocks.delete(id);
}
