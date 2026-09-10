'use server';

/**
 * Supabase Auth login for Team Lead and Internal Consultant.
 * Uses Supabase SSR to create a session and set cookies.
 */

import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { getSupabaseAdminUntyped } from '@/lib/supabase/admin';

export async function supabaseLogin(
  email: string,
  password: string,
): Promise<{ error?: string } | undefined> {
  if (!email || !password) {
    return { error: '请输入邮箱和密码' };
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    return { error: '系统配置错误：缺少 Supabase 连接信息' };
  }

  const cookieStore = await cookies();

  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options),
          );
        } catch {
          // setAll can be called from Server Components where cookies
          // cannot be set. This is expected when called from a Server Action.
        }
      },
    },
  });

  // Sign in with email/password
  const { error: authError } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (authError) {
    return { error: '邮箱或密码错误' };
  }

  // Verify the user has an active profile
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return { error: '登录失败，请重试' };
  }

  // Check profile exists and is active
  const adminClient = getSupabaseAdminUntyped();
  const { data: profile } = await adminClient
    .from('profiles')
    .select('id, role, status')
    .eq('id', user.id)
    .single();

  if (!profile) {
    // Sign out since profile doesn't exist
    await supabase.auth.signOut();
    return { error: '账号不存在，请联系管理员' };
  }

  if (profile.status !== 'active') {
    await supabase.auth.signOut();
    return { error: '账号已被停用，请联系管理员' };
  }

  // Only allow team_lead and internal_consultant through this path
  // super_admin should use the break-glass login
  if (profile.role === 'super_admin') {
    await supabase.auth.signOut();
    return { error: '超级管理员请使用专用登录入口' };
  }

  return undefined; // Success
}
