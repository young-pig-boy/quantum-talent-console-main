/**
 * 量子赛道 Source of Truth
 *
 * 这是"岗位赛道归类"的唯一权威配置。所有引用 track 的地方
 * （Publication Form / Validation / API types / 列表筛选 / Badge / Display）
 * 都必须从这里取值，禁止在页面或 schema 中硬编码另一套名称。
 *
 * 四大赛道沿用 Showcase 现有定义（2026.8.14 PRD）：
 *   superconducting / ion-trap / photonics / communication-sensing
 *
 * value 为持久化到 job_publications.track 的 canonical slug；
 * label 为控制台展示的中文名。
 *
 * 注意：并非所有岗位都必须归入四大赛道。
 * 中性原子、量子软件、AI for Quantum、IR/GR、品牌公关等岗位
 * 若无法自然归入四大赛道，应允许 track = null，
 * 具体专业方向通过 direction / tags 表达。
 */
export const QUANTUM_TRACKS = [
  { value: 'superconducting', label: '超导量子' },
  { value: 'ion-trap', label: '离子阱' },
  { value: 'photonics', label: '光量子' },
  { value: 'communication-sensing', label: '量子通信与测量' },
] as const;

export type QuantumTrack = (typeof QUANTUM_TRACKS)[number];
export type QuantumTrackValue = QuantumTrack['value'];

/** 允许写入 DB 的四大赛道 value 集合（供 Zod enum 使用）。 */
export const QUANTUM_TRACK_VALUES = QUANTUM_TRACKS.map((t) => t.value) as [
  QuantumTrackValue,
  ...QuantumTrackValue[],
];

export function isQuantumTrack(value: string | null | undefined): value is QuantumTrackValue {
  return QUANTUM_TRACKS.some((t) => t.value === value);
}

export function getQuantumTrackLabel(
  value: string | null | undefined
): string {
  if (!value) return '';
  const found = QUANTUM_TRACKS.find((t) => t.value === value);
  return found ? found.label : '';
}

/**
 * 判断一个 track 值是否属于"明显不属于四大赛道的脏值"。
 * null / undefined / '' 视为未选择（不是脏值），其余非四大赛道值均为脏值。
 */
export function isDirtyTrack(value: string | null | undefined): boolean {
  if (!value) return false;
  return !isQuantumTrack(value);
}
