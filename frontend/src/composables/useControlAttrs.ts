import { computed, useAttrs } from 'vue'

/**
 * Отделяет внешний class от остальных атрибутов, чтобы контрол прогнал
 * свои и внешние классы через cn() и внешний реально перебивал внутренний.
 * Используется вместе с defineOptions({ inheritAttrs: false }).
 */
export function useControlAttrs() {
  const attrs = useAttrs()

  const externalClass = computed(() => attrs.class as string | undefined)

  const passThrough = computed(() => {
    const rest = { ...attrs }
    delete rest.class
    return rest
  })

  return { externalClass, passThrough }
}
