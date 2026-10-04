// Tiếng Việt — phần chữ do script của trang Công viên của tôi viết ra. Bảng thuật ngữ: docs/i18n/glossary.md
import type en from '../en/mypark.ts';
import type { Translation } from '../../define.ts';

export default {
  'project.newDefault': 'Công viên mới',
  'list.openNow': '(đang mở)',
  'list.open': 'Mở',
  'list.delete': 'Xóa',
  'list.deleteLabel': 'Xóa {name}',
  'delete.confirm': 'Xóa “{name}” khỏi trình duyệt này? Không thể lấy lại, trừ khi bạn đã lưu một tệp dự án.',
  'delete.done': 'Đã xóa {name}.',
  'import.opened': 'Đã mở “{name}”. Đây là dự án bạn đang làm.',
  'import.notProject': 'Đây không phải tệp dự án Park in a Truck.',

  'lot.address': 'Địa chỉ',
  'lot.owner': 'Chủ sở hữu',
  'lot.size': 'Diện tích lô đất',
  'lot.zoning': 'Phân vùng (zoning)',
  'lot.ownerLine': '{owner} — {kind}',
  'lot.measured': '{width} × {length} · {area} (đo từ đường ranh thửa đất của Thành phố)',
  'lot.record': '{frontage} × {depth} ft · {area} (hồ sơ bất động sản của Thành phố)',
  'lot.recordNoArea': '{frontage} × {depth} ft (hồ sơ bất động sản của Thành phố)',
  'lot.none': 'Chưa chọn lô đất nào. Hãy tra một lô ở <a href="{href}">Bước 1: Có được đất</a>.',
  'answers.none': 'Chưa điền gì cả.',
} satisfies Translation<typeof en>;
