/**
 * Tests for normalizePublicLocation()
 *
 * Run: npx tsx src/lib/domain/__tests__/public-location.test.ts
 */

import { normalizePublicLocation } from '../public-location';

let passed = 0;
let failed = 0;

function assert(input: string, expected: string, description?: string): void {
  const result = normalizePublicLocation(input);
  if (result === expected) {
    passed++;
    console.log(`  ✅ "${input}" → "${result}"`);
  } else {
    failed++;
    console.log(`  ❌ "${input}" → "${result}" (expected "${expected}")${description ? ` — ${description}` : ''}`);
  }
}

// ─── 北上广深 Normalization ───────────────────────────────────────────

console.log('\n=== 北京 Normalization ===');
assert('北京市海淀区', '北京');
assert('北京-海淀区', '北京');
assert('北京市朝阳区', '北京');
assert('北京', '北京');
assert('北京市', '北京');

console.log('\n=== 上海 Normalization ===');
assert('上海-杨浦区', '上海');
assert('上海市浦东新区', '上海');
assert('上海市杨浦区', '上海');
assert('上海', '上海');
assert('上海浦东', '上海');

console.log('\n=== 广州 Normalization ===');
assert('广州市天河区', '广州');
assert('广州-天河区', '广州');
assert('广州', '广州');

console.log('\n=== 深圳 Normalization ===');
assert('深圳市南山区', '深圳');
assert('深圳-南山区', '深圳');
assert('深圳', '深圳');

// ─── Other City → Province ────────────────────────────────────────────

console.log('\n=== Other City → Province ===');
assert('杭州市余杭区', '浙江');
assert('杭州', '浙江');
assert('宁波', '浙江');
assert('苏州', '江苏');
assert('南京', '江苏');
assert('无锡', '江苏');
assert('合肥', '安徽');
assert('芜湖', '安徽');
assert('成都', '四川');
assert('绵阳', '四川');
assert('西安', '陕西');
assert('武汉', '湖北');
assert('宜昌', '湖北');
assert('长沙', '湖南');
assert('厦门', '福建');
assert('福州', '福建');
assert('青岛', '山东');
assert('济南', '山东');
assert('郑州', '河南');
assert('哈尔滨', '黑龙江');
assert('长春', '吉林');
assert('沈阳', '辽宁');
assert('大连', '辽宁');
assert('昆明', '云南');
assert('贵阳', '贵州');
assert('南宁', '广西');
assert('海口', '海南');
assert('兰州', '甘肃');
assert('太原', '山西');
assert('南昌', '江西');
assert('石家庄', '河北');
assert('呼和浩特', '内蒙古');
assert('乌鲁木齐', '新疆');
assert('拉萨', '西藏');
assert('银川', '宁夏');
assert('西宁', '青海');

// ─── Province Suffix Normalization ────────────────────────────────────

console.log('\n=== Province Suffix Normalization ===');
assert('浙江省', '浙江');
assert('江苏省', '江苏');
assert('安徽省', '安徽');
assert('四川省', '四川');
assert('广东省', '广东');
assert('山东省', '山东');
assert('湖北省', '湖北');
assert('湖南省', '湖南');
assert('河南省', '河南');
assert('福建省', '福建');
assert('陕西省', '陕西');
assert('辽宁省', '辽宁');
assert('河北省', '河北');

// ─── Province names without suffix ────────────────────────────────────

console.log('\n=== Province Names (clean) ===');
assert('浙江', '浙江');
assert('江苏', '江苏');
assert('安徽', '安徽');
assert('四川', '四川');

// ─── Special Existing Data ────────────────────────────────────────────

console.log('\n=== Special Existing Data ===');
assert('上海/长三角', '上海');
assert('上海（工作地）；北京政府关系方向', '上海');
assert('上海（工作地）', '上海');

// ─── Passthrough / Unknown ────────────────────────────────────────────

console.log('\n=== Passthrough / Unknown ===');
assert('待确认', '待确认');
assert('全国', '全国');
assert('Remote', 'Remote');
assert('remote', 'remote');
assert('海外', '海外');
assert('不限', '不限');
assert('待定', '待定');

// ─── Edge Cases ───────────────────────────────────────────────────────

console.log('\n=== Edge Cases ===');
assert('', '');
assert('   ', '');
assert(null as unknown as string, '');
assert(undefined as unknown as string, '');
assert('  杭州  ', '浙江', 'trim whitespace');
assert('天津', '天津');
assert('重庆', '重庆');

// ─── Compound inputs ──────────────────────────────────────────────────

console.log('\n=== Compound Inputs ===');
assert('浙江杭州', '浙江', 'province+city without separator');
assert('江苏苏州', '江苏', 'province+city without separator');

// ─── Summary ──────────────────────────────────────────────────────────

console.log(`\n${'='.repeat(50)}`);
console.log(`Results: ${passed} passed, ${failed} failed, ${passed + failed} total`);
if (failed > 0) {
  console.log('❌ SOME TESTS FAILED');
  process.exit(1);
} else {
  console.log('✅ ALL TESTS PASSED');
}
