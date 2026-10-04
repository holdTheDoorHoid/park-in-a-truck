// 한국어 — 자투리 공원(Park Patch): 작은 공간을 위한 꽃가루 매개자 식재 워크북. PiaT의 글을 그대로, 문단은 통째로. 해요체.
import type en from '../en/patch.ts';
import type { Translation } from '../../define.ts';

export default {
  'title': '자투리 공원(Park Patch)',
  'description':
    '크기는 상관없어요. 자투리 공원 워크북으로 4x4 땅, 앞마당, 창가 화분을 꽃가루 매개자를 위한 정원으로 바꿔 보세요.',
  'lede':
    '공터가 없나요? 크기는 상관없어요. 꽃가루 매개자 정원(Pollinator Planting Patch) 워크북은 4×4 땅, 앞마당, 창가 화분까지 어떤 공간이든 자생 식물로 꽃가루 매개자 정원을 만들도록 도와요. 공원 전체를 만들 때와 같은 단계별 안내 방식이에요.',
  'originalPdf': '📄 원본 워크북 (PDF)',
  'printAnswers': '🖨 내 답변 인쇄',
  'intro':
    '꽃가루 매개자를 위해 자생 식물을 심으면 좋은 점이 아주 많아요. 흙을 건강하게 하고 흙이 쓸려 나가는 것을 막아요. 지역 야생 동물에게 먹이와 쉴 곳을 주고, 남다른 아름다움을 선사해요. 이 지역 기후에서 물과 화학 약품을 덜 쓰고도 잘 자라고, 기후가 변해도 동네 생태계가 잘 버티도록 도와요. 게다가 보통 화단보다 손이 덜 가요.',

  'yourArea.title': '심을 공간',
  'yourArea.text':
    '조사하기 단계에서 만든 기본 평면도로 심고 싶은 공간을 살펴보세요. 평면도가 없다면 식물을 심을 면적이 몇 제곱피트인지 어림잡아 보세요.',
  'yourArea.lengthLabel': '공간의 길이는 얼마인가요?',
  'yourArea.widthLabel': '공간의 너비는 얼마인가요?',
  'yourArea.sunLabel': '햇빛이 드는 부분의 길이와 너비는 얼마인가요?',
  'yourArea.shadeLabel': '그늘진 부분의 길이와 너비는 얼마인가요?',
  'yourArea.alt':
    '공간의 현재 상태를 표시한 격자 도면. 이웃집과 빗물 홈통, 단풍나무, 가끔 물이 고이는 곳, 산딸나무와 꽃사과나무, 머리 위 전선, 소화전이 있고, 햇빛과 그늘에 꽃가루 매개자 식재 구역이 표시되어 있어요',

  'palette.title': '식재 조합 고르기',
  'palette.text':
    '풀과 들꽃이 어우러진 아늑한 구석을 꿈꾸든, 관목과 나무가 우거진 공간을 꿈꾸든, 여러분과 장소에 가장 잘 맞는 조합을 골라 보세요. (각 예시의 점선은 6피트, 즉 눈높이를 나타내요. 시야를 가리고 싶거나 트이게 두고 싶을 때 참고하세요.)',
  'palette.chooseLabel': '어떤 조합이 공간에 맞나요?',
  'palette.alt': '{name} 조합의 식재 계획 예시. 심는 간격과 묶음이 표시되어 있어요',
  'palette.plantListLabel': '꽃가루 매개자 정원 식물 목록',
  'palette.plantListNote': '스프레드시트 하나에 조합마다 탭이 있어요. 수정하려면 사본을 만드세요',

  'palette.grasses-wildflowers.name': '풀과 들꽃',
  'palette.grasses-wildflowers.good': '작은 공간, 생물 다양성 높이기, 꽃가루 매개자 돕기',
  'palette.grasses-wildflowers.why.sightlines': '시야가 트여요. 대개 3피트보다 낮아서 눈길이 막히지 않아요.',
  'palette.grasses-wildflowers.why.waterWise': '잔디 대신 물을 아끼는 선택: 물, 비료, 잔디 깎기가 덜 필요해요.',
  'palette.grasses-wildflowers.why.buffet': '꽃가루, 꿀, 씨앗이 가득한 꽃가루 매개자 뷔페예요.',
  'palette.grasses-wildflowers.why.fullSun': '양지에서 잘 자라요.',
  'palette.grasses-wildflowers.why.color': '계절 내내 색이 이어져요.',

  'palette.grasses-shrubs.name': '풀, 들꽃 + 관목',
  'palette.grasses-shrubs.good': '보기 싫은 것을 가리고 짜임새를 더하기. 풀과 들꽃만 심을 때보다 손이 덜 가요',
  'palette.grasses-shrubs.why.screens': '보기 싫은 풍경을 가려 줘요.',
  'palette.grasses-shrubs.why.shelter': '꽃가루 매개자에게 쉴 곳이 늘고, 일류 식당이 생겨요.',
  'palette.grasses-shrubs.why.structure': '짜임새와 높이를 조금 더해요. 관목은 대부분 4피트 아래로 자라요.',
  'palette.grasses-shrubs.why.lowMaintenance':
    '풀과 들꽃만 심을 때보다 손이 덜 가요. 3–4년째에 가볍게 가지치기하면 깔끔하게 유지돼요.',

  'palette.grasses-shrubs-trees.name': '풀, 들꽃, 관목 + 나무',
  'palette.grasses-shrubs-trees.good': '사계절 가장 튼튼한, 온전한 서식지',
  'palette.grasses-shrubs-trees.why.habitat': '온전한 서식지이자 야생 동물의 아늑한 집이 돼요.',
  'palette.grasses-shrubs-trees.why.resilience': '식재 전체가 훨씬 튼튼해져요.',
  'palette.grasses-shrubs-trees.why.sanctuary': '사계절 생기 넘치는 나만의 쉼터예요.',

  'palette.grasses-trees.name': '풀, 들꽃 + 나무',
  'palette.grasses-trees.good': '그늘이 조금 생기고, 나무 아래로 시야가 트여요',
  'palette.grasses-trees.why.elegance': '자생 나무가 이 지역에 어울리는 품격을 더해요.',
  'palette.grasses-trees.why.airQuality': '공기가 좋아져요. 나무는 오염 물질을 흡수하고 산소를 내보내요.',
  'palette.grasses-trees.why.habitat': '지역 야생 동물에게 서식지와 먹이를 줘요.',
  'palette.grasses-trees.why.carbon': '탄소를 저장해요.',
  'palette.grasses-trees.why.shade':
    '나무 아래에 식물 양탄자를 깔고 그늘을 조금 만들면서도, 장소 전체가 훤히 보이도록 해요.',

  'notes.title': '심을 때 알아 둘 점',
  'notes.groups': '풀과 들꽃은 한 묶음에 적어도 4–5포기씩, 24인치 간격의 삼각형 모양으로 심으세요.',
  'notes.shrubs': '관목은 48인치 간격의 삼각형 모양으로, 쉴 곳을 만들거나 시야를 가리고 싶은 곳에 심으세요.',
  'notes.trees': '나무는 화단 가운데에 15피트 간격으로 심으세요.',
  'notes.mulch': '다 심은 뒤에는 잡초가 나지 않도록 멀칭재(덮개)를 3인치 두께로 덮으세요.',
  'notes.sign': '식물에 이름표를 달아 이웃들이 무엇이 자라는지(그리고 무엇이 잡초인지) 알 수 있게 하세요.',
  'notes.callout':
    '[식물을 캐내는 법 (영어) ↗](https://www.youtube.com/watch?v=-5gk2yVAQtM) · [나무 심는 법 (영어) ↗](https://www.youtube.com/watch?v=RypqSrLZVlw) · [뿌리가 엉킨 나무 다루는 법 (영어) ↗](https://www.youtube.com/watch?v=-5Wk_6fz4rc)',

  'maintenance.title': '관리',
  'maintenance.firstSeason': '첫해',
  'maintenance.waterItem': '흠뻑 물 주기: 첫해에는 매주 1인치만큼 물을 주세요.',
  'maintenance.weedItem': '잡초 구별하기: 원하지 않는 잡초에 막대를 꽂아 표시하고 뽑으세요.',
  'maintenance.secondSeason': '둘째 해부터',
  'maintenance.consult.label': '전문가 상담',
  'maintenance.consult.hint': '1년에 2–3번 정원사나 PiaT 팀에게 조언을 구하세요',
  'maintenance.expand.label': '서식지 넓히기',
  'maintenance.expand.hint': '필요하면 식물을 더 심고, 남는 것은 이웃과 나누세요',
  'maintenance.arborist.label': '겨울 수목 관리사',
  'maintenance.arborist.hint': '겨울에 수목 관리사(arborist)를 불러 주민들과 함께 관목과 나무를 가지치기하세요',
  'maintenance.cutback.label': '여러해살이 식물 잘라 주기',
  'maintenance.cutback.hint': '4월 1일에서 5월 1일 사이에 흙 위로 적어도 3인치는 남기고 자르세요',
  'maintenance.replace.label': '겨울 뒤 바꿔 심기',
  'maintenance.replace.hint': '겨울을 넘기지 못한 식물은 새로 바꿔 심으세요',
  'maintenance.leafMold.label': '부엽토',
  'maintenance.leafMold.hint': '흙이 파헤쳐졌거나 맨흙이 드러난 곳에만 넣으세요',
  'maintenance.spotWeed.label': '매달 군데군데 잡초 뽑기',
  'maintenance.drought.label': '가뭄 때 물 주기',
  'maintenance.drought.hint': '2주 넘게 비가 오지 않는 긴 가뭄 때는 물을 주세요',
  'maintenance.signs.label': '교육용 안내판',
  'maintenance.signs.hint': '식물 묶음 가운데나 나무 밑동에 세우고, 식물과 꽃가루 매개자 정보를 적으세요',
  'maintenance.sustainNote':
    '공원 전체를 위해 쓴 내용이지만, 가꾸기 단계에 식물 관리 도움말이 더 있어요. [가꾸기로 가기 →](/steps/sustain/)',

  'ready.title': '준비됐나요?',
  'ready.text': '식재 워크북을 마친 것을 축하해요! 아래 항목을 하나씩 체크하세요.',
  'ready.size.label': '화단 크기',
  'ready.size.hint': '얼마나 넓은 곳에 심을지, 그곳이 양지인지 그늘인지 알아요',
  'ready.plantChoice.label': '식물 고르기',
  'ready.plantChoice.hint': '식물 계산기와 식물 목록을 써 봤어요',
  'ready.maintenance.label': '관리 메모',
  'ready.maintenance.hint': '관리 메모를 다 읽어 봤어요',
} satisfies Translation<typeof en>;
