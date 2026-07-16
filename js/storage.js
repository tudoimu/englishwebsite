/* Local-only progress storage via localforage. No backend, no login. */
const Storage = (() => {
  const KEYS = {
    THEME: 'ielts_theme',
    PROGRESS: 'ielts_progress',
    LEARNED: 'ielts_learned_words',
    STREAK: 'ielts_streak',
    LAST_VISIT: 'ielts_last_visit',
    ONBOARDED: 'ielts_onboarded',
    BOOKMARKS: 'ielts_bookmarks',
    LAST_QUEST_DATE: 'ielts_last_quest_date',
  };

  const defaultProgress = () => ({
    vocabDone: 0,
    quizDone: 0,
    grammarDone: 0,
    mockTests: [], // { date, band, correct, total }
    badges: [],
  });

  async function get(key, fallback) {
    const v = await localforage.getItem(key);
    return v === null || v === undefined ? fallback : v;
  }
  async function set(key, value) {
    return localforage.setItem(key, value);
  }

  async function getTheme() { return get(KEYS.THEME, 'light'); }
  async function setTheme(theme) { return set(KEYS.THEME, theme); }

  async function getProgress() { return get(KEYS.PROGRESS, defaultProgress()); }
  async function saveProgress(progress) { return set(KEYS.PROGRESS, progress); }

  async function getLearnedWords() { return get(KEYS.LEARNED, []); }
  async function addLearnedWord(word) {
    const list = await getLearnedWords();
    if (!list.find(w => w.id === word.id)) {
      list.unshift({ ...word, learnedAt: Date.now() });
      await set(KEYS.LEARNED, list.slice(0, 200));
    }
  }

  async function bumpStreak() {
    const today = new Date().toISOString().slice(0, 10);
    const last = await get(KEYS.LAST_VISIT, null);
    let streak = await get(KEYS.STREAK, 0);
    if (last === today) return streak;
    const y = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
    streak = last === y ? streak + 1 : 1;
    await set(KEYS.STREAK, streak);
    await set(KEYS.LAST_VISIT, today);
    return streak;
  }
  async function getStreak() { return get(KEYS.STREAK, 0); }

  async function isOnboarded() { return get(KEYS.ONBOARDED, false); }
  async function setOnboarded() { return set(KEYS.ONBOARDED, true); }

  // Bookmarks: generic saved-item list. item = {id, type ('word'|'grammar'|'question'), ...displayFields}
  async function getBookmarks() { return get(KEYS.BOOKMARKS, []); }
  async function isBookmarked(id) {
    const list = await getBookmarks();
    return list.some(b => b.id === id);
  }
  async function toggleBookmark(item) {
    const list = await getBookmarks();
    const idx = list.findIndex(b => b.id === item.id);
    if (idx >= 0) {
      list.splice(idx, 1);
    } else {
      list.unshift({ ...item, savedAt: Date.now() });
    }
    await set(KEYS.BOOKMARKS, list);
    return idx < 0; // true if now bookmarked
  }

  async function getLastQuestDate() { return get(KEYS.LAST_QUEST_DATE, null); }
  async function setLastQuestDate(dateStr) { return set(KEYS.LAST_QUEST_DATE, dateStr); }

  return {
    KEYS, getTheme, setTheme, getProgress, saveProgress,
    getLearnedWords, addLearnedWord, bumpStreak, getStreak,
    isOnboarded, setOnboarded, defaultProgress,
    getBookmarks, isBookmarked, toggleBookmark,
    getLastQuestDate, setLastQuestDate,
  };
})();
