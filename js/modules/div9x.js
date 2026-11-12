'use strict';

/* ============================================================
 * 模块：三位数 ÷ 9x（键盘输入型，分式/横式，±5% 估算判分）
 * 被除数 [100,999]，除数 [91,99]。
 * 判分基准 = 精确商保留 3 位小数；答案落在其 ±5%（含边界）即对。
 * ============================================================ */

/* 分式：aaa / bb = (?)（复用 .frac 竖式样式） */
function div9xVerticalHTML(a, b) {
  return `<span class="frac">` +
    `<span class="frac-n">${a}</span>` +
    `<span class="frac-line"></span>` +
    `<span class="frac-d">${b}</span>` +
    `</span> = (<span class="q-slot q-answer">?</span>)`;
}

/* 横式：aaa ÷ bb = (?)（小字号防溢出） */
function div9xHorizontalHTML(a, b) {
  return `<span class="hsum">${a} ÷ ${b} = (<span class="q-slot q-answer">?</span>)</span>`;
}

registerModule({
  id: 'div9x',
  name: '三位数÷9x',
  icon: '➗',
  desc: '直除估算，±5% 判分',
  total: 10,                       // 每局题数

  formatToggle: { labels: ['分式', '横式'] },   // 右侧开关：分式 ⇄ 横式

  makeQuestion(ctx) {
    const a = rand(100, 999);
    const b = rand(91, 99);
    const vertical = !ctx || ctx.vertical !== false;   // 默认分式
    // 判分基准：精确商保留 3 位小数
    const ref = Math.round((a / b) * 1000) / 1000;
    return {
      type: 'keypad',
      prompt: `${a} ÷ ${b} =`,     // 结算页纯文本（结尾 = 会被去掉）
      answer: `约 ${ref}（±5% 内均对）`,   // 答错提示
      correctText: `≈ ${ref}`,     // 结算页"正确答案"列
      _a: a, _b: b,                // 内部保留，供 rerender 切换格式复用
      check(v) {                   // ±5%（含边界）判对
        return Math.abs(v - ref) <= ref * 0.05 + 1e-9;
      },
      promptHTML: vertical
        ? div9xVerticalHTML(a, b)
        : div9xHorizontalHTML(a, b)
    };
  },

  /* 分式/横式切换时立即重排当前题：数字不变，只换排版 */
  rerender(q, ctx) {
    const vertical = !ctx || ctx.vertical !== false;
    q.promptHTML = vertical
      ? div9xVerticalHTML(q._a, q._b)
      : div9xHorizontalHTML(q._a, q._b);
    return q;
  }
});
