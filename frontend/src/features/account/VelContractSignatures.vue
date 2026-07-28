<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import type { ContractSignedAt } from '@/features/account/contract-data'

/**
 * Подписи на листе договора:
 *  · Prestatore — печать (целиком) + подпись lender, печать чуть выше;
 *  · Prenditore — росчерк клиента на линии (как было, не поднимаем).
 */
interface Props {
  signed: boolean
  signedAt: ContractSignedAt | null
  signatureSrc?: string
}

defineProps<Props>()
const { t } = useI18n()

const base = import.meta.env.BASE_URL
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
              <!-- Подпись у линии; печать поверх и чуть выше -->
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

      <!-- Firma del Prenditore — росчерк на линии, как раньше -->
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

/* Бланк: подпись всегда у нижней линии */
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

/* Обе колонки — одинаковая высота, росчерк у линии (не «в воздухе») */
.vel-csign__box--filled {
  min-block-size: 9.5rem;
  overflow: visible;
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
  min-block-size: 8.5rem;
  align-items: flex-end;
  background: transparent;
  overflow: visible;
}

/*
 * Печать — полный круг, без обрезки.
 * Ширина не больше колонки; bottom чуть выше линии подписи.
 */
.vel-csign__stamp {
  position: absolute;
  left: 0;
  bottom: 0.55rem;
  z-index: 3;
  width: min(8.5rem, 100%);
  height: min(8.5rem, 100%);
  max-width: 100%;
  object-fit: contain;
  object-position: center center;
  background: transparent;
  opacity: 0.98;
  mix-blend-mode: multiply;
  filter: contrast(1.1) saturate(1.12);
  pointer-events: none;
  animation: vel-csign-pop 0.5s cubic-bezier(0.22, 1, 0.36, 1) both;
}

/* Подпись Prestatore — у линии, под печатью */
.vel-csign__lender-sig {
  position: relative;
  z-index: 1;
  display: block;
  max-inline-size: min(100%, 11rem);
  max-block-size: 3.2rem;
  margin-inline-start: 1.25rem;
  margin-block-end: 0.1rem;
  object-fit: contain;
  object-position: left bottom;
  background: transparent;
  mix-blend-mode: multiply;
  animation: vel-csign-pop 0.48s 0.06s cubic-bezier(0.22, 1, 0.36, 1) both;
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
