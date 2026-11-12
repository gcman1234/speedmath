'use strict';

/* ============================================================
 * 模块：一位数试商（键盘输入型，整商判题）
 * 除数 x ∈ [2,9]，被除数 a ∈ 开区间 (x, 10x)。
 * 答案 = 整商 ⌊a / x⌋（必为 1~9 的个位数），同时展示余数帮助找手感。
 * ============================================================ */

registerModule({
  id: 'shishang',
  name: '一位数试商',
  icon: '✏️',
  desc: '一位数除法试商，练整商',
  total: 10,                       // 每局题数
  // 键盘保持全布局，与其他计算模块键位手感一致（答案虽是个位数）

  makeQuestion() {
    const x = rand(2, 9);
    const a = rand(x + 1, 10 * x - 1);          // 开区间 (x, 10x)
    const q = Math.floor(a / x);                 // 整商 1~9
    const rem = a - q * x;                       // 余数
    return {
      type: 'keypad',
      prompt: `${a} / ${x} =`,                   // 结算页纯文本（结尾 = 会被去掉）
      answer: `${q}（余 ${rem}）`,               // 答错提示："✗ 正确答案：8（余 1）"
      correctText: `${q}（余 ${rem}）`,          // 结算页"正确答案"列
      check(v) { return v === q; },
      promptHTML:
        `${a} / ${x} = (<span class="q-slot q-answer">?</span>)`
    };
  }
});
