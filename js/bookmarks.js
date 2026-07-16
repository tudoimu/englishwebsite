/* Saved/bookmarked vocab words: star button on flashcards + #screen-saved list. */
const Bookmarks = (() => {
  function findWordByText(text) {
    const needle = text.trim().toLowerCase();
    for (const topic of DATA.vocabTopics) {
      const w = topic.words.find(w => w.word.toLowerCase() === needle);
      if (w) return w;
    }
    return null;
  }

  async function updateSavedCount() {
    const list = await Storage.getBookmarks();
    const el = document.getElementById('savedCountDesc');
    if (el) el.textContent = `${list.length} mục đã lưu`;
    return list;
  }

  function starHTML(active) {
    return `<button class="bookmark-star${active ? ' active' : ''}" type="button">${active ? '⭐' : '☆'}</button>`;
  }

  async function attachStar(face, wordObj) {
    if (face.querySelector('.bookmark-star')) return;
    const active = await Storage.isBookmarked(wordObj.id);
    face.insertAdjacentHTML('beforeend', starHTML(active));
    const btn = face.querySelector('.bookmark-star');
    btn.addEventListener('click', async (e) => {
      e.stopPropagation();
      e.preventDefault();
      const nowActive = await Storage.toggleBookmark({
        id: wordObj.id, type: 'word', word: wordObj.word,
        phonetic: wordObj.phonetic, meaning: wordObj.meaning, example: wordObj.example,
      });
      btn.closest('.flashcard-wrap')?.querySelectorAll('.bookmark-star').forEach(s => {
        s.classList.toggle('active', nowActive);
        s.textContent = nowActive ? '⭐' : '☆';
      });
      await renderSavedList();
    });
  }

  function onFlashcardMutation() {
    const area = document.getElementById('flashcardArea');
    if (!area) return;
    const front = area.querySelector('.flashcard-face.front');
    const back = area.querySelector('.flashcard-face.back');
    if (!front) return;
    const wordEl = front.querySelector('.flashcard-word');
    if (!wordEl) return;
    const wordObj = findWordByText(wordEl.textContent);
    if (!wordObj) return;
    attachStar(front, wordObj);
    if (back) attachStar(back, wordObj);
  }

  function watchFlashcards() {
    const area = document.getElementById('flashcardArea');
    if (!area) return;
    const observer = new MutationObserver(onFlashcardMutation);
    observer.observe(area, { childList: true, subtree: true });
    onFlashcardMutation();
  }

  async function renderSavedList() {
    const list = await updateSavedCount();
    const el = document.getElementById('savedList');
    if (!el) return;
    if (!list.length) {
      el.innerHTML = '<div class="card">Chưa có từ nào được lưu. Nhấn ⭐ trên flashcard để lưu!</div>';
      return;
    }
    el.innerHTML = list.map(item => `
      <div class="card">
        <strong>${item.word}</strong> ${item.phonetic ? `<span>${item.phonetic}</span>` : ''}
        <div>${item.meaning}</div>
        ${item.example ? `<div><em>${item.example}</em></div>` : ''}
        <button class="remove-bookmark-btn" data-id="${item.id}" type="button">🗑️ Xóa</button>
      </div>
    `).join('');
    el.querySelectorAll('.remove-bookmark-btn').forEach(btn => {
      btn.addEventListener('click', async () => {
        const item = list.find(i => i.id === btn.dataset.id);
        if (item) await Storage.toggleBookmark(item);
        await renderSavedList();
      });
    });
  }

  function init() {
    watchFlashcards();
    const navBtn = document.querySelector('[data-screen="screen-saved"]');
    if (navBtn) navBtn.addEventListener('click', renderSavedList);
    updateSavedCount();
  }

  return { init, renderSavedList };
})();
