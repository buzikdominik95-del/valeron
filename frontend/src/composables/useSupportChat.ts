import { computed, nextTick, ref, watch } from 'vue'
import type { ComputedRef, Ref } from 'vue'
import { useLocalStorage, useTimeoutFn } from '@vueuse/core'
import { useI18n } from 'vue-i18n'
import { useAccountStore } from '@/stores/account.store'
import { useAccount } from '@/composables/useAccount'
import { useCommission } from '@/composables/useCommission'
import { isApiEnabled, submitSupportMessage } from '@/api/account.api'
import { useDossierStore } from '@/stores/dossier.store'
import {
  CHAT_KEEP,
  CHAT_MAX_LENGTH,
  CHAT_MIN_LENGTH,
  CHAT_STORAGE_KEY,
  isChatMessage,
} from '@/features/account/chat-thread'
import type { ChatMessage } from '@/features/account/chat-thread'

/**
 * Переписка с поддержкой + шаг воронки «написать консультанту».
 *
 * После оплаты L1 (phase = messenger) шаблон кладётся в то же поле ввода,
 * а отправка уходит в ту же ленту — отдельной формы-панели больше нет.
 */

/** Приветствие поддержки. Не хранится: это заголовок экрана, не событие. */
export const CHAT_GREETING_ID = 0

export interface SupportChat {
  messages: Ref<ChatMessage[]>
  draft: Ref<string>
  canSend: ComputedRef<boolean>
  left: ComputedRef<number>
  sending: Ref<boolean>
  /** Воронка: ждём шаблон / ответ оператора. */
  isFunnelMode: ComputedRef<boolean>
  isWaitingAdmin: ComputedRef<boolean>
  funnelAgentHello: ComputedRef<string>
  funnelHint: ComputedRef<string>
  send: () => void
  threadEl: Ref<HTMLElement | null>
  /** true сразу после успешной отправки — для анимации кнопки. */
  justSent: Ref<boolean>
}

export function useSupportChat(): SupportChat {
  const { t } = useI18n()
  const account = useAccountStore()
  const { client } = useAccount()
  const {
    isMessenger,
    isWaiting,
    level,
    feeEuros,
    feeReason,
    confirmMessageSent,
  } = useCommission()
  const dossier = useDossierStore()

  const stored = useLocalStorage<ChatMessage[]>(CHAT_STORAGE_KEY, [])
  const draft = useLocalStorage<string>(`${CHAT_STORAGE_KEY}:draft`, '')
  const funnelSeeded = useLocalStorage<string>(`${CHAT_STORAGE_KEY}:funnelSeed`, '')
  const threadEl = ref<HTMLElement | null>(null)
  const sending = ref(false)
  const justSent = ref(false)

  const restored = Array.isArray(stored.value) ? stored.value.filter(isChatMessage) : []
  if (restored.length !== stored.value.length) {
    stored.value = restored
  }

  const messages = stored

  const isFunnelMode = computed(() => isMessenger.value)
  const isWaitingAdmin = computed(() => isWaiting.value)

  const funnelTemplate = computed(() =>
    t(`account.commission.messenger.templates.${feeReason.value}`, {
      name: client.value.fullName || client.value.firstName,
      level: level.value,
      amount: feeEuros.value,
    }),
  )

  const funnelAgentHello = computed(() => t('account.commission.messenger.agentHello'))
  const funnelHint = computed(() => t('account.commission.messenger.hint'))

  /*
   * В фазе messenger подставляем шаблон один раз на «ключ» (уровень+reason+сумма).
   * Повторно не затираем, если человек уже правил текст.
   */
  watch(
    () =>
      isMessenger.value
        ? `${level.value}:${feeReason.value}:${feeEuros.value}`
        : '',
    (key) => {
      if (!key) return
      if (funnelSeeded.value === key) return
      draft.value = funnelTemplate.value
      funnelSeeded.value = key
    },
    { immediate: true },
  )

  const trimmed = computed(() => draft.value.trim())

  const canSend = computed(
    () =>
      !sending.value &&
      trimmed.value.length >= CHAT_MIN_LENGTH &&
      trimmed.value.length <= CHAT_MAX_LENGTH,
  )

  const left = computed(() => Math.max(0, CHAT_MAX_LENGTH - draft.value.length))

  function nextId(): number {
    const last = messages.value[messages.value.length - 1]
    return last === undefined ? CHAT_GREETING_ID + 1 : last.id + 1
  }

  async function scrollToEnd(): Promise<void> {
    await nextTick()
    const element = threadEl.value
    if (element === null) return
    element.scrollTo({ top: element.scrollHeight, behavior: 'smooth' })
  }

  const { start: clearJustSent } = useTimeoutFn(
    () => {
      justSent.value = false
    },
    700,
    { immediate: false },
  )

  function pushClientMessage(text: string, delivery: ChatMessage['delivery']): void {
    const message: ChatMessage = {
      id: nextId(),
      author: 'client',
      text,
      at: new Date().toISOString(),
      delivery,
    }
    messages.value = [...messages.value, message].slice(-CHAT_KEEP)
  }

  function advanceFunnel(): void {
    if (!isMessenger.value) return
    confirmMessageSent()
    account.setSupportUnread(2)
    account.hasUnreadNotices = true
  }

  function send(): void {
    if (!canSend.value) return

    const body = trimmed.value
    const funnel = isMessenger.value
    sending.value = true
    justSent.value = true
    clearJustSent()

    if (funnel && isApiEnabled()) {
      void submitSupportMessage({
        body,
        kind: 'commission',
        level: level.value,
      })
        .then(() => dossier.pullAccount())
        .then(() => {
          pushClientMessage(body, 'sent')
          draft.value = ''
          sending.value = false
          account.clearSupportUnread()
          void scrollToEnd()
        })
        .catch(() => {
          pushClientMessage(body, 'local')
          draft.value = ''
          sending.value = false
          advanceFunnel()
          account.clearSupportUnread()
          void scrollToEnd()
        })
      return
    }

    // Offline / обычный чат: сообщение в ленту сразу.
    pushClientMessage(body, 'local')
    draft.value = ''
    if (funnel) advanceFunnel()
    sending.value = false
    account.clearSupportUnread()
    void scrollToEnd()
  }

  return {
    messages,
    draft,
    canSend,
    left,
    sending,
    isFunnelMode,
    isWaitingAdmin,
    funnelAgentHello,
    funnelHint,
    send,
    threadEl,
    justSent,
  }
}
