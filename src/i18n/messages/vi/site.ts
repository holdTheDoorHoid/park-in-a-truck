// Tiếng Việt — khung của mọi trang. Gọi người đọc là "bạn". Bảng thuật ngữ: docs/i18n/glossary.md
import type en from '../en/site.ts';
import type { Translation } from '../../define.ts';

export default {
  'meta.description': 'Lên kế hoạch, xây dựng và chăm sóc một công viên khu phố với cẩm nang Park in a Truck.',
  'skip': 'Chuyển đến nội dung',

  'header.home': 'Park in a Truck — trang chủ',
  'header.menu': 'Menu',
  'nav.label': 'Chính',
  'nav.steps': 'Các bước',
  'nav.lot': 'Tìm lô đất',
  'nav.planner': 'Thiết kế 3D',
  'nav.build': 'Hướng dẫn lắp ráp',
  'nav.plants': 'Cây trồng',
  'nav.parks': 'Công viên',
  'nav.myPark': 'Công viên của tôi:',

  'lang.label': 'Ngôn ngữ',
  'lang.choose': 'Chọn ngôn ngữ',

  'notice.machine': 'Trang này được dịch tự động từ tiếng Anh, nên có thể có vài chữ chưa đúng.',
  'notice.readEnglish': 'Đọc bằng tiếng Anh',
  'notice.notReady': '{language} sắp có — hiện trang này vẫn bằng tiếng Anh.',

  'offer.question': 'Xem trang web này bằng tiếng Việt?',
  'offer.yes': 'Có',
  'offer.no': 'Không, cảm ơn',

  'footer.about':
    'Cẩm nang tự làm công viên khu phố của Chương trình Kiến trúc Cảnh quan và Phòng thí nghiệm Đổi mới Xã hội và Đô thị thuộc Thomas Jefferson University, Philadelphia. Nội dung cẩm nang và sổ tay thực hành là của họ, được dùng khi có sự cho phép.',
  'footer.questions': 'Có câu hỏi?',
  'footer.aboutSite': 'Về trang web này',
  'footer.saved':
    'Câu trả lời và thiết kế của bạn chỉ được lưu trong trình duyệt này. Vào <a href="{href}">Công viên của tôi</a> để lưu một bản sao hoặc chia sẻ với ban công viên.',
  'footer.resources': 'Tài liệu, đối tác & báo chí',
  'footer.legal': 'Thông báo pháp lý',

  'welcome.eyebrow': 'Chào mừng bạn trở lại',
  'welcome.lot': 'Tiếp tục với lô đất của bạn tại {address}.',
  'welcome.project': 'Tiếp tục với dự án của bạn.',
  'welcome.continue': 'Tiếp tục: {title} →',
  'welcome.myPark': 'Xem Công viên của tôi →',

  'path.subDone': 'bước nhỏ đã xong',
} satisfies Translation<typeof en>;
