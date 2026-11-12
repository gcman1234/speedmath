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

/* ---------- 申请持久化存储：系统承诺不自动清除本应用缓存 ---------- */
if (navigator.storage && navigator.storage.persist) {
  navigator.storage.persist().then(granted => {
    if (granted) console.log('存储已设为持久化，缓存不会被系统自动清理');
  }).catch(() => { /* 不支持时静默忽略 */ });
}

/* ---------- 小工具 ---------- */
const $ = id => document.getElementById(id);
const fmtTime = s => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;

/* ---------- 版本号（显示在模块选择页右上角） ---------- */
const VERSION = '0.10.0';

/* ---------- 局内状态 ---------- */
let module = null;       // 当前模块对象
let current = null;      // 当前题 { type, prompt, ... }
let qIndex = 0;          // 当前题号（0 起）
let correctCount = 0;    // 本局答对数
let roundTotal = 10;     // 本局总题数
let roundStart = 0;      // 开局时间戳
let timerId = null;      // 计时器句柄
let questionStart = 0;   // 当前题开始时间戳（统计单题用时）
let input = '';          // 键盘输入缓冲（支持负数与小数）
let history = [];        // 本局每题记录 { prompt, correct, user, good, secs }
let sheetOpen = false;   // 查表弹层是否打开
let sheetPausedAt = 0;   // 查表暂停开始时间戳
let rightBtnMode = 'ok'; // 右侧圆钮当前功能：'ok' 确定 | 'cheat' 查表
/* 精确模式（仅声明了 strictMode 的模块显示开关；状态本地持久化，跨局记住） */
let strictMode = localStorage.getItem('sm_strict') === '1';
/* 一次性输入（键盘遮罩；所有键盘型题目可用；状态本地持久化，跨局记住） */
let oneshot = localStorage.getItem('sm_oneshot') === '1';
let keypadMasked = false;   // 当前键盘是否处于遮罩状态
/* 竖式/横式切换（声明了 formatToggle 的模块显示；状态本地持久化，默认竖式） */
let vsumMode = localStorage.getItem('sm_vsum') !== '0';
/* 模块设置屏状态 */
let setupModule = null;     // 正在设置中的模块
let setupValue = 3;         // 当前选中的设置值

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
    card.addEventListener('click', () => {
      if (m.setup) openSetup(m);       // 声明了 setup 的模块：先进设置屏
      else startRound(m);
    });
    grid.appendChild(card);
  });
}

/* ---------- 模块设置屏（数字胶囊选择；记住上次选择） ---------- */
function openSetup(m) {
  setupModule = m;
  const s = m.setup;
  $('setup-title').textContent = s.title || '练习设置';
  $('setup-hint').textContent = s.hint || '';
  // 选项列表：优先 options（文字），否则 min~max 数字
  const opts = s.options || rangeSetupOptions(s);
  const persisted = localStorage.getItem('sm_setup_' + m.id);
  const hit = opts.find(o => String(o.value) === String(persisted));
  setupValue = hit ? hit.value : (s.def !== undefined ? s.def : opts[0].value);
  m._setupValue = setupValue;          // 保证重开/再来一局沿用
  renderSetupChips(opts);
  show('screen-setup');
}

function rangeSetupOptions(s) {
  const list = [];
  for (let v = s.min; v <= s.max; v++) list.push({ value: v, label: String(v) });
  return list;
}

function renderSetupChips(opts) {
  const box = $('setup-chips');
  box.innerHTML = '';
  opts.forEach(o => {
    const b = document.createElement('button');
    b.className = 'chip chip-text' + (o.value === setupValue ? ' active' : '');
    b.textContent = o.label;
    b.addEventListener('click', () => { setupValue = o.value; renderSetupChips(opts); });
    box.appendChild(b);
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
  $('timer').textContent = fmtTime((Date.now() - roundStart) / 1000);
}
function resumeTimer() {
  stopTimer();
  updateTimer();
  timerId = setInterval(updateTimer, 1000);
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
  history = [];
  roundTotal = m.total || 10;
  $('feedback').className = 'feedback';
  show('screen-quiz');
  startTimer();
  nextQuestion();
}

/* ---------- 出题 ---------- */
function nextQuestion() {
  // 声明了 setup 的模块收到 ctx = { count, vertical }；其余模块无参（保持兼容）
  const ctx = module.setup ? { count: module._setupValue, vertical: vsumMode } : undefined;
  current = module.makeQuestion(ctx);
  renderQuestion();
  $('progress').textContent = `${qIndex + 1} / ${roundTotal}`;
  input = '';
  renderInput();
  questionStart = Date.now();

  if (current.type === 'choice') {
    // 四选一：显示选项面板，隐藏键盘、"确定"钮与全部开关（选项即答案）
    $('keypad-wrap').style.display = 'none';
    $('btn-ok').style.display = 'none';
    $('btn-strict').style.display = 'none';
    $('btn-oneshot').style.display = 'none';
    $('btn-format').style.display = 'none';
    keypadMasked = false;
    $('keypad-mask').classList.remove('show');
    const box = $('choices');
    box.style.display = 'grid';
    box.innerHTML = '';
    current.options.forEach(opt => {
      const b = document.createElement('button');
      b.className = 'choice';
      b.textContent = opt.text;
      b.addEventListener('click', () => answer(opt.correct === true, opt.text));
      box.appendChild(b);
    });
  } else {
    // 键盘输入：显示键盘，隐藏选项面板
    $('choices').style.display = 'none';
    $('keypad-wrap').style.display = '';
    $('btn-ok').style.display = '';
    // 右侧圆钮：模块声明了附表 → "查表"；否则 → "确定"
    if (module.cheatSheet) {
      rightBtnMode = 'cheat';
      $('btn-ok').textContent = '查表';
      $('btn-ok').classList.add('btn-cheat');
    } else {
      rightBtnMode = 'ok';
      $('btn-ok').textContent = '确定';
      $('btn-ok').classList.remove('btn-cheat');
    }
    // 精确模式开关：仅模块声明 strictMode 时显示
    if (module.strictMode) {
      $('btn-strict').style.display = '';
      renderStrictBtn();
    } else {
      $('btn-strict').style.display = 'none';
    }
    // 一次性输入开关：所有键盘型题目都显示
    $('btn-oneshot').style.display = '';
    renderOneshotBtn();
    // 竖式/横式开关：仅模块声明 formatToggle 时显示
    if (module.formatToggle) {
      $('btn-format').style.display = '';
      renderFormatBtn();
    } else {
      $('btn-format').style.display = 'none';
    }
    // 键盘按键过滤：模块声明 keys 时只显示指定按键（如数独的 1~5 + 退格）
    document.querySelectorAll('#keypad .key').forEach(b => {
      b.style.display = (!module.keys || module.keys.indexOf(b.dataset.k) >= 0) ? '' : 'none';
    });
    // 拼图型模块（数独）：隐藏右侧"确定"圆钮，完成判定由模块通过 finishRound 触发
    if (module.puzzle) {
      $('btn-ok').style.display = 'none';
    }
    updateMask();
  }
}

/* ---------- 一次性输入（键盘遮罩） ----------
 * 开启后每题先遮罩键盘，点击面板任意处解锁；
 * 提交进入下一题后自动恢复遮罩。遮罩时所有按键输入（含实体键盘）被忽略。
 */
function updateMask() {
  if (oneshot && current && current.type !== 'choice') {
    $('keypad-mask').classList.add('show');
    keypadMasked = true;
  } else {
    $('keypad-mask').classList.remove('show');
    keypadMasked = false;
  }
}
function renderOneshotBtn() {
  $('btn-oneshot').textContent = oneshot ? '一次性输入·开' : '一次性输入';
  $('btn-oneshot').classList.toggle('on', oneshot);
}
/* 竖式/横式：按钮显示当前模式（竖式=绿色实心，横式=描边），点击切换，从下一题起生效 */
function renderFormatBtn() {
  $('btn-format').textContent = vsumMode ? '竖式' : '横式';
  $('btn-format').classList.toggle('on', vsumMode);
}

/* ---------- 精确模式开关 ---------- */
function renderStrictBtn() {
  $('btn-strict').textContent = strictMode ? '精确模式·开' : '精确模式';
  $('btn-strict').classList.toggle('on', strictMode);
}

/* ---------- 当前题正确答案（文本） ---------- */
function correctText() {
  if (current.type === 'choice') {
    const c = current.options.find(o => o.correct);
    return c ? String(c.text) : '';
  }
  // 模块可自定义正确答案的显示文本（如百化分的 "1/1.43"）
  return current.correctText ? String(current.correctText) : String(current.answer);
}

/* ---------- 题干渲染 ----------
 * 普通模块：纯文本题干 + 内联答案区（"= 62"）
 * 富文本模块：提供 promptHTML，可在其中放置 <span class="q-slot"> 作为输入占位
 */
function renderQuestion() {
  const box = $('question');
  if (current.promptHTML) {
    box.innerHTML = current.promptHTML;
    return;
  }
  box.textContent = '';
  box.appendChild(document.createTextNode(current.prompt));
  const ans = document.createElement('span');
  ans.className = 'q-answer';
  box.appendChild(ans);
}

/* ---------- 输入渲染（优先填入题干的 q-slot，否则内联在 "=" 后） ---------- */
function renderInput() {
  const slot = $('question').querySelector('.q-slot');
  if (slot) {
    slot.textContent = input || '?';
    return;
  }
  const ans = $('question').querySelector('.q-answer');
  if (ans) ans.textContent = input;
}

/* ---------- 键盘输入（仅键盘型题目） ---------- */
const MAX_LEN = 8;   // 不含负号的最大输入长度

function pressKey(k) {
  if (!current || current.type === 'choice') return;
  if (keypadMasked) return;   // 遮罩状态：忽略一切按键（含实体键盘）
  // 模块优先消费按键（如数独的格子输入）：返回 true 表示已处理
  if (typeof module.onKey === 'function' && module.onKey(k)) return;

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
  if (module.puzzle) return;   // 拼图模块由 finishRound 结束，不走提交判题
  // 空输入（含只输入负号）允许提交：判负并直接进入下一题
  if (!input || input === '-') {
    answer(false, '');
    return;
  }
  // 模块可声明 check(数值, ctx) 自定义判题（如百化分估算的区间判定），否则精确比较
  const good = typeof current.check === 'function'
    ? current.check(Number(input), { strict: strictMode })
    : Number(input) === current.answer;
  answer(good, input);
}

/* ---------- 判题（两种题型共用入口） ---------- */
function answer(good, userText) {
  // 记录本题（题目 / 正确答案 / 你的答案 / 对错 / 单题用时）
  history.push({
    prompt: current.prompt,
    correct: correctText(),
    user: userText || '',
    good: good === true,
    secs: (Date.now() - questionStart) / 1000
  });

  if (good) {
    correctCount++;
    flash('✓ 正确！', true);
  } else {
    if (navigator.vibrate) navigator.vibrate(150);
    // 模块可声明 wrongHint(数值, ctx) 给出针对性错因（如精确模式的端点提示）
    const hint = (current.type === 'keypad' && userText !== '' &&
      typeof current.wrongHint === 'function')
      ? current.wrongHint(Number(userText), { strict: strictMode })
      : null;
    flash(hint || (current.type === 'keypad'
      ? `✗ 正确答案：${current.answer}`
      : '✗ 正确答案已标出'));
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

/* ---------- 拼图模块专用：模块宣布完成/放弃 → 进结算 ---------- */
window.finishRound = function (good) {
  if (!module || !module.puzzle) return;
  stopTimer();
  history.push({
    prompt: module.name,
    correct: '完成',
    user: good ? '完成✓' : '未完成×',
    good: good === true,
    secs: (Date.now() - questionStart) / 1000
  });
  correctCount = good === true ? 1 : 0;
  qIndex = 0;
  roundTotal = 1;
  endRound();
};

/* ---------- 模块自定义题面刷新（如数独棋盘变化后重渲染） ---------- */
window.smRefresh = function () {
  if (!current || typeof module.boardHTML !== 'function') return;
  current.promptHTML = module.boardHTML();
  renderQuestion();
  renderInput();
};

/* ---------- 结算 ---------- */
function endRound() {
  stopTimer();
  $('result-title').textContent = module.name;
  $('result-sub').textContent =
    `本次练习用时 ${fmtTime(elapsedSeconds())} · 答对 ${correctCount}/${roundTotal} · 加油！`;
  renderResultList();
  show('screen-result');
}

function renderResultList() {
  const list = $('result-list');
  list.innerHTML = '';
  history.forEach((h, i) => {
    const row = document.createElement('div');
    row.className = 'result-row';
    const userText = h.user === '' ? '未作答×' : (h.good ? `${h.user}✓` : `${h.user}×`);
    const promptText = h.prompt.replace(/=\s*$/, '').trim();   // 题目列去掉结尾的“=”，避免与正确答案列的“=”重复
    row.innerHTML =
      `<span class="row-no">${i + 1}</span>` +
      `<span class="row-q">${promptText}</span>` +
      `<span class="row-a">= ${h.correct}</span>` +
      `<span class="row-u ${h.good ? 'good' : 'bad'}">${userText}</span>` +
      `<span class="row-t">${h.secs.toFixed(1)}s</span>`;
    list.appendChild(row);
  });
}

/* ---------- 查表弹层 ---------- */
function openSheet() {
  if (sheetOpen || !module || !module.cheatSheet) return;
  renderCheatSheet();
  $('sheet-overlay').classList.add('show');
  sheetOpen = true;
  stopTimer();                 // 查表期间计时暂停
  sheetPausedAt = Date.now();
}

function closeSheet() {
  if (!sheetOpen) return;
  $('sheet-overlay').classList.remove('show');
  sheetOpen = false;
  // 补偿暂停时长：总用时与单题用时都不含查表时间
  const paused = Date.now() - sheetPausedAt;
  roundStart += paused;
  questionStart += paused;
  resumeTimer();
}

function renderCheatSheet() {
  const cs = module.cheatSheet;
  $('sheet-title').textContent = cs.title || '对照表';
  const half = Math.ceil(cs.rows.length / 2);
  const wrap = $('sheet-cols');
  wrap.innerHTML = '';
  [cs.rows.slice(0, half), cs.rows.slice(half)].forEach(col => {
    const t = document.createElement('table');
    t.className = 'sheet-table';
    col.forEach(r => {
      const tr = document.createElement('tr');
      const td1 = document.createElement('td');
      td1.textContent = r[0];
      const td2 = document.createElement('td');
      td2.className = 'sheet-a';
      td2.textContent = '= ' + r[1];
      tr.appendChild(td1);
      tr.appendChild(td2);
      t.appendChild(tr);
    });
    wrap.appendChild(t);
  });
}

/* ---------- 退出本局（放弃计算，回主页面） ---------- */
function quitRound() {
  stopTimer();
  if (sheetOpen) {             // 弹层未关时直接退出：关掉弹层且不恢复计时
    $('sheet-overlay').classList.remove('show');
    sheetOpen = false;
  }
  input = '';
  history = [];
  renderModules();
  show('screen-modules');
}

/* ---------- 事件绑定 ---------- */
$('btn-quit').addEventListener('click', quitRound);                     // 答题页退出
$('btn-restart').addEventListener('click', () => startRound(module));   // 重开：新题 + 计时归零
$('btn-strict').addEventListener('click', () => {                       // 精确模式开关（跨局记住）
  strictMode = !strictMode;
  localStorage.setItem('sm_strict', strictMode ? '1' : '0');
  renderStrictBtn();
});
$('btn-oneshot').addEventListener('click', () => {                      // 一次性输入开关（跨局记住）
  oneshot = !oneshot;
  localStorage.setItem('sm_oneshot', oneshot ? '1' : '0');
  renderOneshotBtn();
  updateMask();
});
$('keypad-mask').addEventListener('click', () => {                      // 点击遮罩任意处解锁（本题内保持解锁）
  $('keypad-mask').classList.remove('show');
  keypadMasked = false;
});
$('btn-format').addEventListener('click', () => {                       // 竖式/横式切换（跨局记住；当前题立即重排，数字不变）
  vsumMode = !vsumMode;
  localStorage.setItem('sm_vsum', vsumMode ? '1' : '0');
  renderFormatBtn();
  if (typeof module.rerender === 'function' && current && current.type !== 'choice') {
    current = module.rerender(current, { count: module._setupValue, vertical: vsumMode });
    renderQuestion();
    renderInput();
  }
});
$('btn-setup-start').addEventListener('click', () => {                  // 设置屏：开始练习
  if (!setupModule) return;
  localStorage.setItem('sm_setup_' + setupModule.id, String(setupValue));
  setupModule._setupValue = setupValue;
  startRound(setupModule);
});
$('btn-setup-back').addEventListener('click', () => {                   // 设置屏：返回模块选择
  setupModule = null;
  renderModules();
  show('screen-modules');
});
$('btn-ok').addEventListener('click', () => {                           // 右侧圆钮：确定 或 查表
  if (rightBtnMode === 'cheat') openSheet();
  else submitKeypad();
});
$('sheet-close').addEventListener('click', closeSheet);                 // 查表弹层：✕ / 关闭 / 点遮罩
$('sheet-confirm').addEventListener('click', closeSheet);
$('sheet-overlay').addEventListener('click', e => {
  if (e.target === $('sheet-overlay')) closeSheet();
});
$('btn-again').addEventListener('click', () => startRound(module));     // 结算页：重来
$('btn-home').addEventListener('click', quitRound);                     // 结算页：返回

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
$('app-version').textContent = 'v' + VERSION;

/* ---------- 彩蛋：点"算"字方块，"立刻"飞到"岸"字正上方 ----------
 * 两阶段定位：
 *   常态——"立刻"是普通行内元素，正常插在"按钮"与"上岸"之间；
 *   点击——先记录它的位置并切为绝对定位（文字随即重排为"点击下方按钮上岸"），
 *          再测量"岸"字的新坐标，过渡动画飞过去；再点一次飞回并恢复行内。
 */
(function () {
  const line = $('egg-line');
  const fly = $('egg-fly');
  const anchor = line.querySelector('.egg-anchor');

  $('logo').addEventListener('click', () => {
    if (navigator.vibrate) navigator.vibrate(20);

    if (!line.classList.contains('egg-on')) {
      // 记录常态位置（相对 egg-line）
      fly.dataset.x = fly.offsetLeft;
      fly.dataset.y = fly.offsetTop;
      // 固定在原位并切绝对定位 → 脱离文档流，行重排
      fly.style.left = fly.dataset.x + 'px';
      fly.style.top = fly.dataset.y + 'px';
      line.classList.add('egg-on');
      // 下一帧测量"岸"字新位置，飞过去（左对齐岸字左缘，叠在其正上方）
      requestAnimationFrame(() => {
        fly.style.left = anchor.offsetLeft + 'px';
        fly.style.top = (anchor.offsetTop - fly.offsetHeight - 2) + 'px';
      });
    } else {
      // 飞回记录的常态位置，动画结束后恢复行内元素
      fly.style.left = fly.dataset.x + 'px';
      fly.style.top = fly.dataset.y + 'px';
      setTimeout(() => {
        line.classList.remove('egg-on');
        fly.style.left = '';
        fly.style.top = '';
      }, 470);
    }
  });
})();

// 调试/测试入口：?autostart=<模块id> 直接进入答题（如 ?autostart=multiadd）
// 追加 &autofinish=1 可自动随机作答跑完一局，用于核对结算页样式
(function () {
  const params = new URLSearchParams(location.search);
  if (params.get('egg')) $('logo').click();   // 彩蛋状态预览（走真实点击逻辑）
  const target = AppModules.find(m => m.id === params.get('autostart'));
  if (!target) return;
  if (params.get('count')) localStorage.setItem('sm_setup_' + target.id, params.get('count'));   // 指定设置值
  if (params.get('hsum')) { vsumMode = false; }                                                  // 横式预览
  if (params.get('strict')) { strictMode = true; renderStrictBtn(); }   // 精确模式预览
  if (params.get('oneshot')) { oneshot = true; renderOneshotBtn(); }    // 一次性输入预览
  if (target.setup) {
    openSetup(target);                                                  // 声明 setup 的模块先进设置屏
    if (params.get('setupgo')) $('btn-setup-start').click();
    if (params.get('autosolve') && typeof target.debugSolve === 'function') target.debugSolve();
    return;
  }
  startRound(target);
  if (params.get('oneshot')) updateMask();
  if (params.get('cheat')) openSheet();   // 查表弹层预览
  if (params.get('autosolve') && typeof target.debugSolve === 'function') target.debugSolve();   // 拼图自动完成（测试结算页）
  if (params.get('autofinish')) {
    const t = setInterval(() => {
      if (!$('screen-quiz').classList.contains('active')) { clearInterval(t); return; }
      if (Math.random() < 0.25) {
        pressKey('ok');   // 1/4 概率空输入直接过题（未作答）
      } else {
        pressKey(String(Math.floor(Math.random() * 10)));
        pressKey('ok');
      }
    }, 300);
  }
})();
