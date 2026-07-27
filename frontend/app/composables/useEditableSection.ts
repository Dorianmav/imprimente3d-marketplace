// composables/useEditableSection.ts
export function useEditableSection<T extends Record<string, any>>(
  source: Ref<T> | ComputedRef<T>
) {
  const isEditing = ref(false);
  const form = ref<T>({ ...source.value }) as Ref<T>;

  function startEdit() {
    // on repart toujours des dernières valeurs "officielles"
    form.value = { ...source.value };
    isEditing.value = true;
  }

  function cancelEdit() {
    isEditing.value = false;
  }

  function getDiff(): Partial<T> {
    const diff: Partial<T> = {};
    for (const key in form.value) {
      if (JSON.stringify(form.value[key]) !== JSON.stringify(source.value[key])) {
        diff[key] = form.value[key];
      }
    }
    return diff;
  }

  return { isEditing, form, startEdit, cancelEdit, getDiff };
}