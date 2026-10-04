// 한국어 — 주민 회의 전단지. 동네 전체에 보내는 안내문이라 인쇄되는 문구는 합니다체, 화면 조작 문구는 해요체. 크게 인쇄되니 짧게.
import type en from '../en/flyer.ts';
import type { Translation } from '../../define.ts';

export default {
  'eyebrow': '여러분을 초대합니다',
  'headline': '주민 회의: 우리 동네 새 공원 만들기',
  'when': '일시',
  'where': '장소',
  'lot': '공원 부지',
  'contact': '문의',
  'committee': '우리 공원 위원회',
  'credit': 'Park in a Truck 툴킷으로 만들었습니다 · Thomas Jefferson University',

  'ui.empty': '위에 회의 날짜, 시간, 장소, 목적을 적고 (위원도 한 명 추가하면) 전단지가 만들어지는 모습을 볼 수 있어요.',
  'ui.noContact': '여기에 연락처를 넣으려면 위에서 위원을 한 명 추가하세요.',
  'ui.print': '🖨 전단지 인쇄',
  'ui.language': '전단지 언어',
  'ui.second': '두 번째 언어 (나란히 인쇄)',
  'ui.none': '없음',
  'ui.notReady': '{language} (아직 번역 안 됨)',
  'ui.purpose2': '목적 ({language}, 선택 사항)',
  'ui.purpose2Hint': '위에 입력한 내용은 그대로 인쇄돼요. 두 번째 칸에 넣을 번역을 여기에 적으세요.',
} satisfies Translation<typeof en>;
