// 中文（简体）— 每页的框架：页头、语言选择、提示、页脚、步骤路径。称呼读者用“您”。词汇表：docs/i18n/glossary.md
import type en from '../en/site.ts';
import type { Translation } from '../../define.ts';

export default {
  'meta.description': '借助 Park in a Truck 工具包，规划、建造并照管您社区的公园。',
  'skip': '跳到正文',

  'header.home': 'Park in a Truck — 首页',
  'header.menu': '菜单',
  'nav.label': '主菜单',
  'nav.steps': '步骤',
  'nav.lot': '寻找地块',
  'nav.planner': '3D 规划',
  'nav.build': '制作指南',
  'nav.plants': '植物',
  'nav.parks': '公园',
  'nav.myPark': '我的公园：',

  'lang.label': '语言',
  'lang.choose': '选择语言',

  'notice.machine': '本页由机器从英文翻译，部分用词可能不够准确。',
  'notice.readEnglish': '阅读英文原文',
  'notice.notReady': '{language}版本即将推出，本页目前仍为英文。',

  'offer.question': '以中文浏览本网站？',
  'offer.yes': '好的',
  'offer.no': '不用了，谢谢',

  'footer.about':
    '一套自己动手建造社区公园的工具包，由费城 Thomas Jefferson University 的景观建筑项目和社会与城市创新实验室制作。工具包和工作手册的内容归他们所有，经许可使用。',
  'footer.questions': '有问题？',
  'footer.aboutSite': '关于本网站',
  'footer.saved': '您的回答和设计只保存在这个浏览器里。请在<a href="{href}">我的公园</a>中保存一份副本，或与您的委员会分享。',
  'footer.resources': '资源、合作伙伴和媒体报道',
  'footer.legal': '法律声明',

  'welcome.eyebrow': '欢迎回来',
  'welcome.lot': '继续处理您在 {address} 的地块。',
  'welcome.project': '继续您的项目。',
  'welcome.continue': '继续：{title} →',
  'welcome.myPark': '查看我的公园 →',

  'path.subDone': '个小步骤已完成',
} satisfies Translation<typeof en>;
