/* Vocab module: topic list, flashcards, typing practice, matching game, quiz. */
const Vocab = (() => {
  let currentTopic = null;
  let currentIndex = 0;
  let flippedIds = new Set();

  let typingWords = [];
  let typingIndex = 0;

  let quizQuestions = [];
  let quizIndex = 0;
  let quizScore = 0;

  function renderTopicList() {
    const el = document.getElementById('vocabTopicList');
    el.innerHTML = DATA.vocabTopics.map(t => `
      <div class="module-tile" data-topic="${t.id}" style="width:100%; text-align:left; display:flex; align-items:center; gap:12px; margin-bottom:10px;">
        <span class="emoji" style="font-size:26px;">${t.emoji}</span>
        <div>
          <div class="title">${t.name}</div>
          <div class="desc">${t.words.length} từ</div>
        </div>
      </div>
    `).join('');
    el.querySelectorAll('[data-topic]').forEach(tile => {
      tile.addEventListener('click', () => {
        currentTopic = DATA.vocabTopics.find(t => t.id === tile.dataset.topic);
        currentIndex = 0;
        App.showScreen('screen-vocab-flashcards');
        renderFlashcard();
      });
    });
  }

  async function markLearned(word) {
    if (flippedIds.has(word.id)) return;
    flippedIds.add(word.id);
    await Storage.addLearnedWord(word);
    const progress = await Storage.getProgress();
    progress.vocabDone += 1;
    await Storage.saveProgress(progress);
    App.renderHome();
  }

  function renderFlashcard() {
    const el = document.getElementById('flashcardArea');
    if (!currentTopic) return;
    const word = currentTopic.words[currentIndex];
    el.innerHTML = `
      <div class="flashcard-wrap">
        <div class="flashcard" id="flashcardEl">
          <div class="flashcard-face front">
            <div class="flashcard-word">${word.word}</div>
            <div class="flashcard-phonetic">${word.phonetic}</div>
          </div>
          <div class="flashcard-face back">
            <div class="flashcard-meaning">${word.meaning}</div>
            <div class="flashcard-example">${word.example}</div>
          </div>
        </div>
      </div>
      <div class="chip">${currentIndex + 1}/${currentTopic.words.length}</div>
      <div style="display:flex; gap:10px; margin-top:10px;">
        <button class="btn btn-outline" id="flashcardPrevBtn">← Trước</button>
        <button class="btn btn-outline" id="flashcardNextBtn">Sau →</button>
      </div>
    `;
    const cardEl = document.getElementById('flashcardEl');
    cardEl.addEventListener('click', () => {
      cardEl.classList.toggle('flipped');
      if (cardEl.classList.contains('flipped')) markLearned(word);
    });
    document.getElementById('flashcardPrevBtn').addEventListener('click', () => {
      currentIndex = (currentIndex - 1 + currentTopic.words.length) % currentTopic.words.length;
      renderFlashcard();
    });
    document.getElementById('flashcardNextBtn').addEventListener('click', () => {
      currentIndex = (currentIndex + 1) % currentTopic.words.length;
      renderFlashcard();
    });
  }

  function renderTyping() {
    if (!currentTopic) return;
    typingWords = [...currentTopic.words].sort(() => Math.random() - 0.5);
    typingIndex = 0;
    showTypingWord();
  }

  function showTypingWord() {
    const meaningEl = document.getElementById('typingMeaning');
    const input = document.getElementById('typingInput');
    if (typingIndex >= typingWords.length) {
      meaningEl.textContent = '🎉 Hoàn thành!';
      input.style.display = 'none';
      return;
    }
    input.style.display = '';
    input.value = '';
    input.classList.remove('correct', 'wrong');
    meaningEl.textContent = typingWords[typingIndex].meaning;
    input.focus();
  }

  function handleTypingInput(e) {
    if (e.key !== 'Enter') return;
    const input = e.target;
    const word = typingWords[typingIndex];
    if (input.value.trim().toLowerCase() === word.word.toLowerCase()) {
      input.classList.remove('wrong');
      input.classList.add('correct');
      setTimeout(() => { typingIndex++; showTypingWord(); }, 500);
    } else {
      input.classList.remove('correct');
      input.classList.add('wrong');
      setTimeout(() => { input.classList.remove('wrong'); input.value = ''; }, 400);
    }
  }

  function renderMatch() {
    const grid = document.getElementById('matchGrid');
    if (!currentTopic) return;
    const words = [...currentTopic.words].sort(() => Math.random() - 0.5).slice(0, 6);
    const tiles = [];
    words.forEach(w => {
      tiles.push({ pairId: w.id, text: w.word, type: 'en' });
      tiles.push({ pairId: w.id, text: w.meaning, type: 'vi' });
    });
    tiles.sort(() => Math.random() - 0.5);

    let selected = null;
    let matchedCount = 0;

    grid.innerHTML = tiles.map((t, i) => `<div class="match-tile" data-idx="${i}" data-pair="${t.pairId}">${t.text}</div>`).join('');

    grid.querySelectorAll('.match-tile').forEach(tile => {
      tile.addEventListener('click', () => {
        if (tile.classList.contains('matched') || tile.classList.contains('selected')) return;
        if (!selected) {
          selected = tile;
          tile.classList.add('selected');
          return;
        }
        if (selected.dataset.pair === tile.dataset.pair && selected !== tile) {
          selected.classList.add('matched');
          tile.classList.add('matched');
          selected.classList.remove('selected');
          selected = null;
          matchedCount++;
          if (matchedCount === words.length) {
            App.fireConfetti();
            const card = grid.closest('.card');
            const done = document.createElement('div');
            done.className = 'chip';
            done.textContent = '🎉 Hoàn thành!';
            card.appendChild(done);
          }
        } else {
          tile.classList.add('selected');
          setTimeout(() => {
            selected.classList.remove('selected');
            tile.classList.remove('selected');
            selected = null;
          }, 500);
        }
      });
    });
  }

  function renderQuizQuestion() {
    const qEl = document.getElementById('quizQuestion');
    const optsEl = document.getElementById('quizOptions');
    const q = quizQuestions[quizIndex];
    qEl.textContent = q.question;
    optsEl.innerHTML = q.options.map((opt, i) => `<div class="option-item" data-idx="${i}">${opt}</div>`).join('');
    let locked = false;
    optsEl.querySelectorAll('.option-item').forEach(item => {
      item.addEventListener('click', () => {
        if (locked) return;
        locked = true;
        const idx = Number(item.dataset.idx);
        if (idx === q.answer) {
          item.classList.add('correct');
          quizScore++;
        } else {
          item.classList.add('wrong');
          optsEl.children[q.answer].classList.add('correct');
        }
        setTimeout(async () => {
          quizIndex++;
          if (quizIndex >= quizQuestions.length) {
            await finishQuiz();
          } else {
            renderQuizQuestion();
          }
        }, 700);
      });
    });
  }

  async function finishQuiz() {
    const progress = await Storage.getProgress();
    progress.quizDone += 1;
    await Storage.saveProgress(progress);
    App.renderHome();
    document.getElementById('quizScore').textContent = `${quizScore}/${quizQuestions.length}`;
    if (quizScore / quizQuestions.length >= 0.8) App.fireConfetti();
    App.showScreen('screen-quiz-result');
  }

  function startQuiz() {
    quizQuestions = [...DATA.quizPool].sort(() => Math.random() - 0.5).slice(0, 5);
    quizIndex = 0;
    quizScore = 0;
    App.showScreen('screen-quiz-run');
    renderQuizQuestion();
  }

  function init() {
    renderTopicList();
    document.getElementById('vocabTypingBtn').addEventListener('click', () => {
      App.showScreen('screen-typing');
      renderTyping();
    });
    document.getElementById('vocabMatchBtn').addEventListener('click', () => {
      App.showScreen('screen-match');
      renderMatch();
    });
    document.getElementById('typingInput').addEventListener('keydown', handleTypingInput);
    document.getElementById('quizStartBtn').addEventListener('click', startQuiz);
  }

  return { init };
})();
