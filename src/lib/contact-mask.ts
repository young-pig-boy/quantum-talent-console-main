/**
 * Contact information masking utilities.
 * Masks phone, email, and WeChat for display when user lacks permission.
 */

export function maskPhone(phone: string | null | undefined): string {
  if (!phone) return '—';
  const cleaned = phone.replace(/\s+/g, '');
  if (cleaned.length <= 4) return '****';
  return cleaned.slice(0, 3) + '****' + cleaned.slice(-2);
}

export function maskEmail(email: string | null | undefined): string {
  if (!email) return '—';
  const [local, domain] = email.split('@');
  if (!domain) return '****';
  const maskedLocal = local.length <= 2
    ? local[0] + '***'
    : local[0] + '***' + local[local.length - 1];
  return `${maskedLocal}@${domain}`;
}

export function maskWechat(wechat: string | null | undefined): string {
  if (!wechat) return '—';
  if (wechat.length <= 3) return '****';
  return wechat.slice(0, 2) + '****' + wechat.slice(-1);
}

/**
 * Mask all contact fields of a talent for display.
 */
export function maskTalentContact(talent: {
  phone?: string | null;
  email?: string | null;
  wechat?: string | null;
}): { phone: string; email: string; wechat: string } {
  return {
    phone: maskPhone(talent.phone),
    email: maskEmail(talent.email),
    wechat: maskWechat(talent.wechat),
  };
}
