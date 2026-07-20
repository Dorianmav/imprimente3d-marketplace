interface User {
  id: string;
  email: string;
  name: string;
}

interface AuthResponse {
  user: User;
  accessToken: string;
  refreshToken: string;
}

export function useAuth() {
  const user = useState<User | null>("auth.user", () => null);
  const accessToken = useCookie<string | null>("accessToken", {
    default: () => null,
    maxAge: 60 * 15,
    sameSite: "strict",
  });
  const refreshToken = useCookie<string | null>("refreshToken", {
    default: () => null,
    maxAge: 60 * 60 * 24 * 7,
    sameSite: "strict",
  });

  const config = useRuntimeConfig();

  async function login(email: string, password: string) {
    const res = await $fetch<AuthResponse>(
      `${config.public.apiBase}/auth/login`,
      {
        method: "POST",
        body: { email, password },
      },
    );

    accessToken.value = res.accessToken;
    refreshToken.value = res.refreshToken;
    user.value = res.user;

    return res;
  }

  async function signup(prenom: string, nom: string, email: string, password: string, typeCompte: string) {
    const res = await $fetch<AuthResponse>(
      `${config.public.apiBase}/auth/signup`,
      {
        method: "POST",
        body: { prenom, nom, email, password, typeCompte },
      },
    );

    accessToken.value = res.accessToken;
    refreshToken.value = res.refreshToken;
    user.value = res.user;

    return res;
  }

  async function refresh() {
    if (!refreshToken.value) throw new Error("No refresh token");

    const res = await $fetch<{ accessToken: string; refreshToken: string }>(
      `${config.public.apiBase}/auth/refresh`,
      {
        method: "POST",
        body: { refreshToken: refreshToken.value },
      },
    );

    accessToken.value = res.accessToken;
    refreshToken.value = res.refreshToken;

    return res.accessToken;
  }

  async function logout() {
    accessToken.value = null;
    refreshToken.value = null;
    user.value = null;
    await navigateTo("/login");
  }

  async function fetchProfile() {
    const res = await $fetch<User>(`${config.public.apiBase}/auth/me`, {
      headers: { Authorization: `Bearer ${accessToken.value}` },
    });
    user.value = res;
    return res;
  }

  return {
    user,
    accessToken,
    refreshToken,
    login,
    signup,
    refresh,
    logout,
    fetchProfile,
  };
}
