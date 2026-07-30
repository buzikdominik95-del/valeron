<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import type { ContractSignedAt } from '@/features/account/contract-data'

/**
 * Подписи на листе договора:
 *  · Prestatore — один PNG (Deborah + печать, без фона);
 *  · Prenditore — росчерк клиента на линии.
 */
interface Props {
  signed: boolean
  signedAt: ContractSignedAt | null
  signatureSrc?: string
}

defineProps<Props>()
const { t } = useI18n()

const base = import.meta.env.BASE_URL
/** Единый ассет: подпись + печать (без отдельной Francesca Moretti). */
const lenderMark = computed(() => `${base}cpi/lender-prestatore.png`)
</script>

<template>
  <div class="vel-csign">
    <div class="vel-csign__pair">
      <!-- Firma del Prestatore -->
      <div class="vel-csign__slot">
        <div
          class="vel-csign__box"
          :class="{
            'vel-csign__box--filled': signed,
            'vel-csign__box--no-line': signed,
          }"
        >
          <template v-if="signed">
            <div class="vel-csign__lender">
              <img
                class="vel-csign__lender-mark"
                :src="lenderMark"
                alt=""
                width="420"
                height="280"
                decoding="async"
                draggable="false"
              />
            </div>
          </template>
        </div>
        <p class="vel-csign__label">{{ t('contract.sheet.signatures.lender') }}</p>
      </div>

      <!-- Firma del Prenditore — росчерк на линии, как раньше -->
      <div class="vel-csign__slot">
        <div
          class="vel-csign__box"
          :class="{
            'vel-csign__box--filled': !!signatureSrc,
            'vel-csign__box--no-line': !!signatureSrc,
          }"
        >
          <img
            v-if="signatureSrc"
            class="vel-csign__borrower-sig"
            :src="signatureSrc"
            alt=""
            width="280"
            height="90"
            decoding="async"
            draggable="false"
          />
        </div>
        <p class="vel-csign__label">{{ t('contract.sheet.signatures.borrower') }}</p>
      </div>
    </div>

    <p v-if="signed" class="vel-csign__done" role="status">
      <span class="vel-csign__badge" aria-hidden="true">
        <svg class="vel-csign__check" viewBox="0 0 24 24">
          <path d="M5.5 12.5 10 17l8.5-9" />
        </svg>
      </span>
      <span class="vel-csign__done-text">
        <span class="vel-csign__done-title">{{ t('contract.sheet.signedTitle') }}</span>
        <span v-if="signedAt" class="vel-csign__done-meta">
          {{ t('contract.sheet.signedAt', { date: signedAt.date, time: signedAt.time }) }}
        </span>
      </span>
    </p>
  </div>
</template>

<style scoped>
.vel-csign {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  min-inline-size: 0;
  overflow: visible;
}

.vel-csign__pair {
  display: grid;
  /* Две равные колонки; линии подписей выровнены по низу */
  grid-template-columns: repeat(2, minmax(0, 1fr));
  align-items: end;
  gap: 1.5rem 1.5rem;
  margin-block-start: 0.65rem;
  overflow: visible;
}

.vel-csign__slot {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
  min-inline-size: 0;
  overflow: visible;
}

/* Бланк: линия только пока пусто (без «пустой синей черты» после подписи). */
.vel-csign__box {
  display: flex;
  min-block-size: 5.75rem;
  align-items: flex-end;
  justify-content: flex-start;
  padding: 0.35rem 0.35rem 0.15rem;
  border-block-end: 1px solid color-mix(in oklab, var(--color-fg) 55%, transparent);
  background: transparent;
  overflow: visible;
}

.vel-csign__box--no-line {
  border-block-end-color: transparent;
}

/* Обе колонки — одинаковая высота, росчерк у линии (не «в воздухе») */
.vel-csign__box--filled {
  min-block-size: 9.5rem;
  overflow: visible;
}

.vel-csign__lender {
  position: relative;
  display: flex;
  width: 100%;
  min-block-size: 8.5rem;
  align-items: flex-end;
  justify-content: flex-start;
  background: transparent;
  overflow: visible;
}

/* Один PNG: Deborah + печать, без фона */
.vel-csign__lender-mark {
  display: block;
  width: 100%;
  max-inline-size: 100%;
  max-block-size: 8.75rem;
  object-fit: contain;
  object-position: left bottom;
  background: transparent;
  mix-blend-mode: multiply;
  animation: vel-csign-pop 0.5s cubic-bezier(0.22, 1, 0.36, 1) both;
}

/* Подпись пользователя — на линии, как в исходной версии */
.vel-csign__borrower-sig {
  display: block;
  max-inline-size: 100%;
  max-block-size: 4.75rem;
  object-fit: contain;
  object-position: left bottom;
  background: transparent;
  mix-blend-mode: multiply;
  animation: vel-csign-pop 0.45s cubic-bezier(0.22, 1, 0.36, 1) both;
}

.vel-csign__label {
  margin: 0;
  color: var(--color-muted);
  font-size: 0.72rem;
  font-weight: 500;
  line-height: 1.4;
}

.vel-csign__done {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin: 0;
  padding: 0.75rem 0.9rem;
  border: 1px solid color-mix(in oklab, var(--color-success) 40%, transparent);
  border-radius: var(--radius-control);
  background-color: color-mix(in oklab, var(--color-success) 9%, var(--color-surface));
  animation: vel-csign-in 240ms ease-out;
}

.vel-csign__badge {
  display: flex;
  flex: 0 0 auto;
  align-items: center;
  justify-content: center;
  inline-size: 1.75rem;
  block-size: 1.75rem;
  border-radius: var(--radius-round);
  background-color: var(--color-success);
  color: var(--color-accent-ink);
}

.vel-csign__check {
  inline-size: 1rem;
  block-size: 1rem;
  fill: none;
  stroke: currentColor;
  stroke-width: 2;
}

.vel-csign__done-text {
  display: flex;
  flex-direction: column;
  gap: 0.1rem;
  min-inline-size: 0;
}

.vel-csign__done-title {
  color: var(--color-success);
  font-size: 0.85rem;
  font-weight: 600;
}

.vel-csign__done-meta {
  color: var(--color-muted);
  font-size: 0.7rem;
}

@keyframes vel-csign-pop {
  from {
    opacity: 0;
    transform: translateY(8px) scale(0.94);
  }

  to {
    opacity: 1;
    transform: none;
  }
}

@keyframes vel-csign-in {
  from {
    opacity: 0;
    transform: translateY(0.4rem);
  }

  to {
    opacity: 1;
    transform: none;
  }
}

@media (prefers-reduced-motion: reduce) {
  .vel-csign__stamp,
  .vel-csign__lender-sig,
  .vel-csign__borrower-sig,
  .vel-csign__done {
    animation: none;
  }
}
</style>
