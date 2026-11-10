'use strict';

/* ============================================================
 * 模块注册表 + 共享工具
 * 所有练习模块通过 registerModule() 登记到这里，
 * 应用外壳（app.js）从这里读取模块清单并调度。
 * ============================================================ */

const AppModules = [];

function registerModule(module) {
  AppModules.push(module);
}

/* ---------- 共享工具（出题器通用） ---------- */

/** 随机整数 [min, max] */
function rand(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/** 随机取数组中的一个元素 */
function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

/** 洗牌（原地修改并返回） */
function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

/** 生成"四选一"选项：
 *  @param correctText 正确选项文本
 *  @param distractTexts 干扰项文本数组（建议 3~5 个，会随机挑 3 个）
 *  @returns { type:'choice', options:[{text,correct},...] } 已洗牌的 4 个选项
 */
function makeChoiceOptions(correctText, distractTexts) {
  const pool = shuffle(distractTexts.slice());
  const chosen = pool.slice(0, 3);
  const options = shuffle([
    { text: String(correctText), correct: true },
    ...chosen.map(t => ({ text: String(t), correct: false }))
  ]);
  return options;
}
