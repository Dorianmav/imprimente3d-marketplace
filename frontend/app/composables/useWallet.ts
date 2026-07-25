interface BalanceEntry {
  amount: number;
  currency: string;
}

interface WalletBalance {
  available: BalanceEntry[];
  pending: BalanceEntry[];
}

export function useWallet() {
  const accessToken = useCookie<string | null>("accessToken");
  const config = useRuntimeConfig();
  const apiBase = import.meta.server
    ? config.apiBaseServer
    : config.public.apiBase;

  const balance = useState<WalletBalance | null>("wallet.balance", () => null);
  const needsOnboarding = useState<boolean>("wallet.needsOnboarding", () => false);
  const loading = useState<boolean>("wallet.loading", () => false);
  const payoutLoading = useState<boolean>("wallet.payoutLoading", () => false);
  const error = useState<string | null>("wallet.error", () => null);

  function authHeaders(): Record<string, string> {
    return accessToken.value
      ? { Authorization: `Bearer ${accessToken.value}` }
      : {};
  }

  async function fetchBalance() {
    loading.value = true;
    error.value = null;
    needsOnboarding.value = false;

    try {
      const res = await $fetch<WalletBalance>(`${apiBase}/stripe/wallet/balance`, {
        credentials: "include",
        headers: authHeaders(),
      });
      balance.value = res;
    } catch (e: any) {
      const status = e?.response?.status ?? e?.status;
      if (status === 400) {
        needsOnboarding.value = true;
      } else {
        error.value = "Impossible de récupérer le solde pour le moment.";
      }
    } finally {
      loading.value = false;
    }
  }

  async function requestPayout(amount: number) {
    payoutLoading.value = true;
    error.value = null;

    try {
      await $fetch(`${apiBase}/stripe/wallet/payout`, {
        method: "POST",
        credentials: "include",
        headers: authHeaders(),
        body: { amount },
      });
      await fetchBalance();
      return true;
    } catch (e: any) {
      const message =
        e?.response?._data?.message ??
        "Le retrait n'a pas pu être effectué.";
      error.value = Array.isArray(message) ? message.join(" ") : message;
      return false;
    } finally {
      payoutLoading.value = false;
    }
  }

  async function getOnboardingLink() {
    const res = await $fetch<{ url: string }>(
      `${apiBase}/stripe/onboarding-link`,
      {
        method: "POST",
        credentials: "include",
        headers: authHeaders(),
      },
    );
    return res.url;
  }

  async function getDashboardLink() {
    const res = await $fetch<{ url: string }>(
      `${apiBase}/stripe/dashboard-link`,
      {
        credentials: "include",
        headers: authHeaders(),
      },
    );
    return res.url;
  }

  return {
    balance,
    needsOnboarding,
    loading,
    payoutLoading,
    error,
    fetchBalance,
    requestPayout,
    getOnboardingLink,
    getDashboardLink,
  };
}