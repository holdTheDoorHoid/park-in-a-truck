// 中文（简体）— “我的公园”页面脚本写出的文字：项目列表、重命名／新建／删除、打开项目文件、地块摘要和回答摘要。词汇表：docs/i18n/glossary.md
import type en from '../en/mypark.ts';
import type { Translation } from '../../define.ts';

export default {
  'project.newDefault': '新公园',
  'list.openNow': '（当前）',
  'list.open': '打开',
  'list.delete': '删除',
  'list.deleteLabel': '删除{name}',
  'delete.confirm': '要从这个浏览器里删除“{name}”吗？除非您保存过项目文件，否则无法恢复。',
  'delete.done': '已删除{name}。',
  'import.opened': '已打开“{name}”。它现在是您的当前项目。',
  'import.notProject': '这不是 Park in a Truck 的项目文件。',

  'lot.address': '地址',
  'lot.owner': '业主',
  'lot.size': '地块面积',
  'lot.zoning': '用地分区',
  'lot.ownerLine': '{owner}——{kind}',
  'lot.measured': '{width} × {length} · {area}（根据市政府的地块轮廓测得）',
  'lot.record': '{frontage} × {depth}英尺 · {area}（市政府房地产记录）',
  'lot.recordNoArea': '{frontage} × {depth}英尺（市政府房地产记录）',
  'lot.none': '还没有选定地块。请在<a href="{href}">第1步：获取</a>中查询。',
  'answers.none': '还没有填写任何内容。',
} satisfies Translation<typeof en>;
