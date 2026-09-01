/* Player profiles + local leaderboard — DOM-free.
   Ported from index.html:988-998 (scores) and 1321-1348 (profiles).
   The dress-up / unlock system is DELETED: BLANK_PROFILE no longer carries the
   four legacy wardrobe keys, and fixProfile drops them from stored profiles. */

export const GUEST = 'Guest';

/* fruit is the lifetime count, best the quickest full run, bestLvl the quickest
   climb of each tower on its own (index.html:1324). */
export const BLANK_PROFILE = () => ({
  beaten: 0, fruit: 0, best: null, bestLvl: [null, null, null],
});

/* Profiles saved before a field existed get it filled in; legacy wardrobe
   fields are simply not copied across, so they drop out. Returns a fresh
   object — callers reassign (index.html:1330-1333). */
export function fixProfile(p) {
  const b = BLANK_PROFILE();
  const out = {};
  for (const k in b) out[k] = (p && p[k] !== undefined) ? p[k] : b[k];
  if (!Array.isArray(out.bestLvl) || out.bestLvl.length !== 3) out.bestLvl = [null, null, null];
  return out;
}

/* --- module-owned state (index.html:1326) --- */
let profiles = {};
let profileName = '';

export function loadProfiles() {
  try { profiles = JSON.parse(localStorage.getItem('ft_profiles') || '{}') || {}; } catch (e) { profiles = {}; }
  try { profileName = localStorage.getItem('ft_who') || ''; } catch (e) { /* private mode */ }
  Object.keys(profiles).forEach((n) => { profiles[n] = fixProfile(profiles[n]); });
  return profiles;
}

export function saveProfiles() {
  try {
    localStorage.setItem('ft_profiles', JSON.stringify(profiles));
    localStorage.setItem('ft_who', profileName);
  } catch (e) { /* private mode */ }
}

/* there is always somebody to play as, so nothing ever blocks on being named */
export function ensureGuest() {
  if (!Object.keys(profiles).length) profiles[GUEST] = BLANK_PROFILE();
  if (!profileName || !profiles[profileName]) {
    profileName = profiles[GUEST] ? GUEST : Object.keys(profiles)[0];
  }
  return profileName;
}

export function prof() {
  return (profileName && profiles[profileName]) ? profiles[profileName] : null;
}

export function useProfile(name) {
  name = (name || '').trim().slice(0, 14);
  if (!name) return false;
  if (!profiles[name]) profiles[name] = BLANK_PROFILE();
  profiles[name] = fixProfile(profiles[name]);
  profileName = name;
  saveProfiles();
  return true;
}

export function getProfiles() { return profiles; }
export function getProfileName() { return profileName; }

/* --- local leaderboard (index.html:988-993) --- */
export function loadScores() {
  try { return JSON.parse(localStorage.getItem('ft_scores') || '[]'); } catch (e) { return []; }
}
export function saveScore(name, time) {
  const s = loadScores().filter((r) => r.name !== name || r.time < time);   // keep their best
  if (!s.some((r) => r.name === name)) s.push({ name, time });
  s.sort((a, b) => a.time - b.time);
  try { localStorage.setItem('ft_scores', JSON.stringify(s.slice(0, 8))); } catch (e) { /* private mode */ }
}

loadProfiles();
