/* Profile/achievements screen + onboarding overlay. */
const Achievements = (() => {
  function showOnboarding() {
    const el = document.getElementById('onboardingOverlay');
    if (el) el.classList.remove('hidden');
  }

  async function hideOnboarding() {
    const el = document.getElementById('onboardingOverlay');
    if (el) el.classList.add('hidden');
    await Storage.setOnboarded();
  }

  function statBlock(num, label) {
    return `<div class="result-stat"><div class="num">${num}</div><div class="label">${label}</div></div>`;
  }

  async function renderAchievements() {
    const progress = await Storage.getProgress();
    const words = await Storage.getLearnedWords();

    const bestBand = progress.mockTests.length
      ? Math.max(...progress.mockTests.map(m => m.band))
      : '-';

    const stats = document.getElementById('achieveStats');
    if (stats) {
      stats.innerHTML = statBlock(words.length, 'Từ đã học')
        + statBlock(progress.quizDone, 'Quiz đã làm')
        + statBlock(bestBand, 'Band cao nhất');
    }

    const grid = document.getElementById('badgeGrid');
    if (grid) {
      grid.innerHTML = DATA.achievements.map(a => {
        const unlocked = a.condition(progress);
        return `<div class="badge-tile${unlocked ? '' : ' locked'}">
          <div class="emoji">${a.emoji}</div>
          <div class="name">${a.name}</div>
        </div>`;
      }).join('');
    }

    const recent = document.getElementById('recentWordsList');
    if (recent) {
      recent.innerHTML = words.length
        ? words.slice(0, 10).map(w => `<div class="card">${w.word} — ${w.meaning}</div>`).join('')
        : '<div class="card">Chưa học từ nào</div>';
    }
  }

  function init() {
    const closeBtn = document.getElementById('onboardingCloseBtn');
    if (closeBtn) closeBtn.addEventListener('click', hideOnboarding);

    const navBtn = document.querySelector('[data-screen="screen-achievements"]');
    if (navBtn) navBtn.addEventListener('click', renderAchievements);

    renderAchievements();
  }

  return { init, showOnboarding, renderAchievements };
})();
