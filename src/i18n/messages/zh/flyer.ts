// 中文（简体）— 会议传单。句子要短：用大字号打印在半页纸上。
import type en from '../en/flyer.ts';
import type { Translation } from '../../define.ts';

export default {
  'eyebrow': '诚邀您参加',
  'headline': '社区会议：为我们的社区建一座新公园',
  'when': '时间',
  'where': '地点',
  'lot': '地块',
  'contact': '有问题？请联系',
  'committee': '我们的公园委员会',
  'credit': '使用 Park in a Truck 工具包制作 · Thomas Jefferson University',

  'ui.empty': '请在上方填写会议的日期、时间、地点和目的（并添加一位委员会成员），就能看到传单的样子。',
  'ui.noContact': '请在上方添加一位委员会成员，这里就会显示联系人。',
  'ui.print': '🖨 打印传单',
  'ui.language': '传单语言',
  'ui.second': '第二种语言（并排）',
  'ui.none': '无',
  'ui.notReady': '{language}（尚未翻译）',
  'ui.purpose2': '会议目的（{language}，选填）',
  'ui.purpose2Hint': '您在上方输入的内容会原样打印；可在这里添加译文，印在第二栏。',
} satisfies Translation<typeof en>;
