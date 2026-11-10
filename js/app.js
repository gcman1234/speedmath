'use strict';

/* ============================================================
 * 速算练习 · 应用外壳
 * 职责：模块选择页 → 答题页（键盘输入 / 四选一）→ 结算页
 * 出题逻辑在各模块文件中，外壳只负责调度与渲染。
 * ============================================================ */

/* ---------- PWA：注册 Service Worker（实现离线可用） ---------- */
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('sw.js').catch(err => {
      console.warn('Service Worker 注册失败（离线功能不可用）:', err);
    });
  });
}

/* ---------- 小工具 ---------- */
const $ = id => document.getElementById(id);

/* ---------- 局内状态 ---------- */
let module = null;      // 当前模块对象
let current = null;     // 当前题 { type, prompt, ... }
let qIndex = 0;         // 当前题号（0 起）
let correctCount = 0;   // 本局答对数
let roundTotal = 10;    // 本局总题数
let roundStart = 0;     // 开局时间戳
let timerId = null;     // 计时器句柄
let input = '';         // 键盘输入缓冲（支持负数与小数）

/* ---------- 界面切换 ---------- */
function show(id) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  $(id).classList.add('active');
}

/* ---------- 模块选择页 ---------- */
function renderModules() {
  const grid = $('module-grid');
  grid.innerHTML = '';
  AppModules.forEach(m => {
    const card = document.createElement('button');
    card.className = 'module-card';
    card.innerHTML =
      `<div class="module-icon">${m.icon || '🧮'}</div>` +
      `<div class="module-name">${m.name}</div>` +
      `<div class="module-desc">${m.desc || ''}</div>`;
    card.addEventListener('click', () => startRound(m));
    grid.appendChild(card);
  });
}

/* ---------- 计时 ---------- */
function startTimer() {
  stopTimer();
  roundStart = Date.now();
  updateTimer();
  timerId = setInterval(updateTimer, 1000);
}
function stopTimer() {
  if (timerId) { clearInterval(timerId); timerId = null; }
}
function updateTimer() {
  const s = Math.floor((Date.now() - roundStart) / 1000);
  $('timer').textContent = `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}
function elapsedSeconds() {
  return Math.floor((Date.now() - roundStart) / 1000);
}

/* ---------- 开局 / 重开 ---------- */
function startRound(m) {
  module = m;
  qIndex = 0;
  correctCount = 0;
  input = '';
  roundTotal = m.total || 10;
  $('feedback').className = 'feedback';
  show('screen-quiz');
  startTimer();
  nextQuestion();
}

/* ---------- 出题 ---------- */
function nextQuestion() {
  current = module.makeQuestion();
  $('question-text').textContent = current.prompt;
  $('progress').textContent = `${qIndex + 1} / ${roundTotal}`;
  input = '';
  renderInput();

  if (current.type === 'choice') {
    // 四选一：显示选项面板，隐藏键盘与"确定"钮（选项即答案）
    $('keypad-wrap').style.display = 'none';
    $('btn-ok').style.display = 'none';
    const box = $('choices');
    box.style.display = 'grid';
    box.innerHTML = '';
    current.options.forEach(opt => {
      const b = document.createElement('button');
      b.className = 'choice';
      b.textContent = opt.text;
      b.addEventListener('click', () => answer(opt.correct === true));
      box.appendChild(b);
    });
  } else {
    // 键盘输入：显示键盘，隐藏选项面板
    $('choices').style.display = 'none';
    $('keypad-wrap').style.display = '';
    $('btn-ok').style.display = '';
  }
}

/* ---------- 输入渲染（答案内联在题干 "=" 后） ---------- */
function renderInput() {
  $('q-answer').textContent = input;
}

/* ---------- 键盘输入（仅键盘型题目） ---------- */
const MAX_LEN = 8;   // 不含负号的最大输入长度

function pressKey(k) {
  if (!current || current.type === 'choice') return;

  if (k === 'sign') {
    // ±：切换开头的负号
    input = input.startsWith('-') ? input.slice(1) : '-' + input;
  } else if (k === 'clear') {
    input = '';
  } else if (k === 'del') {
    input = input.slice(0, -1);
  } else if (k === 'ok') {
    submitKeypad();
    return;
  } else if (k === '.') {
    if (!input.includes('.')) input += (input === '' || input === '-') ? '0.' : '.';
  } else if (/^[0-9]$/.test(k)) {
    const body = input.replace('-', '');
    if (body.replace('.', '').length < MAX_LEN) input += k;
  }
  renderInput();
}

function submitKeypad() {
  if (!current || current.type === 'choice') return;
  if (!input || input === '-') { flash('先输入答案哦'); return; }
  answer(Number(input) === current.answer);
}

/* ---------- 判题（两种题型共用入口） ---------- */
function answer(good) {
  if (good) {
    correctCount++;
    flash('✓ 正确！', true);
  } else {
    if (navigator.vibrate) navigator.vibrate(150);
    flash(current.type === 'keypad'
      ? `✗ 正确答案：${current.answer}`
      : '✗ 正确答案已标出');
    if (current.type === 'choice') {
      // 标出正确选项
      document.querySelectorAll('#choices .choice').forEach((b, i) => {
        if (current.options[i].correct) b.classList.add('choice-correct');
      });
    }
  }
  qIndex++;

  if (current.type === 'choice' && !good) {
    // 答错的选择题：先亮出正确答案，短暂停留再进入下一题
    setTimeout(advance, 900);
  } else {
    advance();
  }
}

function advance() {
  input = '';
  if (qIndex >= roundTotal) {
    endRound();
  } else {
    nextQuestion();
  }
}

/* ---------- 提示条 ---------- */
let flashTimer = null;
function flash(msg, good) {
  const fb = $('feedback');
  fb.textContent = msg;
  fb.className = 'feedback show ' + (good ? 'good' : 'bad');
  clearTimeout(flashTimer);
  flashTimer = setTimeout(() => fb.classList.remove('show'), 900);
}

/* ---------- 结算 ---------- */
function endRound() {
  stopTimer();
  const secs = elapsedSeconds();
  $('result-title').textContent = module.name;
  $('result-score').textContent = `${correctCount} / ${roundTotal}`;
  $('result-detail').textContent = `用时 ${Math.floor(secs / 60)}:${String(secs % 60).padStart(2, '0')}`;
  show('screen-result');
}

/* ---------- 事件绑定 ---------- */
$('btn-restart').addEventListener('click', () => startRound(module));   // 重开：新题 + 计时归零
$('btn-ok').addEventListener('click', submitKeypad);
$('btn-again').addEventListener('click', () => startRound(module));
$('btn-home').addEventListener('click', () => { stopTimer(); renderModules(); show('screen-modules'); });

document.querySelectorAll('.key').forEach(btn => {
  btn.addEventListener('click', () => pressKey(btn.dataset.k));
});

// 电脑实体键盘也能玩（调试用）
document.addEventListener('keydown', e => {
  if (!$('screen-quiz').classList.contains('active')) return;
  if (!current || current.type === 'choice') return;
  if (/^[0-9]$/.test(e.key)) pressKey(e.key);
  else if (e.key === '.') pressKey('.');
  else if (e.key === '-') pressKey('sign');
  else if (e.key === 'Backspace') pressKey('del');
  else if (e.key === 'Enter') pressKey('ok');
});

renderModules();

// 调试/测试入口：?autostart=<模块id> 直接进入答题（如 ?autostart=addition）
(function () {
  const id = new URLSearchParams(location.search).get('autostart');
  const target = AppModules.find(m => m.id === id);
  if (target) startRound(target);
})();
