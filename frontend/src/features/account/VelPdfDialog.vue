<script setup lang="ts">
import { computed, useId, useTemplateRef } from 'vue'
import { useI18n } from 'vue-i18n'
import { useNativeDialog } from '@/composables/useNativeDialog'
import VelButton from '@/components/ui/VelButton.vue'

/**
 * Модалка документа:
 * — CPI: картинка policy-template + оверлей ФИО
 * — Contratto: слот #default (полный VelContractSheet) или PDF src
 */
const open = defineModel<boolean>('open', { default: false })

const props = withDefaults(
  defineProps<{
    /** Картинка бланка CPI. */
    previewImage?: string
    /** ФИО на строке Cliente (только CPI). */
    holderName?: string
    signatureUrl?: string
    title?: string
    loading?: boolean
    error?: string | null
    nameMode?: 'cpi' | 'none'
    /** Заполненный PDF (blob:/url) — Contratto. */
    src?: string
  }>(),
  {
    previewImage: '',
    holderName: '',
    signatureUrl: '',
    title: '',
    loading: false,
    error: null,
    nameMode: 'cpi',
    src: '',
  },
)

const slots = defineSlots<{
  default?: () => unknown
}>()

const { t } = useI18n()
const uid = useId()
const titleId = `vel-pdf-dialog-title-${uid}`
const dialog = useTemplateRef<HTMLDialogElement>('dialog')
useNativeDialog(dialog, open)

const hasPreview = computed(() => (props.previewImage ?? '').trim() !== '')
const hasPdf = computed(() => (props.src ?? '').trim() !== '')
const hasSlot = computed(() => typeof slots.default === 'function')
const nameText = computed(() => {
  if (props.nameMode === 'none') return ''
  return (props.holderName ?? '').trim()
})
const hasSig = computed(
  () => props.nameMode !== 'none' && (props.signatureUrl ?? '').trim() !== '',
)

function close(): void {
  open.value = false
}
</script>

<template>
  <dialog
    ref="dialog"
    class="vel-pdf-dlg"
    :class="{ 'vel-pdf-dlg--wide': hasSlot || hasPdf }"
    data-testid="pdf-dialog"
    :aria-labelledby="titleId"
  >
    <div class="vel-pdf-dlg__shell">
      <header class="vel-pdf-dlg__head">
        <div class="min-w-0">
          <p class="vel-label m-0">{{ t('contract.pdfDialog.overline') }}</p>
          <h2 :id="titleId" class="vel-pdf-dlg__title">
            {{ title || t('contract.pdfDialog.title') }}
          </h2>
        </div>
        <button
          type="button"
          class="vel-pdf-dlg__x"
          :aria-label="t('contract.pdfDialog.close')"
          @click="close"
        >
          <svg class="vel-pdf-dlg__x-ico" viewBox="0 0 24 24" aria-hidden="true">
            <path d="M6 6 18 18M18 6 6 18" />
          </svg>
        </button>
      </header>

      <div class="vel-pdf-dlg__body">
        <div v-if="loading" class="vel-pdf-dlg__loading" role="status">
          {{ t('contract.pdfDialog.loading') }}
        </div>

        <!-- Полный Contratto di credito al consumo (лист договора) -->
        <div v-else-if="hasSlot" class="vel-pdf-dlg__slot">
          <slot />
        </div>

        <!-- PDF blob (fallback) -->
        <div v-else-if="hasPdf" class="vel-pdf-dlg__pdf-wrap">
          <object
            class="vel-pdf-dlg__pdf"
            :data="src"
            type="application/pdf"
            :aria-label="title || t('contract.pdfDialog.title')"
          >
            <iframe class="vel-pdf-dlg__pdf" :src="src" title="PDF" />
          </object>
        </div>

        <!-- CPI image + name overlay -->
        <div v-else-if="hasPreview" class="vel-pdf-dlg__sheet-wrap">
          <div class="vel-pdf-dlg__sheet">
            <img
              class="vel-pdf-dlg__img"
              :src="previewImage"
              :alt="title || t('contract.pdfDialog.title')"
              width="600"
              height="auto"
            />
            <span v-if="nameText" class="vel-pdf-dlg__name" aria-hidden="true">{{ nameText }}</span>
            <img
              v-if="hasSig"
              class="vel-pdf-dlg__sig"
              :src="signatureUrl"
              alt=""
              aria-hidden="true"
            />
          </div>
        </div>

        <p v-else class="vel-pdf-dlg__empty">{{ t('contract.pdfDialog.empty') }}</p>
      </div>

      <p v-if="error" class="vel-pdf-dlg__err" role="alert">{{ error }}</p>

      <footer class="vel-pdf-dlg__foot">
        <VelButton type="button" size="lg" block @click="close">
          {{ t('contract.pdfDialog.close') }}
        </VelButton>
      </footer>
    </div>
  </dialog>
</template>

<style scoped>
.vel-pdf-dlg {
  inline-size: min(100% - 0.85rem, 36rem);
  max-block-size: min(96dvh, 54rem);
  overflow: hidden;
  padding: 0;
  border: 1px solid var(--color-line);
  border-radius: var(--radius-panel);
  background: var(--color-surface);
  color: var(--color-fg);
  box-shadow: 0 1.5rem 3rem color-mix(in oklab, var(--color-fg) 28%, transparent);
}

.vel-pdf-dlg--wide {
  inline-size: min(100% - 0.85rem, 44rem);
}

.vel-pdf-dlg__slot {
  display: flex;
  flex-direction: column;
}

.vel-pdf-dlg__pdf-wrap {
  overflow: hidden;
  min-block-size: min(70dvh, 36rem);
  border: 1px solid var(--color-line);
  border-radius: var(--radius-control);
  background: #fff;
}

.vel-pdf-dlg__pdf {
  display: block;
  width: 100%;
  min-block-size: min(70dvh, 36rem);
  border: 0;
}

.vel-pdf-dlg::backdrop {
  background-color: color-mix(in oklab, var(--color-fg) 55%, transparent);
}

.vel-pdf-dlg__shell {
  display: flex;
  flex-direction: column;
  max-block-size: min(96dvh, 54rem);
}

.vel-pdf-dlg__head {
  display: flex;
  flex-shrink: 0;
  align-items: flex-start;
  justify-content: space-between;
  gap: 0.75rem;
  padding: 1rem 1.1rem 0.85rem;
  border-block-end: 1px solid var(--color-line);
}

.vel-pdf-dlg__title {
  margin: 0.15rem 0 0;
  font-size: 1.15rem;
  font-weight: 700;
  line-height: 1.25;
}

.vel-pdf-dlg__x {
  display: inline-flex;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
  width: 2.75rem;
  height: 2.75rem;
  padding: 0;
  border: 0;
  border-radius: var(--radius-round);
  background: transparent;
  box-shadow: none;
  color: var(--color-muted);
  cursor: pointer;
  transition: color 140ms ease, background-color 140ms ease;
}

.vel-pdf-dlg__x:hover {
  background: var(--color-raised);
  color: var(--color-fg);
}

.vel-pdf-dlg__x:focus,
.vel-pdf-dlg__x:focus-visible {
  outline: none;
  border: 0;
  box-shadow: none;
}

.vel-pdf-dlg__x-ico {
  width: 1.15rem;
  height: 1.15rem;
  fill: none;
  stroke: currentColor;
  stroke-width: 2;
  stroke-linecap: square;
  stroke-linejoin: miter;
}

.vel-pdf-dlg__body {
  flex: 1 1 auto;
  min-block-size: 0;
  overflow: auto;
  padding: 0.85rem 0.9rem;
  background: var(--color-ground);
}

.vel-pdf-dlg__loading,
.vel-pdf-dlg__empty {
  margin: 0;
  padding: 2rem 1rem;
  color: var(--color-muted);
  text-align: center;
  font-size: 0.9rem;
}

.vel-pdf-dlg__sheet-wrap {
  display: flex;
  justify-content: center;
}

.vel-pdf-dlg__sheet {
  position: relative;
  width: 100%;
  max-inline-size: 34rem;
  overflow: hidden;
  border: 1px solid var(--color-line);
  border-radius: var(--radius-control);
  background: #fff;
  box-shadow: 0 0.35rem 1.1rem color-mix(in oklab, var(--color-fg) 10%, transparent);
  /* % / cqw привязаны к ширине бланка, не viewport */
  container-type: inline-size;
  container-name: cpi-sheet;
}

.vel-pdf-dlg__img {
  display: block;
  width: 100%;
  height: auto;
}

/*
 * ФИО на CPI-бланке (policy-template.png):
 *   Cliente label ~23.32%; имя left 29.4%, top 23.38% (+2px вниз).
 *   Кегль ~1.8cqw.
 */
.vel-pdf-dlg__name {
  position: absolute;
  left: 29.4%;
  top: 23.38%;
  max-width: 52%;
  overflow: hidden;
  color: #1f2022;
  font-family: 'Times New Roman', Times, 'Liberation Serif', 'Noto Serif', serif;
  font-size: 0.9rem;
  font-size: 1.8cqw;
  font-weight: 600;
  font-style: normal;
  line-height: 1;
  letter-spacing: 0;
  /* На пару px толще (как PDF-вложение CPI) */
  -webkit-text-stroke: 0.45px currentColor;
  paint-order: stroke fill;
  white-space: nowrap;
  text-overflow: ellipsis;
  pointer-events: none;
}

/* Росчерк в зоне Firma (левый низ бланка) */
.vel-pdf-dlg__sig {
  position: absolute;
  left: 14%;
  bottom: 9.5%;
  width: min(28%, 7.5rem);
  height: auto;
  max-height: 2.4rem;
  object-fit: contain;
  object-position: left bottom;
  opacity: 0.92;
  pointer-events: none;
}

.vel-pdf-dlg__err {
  margin: 0;
  padding: 0.5rem 1.1rem;
  border-block-start: 1px solid color-mix(in oklab, var(--color-danger) 35%, var(--color-line));
  background: color-mix(in oklab, var(--color-danger) 8%, var(--color-surface));
  color: var(--color-danger);
  font-size: 0.78rem;
}

.vel-pdf-dlg__foot {
  flex-shrink: 0;
  padding: 0.85rem 1.1rem 1.05rem;
  border-block-start: 1px solid var(--color-line);
  background: var(--color-surface);
}

.vel-pdf-dlg[open] {
  animation: vel-pdf-in 200ms ease-out;
}

@keyframes vel-pdf-in {
  from {
    opacity: 0;
    transform: translateY(0.55rem);
  }

  to {
    opacity: 1;
    transform: none;
  }
}

@media (prefers-reduced-motion: reduce) {
  .vel-pdf-dlg[open] {
    animation: none;
  }
}
</style>
