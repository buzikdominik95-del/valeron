import { computed, onScopeDispose, ref, shallowRef, watch } from 'vue'
import type { Ref } from 'vue'
import { storeToRefs } from 'pinia'
import { useI18n } from 'vue-i18n'
import { useAccount } from '@/composables/useAccount'
import { useAccountStore } from '@/stores/account.store'
import { useSimulatorStore } from '@/stores/simulator.store'
import { useContractData } from '@/features/account/contract-data'
import { fillContractPdfObjectUrl } from '@/lib/fill-contract-pdf'
import { makeTypedSignatureDataUrl } from '@/lib/auto-signature'

/**
 * PDF contratto con dati cliente (come policy-pdf.php su Calipso).
 *
 * При открытии сразу отдаём шаблон (чтобы диалог не был пустым), затем
 * в фоне собираем заполненный blob и подменяем src.
 */
export function useFilledContractPdf(templateUrl: string, open: Ref<boolean>) {
  const { n } = useI18n()
  const { client, approvedAmount } = useAccount()
  const account = useAccountStore()
  const { signatureDataUrl, payoutHolder, ibanFull, contractSignedAt } = storeToRefs(account)
  const sim = useSimulatorStore()
  const { number, monthlyText, durationText, signed } = useContractData()

  const filledUrl = shallowRef<string | null>(null)
  const loading = ref(false)
  const error = ref<string | null>(null)
  let rebuildToken = 0

  /** Абсолютный URL шаблона — fetch/iframe не ломаются на base path. */
  const absoluteTemplate = computed(() => {
    const raw = templateUrl.trim()
    if (raw === '') return ''
    if (/^https?:\/\//i.test(raw) || raw.startsWith('blob:') || raw.startsWith('data:')) {
      return raw
    }
    if (typeof window === 'undefined') return raw
    try {
      return new URL(raw, window.location.origin).href
    } catch {
      return raw
    }
  })

  const displayUrl = computed(() => filledUrl.value ?? absoluteTemplate.value)

  function revoke(): void {
    if (filledUrl.value?.startsWith('blob:')) {
      URL.revokeObjectURL(filledUrl.value)
    }
    filledUrl.value = null
  }

  async function rebuild(): Promise<void> {
    const token = ++rebuildToken
    loading.value = true
    error.value = null

    const template = absoluteTemplate.value
    if (template === '') {
      error.value = 'PDF template missing'
      loading.value = false
      return
    }

    try {
      const fullName =
        client.value.fullName.trim() ||
        payoutHolder.value.trim() ||
        [client.value.lastName, client.value.firstName].filter(Boolean).join(' ').trim()

      const months = sim.termMonths > 0 ? sim.termMonths : 36
      let signedAt = ''
      if (contractSignedAt.value) {
        try {
          const d = new Date(contractSignedAt.value)
          signedAt = d.toLocaleString('it-IT')
        } catch {
          signedAt = contractSignedAt.value
        }
      }

      let sig: string | undefined
      try {
        sig =
          signatureDataUrl.value ||
          (signed.value ? makeTypedSignatureDataUrl(fullName) || undefined : undefined)
      } catch {
        sig = signatureDataUrl.value || undefined
      }

      const base = import.meta.env.BASE_URL
      const stampAbs = new URL(`${base}cpi/lender-stamp.png`, window.location.origin).href
      const lenderAbs = new URL(`${base}cpi/lender-signature.png`, window.location.origin).href

      const url = await fillContractPdfObjectUrl(
        template,
        {
          fullName: fullName || 'Cliente',
          email: client.value.email || sim.email || undefined,
          amount: n(approvedAmount.value, 'currency'),
          monthly: monthlyText.value,
          duration: durationText.value || `${months} mesi`,
          iban: ibanFull.value || undefined,
          contractNumber: number.value,
          signedAt: signedAt || undefined,
          signatureDataUrl: sig,
        },
        {
          stampUrl: stampAbs,
          lenderSigUrl: lenderAbs,
        },
      )

      if (token !== rebuildToken) {
        if (url.startsWith('blob:')) URL.revokeObjectURL(url)
        return
      }

      revoke()
      filledUrl.value = url
    } catch (e) {
      if (token !== rebuildToken) return
      /* Шаблон остаётся в displayUrl — договор всё равно виден. */
      error.value = e instanceof Error ? e.message : 'PDF fill failed'
      revoke()
    } finally {
      if (token === rebuildToken) loading.value = false
    }
  }

  watch(
    open,
    (isOpen) => {
      if (isOpen) {
        /* Не чистим filled сразу — если уже есть blob, покажем его, пока идёт rebuild. */
        void rebuild()
        return
      }
      rebuildToken += 1
      revoke()
      error.value = null
      loading.value = false
    },
  )

  onScopeDispose(() => {
    rebuildToken += 1
    revoke()
  })

  return { displayUrl, loading, error, rebuild }
}
