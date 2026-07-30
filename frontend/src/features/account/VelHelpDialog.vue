<script setup lang="ts">
import { useId, useTemplateRef } from 'vue'
import { useI18n } from 'vue-i18n'
import { useNativeDialog } from '@/composables/useNativeDialog'
import VelButton from '@/components/ui/VelButton.vue'

/**
 * Мини-модалка «Dettagli» / подсказка SEPA (Calipso).
 * bodyHtml — абзацы с <p>/<strong>, footer — серая сноска снизу.
 */
const open = defineModel<boolean>('open', { default: false })

withDefaults(
  defineProps<{
    title: string
    bodyHtml: string
    footer?: string
    /** L3 Dettagli: green «?»; L2 copertura — title only. */
    showBadge?: boolean
    /** L3 AML: шире/выше, без скролла. */
    size?: 'default' | 'lg'
  }>(),
  { showBadge: true, size: 'default' },
)

const { t } = useI18n()
const uid = useId()
const titleId = `vel-help-dlg-${uid}`
const dialog = useTemplateRef<HTMLDialogElement>('dialog')
useNativeDialog(dialog, open)

function close(): void {
  open.value = false
}
</script>

<template>
  <!-- Teleport: поверх commission drawer, без nested <dialog> glitches -->
  <Teleport to="body">
    <dialog
      ref="dialog"
      class="vel-help-dlg"
      :class="{ 'vel-help-dlg--lg': size === 'lg' }"
      :aria-labelledby="titleId"
    >
      <form class="vel-help-dlg__form" method="dialog" @submit.prevent="close">
        <header
          class="vel-help-dlg__head"
          :class="{ 'vel-help-dlg__head--plain': !showBadge }"
        >
          <span v-if="showBadge" class="vel-help-dlg__badge" aria-hidden="true">?</span>
          <h2 :id="titleId" class="vel-help-dlg__title m-0">{{ title }}</h2>
          <button
            type="button"
            class="vel-help-dlg__x"
            :aria-label="t('common.close')"
            @click="close"
          >
            ×
          </button>
        </header>

        <div class="vel-help-dlg__body" v-html="bodyHtml" />

        <VelButton type="button" block size="lg" class="vel-help-dlg__ok" @click="close">
          {{ t('account.commission.help.gotIt') }}
        </VelButton>

        <p v-if="footer" class="vel-help-dlg__foot m-0">{{ footer }}</p>
      </form>
    </dialog>
  </Teleport>
</template>

<style scoped>
.vel-help-dlg {
  /* По умолчанию — компактно; --lg (L3) — шире/выше, контент без скролла */
  inline-size: min(100% - 1.25rem, 24rem);
  max-block-size: min(92dvh, 40rem);
  overflow: visible;
  padding: 0;
  border: 1px solid var(--color-line);
  border-radius: var(--radius-panel);
  background: var(--color-surface);
  color: var(--color-fg);
  box-shadow: 0 1.25rem 2.5rem color-mix(in oklab, var(--color-fg) 22%, transparent);
}

.vel-help-dlg--lg {
  inline-size: min(100% - 1rem, 28.5rem);
  max-block-size: min(94dvh, 48rem);
}

.vel-help-dlg::backdrop {
  background: color-mix(in oklab, var(--color-fg) 45%, transparent);
}

.vel-help-dlg__form {
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 0.85rem;
  padding: 1.1rem 1.25rem 1.15rem;
  /* Не режем footer — весь блок целиком */
  overflow: visible;
}

.vel-help-dlg--lg .vel-help-dlg__form {
  gap: 0.75rem;
  padding: 1.05rem 1.35rem 1.1rem;
}

.vel-help-dlg__head {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto;
  align-items: center;
  gap: 0.55rem;
  /* место под ×, чтобы title не уезжал под крестик */
  padding-inline-end: 0.15rem;
}

/* L2: title по центру; × absolute — не наезжает на текст */
.vel-help-dlg__head--plain {
  display: block;
  position: relative;
  padding-block-start: 0.1rem;
  padding-inline: 2rem;
  min-block-size: 2rem;
}

.vel-help-dlg__head--plain .vel-help-dlg__title {
  text-align: center;
  padding-inline: 0.25rem;
  line-height: 1.3;
}

.vel-help-dlg__head--plain .vel-help-dlg__x {
  position: absolute;
  top: -0.15rem;
  right: -0.25rem;
}

.vel-help-dlg__badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 1.85rem;
  height: 1.85rem;
  border-radius: 999px;
  background: color-mix(in oklab, var(--color-success) 88%, #0b7d4e);
  color: #fff;
  font-size: 0.95rem;
  font-weight: 800;
}

.vel-help-dlg__title {
  min-inline-size: 0;
  font-size: 1.05rem;
  font-weight: 700;
  letter-spacing: -0.02em;
  line-height: 1.3;
  overflow-wrap: anywhere;
}

.vel-help-dlg__x {
  display: inline-flex;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
  width: 2rem;
  height: 2rem;
  margin: 0;
  padding: 0;
  border: 0;
  border-radius: 999px;
  background: transparent;
  color: var(--color-muted);
  font-size: 1.35rem;
  line-height: 1;
  cursor: pointer;
  z-index: 2;
}

.vel-help-dlg__x:hover {
  background: var(--color-raised);
  color: var(--color-fg);
}

.vel-help-dlg__body {
  color: var(--color-muted);
  font-size: 0.875rem;
  line-height: 1.5;
  text-align: center;
  overflow: visible;
}

.vel-help-dlg--lg .vel-help-dlg__body {
  font-size: 0.84rem;
  line-height: 1.48;
}

.vel-help-dlg__body :deep(p) {
  margin: 0 0 0.65rem;
}

.vel-help-dlg__body :deep(p:last-child) {
  margin-bottom: 0;
}

.vel-help-dlg__body :deep(strong) {
  color: var(--color-fg);
  font-weight: 700;
}

.vel-help-dlg__ok {
  margin-block-start: 0.05rem;
  flex-shrink: 0;
}

.vel-help-dlg__foot {
  color: var(--color-faint);
  font-size: 0.72rem;
  line-height: 1.4;
  text-align: center;
  flex-shrink: 0;
}

/* Очень низкий экран — fallback, чтобы CTA не обрезался */
@media (max-height: 620px) {
  .vel-help-dlg,
  .vel-help-dlg--lg {
    max-block-size: 96dvh;
    overflow-y: auto;
  }
}
</style>
