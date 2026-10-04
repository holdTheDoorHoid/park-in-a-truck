// Tiếng Việt — tờ mời họp. Tờ mời nói với cả khu phố nên dùng "quý vị". Câu ngắn: in chữ lớn.
import type en from '../en/flyer.ts';
import type { Translation } from '../../define.ts';

export default {
  'eyebrow': 'Trân trọng kính mời quý vị',
  'headline': 'Họp cộng đồng: một công viên mới cho khu phố chúng ta',
  'when': 'Thời gian',
  'where': 'Địa điểm',
  'lot': 'Lô đất',
  'contact': 'Có câu hỏi? Xin liên lạc',
  'committee': 'Ban công viên của chúng tôi',
  'credit': 'Làm bằng cẩm nang Park in a Truck · Thomas Jefferson University',

  'ui.empty':
    'Hãy điền ngày, giờ, địa điểm và mục đích buổi họp ở trên (và thêm một thành viên ban công viên) để xem tờ mời dần thành hình.',
  'ui.noContact': 'Thêm một thành viên ban công viên ở trên để có người liên lạc ở đây.',
  'ui.print': '🖨 In tờ mời',
  'ui.language': 'Ngôn ngữ của tờ mời',
  'ui.second': 'Ngôn ngữ thứ hai, in song song',
  'ui.none': 'Không có',
  'ui.notReady': '{language} (chưa được dịch)',
  'ui.purpose2': 'Mục đích, bằng {language} (không bắt buộc)',
  'ui.purpose2Hint': 'Những gì bạn gõ ở trên sẽ được in nguyên văn; hãy thêm bản dịch ở đây cho cột thứ hai.',
} satisfies Translation<typeof en>;
