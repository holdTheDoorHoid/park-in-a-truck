// 中文（简体）— 公园小块地（Park Patch）：小空间的传粉者种植工作手册。PiaT 的原话，段落保持完整。词汇表：docs/i18n/glossary.md
import type en from '../en/patch.ts';
import type { Translation } from '../../define.ts';

export default {
  'title': '公园小块地（Park Patch）',
  'description': '大小不重要——用公园小块地工作手册，把一块4x4的小地、一个前院或一个窗台花箱，变成吸引传粉者的种植地。',
  'lede':
    '没有空地？大小不重要。传粉者种植小块地工作手册可以把任何空间——一块4×4的小地、一个前院，甚至一个窗台花箱——变成种满本土植物、吸引传粉者的地方，用的是和建整座公园一样的分步指南。',
  'originalPdf': '📄 工作手册原版（PDF）',
  'printAnswers': '🖨 打印我的回答',
  'intro':
    '为传粉者种植本土植物有很多好处：能改善土壤健康、防止水土流失，为本地野生动物提供食物和藏身之处，带来独特的美景，适应本地气候、用水更少、化学品更少，还能帮助您社区的生态在气候变化中保持韧性——而且比一般的花坛更省心。',

  'yourArea.title': '您的种植区',
  'yourArea.text': '用您在“评估”中画的底图来评估您想种植的区域；如果没有底图，就估计一下您想用来种植的面积有多少平方英尺。',
  'yourArea.lengthLabel': '您的小块地有多长？',
  'yourArea.widthLabel': '您的小块地有多宽？',
  'yourArea.sunLabel': '向阳的部分有多长、多宽？',
  'yourArea.shadeLabel': '背阴的部分有多长、多宽？',
  'yourArea.alt':
    '一块小块地的方格示意图，标出了现有情况——邻居的房子和落水管、一棵枫树、一处时常积水的地方、一棵山茱萸和一棵海棠树、架空电线和一个消防栓——并标出了向阳和背阴处的传粉者种植区',

  'palette.title': '选择一种种植组合',
  'palette.text':
    '无论您想要的是一个种满草和野花的温馨角落，还是一片有灌木和树木的繁茂空间，请挑选最适合您和这块地的种植组合。（每个示例中的虚线表示6英尺高，也就是人眼的高度——如果您想挡住某处景象或保持视野开阔，这会很有用。）',
  'palette.chooseLabel': '哪种组合适合您的空间？',
  'palette.alt': '“{name}”种植组合的示例种植图，标出了种植间距和分组',
  'palette.plantListLabel': '传粉者小块地植物清单',
  'palette.plantListNote': '一个电子表格，每种组合一个标签页——请另存一份副本再编辑',

  'palette.grasses-wildflowers.name': '草和野花',
  'palette.grasses-wildflowers.good': '适合较小的空间，促进生物多样性，支持传粉者',
  'palette.grasses-wildflowers.why.sightlines': '视野不受遮挡——一般不到3英尺高，所以视线保持开阔。',
  'palette.grasses-wildflowers.why.waterWise': '可以替代草坪，更节水：用水、肥料和割草都更少。',
  'palette.grasses-wildflowers.why.buffet': '为传粉者提供花粉、花蜜和种子的自助餐。',
  'palette.grasses-wildflowers.why.fullSun': '在全日照下长得很好。',
  'palette.grasses-wildflowers.why.color': '整季都有色彩。',

  'palette.grasses-shrubs.name': '草、野花和灌木',
  'palette.grasses-shrubs.good': '能遮挡难看的景象、增加层次，比只种草和野花更省心',
  'palette.grasses-shrubs.why.screens': '遮挡难看的景象。',
  'palette.grasses-shrubs.why.shelter': '给传粉者更多藏身之处和“五星级”美食。',
  'palette.grasses-shrubs.why.structure': '增加层次，也稍微高一些——大多数灌木不超过4英尺。',
  'palette.grasses-shrubs.why.lowMaintenance': '比只种草和野花更省心；第3–4年稍微修剪一下，就能保持整齐。',

  'palette.grasses-shrubs-trees.name': '草、野花、灌木和树木',
  'palette.grasses-shrubs-trees.good': '一个完整的栖息地，一年四季最有韧性',
  'palette.grasses-shrubs-trees.why.habitat': '营造一个完整的栖息地，为野生动物提供温馨的家。',
  'palette.grasses-shrubs-trees.why.resilience': '大大增强整片种植的韧性。',
  'palette.grasses-shrubs-trees.why.sanctuary': '一处生机勃勃、四季常在的私密小天地。',

  'palette.grasses-trees.name': '草、野花和树木',
  'palette.grasses-trees.good': '有一点树荫，树下视线开阔',
  'palette.grasses-trees.why.elegance': '本土树木带来适合本地区的优雅风貌。',
  'palette.grasses-trees.why.airQuality': '改善空气质量——树木吸收污染物、释放氧气。',
  'palette.grasses-trees.why.habitat': '为本地野生动物提供栖息地和食物。',
  'palette.grasses-trees.why.carbon': '固定碳。',
  'palette.grasses-trees.why.shade': '有一点树荫，树下铺满植物，同时整块地的视野仍然开阔。',

  'notes.title': '一般种植说明',
  'notes.groups': '草和野花要成组种植，每组至少4–5株，按三角形排列，株距24"。',
  'notes.shrubs': '灌木按三角形排列，株距48"，种在您可能想要遮蔽或想挡住某处景象的地方。',
  'notes.trees': "树木种在种植床的中间，间距15'。",
  'notes.mulch': '种好以后，铺3"厚的覆盖物，防止杂草生长。',
  'notes.sign': '给植物立一个牌子，让邻居知道种的是什么（以及哪些是杂草）。',
  'notes.callout':
    '[怎样把植物挖出来（英文）↗](https://www.youtube.com/watch?v=-5gk2yVAQtM) · [怎样种树（英文）↗](https://www.youtube.com/watch?v=RypqSrLZVlw) · [怎样处理根系盘结的树（英文）↗](https://www.youtube.com/watch?v=-5Wk_6fz4rc)',

  'maintenance.title': '养护',
  'maintenance.firstSeason': '第一季',
  'maintenance.waterItem': '浇透水：第一季每周浇1"的水。',
  'maintenance.weedItem': '识别杂草：用小棍标出不要的杂草，然后拔掉。',
  'maintenance.secondSeason': '第二季及以后',
  'maintenance.consult.label': '专业咨询',
  'maintenance.consult.hint': '每年向园艺人员或 PiaT 团队请教2–3次',
  'maintenance.expand.label': '扩大栖息地',
  'maintenance.expand.hint': '根据需要添加植物，多余的和社区分享',
  'maintenance.arborist.label': '冬季请树艺师',
  'maintenance.arborist.hint': '冬天请一位树艺师，和社区一起修剪灌木和树木',
  'maintenance.cutback.label': '修剪多年生植物',
  'maintenance.cutback.hint': '在4月1日到5月1日之间修剪，至少留出离地3"',
  'maintenance.replace.label': '补种冬季损失',
  'maintenance.replace.hint': '补种没能熬过冬天的植物',
  'maintenance.leafMold.label': '腐叶土',
  'maintenance.leafMold.hint': '只加在被翻动过或裸露的土上',
  'maintenance.spotWeed.label': '每月局部除草',
  'maintenance.drought.label': '干旱时浇水',
  'maintenance.drought.hint': '长时间干旱时浇水——超过2周没下雨',
  'maintenance.signs.label': '科普标牌',
  'maintenance.signs.hint': '放在每组植物的中间或树的底部，写上植物／传粉者的信息',
  'maintenance.sustainNote': '更多种植养护的小贴士，请查看“维护”这一步，虽然那是为整座公园写的。[前往“维护” →](/steps/sustain/)',

  'ready.title': '准备好了吗？',
  'ready.text': '恭喜您完成了种植工作手册！请把下面每一步都勾选上。',
  'ready.size.label': '种植床的大小',
  'ready.size.hint': '您知道要种植的区域有多大，也知道它是向阳还是背阴',
  'ready.plantChoice.label': '挑选植物',
  'ready.plantChoice.hint': '您已经用过植物计算工具和植物清单',
  'ready.maintenance.label': '养护说明',
  'ready.maintenance.hint': '您已经看过养护说明',
} satisfies Translation<typeof en>;
