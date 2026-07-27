<script setup lang="ts">
import { computed, useId, useTemplateRef, watch } from 'vue'
import { storeToRefs } from 'pinia'
import { useI18n } from 'vue-i18n'
import { useAutoAnimate } from '@/composables/useAutoAnimate'
import { useDocumentUpload } from '@/composables/useDocumentUpload'
import { useAccountStore } from '@/stores/account.store'
import { DOC_MAX_FILE_MB, docSideKey } from '@/features/account/doc-kinds'
import type { DocSide } from '@/features/account/doc-kinds'
import VelButton from '@/components/ui/VelButton.vue'
import VelDocChecking from '@/features/account/VelDocChecking.vue'
import VelDocIcon from '@/features/account/VelDocIcon.vue'
import VelDocKindChoice from '@/features/account/VelDocKindChoice.vue'
import VelDocSlotRow from '@/features/account/VelDocSlotRow.vue'
import VelDocVerified from '@/features/account/VelDocVerified.vue'
/**
 * Documenti: idle → checking → verified.
 * До accept — вкладка Documenti; после — Profilo (docsAccepted).
 * Анимация «Documento verificato» ВНУТРИ этой карточки, не отдельным блоком снизу.
 */
const files = defineModel<File[]>({ default: () => [] })
const emit = defineEmits<{ verified: [] }>()

const { t } = useI18n()
const account = useAccountStore()
const { documentsUploaded } = storeToRefs(account)

const docsLocked = computed(() => documentsUploaded.value === true)

const { kind, sides, fileOf, previewOf, rejection, status, ready, pick, submit } =
  useDocumentUpload(files, { locked: docsLocked })

/* Когда проверка дошла до verified — фиксируем в store и закрываем шаг. */
watch(status, (s) => {
  if (s !== 'verified') return
  if (!documentsUploaded.value) {
    documentsUploaded.value = true
  }
  emit('verified')
})

const titleId = `vel-docup-${useId()}`

/** Подпись слота зависит и от вида, и от стороны: у паспорта сторон нет вовсе. */
function slotLabel(side: DocSide): string {
  const current = kind.value
  if (current === null) return ''
  return t(`account.docs.sides.${docSideKey(current, side)}`)
}

const rejectionText = computed(() => {
  const item = rejection.value
  if (item === null) return null
  return t(`account.docs.errors.${item.reason}`, { name: item.name, size: DOC_MAX_FILE_MB })
})

/* Смена вида документа меняет ЧИСЛО слотов (один ↔ два). Без плавного
   перехода строка под ними прыгает на всю высоту слота. */
const slotList = useTemplateRef<HTMLElement>('slotList')
useAutoAnimate(slotList)
</script>

<template>
  <section class="vel-docup" :aria-labelledby="titleId">
    <h2 :id="titleId" class="vel-docup__title">{{ t('account.docs.cardTitle') }}</h2>

    <div class="vel-docup__head">
      <span class="vel-docup__head-mark" aria-hidden="true">
        <VelDocIcon sign="identity" />
      </span>
      <p class="vel-docup__head-name">{{ t('account.docs.identity') }}</p>
      <!-- role=status: смену состояния карточки скринридер обязан услышать,
           а цвет бейджа ему ничего не говорит. -->
      <span class="vel-docup__badge" :class="`vel-docup__badge--${status}`" role="status">
        {{ t(`account.docs.badge.${status}`) }}
      </span>
    </div>

    <template v-if="status === 'idle'">
      <VelDocKindChoice v-model="kind" />

      <ul
        v-if="sides.length > 0"
        ref="slotList"
        class="vel-docup__slots"
        :aria-label="t('account.docs.slotsLabel')"
      >
        <VelDocSlotRow
          v-for="side in sides"
          :key="side"
          :label="slotLabel(side)"
          :file="fileOf(side)"
          :preview="previewOf(side)"
          @pick="pick(side, $event)"
        />
      </ul>

      <p v-if="rejectionText !== null" class="vel-docup__error" role="alert">
        {{ rejectionText }}
      </p>

      <VelButton v-if="kind !== null" block size="lg" :disabled="!ready" @click="submit">
        {{ t('account.docs.submit') }}
      </VelButton>

      <p class="vel-docup__note">
        {{ t('account.docs.limits', { size: DOC_MAX_FILE_MB }) }} · {{ t('account.docs.notSent') }}
      </p>
    </template>

    <VelDocChecking v-else-if="status === 'checking'" />

    <!-- Verified: анимация + lock внутри той же карточки (не отдельным блоком) -->
    <div v-else class="vel-docup__done" role="status">
      <VelDocVerified />
      <p class="vel-docup__done-note">
        {{ t('account.docs.lockedAfterVerify') }}
      </p>
    </div>
  </section>
</template>

<style scoped>
.vel-docup {
  display: flex;
  flex-direction: column;
  gap: 0.875rem;
  padding: 1.125rem;
  border: 1px solid var(--color-line);
  border-radius: var(--radius-panel);
  background-color: var(--color-surface);
}

.vel-docup__title {
  color: var(--color-fg);
  font-size: 1.125rem;
  font-weight: 600;
  line-height: 1.25;
}

/* Строка-заголовок документа: значок, название, состояние. Перенос разрешён —
   на 320px бейдж уезжает на вторую строку вместо того, чтобы сплющить название. */
.vel-docup__head {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.625rem;
  padding-block-end: 0.875rem;
  border-block-end: 1px solid var(--color-line);
}

.vel-docup__head-mark {
  --vel-icon-size: 1.25rem;

  display: inline-flex;
  flex: 0 0 auto;
  align-items: center;
  justify-content: center;
  inline-size: 2.25rem;
  block-size: 2.25rem;
  border-radius: var(--radius-control);
  background-color: var(--color-raised);
  color: var(--color-accent-deep);
}

.vel-docup__head-name {
  min-inline-size: 0;
  flex: 1 1 auto;
  color: var(--color-fg);
  font-size: 0.9375rem;
  font-weight: 600;
}

/*
  Бейдж состояния. Три состояния различаются НЕ ТОЛЬКО цветом: «Da caricare»
  стоит в контурной рамке, «In verifica» на заливке, «Verificato» зелёным с
  собственной рамкой — то есть их видно и в чёрно-белой печати, и при
  дальтонизме.

  На присланных владельцем продукта снимках первый бейдж жёлтый. Жёлтого в палитре
  Velora нет, а заводить его ради одного бейджа значило бы поставить в
  интерфейс цвет без роли и без проверенного контраста. Роль «ещё не сделано»
  у нас уже есть — контурный нейтральный бейдж, тот же, что у невыполненного
  шага в трекере.
*/
.vel-docup__badge {
  flex: 0 0 auto;
  padding-inline: 0.625rem;
  padding-block: 0.25rem;
  border: 1px solid;
  border-radius: var(--radius-control);
  font-size: 0.75rem;
  font-weight: 600;
  white-space: nowrap;
}

.vel-docup__badge--idle {
  border-color: var(--color-line-strong);
  color: var(--color-muted);
}

.vel-docup__badge--checking {
  border-color: var(--color-accent);
  background-color: var(--color-raised);
  color: var(--color-accent-deep);
}

.vel-docup__badge--verified {
  border-color: var(--color-success);
  background-color: color-mix(in oklab, var(--color-success) 12%, var(--color-surface));
  color: var(--color-success);
}

.vel-docup__slots {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.vel-docup__error {
  color: var(--color-danger);
  font-size: 0.75rem;
  line-height: 1.35;
}

.vel-docup__note {
  color: var(--color-faint);
  font-size: 0.75rem;
  line-height: 1.4;
}

.vel-docup__done {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  padding-block-start: 0.25rem;
}

/* Анимация встроена в карточку — чуть компактнее, без внешнего « visания» */
.vel-docup__done :deep(.vel-docdone) {
  padding-block: 0.25rem 0.5rem;
  gap: 0.65rem;
}

.vel-docup__done :deep(.vel-docdone__sign) {
  inline-size: 4.75rem;
  block-size: 4.75rem;
}

.vel-docup__done-note {
  margin: 0;
  padding: 0.75rem 0.9rem;
  border: 1px solid color-mix(in oklab, var(--color-success) 35%, var(--color-line));
  border-radius: var(--radius-control);
  background: color-mix(in oklab, var(--color-success) 8%, var(--color-surface));
  color: var(--color-success);
  font-size: 0.85rem;
  font-weight: 600;
  line-height: 1.4;
  text-align: center;
}
</style>
