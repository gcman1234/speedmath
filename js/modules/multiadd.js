'use strict';

/* ============================================================
 * 模块：多数相加（键盘输入型，竖式/横式）
 * 进入后先在设置屏选择"每组数字个数"（3~10，记住上次），
 * 每题给出 X 个 100~999 的随机正整数，输入精确和。
 * ============================================================ */

/* 竖式 HTML：数字右对齐堆叠，末行加号 + 横线 + ( ? ) 答案位 */
function multiaddVerticalHTML(nums) {
  const rows = nums.map((n, i) => {
    const last = i === nums.length - 1;
    return `<span class="vs-num">${last ? '+&nbsp;' : ''}${n}</span>`;
  }).join('');
  const compact = nums.length >= 8 ? ' compact' : '';
  return `<span class="vsum${compact}">${rows}<span class="vs-line"></span><span class="vs-ans">(<span class="q-slot">?</span>)</span></span>`;
}

/* 横式 HTML：A + B + C = ( ? )，自动换行 */
function multiaddHorizontalHTML(nums) {
  return `<span class="hsum">${nums.join(' + ')} = (<span class="q-slot">?</span>)</span>`;
}

registerModule({
  id: 'multiadd',
  name: '多数相加',
  icon: '🔢',
  desc: '3~10 个三位数连加',
  total: 10,                       // 每局题数

  /* 进入模块先显示设置屏：数字胶囊选择个数（3~10），记住上次 */
  setup: {
    title: '每组数字个数',
    hint: '选择相加的数字个数（3 ~ 10）',
    min: 3,
    max: 10,
    def: 3
  },

  formatToggle: true,              // 声明支持 竖式/横式 切换

  makeQuestion(ctx) {
    const count = (ctx && ctx.count) || 3;
    const vertical = !ctx || ctx.vertical !== false;   // 默认竖式
    const nums = [];
    for (let i = 0; i < count; i++) nums.push(rand(100, 999));
    const sum = nums.reduce((a, b) => a + b, 0);
    return {
      type: 'keypad',
      prompt: `${nums.join(' + ')} =`,   // 结算页纯文本（结尾 = 会被去掉）
      answer: sum,
      nums: nums,                        // 内部保留数字，供 rerender 切换格式时复用
      promptHTML: vertical
        ? multiaddVerticalHTML(nums)
        : multiaddHorizontalHTML(nums)
    };
  },

  /* 竖式/横式切换时立即重排当前题：数字不变，只换排版 */
  rerender(q, ctx) {
    const vertical = !ctx || ctx.vertical !== false;
    q.promptHTML = vertical
      ? multiaddVerticalHTML(q.nums)
      : multiaddHorizontalHTML(q.nums);
    return q;
  }
});
