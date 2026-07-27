<script setup lang="ts">
import { computed, useId, useTemplateRef } from 'vue'
import { useI18n } from 'vue-i18n'
import { useNativeDialog } from '@/composables/useNativeDialog'
import VelButton from '@/components/ui/VelButton.vue'

/**
 * PDF внутри модалки кабинета (iframe), без window.open.
 * Шаблон/blob показываем сразу; loading — оверлей, а не пустой экран.
 */
const open = defineModel<boolean>('open', { default: false })

const props = withDefaults(
  defineProps<{
    src: string
    title?: string
    loading?: boolean
    error?: string | null
  }>(),
  { title: '', loading: false, error: null },
)

const { t } = useI18n()
const uid = useId()
const titleId = `vel-pdf-dialog-title-${uid}`
const dialog = useTemplateRef<HTMLDialogElement>('dialog')
useNativeDialog(dialog, open)

const hasSrc = computed(() => (props.src ?? '').trim() !== '')

/**
 * Chrome: blob: + #fragment иногда ломает viewer — hash только для http(s).
 */
function viewerSrc(url: string): string {
  if (!url) return ''
  if (url.startsWith('blob:') || url.startsWith('data:')) return url
  const base = url.split('#')[0] ?? url
  return `${base}#view=FitH&toolbar=1&navpanes=0`
}

function close(): void {
  open.value = false
}
</script>

<template>
  <dialog
    ref="dialog"
    class="vel-pdf-dlg"
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
          ×
        </button>
      </header>

      <div class="vel-pdf-dlg__frame-wrap">
        <!-- PDF сразу, если есть src; loading — поверх, не вместо -->
        <template v-if="open && hasSrc">
          <iframe
            class="vel-pdf-dlg__frame"
            :src="viewerSrc(src)"
            :title="title || t('contract.pdfDialog.title')"
          />
          <div
            v-if="loading"
            class="vel-pdf-dlg__loading"
            role="status"
            aria-live="polite"
          >
            {{ t('contract.pdfDialog.loading') }}
          </div>
        </template>
        <p v-else-if="loading" class="vel-pdf-dlg__empty">
          {{ t('contract.pdfDialog.loading') }}
        </p>
        <p v-else class="vel-pdf-dlg__empty">{{ t('contract.pdfDialog.empty') }}</p>
      </div>

      <p v-if="error" class="vel-pdf-dlg__err" role="alert">{{ error }}</p>

      <footer class="vel-pdf-dlg__foot">
        <a
          v-if="hasSrc"
          class="vel-pdf-dlg__ext"
          :href="src"
          target="_blank"
          rel="noopener noreferrer"
        >
          {{ t('contract.pdfDialog.openTab') }}
        </a>
        <span v-else class="vel-pdf-dlg__ext vel-pdf-dlg__ext--muted">
          {{ t('contract.pdfDialog.empty') }}
        </span>
        <VelButton type="button" size="lg" @click="close">
          {{ t('contract.pdfDialog.close') }}
        </VelButton>
      </footer>
    </div>
  </dialog>
</template>

<style scoped>
.vel-pdf-dlg {
  inline-size: min(100% - 0.75rem, 58rem);
  max-block-size: min(96dvh, 56rem);
  overflow: hidden;
  padding: 0;
  border: 1px solid var(--color-line);
  border-radius: var(--radius-panel);
  background: var(--color-surface);
  color: var(--color-fg);
  box-shadow: 0 1.5rem 3rem color-mix(in oklab, var(--color-fg) 28%, transparent);
}

.vel-pdf-dlg::backdrop {
  background-color: color-mix(in oklab, var(--color-fg) 55%, transparent);
}

.vel-pdf-dlg__shell {
  display: flex;
  flex-direction: column;
  gap: 0;
  max-block-size: min(96dvh, 56rem);
}

.vel-pdf-dlg__head {
  display: flex;
  flex-shrink: 0;
  align-items: flex-start;
  justify-content: space-between;
  gap: 0.75rem;
  padding: 1rem 1.15rem 0.85rem;
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
  border: 1px solid var(--color-line);
  border-radius: var(--radius-round);
  background: var(--color-ground);
  color: var(--color-fg);
  font-size: 1.35rem;
  line-height: 1;
  cursor: pointer;
}

.vel-pdf-dlg__frame-wrap {
  position: relative;
  flex: 1 1 auto;
  min-block-size: min(78dvh, 44rem);
  background: #525659;
}

.vel-pdf-dlg__frame {
  display: block;
  width: 100%;
  height: min(78dvh, 44rem);
  border: 0;
  background: #525659;
}

.vel-pdf-dlg__loading {
  position: absolute;
  inset-inline: 0;
  top: 0;
  z-index: 2;
  margin: 0;
  padding: 0.55rem 1rem;
  background: color-mix(in oklab, var(--color-accent-deep) 88%, transparent);
  color: #fff;
  font-size: 0.82rem;
  font-weight: 600;
  text-align: center;
  pointer-events: none;
}

.vel-pdf-dlg__empty {
  margin: 0;
  padding: 2rem 1rem;
  color: #e8eef6;
  text-align: center;
}

.vel-pdf-dlg__err {
  margin: 0;
  padding: 0.5rem 1.15rem;
  border-block-start: 1px solid color-mix(in oklab, var(--color-danger) 35%, var(--color-line));
  background: color-mix(in oklab, var(--color-danger) 8%, var(--color-surface));
  color: var(--color-danger);
  font-size: 0.78rem;
  line-height: 1.35;
}

.vel-pdf-dlg__foot {
  display: flex;
  flex-shrink: 0;
  flex-wrap: wrap;
  align-items: center;
  justify-content: flex-end;
  gap: 0.65rem;
  padding: 0.85rem 1.15rem 1.1rem;
  border-block-start: 1px solid var(--color-line);
  background: var(--color-surface);
}

.vel-pdf-dlg__ext {
  margin-inline-end: auto;
  color: var(--color-accent-deep);
  font-size: 0.85rem;
  font-weight: 600;
  text-decoration: none;
}

.vel-pdf-dlg__ext:hover {
  text-decoration: underline;
}

.vel-pdf-dlg__ext--muted {
  color: var(--color-muted);
  font-weight: 500;
  pointer-events: none;
}

.vel-pdf-dlg[open] {
  animation: vel-pdf-in 200ms ease-out;
}

@keyframes vel-pdf-in {
  from {
    opacity: 0;
    transform: translateY(0.6rem);
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
