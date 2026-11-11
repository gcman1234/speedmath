'use strict';

/* ============================================================
 * 模块：百化分估算（键盘输入型，区间判分）
 * 给出 6.3% ~ 90% 之间的随机百分数（一位小数），
 * 回答 1/x 的分母 x：只要落在"原始对照表中夹住它的相邻两条"
 * 的分母区间 [小, 大] 内即算对（闭区间 ±0.01 容差）。
 * 题库直接复用背诵模块的 BAIHUAFEN_BANK（加载顺序在前）。
 * ============================================================ */

const BHF_EST_TOL = 0.01;              // 区间判分容差
const BHF_EST_MIN = 6.3;               // 随机下限（对照表最小值为 6.25，避开下邻缺失）
const BHF_EST_MAX = 90;                // 随机上限（对照表最大值）

/* 对照表按百分数升序展开：[[百分数, 分母], ...] */
const BHF_EST_TABLE = BAIHUAFEN_BANK
  .map(e => [parseFloat(e[0]), e[1]])
  .sort((a, b) => a[0] - b[0]);

/* 求 pct 的分母区间：夹住它的相邻两条（恰好等于表值时退化为该值） */
function bhfEstRange(pct) {
  const hit = BHF_EST_TABLE.find(e => Math.abs(e[0] - pct) < 1e-9);
  if (hit) return [hit[1], hit[1]];
  for (let i = 0; i < BHF_EST_TABLE.length - 1; i++) {
    const a = BHF_EST_TABLE[i];
    const b = BHF_EST_TABLE[i + 1];
    if (pct > a[0] && pct < b[0]) {
      return [Math.min(a[1], b[1]), Math.max(a[1], b[1])];
    }
  }
  // 理论不可达（随机范围被限制在表内）；兜底取最近一条
  const last = BHF_EST_TABLE[BHF_EST_TABLE.length - 1];
  return [last[1], last[1]];
}

/* 随机百分数：一位小数，[6.3, 90] */
function bhfEstRand() {
  return rand(Math.round(BHF_EST_MIN * 10), Math.round(BHF_EST_MAX * 10)) / 10;
}

registerModule({
  id: 'baihuafen-est',
  name: '百化分估算',
  icon: '🎯',
  desc: '随机百分数，区间判分',
  total: 10,                       // 每局题数

  /* 与背诵模块同款对照表（查表按钮 + 弹层） */
  cheatSheet: {
    title: '百化分对照表',
    rows: BAIHUAFEN_BANK.map(e => [e[0], `1/${e[1]}`])
  },

  makeQuestion() {
    const pct = bhfEstRand();
    const [dlo, dhi] = bhfEstRange(pct);
    const pctStr = String(pct);    // 6.3 / 47 / 90 等
    const rangeText = dlo === dhi ? String(dlo) : `${dlo} ~ ${dhi}`;
    // 分数区间按从小到大排列：1/大分母 ~ 1/小分母（如 1/2.2 ~ 1/2）
    const fracText = dlo === dhi ? `1/${dlo}` : `1/${dhi} ~ 1/${dlo}`;
    return {
      type: 'keypad',
      prompt: `${pctStr}% ≈ 1/( )`,   // 结算页纯文本
      correctText: fracText,          // 结算页"正确答案"列
      answer: rangeText,              // 答错提示显示："✗ 正确答案：2 ~ 2.2"
      check(v) {                      // 区间判分（外壳钩子）
        return v >= dlo - BHF_EST_TOL && v <= dhi + BHF_EST_TOL;
      },
      promptHTML:
        `${pctStr}% ≈ ` +
        `<span class="frac">` +
        `<span class="frac-n">1</span>` +
        `<span class="frac-line"></span>` +
        `<span class="frac-d">(<span class="q-slot">?</span>)</span>` +
        `</span>`
    };
  }
});
