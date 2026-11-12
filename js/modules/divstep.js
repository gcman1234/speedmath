'use strict';

/* ============================================================
 * 模块：3除2第一步（多空两阶段：第一位商 + 余数）
 * 被除数 a ∈ [100,999]，除数 b ∈ [11,99]。
 * 位置值 k：a ≥ 10b 时 k=10（第一位商在十位），否则 k=1（个位）。
 * 第一空 q 合法 ⟺ |a − q·k·b| < k·b（严格小于；整除时只有唯一解）。
 * 第二空 r 必须精确等于 a − q·k·b（可负；留空视为 0）。
 * ============================================================ */

/* 分式：aaa / bb = (第一空)···(第二空) */
function divstepVerticalHTML(a, b) {
  return `<span class="frac">` +
    `<span class="frac-n">${a}</span><span class="frac-line"></span><span class="frac-d">${b}</span>` +
    `</span> = (<span class="q-slot" data-slot="0">?</span>)···(<span class="q-slot" data-slot="1">?</span>)`;
}

/* 横式：aaa ÷ bb = (第一空)···(第二空) */
function divstepHorizontalHTML(a, b) {
  return `<span class="hsum">${a} ÷ ${b} = (<span class="q-slot" data-slot="0">?</span>)···(<span class="q-slot" data-slot="1">?</span>)</span>`;
}

registerModule({
  id: 'divstep',
  name: '3除2第一步',
  icon: '🥇',
  desc: '首商与余数',
  total: 10,                       // 每局题数

  formatToggle: { labels: ['分式', '横式'] },   // 右侧开关：分式 ⇄ 横式

  makeQuestion(ctx) {
    const a = rand(100, 999);
    const b = rand(11, 99);
    const vertical = !ctx || ctx.vertical !== false;   // 默认分式
    const k = a >= 10 * b ? 10 : 1;                    // 位置值：十位或个位
    const qt = Math.floor(a / (k * b));                // 标准第一位商
    const stdR = a - qt * k * b;                       // 标准余数（0 ≤ r < k·b）
    return {
      type: 'keypad',
      blanks: 2,
      prompt: `${a} ÷ ${b}`,                          // 结算页纯文本
      answer: `${qt}...${stdR}`,                      // 答错提示显示
      correctText: `${qt}...${stdR}`,                 // 结算页"正确答案"列
      _a: a, _b: b,                                   // 内部保留，供 rerender 复用
      /* 第一空校验：|a − q·k·b| < k·b（严格） */
      stageCheck(stage, v) {
        if (stage !== 0) return true;
        return Math.abs(a - v * k * b) < k * b;
      },
      stageHint() {
        return `商得太远：|余数| 应小于 ${k * b}`;
      },
      /* 终审：余数必须精确等于 a − q·k·b */
      check(q, r) {
        return r === a - q * k * b;
      },
      promptHTML: vertical
        ? divstepVerticalHTML(a, b)
        : divstepHorizontalHTML(a, b)
    };
  },

  /* 分式/横式切换时立即重排当前题：数字不变，只换排版 */
  rerender(q, ctx) {
    const vertical = !ctx || ctx.vertical !== false;
    q.promptHTML = vertical
      ? divstepVerticalHTML(q._a, q._b)
      : divstepHorizontalHTML(q._a, q._b);
    return q;
  }
});
