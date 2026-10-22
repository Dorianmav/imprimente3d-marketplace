import type {
  AuthResponse,
  LoginDto,
  SignupDto,
  User,
} from '~/types';

export function useApiService() {
  const config = useRuntimeConfig();
  const apiBase = config.public.apiBase;
  function getHeaders(token?: string | null) {
    const headers: Record<string, string> = {};
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }
    return headers;
  }

  // ---- Auth ----
  async function signup(dto: SignupDto): Promise<AuthResponse> {
    return $fetch(`${apiBase}/auth/signup`, {
      method: 'POST',
      credentials: 'include',
      body: dto,
    });
  }

  async function login(dto: LoginDto): Promise<AuthResponse> {
    return $fetch(`${apiBase}/auth/login`, {
      method: 'POST',
      credentials: 'include',
      body: dto,
    });
  }

  async function refreshSession(): Promise<{ accessToken: string }> {
    return $fetch(`${apiBase}/auth/refresh`, {
      method: 'POST',
      credentials: 'include',
    });
  }

  async function logout(token: string | null) {
    if (token) {
      await $fetch(`${apiBase}/auth/logout`, {
        method: 'POST',
        credentials: 'include',
        headers: getHeaders(token),
      }).catch(() => {});
    }
  }

  async function getProfile(token: string | null): Promise<User> {
    return $fetch(`${apiBase}/auth/me`, {
      credentials: 'include',
      headers: getHeaders(token),
    });
  }

  async function updateProfile(
    token: string | null,
    dto: { prenom?: string; nom?: string; avatarUrl?: string; localisation?: unknown }
  ): Promise<User> {
    return $fetch(`${apiBase}/auth/me`, {
      method: 'PATCH',
      credentials: 'include',
      headers: getHeaders(token),
      body: dto,
    });
  }

  async function changePassword(
    token: string | null,
    current: string,
    newPass: string
  ): Promise<{ message: string }> {
    return $fetch(`${apiBase}/auth/change-password`, {
      method: 'POST',
      credentials: 'include',
      headers: getHeaders(token),
      body: { currentPassword: current, newPassword: newPass },
    });
  }

  async function forgotPassword(email: string): Promise<{ message: string }> {
    return $fetch(`${apiBase}/auth/forgot-password`, {
      method: 'POST',
      body: { email },
    });
  }

  async function resetPassword(
    token: string,
    newPassword: string
  ): Promise<{ message: string }> {
    return $fetch(`${apiBase}/auth/reset-password`, {
      method: 'POST',
      body: { token, newPassword },
    });
  }

  return {
    signup,
    login,
    refreshSession,
    logout,
    getProfile,
    updateProfile,
    changePassword,
    forgotPassword,
    resetPassword,
  };
}
