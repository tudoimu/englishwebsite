/* Boot, screen router, home dashboard, dark mode, install prompt, confetti helper. */
const App = (() => {
  let deferredInstallPrompt = null;

  function showScreen(id) {
    document.querySelectorAll('.screen').forEach(s => s.classList.add('hidden'));
    const el = document.getElementById(id);
    if (el) el.classList.remove('hidden');
    document.querySelectorAll('.footer-nav-btn').forEach(b => {
      b.classList.toggle('active', b.dataset.screen === id);
    });
    window.scrollTo(0, 0);
  }

  function fireConfetti() {
    if (typeof confetti === 'function') {
      confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });
    }
  }

  async function applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    await Storage.setTheme(theme);
    const btn = document.getElementById('darkModeBtn');
    if (btn) btn.textContent = theme === 'dark' ? '☀️' : '🌙';
  }

  async function toggleTheme() {
    const current = document.documentElement.getAttribute('data-theme') || 'light';
    await applyTheme(current === 'dark' ? 'light' : 'dark');
  }

  async function renderHome() {
    const progress = await Storage.getProgress();
    const streak = await Storage.getStreak();
    const totalWords = DATA.vocabTopics.reduce((sum, t) => sum + t.words.length, 0);
    const pct = Math.min(100, Math.round((progress.vocabDone / totalWords) * 100)) || 0;

    document.getElementById('heroStreak').textContent = `🔥 ${streak} ngày streak`;
    document.getElementById('heroProgressText').textContent = `${progress.vocabDone}/${totalWords} từ vựng đã học`;
    document.getElementById('heroProgressFill').style.width = pct + '%';
    document.getElementById('footerProgressText').textContent = `${pct}%`;
  }

  function wireNav() {
    document.querySelectorAll('.footer-nav-btn').forEach(btn => {
      btn.addEventListener('click', () => showScreen(btn.dataset.screen));
    });
    document.querySelectorAll('[data-back]').forEach(btn => {
      btn.addEventListener('click', () => showScreen(btn.dataset.back));
    });
    document.getElementById('darkModeBtn').addEventListener('click', toggleTheme);
  }

  function wireInstall() {
    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      deferredInstallPrompt = e;
      const btn = document.getElementById('navbarInstallBtn');
      if (btn) btn.classList.remove('hidden');
    });
    const btn = document.getElementById('navbarInstallBtn');
    if (btn) {
      btn.addEventListener('click', async () => {
        if (!deferredInstallPrompt) return;
        deferredInstallPrompt.prompt();
        await deferredInstallPrompt.userChoice;
        deferredInstallPrompt = null;
        btn.classList.add('hidden');
      });
    }
  }

  async function maybeShowOnboarding() {
    const done = await Storage.isOnboarded();
    if (!done && typeof Achievements !== 'undefined') Achievements.showOnboarding();
  }

  async function boot() {
    const theme = await Storage.getTheme();
    await applyTheme(theme);
    await Storage.bumpStreak();
    wireNav();
    wireInstall();

    if (typeof Vocab !== 'undefined') Vocab.init();
    if (typeof Grammar !== 'undefined') Grammar.init();
    if (typeof MockTest !== 'undefined') MockTest.init();
    if (typeof Achievements !== 'undefined') Achievements.init();
    if (typeof Bookmarks !== 'undefined') Bookmarks.init();
    if (typeof Search !== 'undefined') Search.init();
    if (typeof DailyQuest !== 'undefined') DailyQuest.init();

    await renderHome();
    showScreen('screen-home');
    await maybeShowOnboarding();

    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('sw.js').catch(() => {});
    }
  }

  document.addEventListener('DOMContentLoaded', boot);

  return { showScreen, fireConfetti, renderHome, applyTheme };
})();
