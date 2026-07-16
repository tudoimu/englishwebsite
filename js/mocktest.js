/* Mock test flow (reading+listening, band-scored), writing/speaking prompt lists. */
const MockTest = (() => {
  let queue = [];
  let index = 0;
  let correct = 0;

  function buildQueue() {
    const reading = DATA.mockTest.reading.map(q => ({ ...q, section: 'Reading' }));
    const listening = DATA.mockTest.listening.map(q => ({ ...q, section: 'Listening' }));
    return reading.concat(listening);
  }

  function renderQuestion() {
    const q = queue[index];
    document.getElementById('mockSectionLabel').textContent = q.section;
    document.getElementById('mockPassage').textContent = q.section === 'Listening'
      ? `🎧 Transcript: ${q.audioText}`
      : q.passage;
    document.getElementById('mockQuestion').textContent = q.question;

    const optionsEl = document.getElementById('mockOptions');
    optionsEl.innerHTML = '';
    q.options.forEach((opt, i) => {
      const div = document.createElement('div');
      div.className = 'option-item';
      div.textContent = opt;
      div.addEventListener('click', () => selectOption(div, i, q));
      optionsEl.appendChild(div);
    });
  }

  function selectOption(el, i, q) {
    const optionsEl = document.getElementById('mockOptions');
    optionsEl.querySelectorAll('.option-item').forEach(o => o.style.pointerEvents = 'none');
    if (i === q.answer) {
      el.classList.add('correct');
      correct++;
    } else {
      el.classList.add('wrong');
      optionsEl.children[q.answer].classList.add('correct');
    }
    setTimeout(() => {
      index++;
      if (index < queue.length) renderQuestion();
      else finishTest();
    }, 700);
  }

  // ponytail: simple linear curve — correct/total scaled to 0-9, rounded to nearest 0.5
  function computeBand(correctCount, total) {
    const band = Math.round((correctCount / total) * 9 * 2) / 2;
    return Math.max(0, Math.min(9, band));
  }

  async function finishTest() {
    const total = queue.length;
    const band = computeBand(correct, total);
    document.getElementById('mockBand').textContent = `Band ${band.toFixed(1)}`;
    document.getElementById('mockCorrect').textContent = correct;
    document.getElementById('mockTotal').textContent = total;

    const progress = await Storage.getProgress();
    progress.mockTests.push({ date: new Date().toISOString(), band, correct, total });
    await Storage.saveProgress(progress);
    await App.renderHome();
    if (band >= 6.5) App.fireConfetti();

    App.showScreen('screen-mocktest-result');
  }

  function startTest() {
    queue = buildQueue();
    index = 0;
    correct = 0;
    App.showScreen('screen-mocktest-run');
    renderQuestion();
  }

  function renderPromptList(containerId, prompts, labelKey) {
    const container = document.getElementById(containerId);
    container.innerHTML = prompts.map(p => `
      <div class="card">
        <div class="chip">${p[labelKey]}</div>
        <p class="mt-8">${p.prompt}</p>
        <ul>${p.tips.map(t => `<li>${t}</li>`).join('')}</ul>
      </div>
    `).join('');
  }

  function init() {
    document.getElementById('mockStartBtn').addEventListener('click', startTest);
    renderPromptList('writingList', DATA.writingPrompts, 'task');
    renderPromptList('speakingList', DATA.speakingPrompts, 'part');
  }

  return { init };
})();
