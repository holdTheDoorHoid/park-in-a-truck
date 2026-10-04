// 中文（简体）— 首页和步骤总览页。词汇表：docs/i18n/glossary.md
import type en from '../en/pages.ts';
import type { Translation } from '../../define.ts';

export default {
  'home.eyebrow': '自己动手建造社区公园的工具包',
  'home.title': '把一块空地变成您社区的公园。',
  'home.lede':
    'Park in a Truck 陪您和邻居走完每一步：寻找地块、组织团队、设计公园、动手建造，并让公园一直保持美丽。本网站把工具包变成一本互动式工作手册，一步步引导您，还替您查好资料。',
  'home.start': '从这里开始 →',
  'home.allSteps': '查看全部六个步骤',
  'home.heroAlt':
    '邻居们从一辆写着 Park in a Truck 的皮卡上卸货：有人搬长椅，有人种树、照料花草，后面是一排联排房屋。',
  'home.path': '您的路线',
  'home.lotTitle': '心里已经有一块地了吗？',
  'home.lotLede':
    '输入一个费城地址。我们会帮您找到业主、地块面积、用地分区和地块轮廓，不用您自己在 atlas.phila.gov 上翻找。',
  'home.tools': '替您跑腿的工具',
  'home.tool.lot': '寻找地块',
  'home.tool.lot.text': '您附近空地的地图，附有业主、面积和用地分区。',
  'home.tool.planner': '3D 规划',
  'home.tool.planner.text': '把 Park in a Truck 的公园图块放到您真实的地块上，看看哪里有阳光、哪里背阴。',
  'home.tool.build': '制作指南',
  'home.tool.build.text': '长椅、桌子、种植箱、遮阳棚等的分步制作说明。',
  'home.tool.plants': '植物',
  'home.tool.plants.text': '按公园主题分类的本土植物清单，适合向阳处和背阴处。',
  'home.tool.parks': '已建成的公园',
  'home.tool.parks.text': '看看费城各地的邻居们已经建成了什么。',
  'home.tool.myPark': '我的公园',
  'home.tool.myPark.text': '您的回答保存在这个浏览器里。可以分享一份副本给您的委员会。',

  'steps.title': '步骤',
  'steps.eyebrow': 'Park in a Truck 的做法',
  'steps.h1': '建成公园的六个步骤',
  'steps.lede':
    '每一个 Park in a Truck 公园都要经过同样的六个步骤。请按顺序进行，每一步都以前一步为基础。完成一个小步骤就标记一下；您的进度会保存在这个浏览器里。',
} satisfies Translation<typeof en>;
