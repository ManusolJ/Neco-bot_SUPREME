const userLocks = new Map<string, boolean>();

export function isUserLocked(id: string): boolean {
  return userLocks.get(id) === true;
}

export function lockUser(id: string): void {
  userLocks.set(id, true);
}

export function unlockUser(id: string): void {
  userLocks.delete(id);
}
