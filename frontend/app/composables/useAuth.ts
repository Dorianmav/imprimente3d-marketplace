async function fetchWithRetry<T>(
  fn: () => Promise<T>,
  retries = 2,
  delay = 300,
): Promise<T> {
  try {
    return await fn();
  } catch (e: any) {
    if (retries > 0 && !e?.response) {
      await new Promise((r) => setTimeout(r, delay));
      return fetchWithRetry(fn, retries - 1, delay);
    }
    throw e;
  }
}

interface User {
  id: string;
  email: string;
  nom: string;
  prenom: string;
  typeCompte: "particulier" | "pro";
  isVerified: boolean;
}

interface AuthSuccessResponse {
  user: User;
  accessToken: string;
  requiresVerification?: false;
}

interface VerificationRequiredResponse {
  requiresVerification: true;
  message: string;
  email: string;
}

type AuthResponse = AuthSuccessResponse | VerificationRequiredResponse;

let refreshInFlight: Promise<boolean> | null = null;

export function useAuth() {
  const user = useState<User | null>("auth.user", () => null);
  const accessToken = useCookie<string | null>("accessToken", {
    default: () => null,
    maxAge: 60 * 15,
    sameSite: "lax",
  });
  const config = useRuntimeConfig();
  const apiBase = import.meta.server
    ? config.apiBaseServer
    : config.public.apiBase;

  function getHeaders(): Record<string, string> {
    if (import.meta.server) {
      return useRequestHeaders(["cookie"]) as Record<string, string>;
    }
    return {};
  }

  async function refreshSession(headers?: Record<string, string>) {
    if (refreshInFlight) return refreshInFlight;

    const h = headers ?? getHeaders();
    refreshInFlight = (async () => {
      try {
        const res = await fetchWithRetry(() =>
          $fetch<{ accessToken: string }>(
            `${apiBase}/auth/refresh`,
            {
              method: "POST",
              credentials: "include",
              headers: h,
              timeout: 5000,
            },
          ),
        );
        accessToken.value = res.accessToken;
        return true;
      } catch (e: any) {
        const status = e?.response?.status ?? e?.status;
        if (status !== 401) {
          console.error(
            "[useAuth] refreshSession failed:",
            e?.cause ?? e?.message ?? e,
          );
        }
        accessToken.value = null;
        user.value = null;
        return false;
      }
    })();

    try {
      return await refreshInFlight;
    } finally {
      refreshInFlight = null;
    }
  }

  async function fetchProfile(headers?: Record<string, string>) {
    const h = headers ?? getHeaders();

    if (!accessToken.value) {
      const refreshed = await refreshSession(h);
      if (!refreshed) throw new Error("No active session");
    }

    const fetchProfileRequest = () =>
      fetchWithRetry(() =>
        $fetch<User>(`${apiBase}/auth/me`, {
          credentials: "include",
          headers: { ...h, Authorization: `Bearer ${accessToken.value}` },
          timeout: 5000,
        }),
      );

    try {
      const res = await fetchProfileRequest();
      if (!res || !res.id) {
        user.value = null;
        throw new Error("Empty profile response");
      }
      user.value = res;
      return res;
    } catch (error: any) {
      if (error?.response?.status !== 401) {
        console.error(
          "[useAuth] fetchProfile non-401 failure:",
          error?.cause ?? error?.message ?? error,
        );
        throw error;
      }

      const refreshed = await refreshSession(h);
      if (!refreshed) throw error;

      const res = await fetchProfileRequest();
      if (!res || !res.id) {
        user.value = null;
        throw new Error("Empty profile response after refresh");
      }
      user.value = res;
      return res;
    }
  }

  async function initAuth() {
    const h = getHeaders();

    if (accessToken.value) {
      try {
        await fetchProfile(h);
        return !!user.value;
      } catch {
        const refreshed = await refreshSession(h);
        if (!refreshed) return false;
      }
    } else {
      const refreshed = await refreshSession(h);
      if (!refreshed) return false;
    }

    try {
      await fetchProfile(h);
      return !!user.value;
    } catch {
      return false;
    }
  }

  async function login(email: string, password: string) {
    const res = await $fetch<AuthResponse>(
      `${apiBase}/auth/login`,
      { method: "POST", credentials: "include", body: { email, password } },
    );

    if (!res.requiresVerification) {
      accessToken.value = res.accessToken;
      user.value = res.user;
    }

    return res;
  }

  async function signup(
    prenom: string,
    nom: string,
    email: string,
    password: string,
    typeCompte: string,
  ) {
    const res = await $fetch<AuthResponse>(
      `${apiBase}/auth/signup`,
      {
        method: "POST",
        credentials: "include",
        body: { prenom, nom, email, password, typeCompte },
      },
    );

    if (!res.requiresVerification) {
      accessToken.value = res.accessToken;
      user.value = res.user;
    }


    return res;
  }

  async function logout() {
    try {
      if (accessToken.value) {
        await $fetch(`${apiBase}/auth/logout`, {
          method: "POST",
          credentials: "include",
          headers: { Authorization: `Bearer ${accessToken.value}` },
        });
      }
    } catch {
      // ignore
    }
    accessToken.value = null;
    user.value = null;
    if (import.meta.client) await navigateTo("/login");
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