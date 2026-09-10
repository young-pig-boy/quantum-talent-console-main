/**
 * Public Location Normalizer
 *
 * Standardizes `job_publications.city` for public display:
 * - 北京/上海/广州/深圳 → keep city name
 * - Other Chinese cities → province name
 * - Province names → strip 省 suffix
 * - Unknown values → pass through cleaned
 *
 * Internal `jobs.city` is NOT normalized (猎头需要精确信息).
 */

/**
 * Comprehensive mapping of Chinese prefecture-level cities to their provinces.
 * Covers all mainland China prefecture-level cities plus HK/MO.
 */
const CITY_TO_PROVINCE: Record<string, string> = {
  // ── 直辖市 (handled by TIER1_CITIES, but included for completeness) ──
  // 北京 / 上海 / 天津 / 重庆 → see TIER1_CITIES + DIRECT_MUNICIPALITIES

  // ── 安徽 Anhui ──
  合肥: '安徽',
  芜湖: '安徽',
  蚌埠: '安徽',
  淮南: '安徽',
  马鞍山: '安徽',
  淮北: '安徽',
  铜陵: '安徽',
  安庆: '安徽',
  黄山: '安徽',
  滁州: '安徽',
  阜阳: '安徽',
  宿州: '安徽',
  六安: '安徽',
  亳州: '安徽',
  池州: '安徽',
  宣城: '安徽',

  // ── 福建 Fujian ──
  福州: '福建',
  厦门: '福建',
  莆田: '福建',
  三明: '福建',
  泉州: '福建',
  漳州: '福建',
  南平: '福建',
  龙岩: '福建',
  宁德: '福建',

  // ── 甘肃 Gansu ──
  兰州: '甘肃',
  嘉峪关: '甘肃',
  金昌: '甘肃',
  白银: '甘肃',
  天水: '甘肃',
  武威: '甘肃',
  张掖: '甘肃',
  平凉: '甘肃',
  酒泉: '甘肃',
  庆阳: '甘肃',
  定西: '甘肃',
  陇南: '甘肃',

  // ── 广东 Guangdong ──
  广州: '广东', // also TIER1
  深圳: '广东', // also TIER1
  珠海: '广东',
  汕头: '广东',
  佛山: '广东',
  韶关: '广东',
  湛江: '广东',
  肇庆: '广东',
  江门: '广东',
  茂名: '广东',
  惠州: '广东',
  梅州: '广东',
  汕尾: '广东',
  河源: '广东',
  阳江: '广东',
  清远: '广东',
  东莞: '广东',
  中山: '广东',
  潮州: '广东',
  揭阳: '广东',
  云浮: '广东',

  // ── 广西 Guangxi ──
  南宁: '广西',
  柳州: '广西',
  桂林: '广西',
  梧州: '广西',
  北海: '广西',
  防城港: '广西',
  钦州: '广西',
  贵港: '广西',
  玉林: '广西',
  百色: '广西',
  贺州: '广西',
  河池: '广西',
  来宾: '广西',
  崇左: '广西',

  // ── 贵州 Guizhou ──
  贵阳: '贵州',
  六盘水: '贵州',
  遵义: '贵州',
  安顺: '贵州',
  毕节: '贵州',
  铜仁: '贵州',

  // ── 海南 Hainan ──
  海口: '海南',
  三亚: '海南',
  儋州: '海南',

  // ── 河北 Hebei ──
  石家庄: '河北',
  唐山: '河北',
  秦皇岛: '河北',
  邯郸: '河北',
  邢台: '河北',
  保定: '河北',
  张家口: '河北',
  承德: '河北',
  沧州: '河北',
  廊坊: '河北',
  衡水: '河北',
  雄安: '河北',

  // ── 河南 Henan ──
  郑州: '河南',
  开封: '河南',
  洛阳: '河南',
  平顶山: '河南',
  安阳: '河南',
  鹤壁: '河南',
  新乡: '河南',
  焦作: '河南',
  濮阳: '河南',
  许昌: '河南',
  漯河: '河南',
  三门峡: '河南',
  南阳: '河南',
  商丘: '河南',
  信阳: '河南',
  周口: '河南',
  驻马店: '河南',

  // ── 黑龙江 Heilongjiang ──
  哈尔滨: '黑龙江',
  齐齐哈尔: '黑龙江',
  牡丹江: '黑龙江',
  佳木斯: '黑龙江',
  大庆: '黑龙江',
  鸡西: '黑龙江',
  双鸭山: '黑龙江',
  伊春: '黑龙江',
  七台河: '黑龙江',
  鹤岗: '黑龙江',
  黑河: '黑龙江',
  绥化: '黑龙江',

  // ── 湖北 Hubei ──
  武汉: '湖北',
  黄石: '湖北',
  十堰: '湖北',
  宜昌: '湖北',
  襄阳: '湖北',
  鄂州: '湖北',
  荆门: '湖北',
  孝感: '湖北',
  荆州: '湖北',
  黄冈: '湖北',
  咸宁: '湖北',
  随州: '湖北',

  // ── 湖南 Hunan ──
  长沙: '湖南',
  株洲: '湖南',
  湘潭: '湖南',
  衡阳: '湖南',
  邵阳: '湖南',
  岳阳: '湖南',
  常德: '湖南',
  张家界: '湖南',
  益阳: '湖南',
  郴州: '湖南',
  永州: '湖南',
  怀化: '湖南',
  娄底: '湖南',

  // ── 吉林 Jilin ──
  长春: '吉林',
  四平: '吉林',
  辽源: '吉林',
  通化: '吉林',
  白山: '吉林',
  松原: '吉林',
  白城: '吉林',

  // ── 江苏 Jiangsu ──
  南京: '江苏',
  无锡: '江苏',
  徐州: '江苏',
  常州: '江苏',
  苏州: '江苏',
  南通: '江苏',
  连云港: '江苏',
  淮安: '江苏',
  盐城: '江苏',
  扬州: '江苏',
  镇江: '江苏',
  泰州: '江苏',
  宿迁: '江苏',

  // ── 江西 Jiangxi ──
  南昌: '江西',
  景德镇: '江西',
  萍乡: '江西',
  九江: '江西',
  新余: '江西',
  鹰潭: '江西',
  赣州: '江西',
  吉安: '江西',
  宜春: '江西',
  抚州: '江西',
  上饶: '江西',

  // ── 辽宁 Liaoning ──
  沈阳: '辽宁',
  大连: '辽宁',
  鞍山: '辽宁',
  抚顺: '辽宁',
  本溪: '辽宁',
  丹东: '辽宁',
  锦州: '辽宁',
  营口: '辽宁',
  阜新: '辽宁',
  辽阳: '辽宁',
  盘锦: '辽宁',
  铁岭: '辽宁',
  朝阳: '辽宁',
  葫芦岛: '辽宁',

  // ── 内蒙古 Inner Mongolia ──
  呼和浩特: '内蒙古',
  包头: '内蒙古',
  乌海: '内蒙古',
  赤峰: '内蒙古',
  通辽: '内蒙古',
  鄂尔多斯: '内蒙古',
  呼伦贝尔: '内蒙古',
  巴彦淖尔: '内蒙古',
  乌兰察布: '内蒙古',

  // ── 宁夏 Ningxia ──
  银川: '宁夏',
  石嘴山: '宁夏',
  吴忠: '宁夏',
  固原: '宁夏',
  中卫: '宁夏',

  // ── 青海 Qinghai ──
  西宁: '青海',
  海东: '青海',

  // ── 山东 Shandong ──
  济南: '山东',
  青岛: '山东',
  淄博: '山东',
  枣庄: '山东',
  东营: '山东',
  烟台: '山东',
  潍坊: '山东',
  济宁: '山东',
  泰安: '山东',
  威海: '山东',
  日照: '山东',
  临沂: '山东',
  德州: '山东',
  聊城: '山东',
  滨州: '山东',
  菏泽: '山东',

  // ── 山西 Shanxi ──
  太原: '山西',
  大同: '山西',
  阳泉: '山西',
  长治: '山西',
  晋城: '山西',
  朔州: '山西',
  晋中: '山西',
  运城: '山西',
  忻州: '山西',
  临汾: '山西',
  吕梁: '山西',

  // ── 陕西 Shaanxi ──
  西安: '陕西',
  铜川: '陕西',
  宝鸡: '陕西',
  咸阳: '陕西',
  渭南: '陕西',
  延安: '陕西',
  汉中: '陕西',
  榆林: '陕西',
  安康: '陕西',
  商洛: '陕西',

  // ── 四川 Sichuan ──
  成都: '四川',
  自贡: '四川',
  攀枝花: '四川',
  泸州: '四川',
  德阳: '四川',
  绵阳: '四川',
  广元: '四川',
  遂宁: '四川',
  内江: '四川',
  乐山: '四川',
  南充: '四川',
  眉山: '四川',
  宜宾: '四川',
  广安: '四川',
  达州: '四川',
  雅安: '四川',
  巴中: '四川',
  资阳: '四川',

  // ── 西藏 Tibet ──
  拉萨: '西藏',
  日喀则: '西藏',
  昌都: '西藏',
  林芝: '西藏',
  山南: '西藏',

  // ── 新疆 Xinjiang ──
  乌鲁木齐: '新疆',
  克拉玛依: '新疆',
  吐鲁番: '新疆',
  哈密: '新疆',
  库尔勒: '新疆',
  阿克苏: '新疆',
  喀什: '新疆',
  和田: '新疆',
  伊宁: '新疆',
  塔城: '新疆',
  阿勒泰: '新疆',

  // ── 云南 Yunnan ──
  昆明: '云南',
  曲靖: '云南',
  玉溪: '云南',
  保山: '云南',
  昭通: '云南',
  丽江: '云南',
  普洱: '云南',
  临沧: '云南',
  大理: '云南',
  红河: '云南',

  // ── 浙江 Zhejiang ──
  杭州: '浙江',
  宁波: '浙江',
  温州: '浙江',
  嘉兴: '浙江',
  湖州: '浙江',
  绍兴: '浙江',
  金华: '浙江',
  衢州: '浙江',
  舟山: '浙江',
  台州: '浙江',
  丽水: '浙江',

  // ── 天津 Tianjin (直辖市) ──
  天津: '天津',

  // ── 重庆 Chongqing (直辖市) ──
  重庆: '重庆',
};

/** 北上广深 — always return city name regardless of district suffix */
const TIER1_CITIES = ['北京', '上海', '广州', '深圳'] as const;

/** All known province names (without 省 suffix) */
const ALL_PROVINCES = new Set<string>([
  '北京', '上海', '天津', '重庆',
  '河北', '山西', '辽宁', '吉林', '黑龙江',
  '江苏', '浙江', '安徽', '福建', '江西', '山东',
  '河南', '湖北', '湖南', '广东', '海南',
  '四川', '贵州', '云南', '陕西', '甘肃', '青海',
  '内蒙古', '广西', '西藏', '宁夏', '新疆',
  '香港', '澳门', '台湾',
]);

/** Values that should pass through without normalization */
const PASSTHROUGH_VALUES = new Set([
  '待确认', '全国', 'remote', '海外', '不限', '待定',
]);

/**
 * Normalize a raw location string for public display in `job_publications.city`.
 *
 * Rules:
 * - 北上广深 + any district → city name (e.g. "上海-杨浦区" → "上海")
 * - Other cities → province (e.g. "杭州市余杭区" → "浙江")
 * - Province names → strip suffix (e.g. "浙江省" → "浙江")
 * - Unknown → cleaned original value
 */
export function normalizePublicLocation(rawLocation?: string | null): string {
  if (!rawLocation) return '';

  // Step 1: Basic cleanup — trim, collapse whitespace
  let cleaned = rawLocation
    .trim()
    .replace(/[\u3000\u00a0]/g, ' ')   // fullwidth / nbsp → space
    .replace(/\s+/g, ' ')               // collapse multiple spaces
    .trim();

  if (!cleaned) return '';

  // Step 2: Passthrough check (case-insensitive)
  if (PASSTHROUGH_VALUES.has(cleaned.toLowerCase())) {
    return cleaned;
  }

  // Step 3: Strip parenthetical annotations — （工作地）, (base) etc.
  cleaned = cleaned.replace(/[（(][^）)]*[）)]/g, '').trim();
  if (!cleaned) return rawLocation.trim();

  // Step 4: Take the primary location segment.
  // Split on separators: ； 、 / and dash (but not inside known names like 乌鲁木齐)
  const primary = cleaned.split(/[；、\/]/)[0]
    .split(/[-—–]/)[0]
    .trim();
  if (!primary) return cleaned;

  // Step 5: 北上广深 — match city name at start, ignore any district suffix
  for (const city of TIER1_CITIES) {
    if (primary === city || primary.startsWith(city + '市') || primary.startsWith(city + '区') || primary.startsWith(city + '-')) {
      return city;
    }
    // Also match patterns like 北京市海淀区, 上海浦东 (no separator)
    const tier1Re = new RegExp(`^${city}[市区县]`);
    if (tier1Re.test(primary)) return city;
    // Match city name followed by any Chinese chars (district name)
    const tier1Broad = new RegExp(`^${city}[\\u4e00-\\u9fff]`);
    if (tier1Broad.test(primary)) return city;
    if (primary === city) return city;
  }

  // Step 6: Extract city name before 市 (e.g. 杭州市余杭区 → 杭州)
  const cityMarkerIdx = primary.indexOf('市');
  if (cityMarkerIdx > 0) {
    const cityName = primary.substring(0, cityMarkerIdx);
    if (CITY_TO_PROVINCE[cityName]) {
      return CITY_TO_PROVINCE[cityName];
    }
  }

  // Step 7: Direct city lookup (e.g. 杭州, 成都, 苏州)
  if (CITY_TO_PROVINCE[primary]) {
    return CITY_TO_PROVINCE[primary];
  }

  // Step 8: Strip 省 suffix (e.g. 浙江省 → 浙江)
  if (primary.endsWith('省')) {
    const provinceName = primary.slice(0, -1);
    if (ALL_PROVINCES.has(provinceName)) {
      return provinceName;
    }
  }

  // Step 9: Check if it's already a clean province name
  if (ALL_PROVINCES.has(primary)) {
    return primary;
  }

  // Step 10: Strip trailing administrative suffixes and retry
  const stripped = primary.replace(/[市省区县县镇乡]$/, '');
  if (stripped && stripped !== primary) {
    if (CITY_TO_PROVINCE[stripped]) return CITY_TO_PROVINCE[stripped];
    if (ALL_PROVINCES.has(stripped)) return stripped;
  }

  // Step 11: Fallback — check if input starts with a known city name
  // Handles "浙江杭州" or "江苏苏州" style inputs without separators
  for (const cityName of Object.keys(CITY_TO_PROVINCE)) {
    if (primary.startsWith(cityName) && primary.length > cityName.length) {
      return CITY_TO_PROVINCE[cityName];
    }
  }

  // Step 12: Fallback — check if input starts with a known province name
  for (const province of ALL_PROVINCES) {
    if (primary.startsWith(province) && primary.length > province.length) {
      return province;
    }
  }

  // Step 13: Unknown — return cleaned primary segment
  return primary;
}
