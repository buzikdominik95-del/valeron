import { computed, nextTick, onBeforeUnmount, ref, watch } from 'vue'
import type { ComputedRef, Ref } from 'vue'
import { useLocalStorage, useTimeoutFn } from '@vueuse/core'
import { useI18n } from 'vue-i18n'
import { useAccountStore } from '@/stores/account.store'
import { useAccount } from '@/composables/useAccount'
import { useCommission } from '@/composables/useCommission'
import {
  fetchSupportMessages,
  isApiEnabled,
  submitSupportMessage,
  submitSupportMessageMultipart,
} from '@/api/account.api'
import { useSimulatorStore } from '@/stores/simulator.store'
import { useCabinetTab } from '@/composables/useCabinetTab'
import { useNotices } from '@/composables/useNotices'
import { useSupportModal } from '@/composables/useSupportModal'
import { useAgentNotify } from '@/composables/useAgentNotify'
import { createChatSocket } from '@/composables/chatSocket'
import {
  CHAT_KEEP,
  CHAT_MAX_LENGTH,
  CHAT_MIN_LENGTH,
  CHAT_STORAGE_KEY,
  isChatMessage,
  stripHeavyAttachments,
} from '@/features/account/chat-thread'
import type { ChatAttachment, ChatMessage } from '@/features/account/chat-thread'
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
      return 'Voglio confermare il mio pagamento'
    case 2:
      return 'Voglio pagare la copertura assicurativa.'
    case 3:
      return 'Voglio effettuare il deposito per la verifica.'
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
  /** Выбранное фото/файл до отправки. */
  pendingAttachment: Ref<ChatAttachment | null>
  setPendingAttachment: (file: ChatAttachment | null) => void
  /**
   * Реплика менеджера / админа → лента + toast + badge (если не на chat).
   * opts.variant: agent | welcome; silent: только лента.
   */
  pushAgentMessage: (
    text: string,
    opts?: { variant?: 'agent' | 'welcome'; silent?: boolean },
  ) => void
  /**
   * Два welcome Deborah в ленту; убирает старый greeting.
   * Не дублирует, если уже есть.
   */
  ensureDeborahWelcome: (texts: [string, string]) => void
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
  const simulator = useSimulatorStore()
  const { tab } = useCabinetTab()
  const { open: supportModalOpen } = useSupportModal()
  const notices = useNotices()
  const agentNotify = useAgentNotify()

  /**
   * Открыл / смотрит Assistenza → notice менеджера и «messaggio inviato»
   * вычитаются из счётчика колокольчика; badge на вкладке гаснет.
   * immediate: ?tab=support при загрузке тоже.
   */
  function clearChatUnreadState(): void {
    account.clearSupportUnread()
    try {
      notices.markChatNoticesRead()
    } catch {
      /* notices optional */
    }
  }

  const chatVisible = computed(() => tab.value === 'support' || supportModalOpen.value)

  watch(
    tab,
    (next) => {
      if (next === 'support' || supportModalOpen.value) {
        clearChatUnreadState()
        /* Длинная переписка: сразу к последнему сообщению. */
        void scrollToEnd(true, true)
        window.setTimeout(() => {
          void scrollToEnd(true, true)
        }, 80)
        window.setTimeout(() => {
          void scrollToEnd(true, true)
        }, 280)
      }
    },
    { immediate: true },
  )

  watch(
    supportModalOpen,
    (isOpen) => {
      if (!isOpen) return
      clearChatUnreadState()
      void scrollToEnd(true, true)
      window.setTimeout(() => {
        void scrollToEnd(true, true)
      }, 80)
      window.setTimeout(() => {
        void scrollToEnd(true, true)
      }, 280)
    },
    { immediate: false },
  )

  const stored = useLocalStorage<ChatMessage[]>(CHAT_STORAGE_KEY, [])
  const draft = useLocalStorage<string>(`${CHAT_STORAGE_KEY}:draft`, '')
  const funnelSeeded = useLocalStorage<string>(`${CHAT_STORAGE_KEY}:funnelSeed`, '')
  const chatOwner = useLocalStorage<string>(`${CHAT_STORAGE_KEY}:owner`, '')
  const threadEl = ref<HTMLElement | null>(null)
  const shouldStickToBottom = ref(true)
  let threadScrollEl: HTMLElement | null = null

  const isNearBottom = (el: HTMLElement): boolean =>
    el.scrollHeight - (el.scrollTop + el.clientHeight) <= 80

  const updateStickToBottom = (): void => {
    const el = threadEl.value
    if (!el) return
    shouldStickToBottom.value = isNearBottom(el)
  }

  const sending = ref(false)
  const justSent = ref(false)
  /** Локальное фото/файл до send (file в памяти, не в LS). */
  const pendingAttachment = ref<ChatAttachment | null>(null)
  let pendingBlobUrl: string | null = null

  function revokePendingBlob(): void {
    if (pendingBlobUrl) {
      try {
        URL.revokeObjectURL(pendingBlobUrl)
      } catch {
        /* ignore */
      }
      pendingBlobUrl = null
    }
  }

  function setPendingAttachment(file: ChatAttachment | null): void {
    revokePendingBlob()
    pendingAttachment.value = file
    if (file?.url?.startsWith('blob:')) pendingBlobUrl = file.url
  }

  const restoredRaw = Array.isArray(stored.value) ? stored.value.filter(isChatMessage) : []
  const restored = stripHeavyAttachments(restoredRaw)
  stored.value = restored

  const messages = stored



  /** EN-мусор от старого markMessageSent / CRM (client + agent). */
  const EN_RECEIPT_RE = /commission\s*receipt\s*confirmed/i
  const OLD_GREETING_RE =
    /scriva pure la sua domanda|rispondiamo nei giorni lavorativi|buongiorno!\s*scriva/i

  function normalizeThreadMessage(m: ChatMessage): ChatMessage | null {
    const text = m.text.trim()
    if (EN_RECEIPT_RE.test(text)) {
      /* Итальянский вместо EN (фотка 3) — и client, и agent */
      return {
        ...m,
        text: 'Ricevuta commissione confermata.',
      }
    }
    if (OLD_GREETING_RE.test(text) && m.author === 'agent') {
      return null /* выкинуть старый greeting */
    }
    return m
  }

  function stripOldGreetings(list: ChatMessage[]): ChatMessage[] {
    return list.filter((m) => {
      if (m.author !== 'agent' && m.author !== 'client') return true
      if (m.author === 'client' && EN_RECEIPT_RE.test(m.text)) return false
      if (m.author !== 'agent') return true
      return !OLD_GREETING_RE.test(m.text)
    })
  }

  const isFunnelMode = computed(() => isMessenger.value)
  const isWaitingAdmin = computed(() => isWaiting.value)

  const outboundEmail = computed(() => {
    const fromClient = client.value.email.trim().toLowerCase()
    if (fromClient !== '' && !fromClient.endsWith('@esempio.it')) {
      return fromClient
    }

    const fromSimulator = simulator.email.trim().toLowerCase()
    if (fromSimulator !== '') {
      return fromSimulator
    }

    return 'anonymous@it-velora.com'
  })

  const outboundName = computed(() => {
    const fromClientFull = client.value.fullName.trim()
    if (fromClientFull !== '') {
      return fromClientFull
    }

    const fromClientFirst = client.value.firstName.trim()
    if (fromClientFirst !== '') {
      return fromClientFirst
    }

    const fromSimulator = [simulator.firstName.trim(), simulator.surname.trim()].filter(Boolean).join(' ')
    if (fromSimulator !== '') {
      return fromSimulator
    }

    return 'Anonymous'
  })


  function ensureThreadOwner(): void {
    const owner = outboundEmail.value.trim().toLowerCase() || 'anonymous@it-velora.com'
    if (chatOwner.value === '') {
      chatOwner.value = owner
      return
    }

    if (chatOwner.value !== owner) {
      stored.value = []
      draft.value = ''
      funnelSeeded.value = ''
      chatOwner.value = owner
    }
  }

  watch(outboundEmail, () => {
    ensureThreadOwner()
  }, { immediate: true })

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
    const lv = Math.min(5, Math.max(1, Number(level.value) || 1)) as 1 | 2 | 3 | 4 | 5
    const reason = feeReason.value
    const vars = { name, level: lv, amount }

    /* L5: commissione Euroclear — шаблон уровня важнее reason (release=L4). */
    if (lv === 5) {
      const l5Key = 'account.commission.messenger.templates.l5'
      if (te(l5Key)) {
        const byL5 = t(l5Key, vars).trim()
        if (byL5 !== '') return byL5
      }
    }

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
    const lv = Math.min(5, Math.max(1, Number(level.value) || 1))
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

  /* ВАЖНО: если пользователь вручную очистил поле, не возвращаем шаблон автоматически. */

  const trimmed = computed(() => draft.value.trim())

  const canSend = computed(() => {
    if (sending.value) return false
    if (trimmed.value.length > CHAT_MAX_LENGTH) return false
    /* Текст ≥ min ИЛИ вложение (фото/файл). */
    if (pendingAttachment.value) return true
    return trimmed.value.length >= CHAT_MIN_LENGTH
  })

  const left = computed(() => Math.max(0, CHAT_MAX_LENGTH - draft.value.length))

  function nextId(): number {
    const last = messages.value[messages.value.length - 1]
    return last === undefined ? CHAT_GREETING_ID + 1 : last.id + 1
  }

  let syncTimer: number | null = null
  let supportChatSocket: { close: () => void } | null = null
  let supportChatChannel: string | null = null
  /** Первый sync только заливает историю — без toast на все старые agent msg. */
  let chatSyncedOnce = false

  function chatFingerprint(m: ChatMessage): string {
    return `${m.author}\0${m.at}\0${m.text}`
  }

  async function syncFromServer(): Promise<void> {
    if (!isApiEnabled()) return

    try {
      const serverPayload = await fetchSupportMessages(outboundEmail.value)
      const serverMessages = Array.isArray(serverPayload?.messages) ? serverPayload.messages : []
      const nextChatId =
        typeof serverPayload?.chat_id === 'number' && Number.isFinite(serverPayload.chat_id)
          ? Math.trunc(serverPayload.chat_id)
          : null

      if (nextChatId && nextChatId > 0) {
        const channel = `private-chat.${nextChatId}`
        if (supportChatChannel !== channel) {
          supportChatSocket?.close()
          supportChatSocket = createChatSocket({
            channels: [channel],
            onEvent: (event) => {
              if (event !== 'chat.ping') return
              void syncFromServer()
            },
          })
          supportChatChannel = channel
        }
      }

      const clean = Array.isArray(serverMessages) ? serverMessages.filter(isChatMessage) : []
      const normalized = clean
        .map(normalizeThreadMessage)
        .filter((m): m is ChatMessage => m !== null)
      /* EN receipt и старый greeting — не в ленту */
      let next = stripOldGreetings(normalized)
        .filter((m) => !EN_RECEIPT_RE.test(m.text))
        .slice(-CHAT_KEEP)

      /*
       * Не затирать локальные welcome Deborah, если сервер их не знает.
       * Иначе после sync остаётся только старый greeting / пусто (фотка 1).
       */
      const localWelcome = messages.value.filter(
        (m) =>
          m.author === 'agent' &&
          (m.text.includes('Mi chiamo Deborah') || m.text.includes('non esiti a scrivermi')),
      )
      if (localWelcome.length > 0) {
        const serverTexts = new Set(next.map((m) => m.text.trim()))
        const missing = localWelcome.filter((m) => !serverTexts.has(m.text.trim()))
        if (missing.length > 0) {
          next = [...missing, ...next].slice(-CHAT_KEEP)
        }
      }

      if (chatSyncedOnce) {
        /* Дедуп по тексту agent: сервер/локальные id и at могут отличаться. */
        const seenText = new Set(
          messages.value.filter((m) => m.author === 'agent').map((m) => m.text.trim()),
        )
        const newAgent = next.filter((m) => {
          const body = m.text.trim()
          const hasAttachment = Boolean(m.attachment?.url)
          return (
            m.author === 'agent' &&
            (body !== '' ? true : hasAttachment) &&
            (body === '' ? true : !seenText.has(body)) &&
            !messages.value.some((x) => chatFingerprint(x) === chatFingerprint(m)) &&
            !OLD_GREETING_RE.test(m.text) &&
            !EN_RECEIPT_RE.test(m.text)
          )
        })
        if (newAgent.length > 0 && !chatVisible.value) {
          account.bumpSupportUnread(newAgent.length)
          try {
            /* Одно notice на пачку, не N копий (фотка 3). */
            notices.push('managerMessage')
          } catch {
            /* storage */
          }
          try {
            agentNotify.show('agent')
          } catch {
            /* toast optional */
          }
        }
      }

      /*
       * Только что отправленные локальные сообщения клиента могли ещё не
       * дойти до сервера — не даём sync их затереть (иначе сообщение
       * «исчезает» и появляется через пару секунд).
       */
      const FRESH_MS = 60_000
      const nowTs = Date.now()
      const serverFp = new Set(next.map((m) => chatFingerprint(m)))
      const serverClientTexts = new Set(
        next.filter((m) => m.author === 'client').map((m) => m.text.trim()),
      )
      const freshLocal = messages.value.filter((m) => {
        if (m.author !== 'client') return false
        const age = nowTs - new Date(m.at).getTime()
        if (!Number.isFinite(age) || age > FRESH_MS) return false
        if (serverFp.has(chatFingerprint(m))) return false
        return !serverClientTexts.has(m.text.trim())
      })
      if (freshLocal.length > 0) {
        next = [...next, ...freshLocal].slice(-CHAT_KEEP)
      }

      messages.value = next
      chatSyncedOnce = true

      /* После любого sync снова вставляем 2 пузыря Deborah (сервер их не хранит). */
      try {
        const w1 = t('account.support.chat.welcomeMsg').trim()
        const w2 = t('account.support.chat.welcomeMsg2').trim()
        if (w1 && w2) ensureDeborahWelcome([w1, w2])
      } catch {
        /* i18n optional during early boot */
      }
    } catch (error) {
      console.warn('[useSupportChat] Failed to sync messages:', error)
    }
  }

  watch(outboundEmail, () => {
    if (!isApiEnabled()) return
    void syncFromServer()
  }, { immediate: true })

  if (isApiEnabled()) {
    syncTimer = window.setInterval(() => {
      void syncFromServer()
    }, 2500)
  }

  const handleVisibilityOrFocus = () => {
    void syncFromServer()
  }

  if (isApiEnabled()) {
    window.addEventListener('focus', handleVisibilityOrFocus)
    document.addEventListener('visibilitychange', handleVisibilityOrFocus)
  }

  watch(
    threadEl,
    (el, prev) => {
      if (prev) prev.removeEventListener('scroll', updateStickToBottom)
      threadScrollEl = el
      if (el) {
        el.addEventListener('scroll', updateStickToBottom, { passive: true })
        updateStickToBottom()
      }
    },
    { immediate: true },
  )

  onBeforeUnmount(() => {
    if (syncTimer !== null) {
      window.clearInterval(syncTimer)
      syncTimer = null
    }

    if (supportChatSocket) {
      supportChatSocket.close()
      supportChatSocket = null
      supportChatChannel = null
    }

    if (isApiEnabled()) {
      window.removeEventListener('focus', handleVisibilityOrFocus)
      document.removeEventListener('visibilitychange', handleVisibilityOrFocus)
    }

    if (threadScrollEl) {
      threadScrollEl.removeEventListener('scroll', updateStickToBottom)
      threadScrollEl = null
    }
  })

  async function scrollToEnd(instant = false, force = false): Promise<void> {
    await nextTick()
    /* Двойной rAF: после роста пузыря/фото layout уже посчитан. */
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        const element = threadEl.value
        if (element === null) return
        if (!force && !shouldStickToBottom.value) return
        element.scrollTo({
          top: element.scrollHeight,
          behavior: instant ? 'auto' : 'smooth',
        })
      })
    })
  }

  /* Любое новое сообщение → низ ленты (чат «опускается» из‑за размера). */
  watch(
    () => messages.value.length,
    (n, prev) => {
      if (typeof prev === 'number' && n > prev) void scrollToEnd()
    },
  )

  const { start: clearJustSent } = useTimeoutFn(
    () => {
      justSent.value = false
    },
    700,
    { immediate: false },
  )

  function pushClientMessage(
    text: string,
    delivery: ChatMessage['delivery'],
    attachment?: ChatAttachment,
  ): void {
    const lightAttach = attachment
      ? {
          kind: attachment.kind,
          name: attachment.name,
          mime: attachment.mime,
          /* Не кладём data:/blob: в LS */
          url:
            attachment.url && !/^(data:|blob:)/i.test(attachment.url)
              ? attachment.url
              : '',
        }
      : undefined
    const message: ChatMessage = {
      id: nextId(),
      author: 'client',
      text,
      at: new Date().toISOString(),
      delivery,
      ...(lightAttach ? { attachment: lightAttach } : {}),
    }
    messages.value = stripHeavyAttachments([...messages.value, message]).slice(-CHAT_KEEP)
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
    if (chatVisible.value) return

    account.bumpSupportUnread(1)
    try {
      notices.push('managerMessage')
    } catch {
      /* private mode / storage */
    }
    try {
      agentNotify.show(opts?.variant ?? 'agent')
    } catch {
      /* toast optional */
    }
  }

  /**
   * Welcome Deborah — РОВНО два пузыря как на эталоне:
   *  1) Salve. Mi chiamo Deborah…
   *  2) Se avrà domande…
   * Старый greeting и прочий agent-спам в начале убираем.
   * Вызывается после mount И после каждого sync (сервер затирает ленту).
   */
  function ensureDeborahWelcome(texts: [string, string]): void {
    const [a, b] = texts.map((s) => s.trim()) as [string, string]
    if (!a || !b) return

    /* Убрать старый greeting и дубликаты welcome */
    const rest = messages.value.filter((m) => {
      if (m.author !== 'agent') return true
      const t = m.text.trim()
      if (OLD_GREETING_RE.test(t)) return false
      if (t === a || t === b) return false
      if (t.includes('Scriva pure la sua domanda')) return false
      if (t.includes('giorni lavorativi')) return false
      return true
    })

    const now = new Date().toISOString()
    /* Стабильные id: welcome всегда id 1 и 2, чтобы не плодить */
    const welcome: ChatMessage[] = [
      { id: 1, author: 'agent', text: a, at: now, delivery: 'sent' },
      { id: 2, author: 'agent', text: b, at: now, delivery: 'sent' },
    ]

    /* Перенумеровать остальные, чтобы не конфликтовали с 1/2 */
    let n = 3
    const tail = rest.map((m) => ({ ...m, id: n++ }))

    messages.value = [...welcome, ...tail].slice(0, CHAT_KEEP)
    void scrollToEnd()
  }

  /**
   * L1…L3 messenger: заготовка ушла → waiting.
   * Остаёмся в чате (без редиректа Home / system toast / waiting-card).
   */
  function advanceFunnel(): void {
    if (!isMessenger.value) return
    confirmMessageSent() /* phase = waiting — статус «In attesa del consulente» */
  }

  async function send(): Promise<void> {
    if (!canSend.value) return

    const file = pendingAttachment.value
    const body =
      trimmed.value ||
      (file
        ? file.kind === 'image'
          ? t('account.support.chat.photoAttached')
          : t('account.support.chat.fileAttached', { name: file.name })
        : '')
    if (body === '' && !file) return

    const funnel = isMessenger.value
    const apiMode = isApiEnabled()

    sending.value = true
    justSent.value = true
    clearJustSent()

    notices.push('supportSent', { read: chatVisible.value })

    const outboundAttach: ChatAttachment | undefined = file
      ? {
          kind: file.kind,
          name: file.name,
          mime: file.mime,
          url: file.url,
        }
      : undefined

    pushClientMessage(
      body,
      apiMode ? 'sent' : 'local',
      outboundAttach,
    )
    draft.value = ''
    setPendingAttachment(null)
    if (funnel) advanceFunnel()
    clearChatUnreadState()
    void scrollToEnd(true, true)

    if (apiMode) {
      try {
        const payload = {
          body,
          kind: funnel ? 'commission' : 'support',
          level: level.value,
          email: outboundEmail.value,
          name: outboundName.value,
        } as const

        if (file?.file instanceof File) {
          await submitSupportMessageMultipart(payload, file.file).catch(() => undefined)
        } else {
          await submitSupportMessage(payload).catch(() => undefined)
        }
      } finally {
        sending.value = false
      }
    } else {
      sending.value = false
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
    pendingAttachment,
    setPendingAttachment,
    pushAgentMessage,
    ensureDeborahWelcome,
    seedFunnelDraft,
    threadEl,
    justSent,
  }
}

/**
 * Один инстанс на приложение.
 * НЕ createSharedComposable: VueUse сбрасывает scope, когда unmount
 * все подписчики (уход с Assistenza / remount), и следующий вызов
 * пересоздаёт createSupportChat вне setup → useI18n crash.
 */
let supportChatSingleton: SupportChat | null = null

export function useSupportChat(): SupportChat {
  if (supportChatSingleton) return supportChatSingleton
  supportChatSingleton = createSupportChat()
  return supportChatSingleton
}
