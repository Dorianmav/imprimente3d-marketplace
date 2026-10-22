/**
 * Page title composable
 */
export function setTitle(title: string) {
  useHead({
    title: `${title} — Layerly`,
  });
}
