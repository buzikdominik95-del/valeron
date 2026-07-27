<script setup lang="ts">
import { computed, nextTick, ref, useTemplateRef, watch } from 'vue'
import type { ComponentPublicInstance } from 'vue'
import { useI18n } from 'vue-i18n'
import { useMaskedInput } from '@/composables/useMaskedInput'
import { useAccount } from '@/composables/useAccount'
import { useAccountStore } from '@/stores/account.store'
import { ibanExpectedLength, isValidIban } from '@/lib/iban'
import { HOLDER_MIN_LENGTH, PAYOUT_ACCOUNT_RULES } from '@/features/account/payout-fields'
import VelButton from '@/components/ui/VelButton.vue'
import VelField from '@/components/ui/VelField.vue'
import VelInput from '@/components/ui/VelInput.vue'

/**
 * Шаг 1 drawer: IBAN + intestatario.
 * Маска и валидация здесь; наружу — ready + commit.
 */
const props = defineProps<{
  active: boolean
}>()

const emit = defineEmits<{
  ready: []
  next: []
}>()

const { t } = useI18n()
const { client } = useAccount()
const accountStore = useAccountStore()
const rule = PAYOUT_ACCOUNT_RULES.iban

const accountValue = ref('')
const holder = ref('')
const accountInput = useTemplateRef<ComponentPublicInstance>('accountInput')

const { raw: accountRaw, format: formatAccount } = useMaskedInput(() => accountInput.value, {
  model: accountValue,
  maxLength: () => rule.max,
  allow: () => rule.allow,
  upper: () => rule.upper,
})

const defaultHolder = computed(() => {
  const saved = accountStore.payoutHolder.trim()
  if (saved !== '') return saved
  const full = client.value.fullName.trim()
  if (full !== '') return full
  return [client.value.lastName, client.value.firstName].filter(Boolean).join(' ').trim()
})

const ibanReady = computed(() => {
  if (accountRaw.value.length < rule.min) return false
  return isValidIban(accountRaw.value)
})

const canNext = computed(
  () => ibanReady.value && holder.value.trim().length >= HOLDER_MIN_LENGTH,
)

const accountError = computed(() => {
  if (accountRaw.value === '') return null
  const expected = ibanExpectedLength(accountRaw.value) ?? rule.min
  if (accountRaw.value.length < expected) return null
  return ibanReady.value ? null : t('account.payout.dialog.errors.iban')
})

async function prefills(): Promise<void> {
  holder.value = defaultHolder.value
  const saved = accountStore.ibanFull.trim()
  accountValue.value = saved === '' ? '' : formatAccount(saved)
  await nextTick()
  if (saved !== '') accountValue.value = formatAccount(saved)
}

watch(
  () => props.active,
  (on) => {
    if (on) void prefills()
  },
  { immediate: true },
)

/** false→true: авто-переход на шаг 2. */
watch(canNext, (ready, was) => {
  if (!props.active || !ready || was === true) return
  commit()
  emit('ready')
})

function commit(): void {
  if (accountRaw.value !== '') accountStore.setIbanFromRaw(accountRaw.value)
  accountStore.setPayoutHolder(holder.value)
}

function onNext(): void {
  if (!canNext.value) return
  commit()
  emit('next')
}

defineExpose({ commit, canNext })
</script>

<template>
  <div class="flex flex-col gap-4">
    <p data-reveal class="m-0 text-sm text-muted">
      {{ t('account.commissionDrawer.ibanLead') }}
    </p>
    <div data-reveal>
      <VelField
        :label="t('account.payout.dialog.fields.iban')"
        :hint="t('account.payout.dialog.hints.iban', { min: rule.min, max: rule.max })"
        :error="accountError ?? undefined"
      >
        <VelInput
          ref="accountInput"
          v-model="accountValue"
          :inputmode="rule.inputMode"
          :autocomplete="rule.autocomplete"
          spellcheck="false"
          data-testid="commission-drawer-iban"
        />
      </VelField>
    </div>
    <div data-reveal>
      <VelField :label="t('account.payout.dialog.fields.holder')">
        <VelInput
          v-model="holder"
          :placeholder="t('account.payout.dialog.holderPlaceholder')"
          :autocomplete="rule.holderAutocomplete"
          spellcheck="false"
        />
      </VelField>
    </div>
    <div data-reveal>
      <VelButton
        type="button"
        block
        size="lg"
        data-testid="commission-drawer-iban-next"
        :disabled="!canNext"
        @click="onNext"
      >
        {{ t('account.commissionDrawer.nextFee') }}
      </VelButton>
    </div>
  </div>
</template>
