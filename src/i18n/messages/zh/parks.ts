// 中文（简体）— 公园地图和 /parks/ 页面。公园名称和地址不变；描述、街区、链接标签和照片说明来自 src/i18n/data/zh/parks.json。词汇表：docs/i18n/glossary.md
import type en from '../en/parks.ts';
import type { Translation } from '../../define.ts';

export default {
  'page.title': '已建成的公园',
  'page.description': '费城各地已经用 Park in a Truck 工具包建成的真实社区公园。',
  'page.eyebrow': '用 Park in a Truck 建成',
  'page.lede': '邻居们已经用这套工具包在费城各地建成了真实的公园。下面是它们的位置，以及每座公园目前已知的情况——点击地图上的标记或卡片，就能看到它的故事、照片和媒体报道。',
  'park.opened': '{year}年开放',
  'photo.credit': '{caption}——{credit}',
  'video.alt': '视频：{title}',
  'link.english': '（英文）',
  'park.source': '来源：{source}',
  // “来源：”一行和照片署名里的词（报刊名和人名不变）
  'source.toolkitPage': 'Park in a Truck 工具包第{page}页',
  'source.toolkitPages': 'Park in a Truck 工具包第{pages}页',
  'source.toolkitAck': 'Park in a Truck 工具包第{page}页致谢',
  'source.linktree': 'Park in a Truck 的 Linktree',
  'source.linktreeOnly': '仅见于 Park in a Truck 的 Linktree',
  'source.unconfirmedElsewhere': '其他来源尚未证实',
  'source.unconfirmedBeyond': '除此之外尚未证实',
  'source.jeffersonNews': 'Jefferson 新闻',
  'photo.via': '{name} 摄，载于 Park in a Truck 工具包',
  'photo.toolkit': 'Park in a Truck 工具包',

  'map.label': '用 Park in a Truck 建成的公园地图',
  'map.details': '查看详情',
  'map.close': '关闭',
  'map.print': '请在网上查看互动地图，或参阅下面的公园列表。',
} satisfies Translation<typeof en>;
