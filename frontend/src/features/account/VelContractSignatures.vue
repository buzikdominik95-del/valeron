<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import type { ContractSignedAt } from '@/features/account/contract-data'

/**
 * Низ листа договора:
 *  · слева Prestatore — печать + подпись с старого прода (pechat / podpisb);
 *  · справа Prenditore — автоподпись клиента (dataURL из модалки / ФИО).
 */
interface Props {
  signed: boolean
  signedAt: ContractSignedAt | null
  /** dataURL PNG подписи заёмщика; пусто — только линия. */
  signatureSrc?: string
}

const props = defineProps<Props>()
const { t } = useI18n()

const base = import.meta.env.BASE_URL
const lenderStamp = computed(() => `${base}cpi/lender-stamp.webp`)
const lenderSignature = computed(() => `${base}cpi/lender-signature.webp`)
</script>

<template>
  <div class="vel-csign">
    <div class="vel-csign__pair">
      <!-- Firma del Prestatore: печать + подпись компании -->
      <div class="vel-csign__slot">
        <div class="vel-csign__lender" :class="{ 'vel-csign__lender--on': signed }">
          <template v-if="signed">
            <img
              class="vel-csign__stamp"
              :src="lenderStamp"
              alt=""
              width="120"
              height="120"
            />
            <img
              class="vel-csign__lender-sig"
              :src="lenderSignature"
              alt=""
              width="200"
              height="72"
            />
          </template>
          <span v-else class="vel-csign__line" aria-hidden="true" />
        </div>
        <p class="vel-csign__label">{{ t('contract.sheet.signatures.lender') }}</p>
      </div>

      <!-- Firma del Prenditore: автоподпись клиента -->
      <div class="vel-csign__slot">
        <div class="vel-csign__ink">
          <img
            v-if="signatureSrc"
            class="vel-csign__png"
            :src="signatureSrc"
            alt=""
            width="240"
            height="72"
          />
          <span v-else class="vel-csign__line" aria-hidden="true" />
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
}

.vel-csign__pair {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(min(11rem, 100%), 1fr));
  gap: 1.25rem;
  margin-block-start: 0.5rem;
}

.vel-csign__slot {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
  min-inline-size: 0;
}

.vel-csign__line {
  display: block;
  block-size: 2.25rem;
  border-block-end: 1px solid var(--color-fg);
}

.vel-csign__lender {
  position: relative;
  display: flex;
  min-block-size: 5.5rem;
  align-items: flex-end;
  justify-content: flex-start;
}

.vel-csign__lender--on {
  min-block-size: 6.5rem;
}

.vel-csign__stamp {
  position: absolute;
  left: 0;
  bottom: 0.35rem;
  z-index: 1;
  width: 5.25rem;
  height: 5.25rem;
  object-fit: contain;
  opacity: 0.92;
  pointer-events: none;
  animation: vel-csign-pop 0.5s cubic-bezier(0.22, 1, 0.36, 1) both;
}

.vel-csign__lender-sig {
  position: relative;
  z-index: 2;
  display: block;
  max-inline-size: min(100%, 11rem);
  max-block-size: 3.75rem;
  margin-inline-start: 1.75rem;
  object-fit: contain;
  object-position: left bottom;
  animation: vel-csign-pop 0.45s 0.08s cubic-bezier(0.22, 1, 0.36, 1) both;
}

.vel-csign__ink {
  display: flex;
  min-block-size: 2.75rem;
  align-items: flex-end;
}

.vel-csign__png {
  display: block;
  max-inline-size: 100%;
  max-block-size: 4.5rem;
  object-fit: contain;
  object-position: left bottom;
  animation: vel-csign-pop 0.45s cubic-bezier(0.22, 1, 0.36, 1) both;
}

@keyframes vel-csign-pop {
  from {
    opacity: 0;
    transform: translateY(6px) scale(0.96);
  }

  to {
    opacity: 1;
    transform: none;
  }
}

@media (prefers-reduced-motion: reduce) {
  .vel-csign__png,
  .vel-csign__stamp,
  .vel-csign__lender-sig {
    animation: none;
  }
}

.vel-csign__label {
  margin: 0;
  color: var(--color-muted);
  font-size: 0.72rem;
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
  stroke-linecap: butt;
  stroke-linejoin: miter;
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
  line-height: 1.3;
}

.vel-csign__done-meta {
  color: var(--color-muted);
  font-size: 0.7rem;
  line-height: 1.4;
}

@keyframes vel-csign-in {
  from {
    opacity: 0;
    transform: translateY(0.4rem);
  }

  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@media (prefers-reduced-motion: reduce) {
  .vel-csign__done {
    animation: none;
  }
}
</style>
