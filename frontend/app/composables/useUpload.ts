export function useUpload() {
  const { accessToken } = useAuth();
  const config = useRuntimeConfig();

  async function uploadFile(file: File): Promise<string> {
    const form = new FormData();
    form.append("file", file);

    const res = await $fetch<{ url: string }>(
      `${config.public.apiBase}/uploads`,
      {
        method: "POST",
        credentials: "include",
        headers: { Authorization: `Bearer ${accessToken.value}` },
        body: form,
      },
    );

    return res.url;
  }

  return { uploadFile };
}