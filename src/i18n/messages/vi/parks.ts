// Tiếng Việt — bản đồ và trang các công viên đã làm. Tên và địa chỉ công viên giữ nguyên.
import type en from '../en/parks.ts';
import type { Translation } from '../../define.ts';

export default {
  'page.title': 'Các công viên đã làm',
  'page.description': 'Những công viên khu phố thật đã được làm với cẩm nang Park in a Truck quanh Philadelphia.',
  'page.eyebrow': 'Làm với Park in a Truck',
  'page.lede':
    'Hàng xóm đã dùng cẩm nang này để làm những công viên thật quanh Philadelphia. Đây là chỗ các công viên đó, cùng những gì được biết về mỗi nơi — bấm vào một ghim hay một thẻ để xem câu chuyện, hình ảnh và báo chí.',
  'park.opened': 'khánh thành năm {year}',
  'photo.credit': '{caption} — {credit}',
  'video.alt': 'Video: {title}',
  'link.english': '(bằng tiếng Anh)',
  'park.source': 'Nguồn: {source}',
  // các phần của dòng "Nguồn:" và ghi công ảnh (tên báo và tên người giữ nguyên)
  'source.toolkitPage': 'cẩm nang Park in a Truck, trang {page}',
  'source.toolkitPages': 'cẩm nang Park in a Truck, trang {pages}',
  'source.toolkitAck': 'cẩm nang Park in a Truck, phần cảm ơn ở trang {page}',
  'source.linktree': 'Linktree của Park in a Truck',
  'source.linktreeOnly': 'chỉ có trên Linktree của Park in a Truck',
  'source.unconfirmedElsewhere': 'chưa được nguồn nào khác xác nhận',
  'source.unconfirmedBeyond': 'ngoài ra chưa được xác nhận',
  'source.jeffersonNews': 'tin tức của Jefferson',
  'source.sep': '; ',
  'photo.via': 'ảnh của {name}, từ cẩm nang Park in a Truck',
  'photo.toolkit': 'cẩm nang Park in a Truck',

  'map.label': 'Bản đồ các công viên làm với Park in a Truck',
  'map.details': 'Xem chi tiết',
  'map.close': 'Đóng',
  'map.print': 'Xem bản đồ tương tác trên mạng, hoặc danh sách công viên bên dưới.',
} satisfies Translation<typeof en>;
