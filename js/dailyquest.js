/* Daily quest suggestion card + tips ticker. */
const DailyQuest = (() => {
  function renderTicker() {
    const track = document.getElementById('tipsTickerTrack');
    if (!track) return;
    const spans = DATA.tips.map(t => `<span>${t}</span>`).join('');
    track.innerHTML = spans + spans; // duplicated for seamless -50% marquee loop
  }

  async function renderQuest() {
    const title = document.getElementById('questTitle');
    const sub = document.getElementById('questSub');
    const btn = document.getElementById('questBtn');
    if (!title || !sub || !btn) return;

    const progress = await Storage.getProgress();
    const totalWords = DATA.vocabTopics.reduce((sum, t) => sum + t.words.length, 0);

    let questTitle, questSub, onClick = null;

    if (progress.vocabDone < totalWords) {
      questTitle = 'Học thêm từ vựng mới';
      questSub = `Còn ${totalWords - progress.vocabDone} từ chưa học`;
      onClick = () => App.showScreen('screen-vocab-topics');
    } else if (progress.grammarDone < DATA.grammarTopics.length) {
      questTitle = 'Luyện tập ngữ pháp';
      questSub = `Còn ${DATA.grammarTopics.length - progress.grammarDone} chủ đề chưa ôn`;
      onClick = () => App.showScreen('screen-grammar-topics');
    } else if (progress.mockTests.length === 0) {
      questTitle = 'Làm bài thi thử đầu tiên';
      questSub = 'Kiểm tra trình độ hiện tại của bạn';
      onClick = () => App.showScreen('screen-mocktest-intro');
    } else {
      questTitle = 'Tuyệt vời! Đã ôn xong hết 🎉';
      questSub = 'Quay lại luyện tập để duy trì streak nhé!';
    }

    const today = new Date().toISOString().slice(0, 10);
    const lastQuestDate = await Storage.getLastQuestDate();
    if (lastQuestDate === today) questTitle = '✅ ' + questTitle;

    title.textContent = questTitle;
    sub.textContent = questSub;

    btn.classList.toggle('hidden', !onClick);
    btn.onclick = onClick
      ? async () => {
          await Storage.setLastQuestDate(new Date().toISOString().slice(0, 10));
          onClick();
        }
      : null;
  }

  function init() {
    renderTicker();
    renderQuest();
    const navBtn = document.querySelector('[data-screen="screen-home"]');
    if (navBtn) navBtn.addEventListener('click', renderQuest);
  }

  return { init };
})();
