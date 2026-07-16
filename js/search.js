/* Home search: live filter across vocab words, jump to topic on click. */
const Search = (() => {
  function allWords() {
    const out = [];
    DATA.vocabTopics.forEach(topic => {
      topic.words.forEach(w => out.push({ word: w, topic }));
    });
    return out;
  }

  function jumpToTopic(topicId) {
    App.showScreen('screen-vocab-topics');
    requestAnimationFrame(() => {
      const tile = document.querySelector(`#vocabTopicList [data-topic="${topicId}"]`);
      if (tile) tile.click();
    });
  }

  function render(query) {
    const resultsEl = document.getElementById('homeSearchResults');
    if (!query) {
      resultsEl.innerHTML = '';
      return;
    }
    const q = query.toLowerCase();
    const matches = allWords()
      .filter(({ word }) => word.word.toLowerCase().includes(q) || word.meaning.toLowerCase().includes(q))
      .slice(0, 8);

    if (matches.length === 0) {
      resultsEl.innerHTML = 'Không tìm thấy từ nào';
      return;
    }

    resultsEl.innerHTML = matches.map(({ word, topic }) => `
      <div class="search-result-item" data-topic="${topic.id}">
        <div class="w">${word.word}</div>
        <div class="m">${word.meaning} · ${topic.name}</div>
      </div>
    `).join('');

    resultsEl.querySelectorAll('[data-topic]').forEach(item => {
      item.addEventListener('click', () => {
        const topicId = item.dataset.topic;
        resultsEl.innerHTML = '';
        document.getElementById('homeSearchInput').value = '';
        jumpToTopic(topicId);
      });
    });
  }

  function init() {
    const input = document.getElementById('homeSearchInput');
    if (!input) return;
    input.addEventListener('input', () => render(input.value.trim()));
  }

  return { init };
})();
