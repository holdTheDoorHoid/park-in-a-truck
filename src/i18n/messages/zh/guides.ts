// 中文（简体）— 制作指南页面的界面文字。指南本身的内容在 src/i18n/data/zh/guides/。词汇表：docs/i18n/glossary.md
import type en from '../en/guides.ts';
import type { Translation } from '../../define.ts';

export default {
  'cat.seating': '座椅',
  'cat.tables': '桌子和工作台',
  'cat.planters': '种植箱',
  'cat.structures': '构筑物',

  'crumb': '制作指南',
  'heroAlt': '组装完成的{title}',
  'dims': '长 {length} × 宽 {width} × 高 {height}',
  'glance.size': '尺寸',
  'glance.time': '时间',
  'glance.people': '人数',
  'glance.skill': '难度',
  'glance.cost': '费用',
  'asBuilt': '用这些部件做出来，尺寸是 {size}。',
  'pdf': '原版 PDF',
  'print': '🖨 打印',

  'need': '您需要准备',
  'materials': '材料和五金件',
  'tools': '工具',
  'cut': '切割清单',
  'cut.part': '部件',
  'cut.qty': '数量',
  'cut.stock': '木料',
  'cut.length': '长度',
  'cut.notes': '备注',
  'siteNote': '本网站的说明，并非来自 Park in a Truck：',
  'steps': '步骤',
  'step': '第{n}步',
  'model': '{title}的 3D 模型',
  'finishing': '收尾处理',
  'safety': '开始之前',
  'links': '供应商和资源链接',
  'source': '出处：{pages}',
  'download': '下载{title}的 PDF',
  'pager': '指南',
  'close': '关闭',
  'notTranslated': '本指南尚未翻译，因此以英文显示。',

  'index.description':
    'Park in a Truck 长椅、桌子、种植箱、石笼座椅、遮阳棚和舞台的分步组装说明，像宜家说明书一样。',
  'index.lede':
    '现在来看看公园里的各种设施是怎么做出来的。有些设施有专门的说明，也就是组装说明——帮您一步步做出来的指南。比如长椅，就配有一套像宜家那样的组装说明。另一些设施提供一个设计，或者一种根据已验证过的说明来制作的建议做法。还有一些直接买现成的产品就行。',
  'index.prose':
    '下面是 Park in a Truck 发布了专门组装说明的十三种设施。选一个，就能看到完整的材料清单、切割清单，以及配有原版图示的编号步骤；也可以下载原版 PDF。备齐一样材料或工具就勾选一样；您勾选的内容会保存在这个浏览器里。',
} satisfies Translation<typeof en>;
