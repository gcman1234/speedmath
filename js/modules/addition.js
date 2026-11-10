'use strict';

/* ============================================================
 * 模块：两位数加法（键盘输入型）
 * ============================================================ */

registerModule({
  id: 'addition',
  name: '两位数加法',
  icon: '➕',
  desc: '两位数加法口算，打牢基础',
  total: 10,                       // 每局题数

  makeQuestion() {
    const a = rand(11, 89);
    const b = rand(11, 99 - a);    // 保证和在 100 以内
    return {
      type: 'keypad',              // 键盘输入型
      prompt: `${a} + ${b} =`,
      answer: a + b
    };
  }
});
