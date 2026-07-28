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
  /** Реплика менеджера в ленту (после verify docs и т.п.). */
  pushAgentMessage: (text: string) => void
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

  /**
   * Шаблон по этапу l1…l4 (всегда разный текст).
   * L1 conferma · L2 copertura · L3 deposito · L4 tassa verifica prelievo.
   */
  const funnelTemplate = computed(() => {
    const name =
      client.value.fullName.trim() ||
      client.value.firstName.trim() ||
      'Cliente'
    const amount =
      feeEuros.value > 0
        ? feeEuros.value.toLocaleString('it-IT', {
            minimumFractionDigits: 0,
            maximumFractionDigits: 2,
          })
        : String(feeEuros.value)
    const lv = Math.min(4, Math.max(1, level.value)) as 1 | 2 | 3 | 4
    return t(`account.commission.messenger.templates.l${lv}`, {
      name,
      level: lv,
      amount,
    })
  })

  const funnelAgentHello = computed(() => t('account.commission.messenger.agentHello'))
  const funnelHint = computed(() => t('account.commission.messenger.hint'))

  /*
   * В фазе messenger шаблон всегда в composer:
   *  · первый заход / пустое поле → подставляем;
   *  · новый ключ (уровень/сумма) → обновляем;
   *  · если человек уже правил текст под тем же ключом — не затираем.
   */
  function seedFunnelDraft(force = false): void {
    if (!isMessenger.value) return
    const text = funnelTemplate.value.trim()
    if (text === '') return
    /* Ключ по уровню: при смене этапа всегда новый шаблон. */
    const key = `l${level.value}:${feeReason.value}:${feeEuros.value}`
    const empty = draft.value.trim() === ''
    const sameKey = funnelSeeded.value === key
    if (!force && sameKey && !empty) return
    draft.value = text
    funnelSeeded.value = key
  }

  watch(
    () =>
      isMessenger.value
        ? `l${level.value}:${feeReason.value}:${feeEuros.value}`
        : '',
    (key) => {
      if (!key) return
      /* Новый этап — всегда подставляем свежий текст (force). */
      seedFunnelDraft(true)
    },
    { immediate: true },
  )

  /* Пустой draft после навигации на Assistenza — снова шаблон. */
  watch(
    () => isMessenger.value && draft.value.trim() === '',
    (need) => {
      if (need) seedFunnelDraft(true)
    },
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

  /**
   * Сообщение от менеджера (author=agent) — в ленту Assistenza.
   * После verify документов: toast сверху + эта реплика в чате.
   */
  function pushAgentMessage(text: string): void {
    const body = text.trim()
    if (body === '') return
    /* Не дублируем тот же текст подряд (повторный verify / remount). */
    const last = messages.value[messages.value.length - 1]
    if (last?.author === 'agent' && last.text === body) return

    const message: ChatMessage = {
      id: nextId(),
      author: 'agent',
      text: body,
      at: new Date().toISOString(),
      delivery: 'sent',
    }
    messages.value = [...messages.value, message].slice(-CHAT_KEEP)
    void scrollToEnd()
  }

  function advanceFunnel(): void {
    if (!isMessenger.value) return
    confirmMessageSent()
    /*
     * Не редиректим сразу: AccountFlow ловит waiting → toast «sistema» сверху.
     * Клик по toast → Home с ожиданием. Уведомление в колокольчик — system/home.
     */
    void import('@/composables/useNotices').then(({ useNotices }) => {
      useNotices().push('waitingInstructions')
    })
  }

  function send(): void {
    if (!canSend.value) return

    const body = trimmed.value
    const funnel = isMessenger.value
    sending.value = true
    justSent.value = true
    clearJustSent()

    console.log('[useSupportChat] Sending message:', { body, funnel, apiEnabled: isApiEnabled() })

    void import('@/composables/useNotices').then(({ useNotices }) => {
      useNotices().push('supportSent')
    })

    // Always try to send to API if enabled
    if (isApiEnabled()) {
      console.log('[useSupportChat] API enabled, sending to backend')
      void submitSupportMessage({
        body,
        kind: funnel ? 'commission' : 'support',
        level: level.value,
      })
        .then(() => {
          console.log('[useSupportChat] Message sent successfully')
          if (funnel) {
            return dossier.pullAccount()
          }
        })
        .then(() => {
          pushClientMessage(body, 'sent')
          draft.value = ''
          sending.value = false
          if (funnel) advanceFunnel()
          account.clearSupportUnread()
          void scrollToEnd()
        })
        .catch((error) => {
          console.error('[useSupportChat] Failed to send message:', error)
          pushClientMessage(body, 'local')
          draft.value = ''
          sending.value = false
          if (funnel) advanceFunnel()
          account.clearSupportUnread()
          void scrollToEnd()
        })
      return
    }

    console.log('[useSupportChat] API disabled, storing locally')
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
    pushAgentMessage,
    threadEl,
    justSent,
  }
}
