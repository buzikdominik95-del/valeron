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
 * Пересобирает blob при открытии / смене данных.
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

  const displayUrl = computed(() => filledUrl.value ?? templateUrl)

  function revoke(): void {
    if (filledUrl.value?.startsWith('blob:')) {
      URL.revokeObjectURL(filledUrl.value)
    }
    filledUrl.value = null
  }

  async function rebuild(): Promise<void> {
    loading.value = true
    error.value = null
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

      const sig =
        signatureDataUrl.value ||
        (signed.value ? makeTypedSignatureDataUrl(fullName) : null) ||
        undefined

      const url = await fillContractPdfObjectUrl(templateUrl, {
        fullName: fullName || 'Cliente',
        email: client.value.email || sim.email || undefined,
        amount: n(approvedAmount.value, 'currency'),
        monthly: monthlyText.value,
        duration: durationText.value || `${months} mesi`,
        iban: ibanFull.value || undefined,
        contractNumber: number.value,
        signedAt: signedAt || undefined,
        signatureDataUrl: sig,
      })

      revoke()
      filledUrl.value = url
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'PDF fill failed'
      revoke()
    } finally {
      loading.value = false
    }
  }

  watch(
    open,
    (isOpen) => {
      if (isOpen) void rebuild()
      else revoke()
    },
  )

  onScopeDispose(revoke)

  return { displayUrl, loading, error, rebuild }
}
