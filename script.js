/* ── State ────────────────────────────────────────────────── */
const STORAGE_KEY = 'forca_words';
const MAX_ERRORS  = 6;
const BODY_PARTS  = ['head', 'body', 'arm-left', 'arm-right', 'leg-left', 'leg-right'];
const ALPHABET    = 'abcdefghijklmnopqrstuvwxyz';

let words       = [];
let currentWord = '';
let currentHint = '';
let guessed     = new Set();
let errors      = 0;
let gameOver    = false;

/* ── Persistence ──────────────────────────────────────────── */
function loadWords() {
  try {
    words = JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
  } catch {
    words = [];
  }
}

function saveWords() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(words));
}

/* ── Navigation ───────────────────────────────────────────── */
function showScreen(name) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
  document.getElementById('screen-' + name).classList.add('active');
  document.querySelectorAll('.tab-btn').forEach(b => {
    if (b.textContent.toLowerCase().includes(name === 'game' ? 'jogar' : 'admin'))
      b.classList.add('active');
  });
  if (name === 'admin') renderWordList();
}

/* ── Admin ────────────────────────────────────────────────── */
function addWord() {
  const wordInput = document.getElementById('input-word');
  const hintInput = document.getElementById('input-hint');
  const word = wordInput.value.trim().toLowerCase();
  const hint = hintInput.value.trim();

  if (!word) { showToast('Digite uma palavra!', true); return; }
  if (!/^[a-záàâãéèêíïóôõöúüçñ\s]+$/i.test(word)) {
    showToast('Use apenas letras!', true); return;
  }
  if (words.some(w => w.word === word)) {
    showToast('Essa palavra já existe!', true); return;
  }

  words.push({ word, hint });
  saveWords();
  renderWordList();
  wordInput.value = '';
  hintInput.value = '';
  wordInput.focus();
  showToast('Palavra adicionada!');
}

function deleteWord(index) {
  words.splice(index, 1);
  saveWords();
  renderWordList();
  showToast('Palavra removida.');
}

function renderWordList() {
  const container = document.getElementById('word-items');
  if (!words.length) {
    container.innerHTML = '<p class="empty-list">Nenhuma palavra cadastrada.</p>';
    return;
  }
  container.innerHTML = words.map((w, i) => `
    <div class="word-item">
      <div class="wi-info">
        <span class="wi-word">${w.word}</span>
        ${w.hint ? `<span class="wi-hint">&#128161; ${w.hint}</span>` : ''}
      </div>
      <button class="del-btn" onclick="deleteWord(${i})">Remover</button>
    </div>
  `).join('');
}

/* ── Game ─────────────────────────────────────────────────── */
function startGame() {
  if (!words.length) {
    document.getElementById('no-words-msg').style.display = 'block';
    document.getElementById('game-area').style.display    = 'none';
    return;
  }

  document.getElementById('no-words-msg').style.display = 'none';
  document.getElementById('game-area').style.display    = 'flex';

  const pick  = words[Math.floor(Math.random() * words.length)];
  currentWord = pick.word;
  currentHint = pick.hint || 'Sem dica';
  guessed     = new Set();
  errors      = 0;
  gameOver    = false;

  document.getElementById('hint-text').textContent       = currentHint;
  document.getElementById('result-banner').style.display = 'none';
  document.getElementById('result-banner').className     = '';

  updateHangman();
  updateLives();
  updateWrongLetters();
  renderWordDisplay();
  renderKeyboard();
}

function guess(letter) {
  if (gameOver || guessed.has(letter)) return;
  guessed.add(letter);

  const normalWord = normalize(currentWord);
  if (!normalWord.includes(letter)) errors++;

  updateHangman();
  updateLives();
  updateWrongLetters();
  renderWordDisplay();
  updateKeyButton(letter, normalWord.includes(letter));
  checkResult();
}

function checkResult() {
  const normalWord  = normalize(currentWord);
  const allGuessed  = [...normalWord.replace(/\s/g, '')].every(l => guessed.has(l));

  if (allGuessed) {
    endGame(true);
  } else if (errors >= MAX_ERRORS) {
    endGame(false);
  }
}

function endGame(won) {
  gameOver = true;
  const banner = document.getElementById('result-banner');
  const text   = document.getElementById('result-text');

  if (won) {
    banner.className = 'win';
    text.innerHTML   = `&#127881; Parabéns! Você acertou!<br>
      <small style="font-weight:400;font-size:.85rem">A palavra era: <strong>${currentWord.toUpperCase()}</strong></small>`;
  } else {
    banner.className = 'lose';
    text.innerHTML   = `&#128128; Você perdeu!<br>
      <small style="font-weight:400;font-size:.85rem">A palavra era: <strong>${currentWord.toUpperCase()}</strong></small>`;
    revealWord();
  }

  banner.style.display = 'block';
  document.querySelectorAll('.key-btn').forEach(b => b.disabled = true);
}

/* ── Render helpers ───────────────────────────────────────── */
function normalize(str) {
  return str.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
}

function renderWordDisplay() {
  const container  = document.getElementById('word-display');
  container.innerHTML = [...currentWord].map(ch => {
    const norm = normalize(ch);
    if (ch === ' ') return '<div class="letter-slot space"></div>';
    const revealed = guessed.has(norm);
    return `<div class="letter-slot ${revealed ? 'revealed' : ''}">${revealed ? ch.toUpperCase() : ''}</div>`;
  }).join('');
}

function revealWord() {
  const container = document.getElementById('word-display');
  container.innerHTML = [...currentWord].map(ch => {
    if (ch === ' ') return '<div class="letter-slot space"></div>';
    const wasGuessed = guessed.has(normalize(ch));
    const style = !wasGuessed ? 'color:var(--danger);text-shadow:0 0 10px rgba(233,69,96,.5)' : '';
    return `<div class="letter-slot revealed" style="${style}">${ch.toUpperCase()}</div>`;
  }).join('');
}

function renderKeyboard() {
  document.getElementById('keyboard').innerHTML = [...ALPHABET].map(l =>
    `<button class="key-btn" onclick="guess('${l}')" id="key-${l}">${l.toUpperCase()}</button>`
  ).join('');
}

function updateKeyButton(letter, correct) {
  const btn = document.getElementById('key-' + letter);
  if (!btn) return;
  btn.disabled = true;
  btn.classList.add(correct ? 'correct' : 'wrong');
}

function updateHangman() {
  BODY_PARTS.forEach((id, i) => {
    const el = document.getElementById(id);
    if (el) el.classList.toggle('show', i < errors);
  });
}

function updateLives() {
  const remaining = MAX_ERRORS - errors;
  document.getElementById('lives-display').innerHTML =
    Array.from({ length: MAX_ERRORS }, (_, i) =>
      `<span class="heart ${i >= remaining ? 'lost' : ''}">&#10084;&#65039;</span>`
    ).join('');
}

function updateWrongLetters() {
  const normalWord = normalize(currentWord);
  const wrong = [...guessed].filter(l => !normalWord.includes(l));
  document.getElementById('wrong-letters').textContent =
    wrong.length ? wrong.map(l => l.toUpperCase()).join('  ') : '—';
}

/* ── Keyboard input ───────────────────────────────────────── */
document.addEventListener('keydown', e => {
  if (document.getElementById('screen-game').classList.contains('active') && !gameOver) {
    const l = e.key.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    if (/^[a-z]$/.test(l) && !guessed.has(l)) guess(l);
  }
});

/* ── Toast ────────────────────────────────────────────────── */
let toastTimer;
function showToast(msg, error = false) {
  const t = document.getElementById('toast');
  clearTimeout(toastTimer);
  t.textContent = msg;
  t.className   = 'show' + (error ? ' error' : '');
  toastTimer = setTimeout(() => t.className = '', 2500);
}

/* ── Init ─────────────────────────────────────────────────── */
loadWords();
startGame();
