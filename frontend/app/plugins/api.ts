export default defineNuxtPlugin(() => {
  const config = useRuntimeConfig();
  const { accessToken, logout, initAuth } = useAuth();

  void initAuth();

  const api = $fetch.create({
    baseURL: config.public.apiBase,
    credentials: 'include',
    onRequest({ options }) {
      if (accessToken.value) {
        options.headers.set('Authorization', `Bearer ${accessToken.value}`);
      }
    },
    async onResponseError({ response }) {
      if (response.status === 401) {
        await logout();
      }
    },
  });

  return {
    provide: { api },
  };
});