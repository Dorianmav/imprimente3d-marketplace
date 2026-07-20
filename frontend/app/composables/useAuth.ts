interface User {
  id: string;
  email: string;
  nom: string;
  prenom: string;
  typeCompte: 'particulier' | 'pro';
}

interface AuthResponse {
  user: User;
  accessToken: string;
}

export function useAuth() {
  const user = useState<User | null>('auth.user', () => null);
  const accessToken = useCookie<string | null>('accessToken', {
    default: () => null,
    maxAge: 60 * 15,
    sameSite: 'lax',
  });

  const config = useRuntimeConfig();

  async function login(email: string, password: string) {
    const res = await $fetch<AuthResponse>(`${config.public.apiBase}/auth/login`, {
      method: 'POST',
      credentials: 'include',
      body: { email, password },
    });

    accessToken.value = res.accessToken;
    user.value = res.user;

    return res;
  }

  async function signup(prenom: string, nom: string, email: string, password: string, typeCompte: string) {
    const res = await $fetch<AuthResponse>(`${config.public.apiBase}/auth/signup`, {
      method: 'POST',
      credentials: 'include',
      body: { prenom, nom, email, password, typeCompte },
    });

    accessToken.value = res.accessToken;
    user.value = res.user;

    return res;
  }

  async function refreshSession() {
    try {
      const res = await $fetch<{ accessToken: string }>(`${config.public.apiBase}/auth/refresh`, {
        method: 'POST',
        credentials: 'include',
      });

      accessToken.value = res.accessToken;
      return true;
    } catch {
      accessToken.value = null;
      user.value = null;
      return false;
    }
  }

  async function initAuth() {
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
    user.value = null;

    if (import.meta.client) {
      await navigateTo('/login');
    }
  }

  async function fetchProfile() {
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
      user.value = res;
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
      user.value = res;
      return res;
    }
  }

  return {
    user,
    accessToken,
    login,
    signup,
    logout,
    refreshSession,
    initAuth,
    fetchProfile,
  };
}
