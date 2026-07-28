<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import type { ContractSignedAt } from '@/features/account/contract-data'

/**
 * Подписи на листе договора:
 *  · Prestatore — печать + подпись с прода (без «шахматки» прозрачности);
 *  · Prenditore — росчерк клиента (авто из ФИО / canvas).
 */
interface Props {
  signed: boolean
  signedAt: ContractSignedAt | null
  signatureSrc?: string
}

defineProps<Props>()
const { t } = useI18n()

const base = import.meta.env.BASE_URL
/* Печать Velora (крупная, поверх подписи — 66.txt §7 / 3.png) */
const lenderStamp = computed(() => `${base}cpi/velora-seal.png`)
const lenderSignature = computed(() => `${base}cpi/lender-signature.webp`)
</script>

<template>
  <div class="vel-csign">
    <div class="vel-csign__pair">
      <!-- Firma del Prestatore -->
      <div class="vel-csign__slot">
        <div class="vel-csign__box" :class="{ 'vel-csign__box--filled': signed }">
          <template v-if="signed">
            <div class="vel-csign__lender">
              <!-- Подпись снизу, печать крупнее и поверх (z-index) -->
              <img
                class="vel-csign__lender-sig"
                :src="lenderSignature"
                alt=""
                width="220"
                height="80"
                decoding="async"
                draggable="false"
              />
              <img
                class="vel-csign__stamp"
                :src="lenderStamp"
                alt=""
                width="200"
                height="200"
                decoding="async"
                draggable="false"
              />
            </div>
          </template>
          <span v-else class="vel-csign__placeholder-line" aria-hidden="true" />
        </div>
        <p class="vel-csign__label">{{ t('contract.sheet.signatures.lender') }}</p>
      </div>

      <!-- Firma del Prenditore — росчерк из ФИО / canvas, хранится в store -->
      <div class="vel-csign__slot">
        <div class="vel-csign__box" :class="{ 'vel-csign__box--filled': !!signatureSrc }">
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
          <span v-else class="vel-csign__placeholder-line" aria-hidden="true" />
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
  grid-template-columns: repeat(auto-fit, minmax(min(12.5rem, 100%), 1fr));
  gap: 1.5rem 2rem;
  margin-block-start: 0.65rem;
}

.vel-csign__slot {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
  min-inline-size: 0;
}

/* «Бланк» под подпись — чистая бумага, без подложки/шахматки */
.vel-csign__box {
  display: flex;
  min-block-size: 5.75rem;
  align-items: flex-end;
  justify-content: flex-start;
  padding: 0.35rem 0.25rem 0.15rem;
  border-block-end: 1px solid color-mix(in oklab, var(--color-fg) 55%, transparent);
  background: transparent;
}

.vel-csign__box--filled {
  min-block-size: 7.5rem;
}

.vel-csign__placeholder-line {
  display: block;
  width: 100%;
  block-size: 1px;
}

.vel-csign__lender {
  position: relative;
  display: flex;
  width: 100%;
  min-block-size: 6.75rem;
  align-items: flex-end;
  background: transparent;
}

/* Печать крупнее и ПОВЕРХ подписи (66.txt §7) */
.vel-csign__stamp {
  position: absolute;
  left: 0.15rem;
  bottom: -0.15rem;
  z-index: 3;
  width: 7.25rem;
  height: 7.25rem;
  object-fit: contain;
  object-position: left bottom;
  background: transparent;
  opacity: 0.95;
  mix-blend-mode: multiply;
  filter: contrast(1.06) saturate(1.08);
  pointer-events: none;
  animation: vel-csign-pop 0.5s cubic-bezier(0.22, 1, 0.36, 1) both;
}

.vel-csign__lender-sig {
  position: relative;
  z-index: 1;
  display: block;
  max-inline-size: min(100%, 12rem);
  max-block-size: 3.4rem;
  margin-inline-start: 1.4rem;
  margin-block-end: 0.15rem;
  object-fit: contain;
  object-position: left bottom;
  background: transparent;
  mix-blend-mode: multiply;
  animation: vel-csign-pop 0.48s 0.06s cubic-bezier(0.22, 1, 0.36, 1) both;
}

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
