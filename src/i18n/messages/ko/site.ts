// 한국어 — 모든 페이지의 틀: 머리글, 언어 상자, 안내, 첫 방문 제안, 바닥글, 단계 경로. 해요체. 용어집: docs/i18n/glossary.md
import type en from '../en/site.ts';
import type { Translation } from '../../define.ts';

export default {
  'meta.description': 'Park in a Truck 툴킷으로 동네 공원을 계획하고, 만들고, 가꿔요.',
  'skip': '본문으로 건너뛰기',

  'header.home': 'Park in a Truck — 홈',
  'header.menu': '메뉴',
  'nav.label': '주 메뉴',
  'nav.steps': '단계',
  'nav.lot': '부지 찾기',
  'nav.planner': '3D 설계',
  'nav.build': '제작 안내서',
  'nav.plants': '식물',
  'nav.parks': '공원',
  'nav.myPark': '내 공원:',

  'lang.label': '언어',
  'lang.choose': '언어 선택',

  'notice.machine': '이 페이지는 영어를 기계로 번역한 것이라 어색한 표현이 있을 수 있어요.',
  'notice.readEnglish': '영어 원문 보기',
  'notice.notReady': '{language} 번역을 준비하고 있어요. 이 페이지는 아직 영어예요.',

  'offer.question': '이 사이트를 한국어로 보시겠어요?',
  'offer.yes': '네',
  'offer.no': '괜찮아요',

  'footer.about':
    '필라델피아 Thomas Jefferson University의 조경학 프로그램과 사회·도시 혁신 연구소(Lab for Social and Urban Innovation)가 만든, 직접 만드는 동네 공원 툴킷이에요. 툴킷과 워크북의 내용은 이들의 것이며, 허락을 받아 사용해요.',
  'footer.questions': '궁금한 점이 있나요?',
  'footer.aboutSite': '이 사이트 소개',
  'footer.saved': '답변과 설계는 이 브라우저에만 저장돼요. <a href="{href}">내 공원</a>에서 사본을 저장하거나 위원회와 공유하세요.',
  'footer.resources': '자료, 협력 단체, 언론 보도',
  'footer.legal': '법적 고지',

  'welcome.eyebrow': '다시 오신 것을 환영해요',
  'welcome.lot': '{address} 부지 작업을 이어서 해요.',
  'welcome.project': '프로젝트를 이어서 해요.',
  'welcome.continue': '이어서 하기: {title} →',
  'welcome.myPark': '내 공원 보기 →',

  'path.subDone': '세부 단계 완료',
} satisfies Translation<typeof en>;
