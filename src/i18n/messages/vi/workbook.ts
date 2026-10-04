// Tiếng Việt — các thành phần của sổ tay thực hành. Bảng thuật ngữ: docs/i18n/glossary.md
import type en from '../en/workbook.ts';
import type { Translation } from '../../define.ts';

export default {
  'project.default': 'Công viên của tôi',

  'callout.tip': 'Mẹo',
  'callout.note': 'Ghi chú',
  'callout.warning': 'Lưu ý',
  'callout.contact': 'Nhờ giúp đỡ',
  'callout.auto': 'Đã làm sẵn cho bạn',
  'callout.site': 'Ghi chú của trang web này, không phải của Park in a Truck',

  'field.choose': 'Chọn…',
  'field.auto': '✓ Điền sẵn từ hồ sơ của Thành phố — gõ để thay đổi',
  'list.noscript': 'Hãy bật JavaScript để điền bảng này, hoặc in trang gốc của sổ tay thực hành.',
  'list.row': 'dòng',
  'list.add': '+ Thêm {row}',
  'list.fillFirst': 'Hãy điền {row} ở trên trước, hoặc ghi thêm gì đó vào đó.',
  'list.remove': 'Xóa',
  'list.removeRow': 'Xóa dòng {n}',
  'list.removed': 'Đã xóa {row}.',
  'list.cell': '{label}, dòng {n}',

  'done.mark': 'Đánh dấu bước này đã xong',
  'done.done': 'Xong rồi — làm tốt lắm!',
  'done.badge': '✓ xong',
  'progress.of': '{done} / {total}',
  'progress.done': 'Đã xong {done} / {total}',
  'progress.total': 'Đã xong {done} / {total} bước',

  'pdf.label': 'Trang gốc của sổ tay thực hành',
  'pdf.page': '(trang {page} của PDF)',
  'file.english': 'bằng tiếng Anh',
  'figure.credit': 'Hình: {credit}',

  'chapter.pdf': '📄 Sổ tay thực hành gốc (PDF)',
  'chapter.print': '🖨 In câu trả lời của tôi',
  'chapter.toc': 'Trong bước này',
  'chapter.pager': 'Các bước',
  'chapter.prev': '← {title}',
  'chapter.prevStep': '← Bước {n}: {title}',
  'chapter.next': 'Tiếp theo: Bước {n} — {title} →',
  'chapter.notTranslated':
    'Chương này chưa được dịch, nên đang hiện bằng tiếng Anh. Câu trả lời của bạn được lưu giống nhau ở mọi ngôn ngữ.',

  'notice.title': 'Ghi chú của trang web',
  'notice.lot':
    'Bạn chưa ghi lại giấy phép dùng lô đất — bạn sẽ cần nó trước khi bất kỳ ai bắt đầu đào đất. <a href="{href}">Đến bước Có được đất → Giữ chắc lô đất của bạn</a>.',
  'notice.dismiss': 'Đóng',

  'auto.owner.city': 'Thành phố Philadelphia (công)',
  'auto.owner.landbank': 'Philadelphia Land Bank (công)',
  'auto.owner.pha': 'Cơ quan Gia cư Philadelphia, PHA (công)',
  'auto.owner.redevelopment': 'Cơ quan Tái phát triển Philadelphia (công)',
  'auto.owner.other-public': 'Một cơ quan công khác',
  'auto.owner.private': 'Chủ tư nhân (cá nhân, tổ chức hoặc doanh nghiệp)',
  'auto.owner.unknown': 'Không rõ',
  'auto.lot.mid-block': 'Lô đất giữa dãy nhà',
  'auto.lot.corner': 'Lô đất góc đường',
  'auto.lot.alley': 'Lối đi xuyên khối nhà / hẻm / lối đi chung',
  'auto.lot.unknown': 'Không chắc',
  'auto.sun.full-sun': 'Nắng cả ngày',
  'auto.sun.mostly-sun': 'Phần lớn có nắng',
  'auto.sun.mostly-shade': 'Phần lớn có bóng râm',
  'auto.sun.deep-shade': 'Bóng râm dày cả ngày',
  'auto.kind.interior': 'Lô đất giữa dãy nhà',
  'auto.kind.corner-right': 'Lô đất góc đường (đường bên phải)',
  'auto.kind.corner-left': 'Lô đất góc đường (đường bên trái)',
  'auto.trees.none': 'Không có cây',
  'auto.trees.few': 'Một hoặc hai cây',
  'auto.trees.several': 'Nhiều cây',
  'auto.yes': 'Có',
  'auto.no': 'Không',
  'auto.sqft': '{n} ft²',
  'auto.ft': '{n} ft',
  'auto.size': 'Cỡ {size}',
} satisfies Translation<typeof en>;
