/**
 * 统一格式化工具
 * - 日期 / 相对时间
 * - 数字
 * - 阶段状态标签（集中管理，避免散落在各页面）
 */

export function formatDate(value: string | Date | null | undefined): string {
  if (!value) return '-';
  const d = typeof value === 'string' ? new Date(value) : value;
  if (Number.isNaN(d.getTime())) return '-';
  return d.toLocaleDateString('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit' });
}

export function formatDateTime(value: string | Date | null | undefined): string {
  if (!value) return '-';
  const d = typeof value === 'string' ? new Date(value) : value;
  if (Number.isNaN(d.getTime())) return '-';
  return d.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function formatRelative(value: string | Date | null | undefined): string {
  if (!value) return '-';
  const d = typeof value === 'string' ? new Date(value) : value;
  if (Number.isNaN(d.getTime())) return '-';
  const now = new Date();
  const diff = now.getTime() - d.getTime();
  const abs = Math.abs(diff);
  const suffix = diff > 0 ? '前' : '后';

  const minutes = Math.floor(abs / 60000);
  if (minutes < 1) return `刚刚`;
  if (minutes < 60) return `${minutes}分钟${suffix}`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}小时${suffix}`;

  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}天${suffix}`;

  const months = Math.floor(days / 30);
  if (months < 12) return `${months}个月${suffix}`;

  const years = Math.floor(months / 12);
  return `${years}年${suffix}`;
}

export function formatNumber(value: number | string | null | undefined): string {
  if (value === null || value === undefined || value === '') return '-';
  const n = typeof value === 'string' ? Number(value) : value;
  if (Number.isNaN(n)) return '-';
  return n.toLocaleString('zh-CN');
}

export function formatPhone(phone: string | null | undefined): string {
  if (!phone) return '-';
  // 中国大陆手机号：xxx xxxx xxxx
  const s = phone.replace(/\s+/g, '');
  if (/^1\d{10}$/.test(s)) {
    return `${s.slice(0, 3)} ${s.slice(3, 7)} ${s.slice(7)}`;
  }
  return phone;
}

export function truncate(text: string | null | undefined, max = 80): string {
  if (!text) return '';
  return text.length > max ? `${text.slice(0, max)}…` : text;
}
