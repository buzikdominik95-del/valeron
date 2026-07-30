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
  }>(),
  { showBadge: true },
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
    <dialog ref="dialog" class="vel-help-dlg" :aria-labelledby="titleId">
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
  inline-size: min(100% - 1.25rem, 22.5rem);
  max-block-size: min(90dvh, 36rem);
  overflow-y: auto;
  padding: 0;
  border: 1px solid var(--color-line);
  border-radius: var(--radius-panel);
  background: var(--color-surface);
  color: var(--color-fg);
  box-shadow: 0 1.25rem 2.5rem color-mix(in oklab, var(--color-fg) 22%, transparent);
}

.vel-help-dlg::backdrop {
  background: color-mix(in oklab, var(--color-fg) 45%, transparent);
}

.vel-help-dlg__form {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  padding: 1.15rem 1.2rem 1.25rem;
}

.vel-help-dlg__head {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto;
  align-items: center;
  gap: 0.55rem;
}

/* L2: заголовок по центру, без badge «?» */
.vel-help-dlg__head--plain {
  grid-template-columns: 2rem minmax(0, 1fr) 2rem;
}

.vel-help-dlg__head--plain .vel-help-dlg__title {
  text-align: center;
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
  font-size: 1.05rem;
  font-weight: 700;
  letter-spacing: -0.02em;
}

.vel-help-dlg__x {
  display: inline-flex;
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
}

.vel-help-dlg__x:hover {
  background: var(--color-raised);
  color: var(--color-fg);
}

.vel-help-dlg__body {
  color: var(--color-muted);
  font-size: 0.9rem;
  line-height: 1.55;
  text-align: center;
}

.vel-help-dlg__body :deep(p) {
  margin: 0 0 0.75rem;
}

.vel-help-dlg__body :deep(p:last-child) {
  margin-bottom: 0;
}

.vel-help-dlg__body :deep(strong) {
  color: var(--color-fg);
  font-weight: 700;
}

.vel-help-dlg__ok {
  margin-block-start: 0.15rem;
}

.vel-help-dlg__foot {
  color: var(--color-faint);
  font-size: 0.75rem;
  line-height: 1.45;
  text-align: center;
}
</style>
