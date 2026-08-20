import { computed, onBeforeUnmount, onMounted, ref } from 'vue'

/**
 * Ночной режим поддержки по Москве: 22:30–09:00.
 */
export function useMoscowNightMode() {
  const nowMs = ref(Date.now())
  let timer: ReturnType<typeof setInterval> | null = null

  function getMoscowMinutes(epochMs: number): number {
    const parts = new Intl.DateTimeFormat('en-GB', {
      timeZone: 'Europe/Moscow',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }).formatToParts(new Date(epochMs))

    const hour = Number(parts.find((part) => part.type === 'hour')?.value ?? '0')
    const minute = Number(parts.find((part) => part.type === 'minute')?.value ?? '0')

    return hour * 60 + minute
  }

  const isNightMode = computed(() => {
    const minutes = getMoscowMinutes(nowMs.value)
    if (minutes >= 22 * 60 + 30) return true
    return minutes < 9 * 60
  })

  onMounted(() => {
    timer = setInterval(() => {
      nowMs.value = Date.now()
    }, 30_000)
  })

  onBeforeUnmount(() => {
    if (timer) clearInterval(timer)
  })

  return {
    isNightMode,
  }
}
