import { GolferUser } from '../types/golf';

/**
 * Normalizes an arbitrary ID string for robust, case-insensitive, whitespace-trimmed comparison.
 */
export function normalizeId(id?: string | null): string {
  if (!id || typeof id !== 'string') return '';
  return id.trim().toLowerCase();
}

/**
 * Normalizes an email address.
 */
export function normalizeEmail(email?: string | null): string {
  if (!email || typeof email !== 'string') return '';
  return email.trim().toLowerCase();
}

/**
 * Normalizes a username (stripping leading @ symbol, whitespace, lowercase).
 */
export function normalizeUsername(username?: string | null): string {
  if (!username || typeof username !== 'string') return '';
  return username.trim().replace(/^@+/, '').toLowerCase();
}

/**
 * Normalizes a display name.
 */
export function normalizeDisplayName(name?: string | null): string {
  if (!name || typeof name !== 'string') return '';
  return name.trim().toLowerCase();
}

/**
 * Check whether a string looks like a standard UUID (e.g., Supabase Auth user ID).
 */
export function isUUID(str?: string | null): boolean {
  if (!str) return false;
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(str.trim());
}

/**
 * Determines whether two user entities or identifiers refer to the EXACT same person.
 * Checks ID match, email match, or username match.
 */
export function isSameUser(
  userA?: Partial<GolferUser> | { id?: string; email?: string; username?: string; displayName?: string } | string | null,
  userB?: Partial<GolferUser> | { id?: string; email?: string; username?: string; displayName?: string } | string | null
): boolean {
  if (!userA || !userB) return false;

  // If one or both are raw strings
  const objA = typeof userA === 'string' ? { id: userA } : userA;
  const objB = typeof userB === 'string' ? { id: userB } : userB;

  const idA = normalizeId(objA.id);
  const idB = normalizeId(objB.id);
  if (idA && idB && idA === idB) return true;

  const emailA = normalizeEmail((objA as any).email);
  const emailB = normalizeEmail((objB as any).email);
  if (emailA && emailB && emailA === emailB) return true;

  const userHandleA = normalizeUsername(objA.username);
  const userHandleB = normalizeUsername(objB.username);
  if (userHandleA && userHandleB && userHandleA === userHandleB) return true;

  return false;
}

/**
 * Merges two duplicate user records into one canonical, high-fidelity profile.
 */
export function mergeUserProfiles(primary: GolferUser, secondary: GolferUser): GolferUser {
  // Prefer UUID as the primary account ID if available
  let preferredId = primary.id;
  if (!isUUID(primary.id) && isUUID(secondary.id)) {
    preferredId = secondary.id;
  }

  const emailVerified = Boolean(primary.emailVerified || secondary.emailVerified);
  const email = primary.email || secondary.email || '';
  const photoURL = (primary.photoURL && !primary.photoURL.includes('placeholder')) 
    ? primary.photoURL 
    : (secondary.photoURL || primary.photoURL);

  const bag = (primary.bag && primary.bag.length > 0) ? primary.bag : (secondary.bag || []);
  const handicapHistory = (primary.handicapHistory && primary.handicapHistory.length > 0) 
    ? primary.handicapHistory 
    : (secondary.handicapHistory || []);

  const stats = {
    fairwaysHitPct: 55,
    greensInRegPct: 45,
    avgPuttsPerRound: 32,
    scramblingPct: 40,
    holesInOne: 0,
    eaglesCount: 0,
    birdiesCount: 0,
    ...(secondary.stats || {}),
    ...(primary.stats || {}),
  };

  const updatedAt = new Date(
    Math.max(
      new Date(primary.updatedAt || 0).getTime(),
      new Date(secondary.updatedAt || 0).getTime(),
      Date.now()
    )
  ).toISOString();

  return {
    ...secondary,
    ...primary,
    id: preferredId,
    email,
    photoURL,
    emailVerified,
    bag,
    handicapHistory,
    stats,
    updatedAt,
  };
}

/**
 * Deduplicates a list of golfer profiles by matching unique ID, email, or username.
 * Preserves ordering while consolidating duplicates into the richest profile.
 */
export function dedupeUsers(users: GolferUser[]): GolferUser[] {
  if (!Array.isArray(users) || users.length <= 1) return users || [];

  const result: GolferUser[] = [];
  // Map identifier -> index in result
  const idIndexMap = new Map<string, number>();
  const emailIndexMap = new Map<string, number>();
  const usernameIndexMap = new Map<string, number>();

  for (const user of users) {
    if (!user) continue;

    const normId = normalizeId(user.id);
    const normEmail = normalizeEmail(user.email);
    const normUsername = normalizeUsername(user.username);

    // Check if this user already exists by any identifier
    let existingIndex = -1;
    if (normId && idIndexMap.has(normId)) {
      existingIndex = idIndexMap.get(normId)!;
    } else if (normEmail && emailIndexMap.has(normEmail)) {
      existingIndex = emailIndexMap.get(normEmail)!;
    } else if (normUsername && usernameIndexMap.has(normUsername)) {
      existingIndex = usernameIndexMap.get(normUsername)!;
    }

    if (existingIndex >= 0) {
      // Merge with existing record
      const merged = mergeUserProfiles(user, result[existingIndex]);
      result[existingIndex] = merged;

      // Update index pointers
      const mergedId = normalizeId(merged.id);
      const mergedEmail = normalizeEmail(merged.email);
      const mergedUsername = normalizeUsername(merged.username);
      if (mergedId) idIndexMap.set(mergedId, existingIndex);
      if (mergedEmail) emailIndexMap.set(mergedEmail, existingIndex);
      if (mergedUsername) usernameIndexMap.set(mergedUsername, existingIndex);
    } else {
      // New unique user
      const newIndex = result.length;
      result.push(user);
      if (normId) idIndexMap.set(normId, newIndex);
      if (normEmail) emailIndexMap.set(normEmail, newIndex);
      if (normUsername) usernameIndexMap.set(normUsername, newIndex);
    }
  }

  return result;
}

/**
 * Builds a comprehensive set of normalized matching tokens (ID, email, username, displayName, aliases)
 * for a given user or user ID to guarantee robust participant lookup in tournaments.
 */
export function getUserSearchTokens(
  userOrId?: string | Partial<GolferUser> | null,
  allKnownUsers?: GolferUser[]
): Set<string> {
  const tokens = new Set<string>();
  if (!userOrId) return tokens;

  let baseUser: Partial<GolferUser> | null = null;
  let rawId = '';

  if (typeof userOrId === 'string') {
    rawId = userOrId;
    tokens.add(normalizeId(rawId));
    if (allKnownUsers) {
      baseUser = allKnownUsers.find(u => normalizeId(u.id) === normalizeId(rawId)) || null;
    }
  } else {
    baseUser = userOrId;
    if (userOrId.id) {
      rawId = userOrId.id;
      tokens.add(normalizeId(userOrId.id));
    }
  }

  if (baseUser) {
    if (baseUser.id) tokens.add(normalizeId(baseUser.id));
    if (baseUser.email) tokens.add(normalizeEmail(baseUser.email));
    if (baseUser.username) {
      tokens.add(normalizeUsername(baseUser.username));
      tokens.add(baseUser.username.trim().toLowerCase());
    }
    if (baseUser.displayName) {
      tokens.add(normalizeDisplayName(baseUser.displayName));
    }
  }

  // Also include any alias IDs from known users matching the same email or username
  if (allKnownUsers && baseUser) {
    const userEmail = normalizeEmail(baseUser.email);
    const userHandle = normalizeUsername(baseUser.username);

    for (const u of allKnownUsers) {
      if (!u) continue;
      const uEmail = normalizeEmail(u.email);
      const uHandle = normalizeUsername(u.username);
      if ((userEmail && uEmail && userEmail === uEmail) || (userHandle && uHandle && userHandle === uHandle)) {
        tokens.add(normalizeId(u.id));
        if (u.displayName) tokens.add(normalizeDisplayName(u.displayName));
      }
    }
  }

  return tokens;
}
