import type { User } from '~/types';

interface AuthResponse {
  user: User;
  accessToken: string;
}

export function useAuth() {
  const profile = useState<User | null>('auth.user', () => null);
  const accessToken = useCookie<string | null>('accessToken', {
    default: () => null,
    maxAge: 60 * 15, // 15 minutes
    sameSite: 'lax',
    secure: false, // Will be true in production with HTTPS
    path: '/',
  });

  const config = useRuntimeConfig();

  async function login(email: string, password: string): Promise<AuthResponse> {
    const res = await $fetch<AuthResponse>(`${config.public.apiBase}/auth/login`, {
      method: 'POST',
      credentials: 'include',
      body: { email, password },
    });

    accessToken.value = res.accessToken;
    profile.value = res.user;

    return res;
  }

  async function signup(prenom: string, nom: string, email: string, password: string, typeCompte: string): Promise<AuthResponse> {
    const res = await $fetch<AuthResponse>(`${config.public.apiBase}/auth/signup`, {
      method: 'POST',
      credentials: 'include',
      body: { prenom, nom, email, password, typeCompte },
    });

    accessToken.value = res.accessToken;
    profile.value = res.user;

    return res;
  }

  async function refreshSession(): Promise<boolean> {
    try {
      const res = await $fetch<{ accessToken: string }>(`${config.public.apiBase}/auth/refresh`, {
        method: 'POST',
        credentials: 'include',
      });

      accessToken.value = res.accessToken;
      return true;
    } catch {
      accessToken.value = null;
      profile.value = null;
      return false;
    }
  }

  async function initAuth(): Promise<boolean> {
    if (accessToken.value) {
      try {
        await fetchProfile();
        return true;
      } catch {
        return refreshSession();
      }
    }

    return refreshSession();
  }

  async function logout() {
    try {
      if (accessToken.value) {
        await $fetch(`${config.public.apiBase}/auth/logout`, {
          method: 'POST',
          credentials: 'include',
          headers: { Authorization: `Bearer ${accessToken.value}` },
        });
      }
    } catch {
      // ignore logout errors and still clear local state
    }

    accessToken.value = null;
    profile.value = null;
  }

  async function fetchProfile(): Promise<User> {
    if (!accessToken.value) {
      const refreshed = await refreshSession();
      if (!refreshed) {
        throw new Error('No active session');
      }
    }

    const fetchProfileRequest = () =>
      $fetch<User>(`${config.public.apiBase}/auth/me`, {
        credentials: 'include',
        headers: { Authorization: `Bearer ${accessToken.value}` },
      });

    try {
      const res = await fetchProfileRequest();
      profile.value = res;
      return res;
    } catch (error: any) {
      if (error?.response?.status !== 401) {
        throw error;
      }

      const refreshed = await refreshSession();
      if (!refreshed) {
        throw error;
      }

      const res = await fetchProfileRequest();
      profile.value = res;
      return res;
    }
  }

  return {
    profile,
    accessToken,
    login,
    signup,
    logout,
    refreshSession,
    initAuth,
    fetchProfile,
  };
}
