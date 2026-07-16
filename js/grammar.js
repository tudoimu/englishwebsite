/* Grammar topics: theory + exercise quiz, wired to existing DOM screens. */
const Grammar = (() => {
  let currentTopic = null;
  let currentIndex = 0;
  let score = 0;

  function renderTopicList() {
    const list = document.getElementById('grammarTopicList');
    list.innerHTML = '';
    DATA.grammarTopics.forEach(topic => {
      const card = document.createElement('div');
      card.className = 'card';
      card.style.cursor = 'pointer';
      card.innerHTML = `<strong>${topic.emoji} ${topic.name}</strong>`;
      card.addEventListener('click', () => openTheory(topic));
      list.appendChild(card);
    });
  }

  function openTheory(topic) {
    currentTopic = topic;
    document.getElementById('grammarTheoryTitle').textContent = `${topic.emoji} ${topic.name}`;
    document.getElementById('grammarTheoryText').textContent = topic.theory;
    App.showScreen('screen-grammar-theory');
  }

  function startQuiz() {
    currentIndex = 0;
    score = 0;
    App.showScreen('screen-grammar-quiz');
    renderQuestion();
  }

  function renderQuestion() {
    const exercise = currentTopic.exercises[currentIndex];
    document.getElementById('grammarQuestion').textContent = exercise.question;
    const optionsEl = document.getElementById('grammarOptions');
    optionsEl.innerHTML = '';
    exercise.options.forEach((option, i) => {
      const item = document.createElement('div');
      item.className = 'option-item';
      item.textContent = option;
      item.addEventListener('click', () => selectOption(item, i, exercise));
      optionsEl.appendChild(item);
    });
  }

  function selectOption(item, index, exercise) {
    const optionsEl = document.getElementById('grammarOptions');
    if (optionsEl.dataset.locked) return;
    optionsEl.dataset.locked = '1';

    if (index === exercise.answer) {
      item.classList.add('correct');
      score++;
    } else {
      item.classList.add('wrong');
      optionsEl.children[exercise.answer].classList.add('correct');
    }

    setTimeout(() => {
      delete optionsEl.dataset.locked;
      currentIndex++;
      if (currentIndex < currentTopic.exercises.length) {
        renderQuestion();
      } else {
        finishQuiz();
      }
    }, 700);
  }

  async function finishQuiz() {
    const total = currentTopic.exercises.length;
    document.getElementById('grammarScore').textContent = `${score}/${total}`;
    App.showScreen('screen-grammar-result');

    const progress = await Storage.getProgress();
    progress.grammarDone = (progress.grammarDone || 0) + 1;
    await Storage.saveProgress(progress);
    await App.renderHome();

    if (score === total) App.fireConfetti();
  }

  function init() {
    renderTopicList();
    document.getElementById('grammarExerciseBtn').addEventListener('click', startQuiz);
  }

  return { init };
})();
