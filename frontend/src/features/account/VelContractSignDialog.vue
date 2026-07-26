<script setup lang="ts">
import { computed, nextTick, ref, useId, useTemplateRef, watch } from 'vue'
import type { ComponentPublicInstance } from 'vue'
import { useI18n } from 'vue-i18n'
import { useMaskedInput } from '@/composables/useMaskedInput'
import { useNativeDialog } from '@/composables/useNativeDialog'
import { useSignaturePad } from '@/composables/useSignaturePad'
import type { SignatureMode } from '@/composables/useSignaturePad'
import { useAccount } from '@/composables/useAccount'
import { useAccountStore } from '@/stores/account.store'
import { ibanExpectedLength, ibanShapeProblem } from '@/lib/iban'
import { PAYOUT_ACCOUNT_RULES } from '@/features/account/payout-fields'
import VelButton from '@/components/ui/VelButton.vue'
import VelField from '@/components/ui/VelField.vue'
import VelInput from '@/components/ui/VelInput.vue'
import VelSignatureModes from '@/features/account/VelSignatureModes.vue'

/**
 * Одна модалка: IBAN + подпись договора.
 * IBAN / ФИО подставляются из уже введённых данных, если есть.
 */
const open = defineModel<boolean>('open', { default: false })

const emit = defineEmits<{
  confirm: [payload: { dataUrl: string; ibanSaved: boolean }]
}>()

const { t } = useI18n()
const account = useAccountStore()
const { client } = useAccount()

const uid = useId()
const titleId = `vel-csign-dlg-${uid}`
const dialog = useTemplateRef<HTMLDialogElement>('dialog')
useNativeDialog(dialog, open)

/** Поле IBAN показываем всегда, но с автозаполнением если уже был. */
const needIban = computed(() => true)

const ibanValue = ref('')
const ibanInput = useTemplateRef<ComponentPublicInstance>('ibanInput')
const rule = PAYOUT_ACCOUNT_RULES.iban
const expected = computed(() => ibanExpectedLength(ibanValue.value))
const limit = computed(() => expected.value ?? rule.max)
const required = computed(() => expected.value ?? rule.min)

const { raw: ibanRaw } = useMaskedInput(() => ibanInput.value, {
  model: ibanValue,
  maxLength: () => limit.value,
  allow: rule.allow,
  upper: rule.upper,
})

const ibanOk = computed(() => {
  if (ibanRaw.value.length < required.value) return false
  return ibanShapeProblem(ibanRaw.value) === null
})

const mode = ref<SignatureMode>('draw')
const typedName = ref('')
const canvas = ref<HTMLCanvasElement | null>(null)
const { isEmpty, isDrawing, clear, toDataUrl } = useSignaturePad({ canvas, mode, typedName })

watch(
  open,
  async (isOpen) => {
    if (!isOpen) return
    typedName.value =
      account.payoutHolder.trim() ||
      client.value.fullName.trim() ||
      [client.value.lastName, client.value.firstName].filter(Boolean).join(' ')
    /* post: dialog content mounted; full IBAN from prior entry */
    const saved = account.ibanFull.trim()
    ibanValue.value = saved
    await nextTick()
    if (saved && ibanValue.value !== saved) ibanValue.value = saved
    clear()
  },
  { flush: 'post' },
)

const canConfirm = computed(() => ibanOk.value && !isEmpty.value)

function onConfirm(): void {
  if (!canConfirm.value) return
  const dataUrl = toDataUrl()
  if (!dataUrl) return

  let ibanSaved = false
  if (ibanRaw.value) {
    account.setIbanFromRaw(ibanRaw.value)
    ibanSaved = true
  }
  if (typedName.value.trim()) {
    account.setPayoutHolder(typedName.value)
  }

  emit('confirm', { dataUrl, ibanSaved })
  open.value = false
}
</script>

<template>
  <dialog ref="dialog" class="vel-csign-dlg" :aria-labelledby="titleId">
    <form class="vel-csign-dlg__form" @submit.prevent="onConfirm">
      <button
        type="button"
        class="vel-csign-dlg__x"
        :aria-label="t('account.signature.close')"
        @click="open = false"
      >
        ×
      </button>

      <div class="flex flex-col gap-1">
        <p class="vel-label m-0">{{ t('account.signature.overline') }}</p>
        <h2 :id="titleId" class="m-0 text-xl font-semibold sm:text-2xl">
          {{ t('account.contractSign.title') }}
        </h2>
        <p class="m-0 text-sm text-muted">{{ t('account.contractSign.lead') }}</p>
      </div>

      <!-- IBAN в той же модалке, если ещё не вводили -->
      <div v-if="needIban" class="flex flex-col gap-3">
        <p class="vel-label m-0">{{ t('account.contractSign.ibanStep') }}</p>
        <VelField :label="t('contract.card.enterIban')">
          <VelInput
            ref="ibanInput"
            v-model="ibanValue"
            inputmode="text"
            autocomplete="off"
            spellcheck="false"
            :placeholder="t('account.contractSign.ibanPlaceholder')"
          />
        </VelField>
      </div>

      <div class="flex flex-col gap-3">
        <p class="vel-label m-0">{{ t('account.contractSign.signStep') }}</p>
        <VelSignatureModes v-model="mode" />

        <div
          class="vel-csign-dlg__pad"
          :class="{ 'vel-csign-dlg__pad--on': isDrawing }"
        >
          <canvas
            ref="canvas"
            class="vel-csign-dlg__canvas"
            width="640"
            height="200"
          />
          <p v-if="isEmpty && mode === 'draw'" class="vel-csign-dlg__hint">
            {{ t('account.signature.placeholder') }}
          </p>
          <VelField
            v-if="mode === 'type'"
            class="vel-csign-dlg__type"
            :label="t('account.signature.nameLabel')"
          >
            <VelInput v-model="typedName" autocomplete="name" spellcheck="false" />
          </VelField>
        </div>

        <button type="button" class="vel-link self-start text-sm" @click="clear">
          {{ t('account.signature.clear') }}
        </button>
      </div>

      <VelButton type="submit" size="lg" block :disabled="!canConfirm">
        {{ t('account.contractSign.confirm') }}
      </VelButton>
    </form>
  </dialog>
</template>

<style scoped>
.vel-csign-dlg {
  inline-size: min(100% - 1rem, 32rem);
  max-block-size: min(94dvh, 48rem);
  overflow-y: auto;
  overscroll-behavior: contain;
  padding: 0;
  border: 1px solid var(--color-line);
  border-radius: var(--radius-panel);
  background: var(--color-surface);
  color: var(--color-fg);
  box-shadow: 0 1.5rem 3rem color-mix(in oklab, var(--color-fg) 24%, transparent);
}

.vel-csign-dlg::backdrop {
  background: color-mix(in oklab, var(--color-fg) 55%, transparent);
}

.vel-csign-dlg__form {
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 1.15rem;
  padding: 1.35rem 1.4rem 1.5rem;
}

.vel-csign-dlg__x {
  position: absolute;
  top: 0.65rem;
  right: 0.65rem;
  display: inline-flex;
  width: 2.75rem;
  height: 2.75rem;
  align-items: center;
  justify-content: center;
  border: 1px solid var(--color-line);
  border-radius: var(--radius-round);
  background: var(--color-ground);
  font-size: 1.35rem;
  line-height: 1;
  cursor: pointer;
}

.vel-csign-dlg__pad {
  position: relative;
  min-block-size: 10rem;
  border: 2px dashed var(--color-line-strong);
  border-radius: var(--radius-control);
  background: var(--color-ground);
  overflow: hidden;
}

.vel-csign-dlg__pad--on {
  border-color: var(--color-accent);
  border-style: solid;
}

.vel-csign-dlg__canvas {
  display: block;
  width: 100%;
  height: 12.5rem;
  touch-action: none;
  cursor: crosshair;
}

.vel-csign-dlg__hint {
  position: absolute;
  inset: 0;
  display: grid;
  place-items: center;
  margin: 0;
  pointer-events: none;
  color: var(--color-faint);
  font-size: 0.9rem;
}

.vel-csign-dlg__type {
  padding: 0.75rem;
}
</style>
