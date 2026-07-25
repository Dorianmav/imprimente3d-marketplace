<script setup lang="ts">
import SoldeCard from "~/components/wallet/SoldeCard.vue";
import RetraitForm from "~/components/wallet/RetraitForm.vue";
import OnboardingRequis from "~/components/wallet/OnboardingRequis.vue";

definePageMeta({
  layout: 'default',
})

const {
  balance,
  needsOnboarding,
  loading,
  payoutLoading,
  error,
  fetchBalance,
  requestPayout,
  getOnboardingLink,
} = useWallet();

const onboardingLoading = ref(false);
const successMessage = ref<string | null>(null);

await fetchBalance();

async function handleConnect() {
  onboardingLoading.value = true;
  try {
    const url = await getOnboardingLink();
    window.location.href = url;
  } finally {
    onboardingLoading.value = false;
  }
}

async function handlePayout(amount: number) {
  successMessage.value = null;
  const ok = await requestPayout(amount);
  if (ok) {
    successMessage.value = "Votre demande de retrait a été enregistrée.";
  }
}
</script>

<template>
  <div class="mx-auto flex max-w-2xl flex-col gap-8 px-6 py-8">
    <!-- <NuxtLink
      to="/dashboard"
      class="self-start w-fit inline-flex h-7 items-center bg-blue-300 pl-5 pr-2 text-sm font-medium text-neutral-700 transition-all hover:bg-neutral-50 hover:text-neutral-900 [clip-path:polygon(16px_0,_100%_0,_100%_100%,_16px_100%,_0_50%)] [filter:drop-shadow(1px_0_0_#d4d4d4)_drop-shadow(-1px_0_0_#d4d4d4)_drop-shadow(0_1px_0_#d4d4d4)_drop-shadow(0_-1px_0_#d4d4d4)] hover:[filter:drop-shadow(1px_0_0_#737373)_drop-shadow(-1px_0_0_#737373)_drop-shadow(0_1px_0_#737373)_drop-shadow(0_-1px_0_#737373)]"
    >
      <i class="i-tabler-arrow-left mr-1.5 text-base"></i>
      Retour
    </NuxtLink> -->
    <h1 class="m-0 text-2xl font-semibold text-neutral-900">Portefeuille</h1>

    <OnboardingRequis
      v-if="needsOnboarding"
      :loading="onboardingLoading"
      @connect="handleConnect"
    />

    <template v-else>
      <p v-if="loading" class="text-neutral-500">Chargement du solde...</p>

      <template v-else-if="balance">
        <SoldeCard :available="balance.available" :pending="balance.pending" />

        <section class="flex flex-col gap-4">
          <h2 class="m-0 text-lg font-semibold text-neutral-900">
            Demander un retrait
          </h2>
          <RetraitForm
            :loading="payoutLoading"
            :disponible="balance.available[0]?.amount ?? 0"
            @submit="handlePayout"
          />
        </section>
      </template>

      <p v-if="successMessage" class="text-sm text-green-700">
        {{ successMessage }}
      </p>
      <p v-if="error" class="text-sm text-red-700">{{ error }}</p>
    </template>
  </div>
</template>
