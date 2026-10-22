/**
 * Toast notification helper using Nuxt UI
 *
 * Usage:
 *   const toast = useToast()
 *   toast.success('Saved!')
 *   toast.error('Something went wrong')
 *
 * Or as a standalone function:
 *   showToast('Hello', 'info')
 */
export function useToast() {
  const { toast } = useNuxtApp() as { toast: (message: string, options?: Record<string, unknown>) => void };

  return {
    success(message: string) {
      toast?.(message, { color: 'success', duration: 3000 });
    },
    error(message: string) {
      toast?.(message, { color: 'error', duration: 3000 });
    },
    warning(message: string) {
      toast?.(message, { color: 'warning', duration: 3000 });
    },
    info(message: string) {
      toast?.(message, { color: 'info', duration: 3000 });
    },
  };
}

/**
 * Standalone toast function for use outside composables
 */
export function showToast(message: string, variant: 'success' | 'error' | 'warning' | 'info' = 'info') {
  const { toast } = useNuxtApp() as { toast: (message: string, options?: Record<string, unknown>) => void };
  const colorMap = { success: 'success', error: 'error', warning: 'warning', info: 'info' };
  toast?.(message, { color: colorMap[variant], duration: 3000 });
}
