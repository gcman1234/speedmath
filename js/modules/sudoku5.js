'use strict';

/* ============================================================
 * 模块：5×5 数独（拼图型，单题制）
 * 规则：5 行、5 列、5 个不规则区域，每行/列/区填入 1~5 不重复。
 * 纯前端生成完整终盘 + 挖空（双解求解器保证唯一解）。
 * ============================================================ */

/* 基础区域模板（5 个区域各 5 格，数字为区域 id）；经镜像/转置得到多种变化 */
const S5_BASE = [
  [0, 0, 1, 1, 1],
  [0, 0, 2, 1, 1],
  [4, 0, 2, 2, 3],
  [4, 4, 2, 3, 3],
  [4, 4, 2, 3, 3]
];

function s5BuildVariants() {
  const transforms = [
    (r, c) => [r, c],            // 原样
    (r, c) => [r, 4 - c],        // 水平镜像
    (r, c) => [4 - r, c],        // 垂直镜像
    (r, c) => [c, r],            // 转置
    (r, c) => [4 - c, 4 - r]     // 旋转 180°
  ];
  return transforms.map(f => {
    const g = Array.from({ length: 5 }, () => Array(5).fill(0));
    for (let r = 0; r < 5; r++) {
      for (let c = 0; c < 5; c++) {
        const p = f(r, c);
        g[p[0]][p[1]] = S5_BASE[r][c];
      }
    }
    return g;
  });
}
const S5_VARIANTS = s5BuildVariants();

/* 由区域网格生成 regionOf(r, c) */
function s5RegionOfFn(regionGrid) {
  return (r, c) => regionGrid[r][c];
}

/* 随机回溯填充完整终盘 */
function s5FillGrid(regionOf) {
  const grid = Array.from({ length: 5 }, () => Array(5).fill(0));
  function ok(r, c, v) {
    for (let i = 0; i < 5; i++) {
      if (grid[r][i] === v || grid[i][c] === v) return false;
    }
    const rid = regionOf(r, c);
    for (let rr = 0; rr < 5; rr++) {
      for (let cc = 0; cc < 5; cc++) {
        if (regionOf(rr, cc) === rid && grid[rr][cc] === v) return false;
      }
    }
    return true;
  }
  (function fill(pos) {
    if (pos === 25) return true;
    const r = Math.floor(pos / 5), c = pos % 5;
    const nums = shuffle([1, 2, 3, 4, 5]);
    for (const v of nums) {
      if (ok(r, c, v)) {
        grid[r][c] = v;
        if (fill(pos + 1)) return true;
        grid[r][c] = 0;
      }
    }
    return false;
  })(0);
  return grid;
}

/* 数解个数（cap 上限，用于唯一解验证） */
function s5CountSolutions(puzzle, regionOf, cap) {
  const g = puzzle.map(row => row.slice());
  let count = 0;
  (function solve() {
    if (count >= cap) return;
    let br = -1, bc = -1;
    outer:
    for (let r = 0; r < 5; r++) {
      for (let c = 0; c < 5; c++) {
        if (g[r][c] === 0) { br = r; bc = c; break outer; }
      }
    }
    if (br < 0) { count++; return; }
    for (let v = 1; v <= 5; v++) {
      let ok = true;
      for (let i = 0; i < 5; i++) {
        if (g[br][i] === v || g[i][bc] === v) { ok = false; break; }
      }
      if (ok) {
        const rid = regionOf(br, bc);
        for (let rr = 0; rr < 5 && ok; rr++) {
          for (let cc = 0; cc < 5; cc++) {
            if (regionOf(rr, cc) === rid && g[rr][cc] === v) { ok = false; break; }
          }
        }
      }
      if (ok) {
        g[br][bc] = v;
        solve();
        g[br][bc] = 0;
        if (count >= cap) return;
      }
    }
  })();
  return count;
}

/* 生成一道题：终盘 + 唯一解挖空；givens = 保留的提示格数 */
function s5Generate(regionOf, givens) {
  const solution = s5FillGrid(regionOf);
  const puzzle = solution.map(row => row.slice());
  const order = shuffle(Array.from({ length: 25 }, (_, i) => i));
  let remaining = 25;
  for (const idx of order) {
    if (remaining <= givens) break;
    const r = Math.floor(idx / 5), c = idx % 5;
    const bak = puzzle[r][c];
    puzzle[r][c] = 0;
    if (s5CountSolutions(puzzle, regionOf, 2) !== 1) {
      puzzle[r][c] = bak;
    } else {
      remaining--;
    }
  }
  return { solution, puzzle };
}

/* ---------- 模块运行状态 ---------- */
let s5 = null;   // { regionOf, puzzle, solution, user, sel }

function s5Conflict(r, c, v) {
  for (let i = 0; i < 5; i++) {
    if (i !== c && s5.user[r][i] === v) return true;
    if (i !== r && s5.user[i][c] === v) return true;
  }
  const rid = s5.regionOf(r, c);
  for (let rr = 0; rr < 5; rr++) {
    for (let cc = 0; cc < 5; cc++) {
      if ((rr !== r || cc !== c) && s5.regionOf(rr, cc) === rid && s5.user[rr][cc] === v) return true;
    }
  }
  return false;
}

function s5AnyConflict() {
  for (let r = 0; r < 5; r++) {
    for (let c = 0; c < 5; c++) {
      const v = s5.user[r][c];
      if (v !== 0 && s5.puzzle[r][c] === 0 && s5Conflict(r, c, v)) return true;
    }
  }
  return false;
}

function s5Filled() {
  for (let r = 0; r < 5; r++) {
    for (let c = 0; c < 5; c++) {
      if (s5.user[r][c] === 0) return false;
    }
  }
  return true;
}

/* ---------- 棋盘渲染 ---------- */
function s5BoardHTML() {
  let cells = '';
  for (let r = 0; r < 5; r++) {
    for (let c = 0; c < 5; c++) {
      const v = s5.user[r][c];
      const given = s5.puzzle[r][c] !== 0;
      const sel = s5.sel && s5.sel.r === r && s5.sel.c === c;
      const rid = s5.regionOf(r, c);
      const peer = s5.sel && !sel &&
        (s5.sel.r === r || s5.sel.c === c || s5.regionOf(s5.sel.r, s5.sel.c) === rid);
      const same = s5.sel && !sel && v !== 0 && v === s5.user[s5.sel.r][s5.sel.c];
      const bad = !given && v !== 0 && s5Conflict(r, c, v);
      cells +=
        `<span class="sd-cell rg${rid}${given ? ' sd-given' : ''}${sel ? ' sd-sel' : ''}` +
        `${peer ? ' sd-peer' : ''}${same ? ' sd-same' : ''}${bad ? ' sd-bad' : ''}"` +
        ` data-r="${r}" data-c="${c}">${v || ''}</span>`;
    }
  }
  return `<span class="sd-board">${cells}</span>`;
}

/* 格子点击（全局事件委托，只绑定一次；innerHTML 重渲染不影响） */
if (typeof document !== 'undefined') {
  document.addEventListener('click', e => {
    const cell = e.target.closest ? e.target.closest('.sd-cell') : null;
    if (!cell || !s5) return;
    s5.sel = { r: Number(cell.dataset.r), c: Number(cell.dataset.c) };
    window.smRefresh();
  });
}

registerModule({
  id: 'sudoku5',
  name: '5×5 数独',
  icon: '🧩',
  desc: '不规则区域迷你数独',
  total: 1,                        // 每局 1 题
  puzzle: true,                    // 拼图型：单题制，finishRound 结束
  keys: ['1', '2', '3', '4', '5', 'del'],   // 键盘只显示这些键

  setup: {
    title: '难度',
    hint: '选择提示数字的数量（均为唯一解）',
    options: [
      { value: 'easy', label: '简单' },
      { value: 'normal', label: '中等' },
      { value: 'hard', label: '困难' }
    ],
    def: 'easy'
  },

  boardHTML: s5BoardHTML,          // smRefresh 钩子：棋盘变化后外壳重渲染

  makeQuestion(ctx) {
    const diff = (ctx && ctx.count) || 'easy';
    const givens = diff === 'hard' ? 9 : diff === 'normal' ? 11 : 13;
    const regionGrid = pick(S5_VARIANTS);
    const regionOf = s5RegionOfFn(regionGrid);
    const gen = s5Generate(regionOf, givens);
    s5 = {
      regionOf,
      puzzle: gen.puzzle,
      solution: gen.solution,
      user: gen.puzzle.map(row => row.slice()),
      sel: null
    };
    let givenCount = 0;
    for (let r = 0; r < 5; r++) for (let c = 0; c < 5; c++) if (gen.puzzle[r][c]) givenCount++;
    return {
      type: 'keypad',
      prompt: `5×5 数独（提示 ${givenCount} 格）`,   // 结算页文本
      answer: 0,
      promptHTML: s5BoardHTML()
    };
  },

  /* 消费键盘输入：向选中格填数字 / 退格清除；已知格锁定 */
  onKey(k) {
    if (!s5) return true;
    if (!s5.sel) return true;                       // 未选中格子：吞掉按键
    const r = s5.sel.r, c = s5.sel.c;
    if (s5.puzzle[r][c] !== 0) return true;         // 已知格锁定
    if (k === 'del') {
      s5.user[r][c] = 0;
    } else if (/^[1-5]$/.test(k)) {
      s5.user[r][c] = Number(k);
    } else {
      return true;                                  // 其余键吞掉
    }
    window.smRefresh();
    // 填满且无冲突 = 解出唯一解（生成时保证唯一）
    if (s5Filled()) {
      if (s5AnyConflict()) {
        if (navigator.vibrate) navigator.vibrate(150);
        flash('有冲突，检查红色格子');
      } else {
        flash('🎉 完成！', true);
        setTimeout(() => window.finishRound(true), 600);
      }
    }
    return true;
  },

  /* 调试：自动按终盘填完并结束（仅 ?autosolve=1 使用） */
  debugSolve() {
    if (!s5) return;
    for (let r = 0; r < 5; r++) {
      for (let c = 0; c < 5; c++) s5.user[r][c] = s5.solution[r][c];
    }
    window.smRefresh();
    setTimeout(() => window.finishRound(true), 600);
  }
});
