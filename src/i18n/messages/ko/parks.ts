// 한국어 — 공원 지도와 /parks/ 페이지. 공원 이름과 주소는 그대로. 해요체.
import type en from '../en/parks.ts';
import type { Translation } from '../../define.ts';

export default {
  'page.title': '지금까지 만든 공원',
  'page.description': '필라델피아 곳곳에 Park in a Truck 툴킷으로 이미 만든 실제 동네 공원들이에요.',
  'page.eyebrow': 'Park in a Truck으로 만든 공원',
  'page.lede':
    '이웃들은 이미 이 툴킷으로 필라델피아 곳곳에 실제 공원을 만들었어요. 어디에 있는지, 공원마다 알려진 내용과 함께 보여 드려요. 핀이나 카드를 누르면 이야기, 사진, 기사를 볼 수 있어요.',
  'park.opened': '{year}년 개장',
  'photo.credit': '{caption} — {credit}',
  'video.alt': '영상: {title}',
  'link.english': '(영어)',
  'park.source': '출처: {source}',

  'map.label': 'Park in a Truck으로 만든 공원 지도',
  'map.details': '자세히 보기',
  'map.close': '닫기',
  'map.print': '온라인에서 대화형 지도를 보거나, 아래 공원 목록을 보세요.',
} satisfies Translation<typeof en>;
