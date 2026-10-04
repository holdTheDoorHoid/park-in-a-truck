// Tiếng Việt — các trang hướng dẫn lắp ráp. Nội dung từng hướng dẫn nằm ở
// src/i18n/data/vi/guides/<slug>.json. Bảng thuật ngữ: docs/i18n/glossary.md
import type en from '../en/guides.ts';
import type { Translation } from '../../define.ts';

export default {
  'cat.seating': 'Chỗ ngồi',
  'cat.tables': 'Bàn & mặt bàn làm việc',
  'cat.planters': 'Bồn trồng cây',
  'cat.structures': 'Công trình',

  'crumb': 'Hướng dẫn lắp ráp',
  'heroAlt': '{title}, đã lắp xong',
  'dims': 'dài {length} × rộng {width} × cao {height}',
  'glance.size': 'Kích thước',
  'glance.time': 'Thời gian',
  'glance.people': 'Số người',
  'glance.skill': 'Tay nghề',
  'glance.cost': 'Chi phí',
  'asBuilt': 'Lắp từ các phần này, thành phẩm có kích thước {size}.',
  'pdf': 'PDF gốc',
  'print': '🖨 In',

  'need': 'Những thứ bạn cần',
  'materials': 'Vật liệu & đồ ngũ kim',
  'tools': 'Dụng cụ',
  'cut': 'Danh sách cắt gỗ',
  'cut.part': 'Phần',
  'cut.qty': 'SL',
  'cut.stock': 'Gỗ',
  'cut.length': 'Chiều dài',
  'cut.notes': 'Ghi chú',
  'siteNote': 'Ghi chú của trang web này, không phải của Park in a Truck:',
  'steps': 'Các bước',
  'step': 'Bước {n}',
  'model': 'Mô hình 3D: {title}',
  'finishing': 'Hoàn thiện',
  'safety': 'Trước khi bắt đầu',
  'links': 'Nhà cung cấp & liên kết hữu ích',
  'source': 'Nguồn: {pages}',
  'download': 'Tải PDF {title}',
  'pager': 'Hướng dẫn',
  'close': 'Đóng',
  'notTranslated': 'Hướng dẫn này chưa được dịch, nên đang hiện bằng tiếng Anh.',

  'index.description':
    'Hướng dẫn lắp ráp từng bước, kiểu Ikea, cho ghế dài, bàn, bồn trồng cây, ghế rọ đá (gabion), mái che nắng và sân khấu của Park in a Truck.',
  'index.lede':
    'Giờ là lúc xem các món đồ trong công viên được làm ra sao. Một số món có hướng dẫn riêng, hay bản lắp ráp — hướng dẫn từng bước giúp bạn tự làm. Ví dụ, một chiếc ghế dài đi kèm một bộ hướng dẫn lắp ráp kiểu Ikea. Những món khác đi kèm một bản thiết kế hoặc một cách làm được gợi ý từ những hướng dẫn đã được thử trước. Còn một số món chỉ đơn giản là hàng mua sẵn.',
  'index.prose':
    'Dưới đây là mười ba món mà Park in a Truck có hướng dẫn lắp ráp riêng. Chọn một món để xem đầy đủ danh sách vật liệu, danh sách cắt gỗ và các bước có đánh số kèm hình vẽ gốc — hoặc tải PDF gốc. Đánh dấu vật liệu và dụng cụ khi bạn gom đủ; dấu đánh của bạn được lưu trong trình duyệt này.',
} satisfies Translation<typeof en>;
