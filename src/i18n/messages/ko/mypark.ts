// 한국어 — 내 공원 페이지의 스크립트가 쓰는 말: 프로젝트 목록, 이름 바꾸기·새로 만들기·삭제, 파일 열기, 부지 요약, 답변 요약. 해요체.
import type en from '../en/mypark.ts';
import type { Translation } from '../../define.ts';

export default {
  'project.newDefault': '새 공원',
  'list.openNow': '(열려 있음)',
  'list.open': '열기',
  'list.delete': '삭제',
  'list.deleteLabel': '{name} 삭제',
  'delete.confirm': '이 브라우저에서 “{name}”을(를) 삭제할까요? 프로젝트 파일을 저장해 두지 않았다면 되돌릴 수 없어요.',
  'delete.done': '{name} 삭제됨.',
  'import.opened': '“{name}” 프로젝트를 열었어요. 이제 이 프로젝트로 작업해요.',
  'import.notProject': 'Park in a Truck 프로젝트 파일이 아니에요.',

  'lot.address': '주소',
  'lot.owner': '소유자',
  'lot.size': '부지 크기',
  'lot.zoning': '용도지역',
  'lot.ownerLine': '{owner} — {kind}',
  'lot.measured': '{width} × {length} · {area} (시 필지 경계선으로 잰 값)',
  'lot.record': '{frontage} × {depth}피트 · {area} (시 부동산 기록)',
  'lot.recordNoArea': '{frontage} × {depth}피트 (시 부동산 기록)',
  'lot.none': '아직 고른 부지가 없어요. <a href="{href}">1단계: 확보하기</a>에서 찾아보세요.',
  'answers.none': '아직 입력한 내용이 없어요.',
} satisfies Translation<typeof en>;
