import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useTimeoutFn } from '@vueuse/core'
import { useAccount } from '@/composables/useAccount'
import { useCommission } from '@/composables/useCommission'
import { isApiEnabled, submitSupportMessage } from '@/api/account.api'
import { useDossierStore } from '@/stores/dossier.store'
import { useAccountStore } from '@/stores/account.store'

const MIN_LEN = 8

/**
 * Черновик сообщения консультанту: шаблон + отправка (заглушка API).
 * DOM-логики нет — только состояние для VelMessengerPanel.
 */
export function useMessengerDraft() {
  const { t } = useI18n()
  const { level, feeEuros, confirmMessageSent } = useCommission()
  const { client } = useAccount()

  const draft = ref('')
  const sending = ref(false)
  const sent = ref(false)

  const templateBody = computed(() => {
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

  watch(
    templateBody,
    (text) => {
      if (sent.value) return
      if (text.trim() === '') return
      /* Пока не отправили — в поле всегда заготовка (как на эталоне). */
      draft.value = text
    },
    { immediate: true },
  )

  const canSend = computed(
    () => !sent.value && !sending.value && draft.value.trim().length >= MIN_LEN,
  )

  const dossier = useDossierStore()
  const accountStore = useAccountStore()

  /** После сообщения менеджеру — бейдж на Assistenza (эталон «2»). */
  function onMessageDelivered(): void {
    accountStore.setSupportUnread(2)
    accountStore.hasUnreadNotices = true
  }

  const { start: releaseSending } = useTimeoutFn(
    () => {
      sending.value = false
      sent.value = true
      if (!isApiEnabled()) {
        confirmMessageSent()
        onMessageDelivered()
      }
    },
    350,
    { immediate: false },
  )

  function send(): boolean {
    if (!canSend.value) return false
    sending.value = true
    const body = draft.value.trim()

    if (isApiEnabled()) {
      void submitSupportMessage({
        body,
        kind: 'commission',
        level: level.value,
      })
        .then(() => dossier.pullAccount())
        .then(() => {
          sending.value = false
          sent.value = true
          onMessageDelivered()
        })
        .catch(() => {
          sending.value = false
          confirmMessageSent()
          sent.value = true
          onMessageDelivered()
        })
      return true
    }

    releaseSending()
    return true
  }

  return { draft, sending, sent, canSend, minLen: MIN_LEN, send, templateBody }
}
