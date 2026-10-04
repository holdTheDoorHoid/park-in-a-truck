// Tiếng Việt — Park Patch (sổ tay thực hành Pollinator Planting Patch). Lời của PiaT, được dịch.
// Gọi người đọc là "bạn". Bảng thuật ngữ: docs/i18n/glossary.md
import type en from '../en/patch.ts';
import type { Translation } from '../../define.ts';

export default {
  'title': 'Park Patch',
  'description':
    'Lớn nhỏ không quan trọng — biến một ô đất 4x4, một khoảng sân trước hay một bồn hoa bên cửa sổ thành chỗ trồng cây cho loài thụ phấn với sổ tay thực hành Park Patch.',
  'lede':
    'Không có lô đất trống? Lớn nhỏ không quan trọng. Sổ tay thực hành Pollinator Planting Patch biến bất kỳ khoảng trống nào — một ô đất 4×4, một khoảng sân trước, thậm chí một bồn hoa bên cửa sổ — thành chỗ trồng cây bản địa cho loài thụ phấn, với cùng kiểu hướng dẫn từng bước như cho cả một công viên.',
  'originalPdf': '📄 Sổ tay thực hành gốc (PDF)',
  'printAnswers': '🖨 In câu trả lời của tôi',
  'intro':
    'Trồng cây bản địa cho loài thụ phấn mang lại rất nhiều lợi ích: giúp đất khỏe hơn và chống xói mòn, cho động vật hoang dã địa phương thức ăn và chỗ trú, mang lại vẻ đẹp riêng, sống khỏe trong khí hậu nơi bạn ở mà cần ít nước và ít hóa chất hơn, và giúp hệ sinh thái của khu phố đứng vững trước khí hậu đang thay đổi — trong khi lại cần ít chăm sóc hơn một luống trồng thông thường.',

  'yourArea.title': 'Khu trồng cây của bạn',
  'yourArea.text':
    'Hãy khảo sát khu vực bạn muốn trồng bằng bản vẽ nền từ bước Khảo sát, hoặc — nếu chưa có — ước chừng diện tích (feet vuông) bạn muốn dành để trồng cây.',
  'yourArea.lengthLabel': 'Mảnh đất của bạn dài bao nhiêu?',
  'yourArea.widthLabel': 'Mảnh đất của bạn rộng bao nhiêu?',
  'yourArea.sunLabel': 'Phần có nắng dài và rộng bao nhiêu?',
  'yourArea.shadeLabel': 'Phần có bóng râm dài và rộng bao nhiêu?',
  'yourArea.alt':
    'Sơ đồ lưới ô của một mảnh đất, có đánh dấu những điều kiện có sẵn — nhà và ống xả nước mưa của hàng xóm, một cây phong, một chỗ thỉnh thoảng bị ngập ướt, một cây sơn thù du và một cây táo dại, dây điện trên cao và một trụ nước cứu hỏa — cùng các khu trồng cây cho loài thụ phấn được đánh dấu ở chỗ có nắng và chỗ có bóng râm',

  'palette.title': 'Chọn một bộ cây trồng',
  'palette.text':
    'Dù bạn mơ một góc nhỏ ấm cúng với cỏ và hoa dại, hay một không gian xanh tốt với cây bụi và cây lớn, hãy chọn bộ cây hợp nhất với bạn và khu đất của bạn. (Đường chấm trong mỗi ví dụ là độ cao 6 feet, tức ngang tầm mắt — có ích nếu bạn muốn che một cảnh nhìn hay để nó thoáng.)',
  'palette.chooseLabel': 'Bộ cây nào hợp với khoảng đất của bạn?',
  'palette.alt': 'Bản vẽ trồng cây mẫu cho bộ cây {name}, có ghi chú khoảng cách trồng và cách trồng thành nhóm',
  'palette.plantListLabel': 'Danh sách cây cho mảnh vườn thụ phấn',
  'palette.plantListNote': 'Một bảng tính, mỗi bộ cây một thẻ — hãy tạo bản sao của riêng bạn để sửa',

  'palette.grasses-wildflowers.name': 'Cỏ & hoa dại',
  'palette.grasses-wildflowers.good': 'Khoảng đất nhỏ hơn, tăng đa dạng sinh học và hỗ trợ loài thụ phấn',
  'palette.grasses-wildflowers.why.sightlines': 'Không che tầm nhìn — thường cao dưới 3 feet, nên vẫn nhìn thông thoáng.',
  'palette.grasses-wildflowers.why.waterWise': 'Thay cho bãi cỏ mà tiết kiệm nước: ít nước, ít phân bón và ít cắt cỏ hơn.',
  'palette.grasses-wildflowers.why.buffet': 'Một bữa tiệc phấn hoa, mật hoa và hạt cho loài thụ phấn.',
  'palette.grasses-wildflowers.why.fullSun': 'Mọc tốt khi có nắng cả ngày.',
  'palette.grasses-wildflowers.why.color': 'Có màu sắc suốt mùa.',

  'palette.grasses-shrubs.name': 'Cỏ, hoa dại + cây bụi',
  'palette.grasses-shrubs.good': 'Che một cảnh khó coi và tạo thêm dáng nét, ít công chăm sóc hơn chỉ có cỏ và hoa dại',
  'palette.grasses-shrubs.why.screens': 'Che những cảnh khó coi.',
  'palette.grasses-shrubs.why.shelter': 'Thêm chỗ trú và "nhà hàng năm sao" cho loài thụ phấn.',
  'palette.grasses-shrubs.why.structure': 'Tạo thêm dáng nét và cao hơn một chút — phần lớn cây bụi cao dưới 4 feet.',
  'palette.grasses-shrubs.why.lowMaintenance':
    'Ít công chăm sóc hơn chỉ có cỏ và hoa dại; tỉa nhẹ vào năm thứ 3–4 là giữ được gọn gàng.',

  'palette.grasses-shrubs-trees.name': 'Cỏ, hoa dại, cây bụi + cây lớn',
  'palette.grasses-shrubs-trees.good': 'Một nơi sống trọn vẹn, vững vàng nhất quanh năm',
  'palette.grasses-shrubs-trees.why.habitat': 'Tạo một nơi sống trọn vẹn và một mái nhà ấm cúng cho động vật hoang dã.',
  'palette.grasses-shrubs-trees.why.resilience': 'Làm cho cả khu trồng cây vững vàng hơn nhiều.',
  'palette.grasses-shrubs-trees.why.sanctuary': 'Một chốn riêng tư sinh động quanh năm.',

  'palette.grasses-trees.name': 'Cỏ, hoa dại + cây lớn',
  'palette.grasses-trees.good': 'Một chút bóng râm mà bên dưới vẫn nhìn thông thoáng',
  'palette.grasses-trees.why.elegance': 'Cây bản địa mang nét đẹp riêng, hợp với vùng bạn ở.',
  'palette.grasses-trees.why.airQuality': 'Không khí trong lành hơn — cây hút chất ô nhiễm và nhả ra oxy.',
  'palette.grasses-trees.why.habitat': 'Nơi sống và thức ăn cho động vật hoang dã địa phương.',
  'palette.grasses-trees.why.carbon': 'Giữ lại khí carbon.',
  'palette.grasses-trees.why.shade':
    'Một chút bóng râm với thảm cây trồng bên dưới, mà vẫn nhìn thông thoáng khắp khu đất.',

  'notes.title': 'Ghi chú chung về trồng cây',
  'notes.groups': 'Trồng cỏ và hoa dại thành nhóm, mỗi nhóm ít nhất 4–5 cây, xếp hình tam giác cách nhau 24".',
  'notes.shrubs': 'Trồng cây bụi xếp hình tam giác cách nhau 48", ở những chỗ bạn muốn có chỗ trú hoặc muốn che một cảnh nhìn.',
  'notes.trees': "Trồng cây lớn ở giữa luống, cách nhau 15'.",
  'notes.mulch': 'Sau khi trồng, phủ 3" lớp phủ gốc (mulch) để ngăn cỏ dại.',
  'notes.sign': 'Cắm bảng tên cho cây để hàng xóm biết đang trồng gì (và đâu là cỏ dại).',
  'notes.callout':
    '[Cách nhổ cây lên khỏi đất ↗](https://www.youtube.com/watch?v=-5gk2yVAQtM) · [Cách trồng một cây lớn ↗](https://www.youtube.com/watch?v=RypqSrLZVlw) · [Cách xử lý cây bị rễ quấn chặt trong chậu ↗](https://www.youtube.com/watch?v=-5Wk_6fz4rc) (bằng tiếng Anh)',

  'maintenance.title': 'Chăm sóc',
  'maintenance.firstSeason': 'Mùa đầu tiên',
  'maintenance.waterItem': 'Tưới thật đẫm: tưới 1" nước mỗi tuần trong mùa đầu tiên.',
  'maintenance.weedItem': 'Nhận biết cỏ dại: cắm que đánh dấu những cây cỏ dại không mong muốn rồi nhổ bỏ.',
  'maintenance.secondSeason': 'Từ mùa thứ hai trở đi',
  'maintenance.consult.label': 'Hỏi ý kiến người có chuyên môn',
  'maintenance.consult.hint': 'Hỏi ý kiến một người làm vườn hoặc nhóm PiaT 2–3 lần mỗi năm',
  'maintenance.expand.label': 'Mở rộng nơi sống',
  'maintenance.expand.hint': 'Trồng thêm cây khi cần và chia sẻ cây dư với cộng đồng',
  'maintenance.arborist.label': 'Chuyên gia chăm sóc cây vào mùa đông',
  'maintenance.arborist.hint': 'Thuê một chuyên gia chăm sóc cây (arborist) vào mùa đông để cùng cộng đồng tỉa cây bụi và cây lớn',
  'maintenance.cutback.label': 'Cắt bớt cây lâu năm',
  'maintenance.cutback.hint': 'Cắt chừa ít nhất 3" trên mặt đất, trong khoảng từ 1 tháng 4 đến 1 tháng 5',
  'maintenance.replace.label': 'Thay cây sau mùa đông',
  'maintenance.replace.hint': 'Thay những cây không sống qua được mùa đông',
  'maintenance.leafMold.label': 'Lá mục',
  'maintenance.leafMold.hint': 'Chỉ rải ở những chỗ đất bị xới tung hoặc đất trống',
  'maintenance.spotWeed.label': 'Nhổ cỏ từng chỗ mỗi tháng',
  'maintenance.drought.label': 'Tưới khi hạn hán',
  'maintenance.drought.hint': 'Tưới nước trong những đợt hạn kéo dài — không mưa hơn 2 tuần',
  'maintenance.signs.label': 'Bảng thông tin',
  'maintenance.signs.hint': 'Đặt ở giữa mỗi nhóm cây hoặc dưới gốc cây lớn, có thông tin về cây/loài thụ phấn',
  'maintenance.sustainNote':
    'Xem bước Duy trì để có thêm mẹo chăm sóc cây trồng, dù bước đó viết cho cả một công viên. [Đến bước Duy trì →](/steps/sustain/)',

  'ready.title': 'Bạn đã sẵn sàng chưa?',
  'ready.text': 'Chúc mừng bạn đã hoàn thành sổ tay thực hành Trồng cây! Hãy đánh dấu từng bước bên dưới.',
  'ready.size.label': 'Kích thước luống',
  'ready.size.hint': 'Bạn biết sẽ trồng một khu rộng bao nhiêu, và chỗ đó có nắng hay bóng râm',
  'ready.plantChoice.label': 'Chọn cây trồng',
  'ready.plantChoice.hint': 'Bạn đã dùng công cụ tính số cây và danh sách cây',
  'ready.maintenance.label': 'Ghi chú chăm sóc',
  'ready.maintenance.hint': 'Bạn đã xem qua các ghi chú chăm sóc',
} satisfies Translation<typeof en>;
