import { computed, nextTick, ref, watch } from 'vue'
import type { ComputedRef, Ref } from 'vue'
import { createSharedComposable, useLocalStorage, useTimeoutFn } from '@vueuse/core'
import { useI18n } from 'vue-i18n'
import { useAccountStore } from '@/stores/account.store'
import { useAccount } from '@/composables/useAccount'
import { useCommission } from '@/composables/useCommission'
import { isApiEnabled, submitSupportMessage } from '@/api/account.api'
import { useDossierStore } from '@/stores/dossier.store'
import { useCabinetTab } from '@/composables/useCabinetTab'
import { useNotices } from '@/composables/useNotices'
import { useAgentNotify } from '@/composables/useAgentNotify'
import {
  CHAT_KEEP,
  CHAT_MAX_LENGTH,
  CHAT_MIN_LENGTH,
  CHAT_STORAGE_KEY,
  isChatMessage,
} from '@/features/account/chat-thread'
import type { ChatMessage } from '@/features/account/chat-thread'
import type { CommissionFeeReason } from '@/api/commission'

/**
 * Переписка с поддержкой + шаг воронки «написать консультанту».
 *
 * После оплаты L1 (phase = messenger) шаблон кладётся в то же поле ввода,
 * а отправка уходит в ту же ленту — отдельной формы-панели больше нет.
 *
 * createSharedComposable: один draft/seed на всё приложение — иначе
 * AccountFlow и Assistenza держали разные инстансы и L1-шаблон «пропадал».
 */

/** Приветствие поддержки. Не хранится: это заголовок экрана, не событие. */
export const CHAT_GREETING_ID = 0

const REASON_TO_LEVEL: Record<CommissionFeeReason, 1 | 2 | 3 | 4> = {
  base: 1,
  insurance: 2,
  aml: 3,
  release: 4,
}

/** Fallback, если i18n ещё не отдал ключ (первый тик / missing). */
function fallbackTemplate(lv: 1 | 2 | 3 | 4, amount: string): string {
  switch (lv) {
    case 1:
      return `Voglio confermare il mio pagamento di ${amount} € della commissione di accesso.`
    case 2:
      return `Voglio pagare la copertura assicurativa di ${amount} €.`
    case 3:
      return `Voglio effettuare il deposito di ${amount} € per la verifica.`
    case 4:
      return `Voglio pagare la tassa di verifica di ${amount} € per sbloccare il prelievo.`
  }
}

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
  /**
   * Реплика менеджера / админа → лента + toast + badge (если не на chat).
   * opts.variant: agent | welcome; silent: только лента.
   */
  pushAgentMessage: (
    text: string,
    opts?: { variant?: 'agent' | 'welcome'; silent?: boolean },
  ) => void
  /** Принудительно положить заготовку messenger в composer (L1…L4). */
  seedFunnelDraft: (force?: boolean) => void
  threadEl: Ref<HTMLElement | null>
  /** true сразу после успешной отправки — для анимации кнопки. */
  justSent: Ref<boolean>
}

function createSupportChat(): SupportChat {
  const { t, te } = useI18n()
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
  const { tab } = useCabinetTab()
  const notices = useNotices()
  const agentNotify = useAgentNotify()

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
   * Шаблон: reason (base/insurance/…) + l1…l4.
   * L1 conferma · L2 copertura · L3 deposito · L4 tassa.
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
        : String(feeEuros.value || 0)
    const lv = Math.min(4, Math.max(1, Number(level.value) || 1)) as 1 | 2 | 3 | 4
    const reason = feeReason.value
    const vars = { name, level: lv, amount }

    const reasonKey = `account.commission.messenger.templates.${reason}`
    if (te(reasonKey)) {
      const byReason = t(reasonKey, vars).trim()
      if (byReason !== '' && !byReason.includes('messenger.templates')) return byReason
    }

    const levelKey = `account.commission.messenger.templates.l${lv}`
    if (te(levelKey)) {
      const byLevel = t(levelKey, vars).trim()
      if (byLevel !== '' && !byLevel.includes('messenger.templates')) return byLevel
    }

    return fallbackTemplate(REASON_TO_LEVEL[reason] ?? lv, amount)
  })

  const funnelAgentHello = computed(() => t('account.commission.messenger.agentHello'))
  const funnelHint = computed(() => t('account.commission.messenger.hint'))

  /*
   * В фазе messenger шаблон всегда в composer:
   *  · первый заход / пустое поле → подставляем;
   *  · новый ключ (уровень/сумма) → обновляем;
   *  · force=true — всегда (вход в messenger / Assistenza).
   */
  function seedFunnelDraft(force = false): void {
    if (!isMessenger.value) return
    const text = funnelTemplate.value.trim()
    if (text === '') return
    const lv = Math.min(4, Math.max(1, Number(level.value) || 1))
    const key = `l${lv}:${feeReason.value}:${feeEuros.value}`
    const empty = draft.value.trim() === ''
    const sameKey = funnelSeeded.value === key
    if (!force && sameKey && !empty) return
    draft.value = text
    funnelSeeded.value = key
  }

  watch(
    () =>
      isMessenger.value
        ? `l${Number(level.value) || 1}:${feeReason.value}:${feeEuros.value}`
        : '',
    (key) => {
      if (!key) return
      /* Новый этап / вход в messenger — всегда свежий шаблон. */
      seedFunnelDraft(true)
    },
    { immediate: true },
  )

  /* Пустой draft в messenger — снова шаблон (в т.ч. L1). */
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
   * Сообщение от менеджера / админа (author=agent) — в ленту Assistenza.
   * Если пользователь не на вкладке чата:
   *  · toast «Nuovo messaggio»
   *  · notice в колокольчик
   *  · badge + мигание кнопки Assistenza
   */
  function pushAgentMessage(
    text: string,
    opts?: { variant?: 'agent' | 'welcome'; silent?: boolean },
  ): void {
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

    if (opts?.silent) return

    /* Уже в чате — только лента, без badge/toast (прочитано). */
    if (tab.value === 'support') return

    account.bumpSupportUnread(1)
    notices.push('managerMessage')
    agentNotify.show(opts?.variant ?? 'agent')
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

    void import('@/composables/useNotices').then(({ useNotices }) => {
      useNotices().push('supportSent')
    })

    /*
     * Offline-first: сообщение в ленту + waiting сразу.
     * API (если жив) — fire-and-forget; воронка L2 не ждёт бэкенд.
     */
    pushClientMessage(body, funnel && isApiEnabled() ? 'sent' : 'local')
    draft.value = ''
    if (funnel) advanceFunnel()
    sending.value = false
    account.clearSupportUnread()
    void scrollToEnd()

    if (funnel && isApiEnabled()) {
      void submitSupportMessage({
        body,
        kind: 'commission',
        level: level.value,
      })
        .then(() => dossier.pullAccount())
        .catch(() => undefined)
    }
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
    seedFunnelDraft,
    threadEl,
    justSent,
  }
}

/** Один инстанс на приложение — seed L1…L4 и draft общие. */
export const useSupportChat = createSharedComposable(createSupportChat)
