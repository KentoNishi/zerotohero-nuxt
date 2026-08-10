// SPEC-062 — clear account-scoped user data from localStorage on logout so
// the next user on this device never sees the previous user's data.
const USER_DATA_KEYS = [
  "zthSavedWords",
  "zthSavedPhrases",
  "zthSavedHits",
  "zthSavedCollocations",
  "zthProgress",
  "zthBookshelf",
  "zthHistory",
  "zthFullHistory",
  "zthSettings",
  "zthPinyinList",
  "zthTranscription",
];

export function wipeLocalUserData() {
  if (typeof localStorage === "undefined") return;
  for (const key of USER_DATA_KEYS) {
    try {
      localStorage.removeItem(key);
    } catch {
      // best effort (privacy mode, quota, etc.)
    }
  }
}
