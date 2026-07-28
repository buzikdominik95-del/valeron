<script setup lang="ts">
import { ref, useId } from 'vue'
import { useI18n } from 'vue-i18n'
import { useSignaturePad } from '@/composables/useSignaturePad'
import { useDialogFocus } from '@/composables/useDialogFocus'
import type { SignatureMode } from '@/composables/useSignaturePad'
import VelButton from '@/components/ui/VelButton.vue'
import VelSignatureClose from '@/features/account/VelSignatureClose.vue'

/**
 * Модальная панель подписи договора — только росчерк (графическая подпись).
 * Набор имени буквами убран по брифу (фотка 4): режим draw зафиксирован.
 *
 * Рисование — useSignaturePad, окно — useDialogFocus, крестик — VelSignatureClose.
 */
const open = defineModel<boolean>('open', { default: false })

const emit = defineEmits<{
  /** Готовая подпись в виде dataURL (image/png). */
  confirm: [dataUrl: string]
}>()

const { t } = useI18n()

const uid = useId()
const titleId = `vel-signature-title-${uid}`
const leadId = `vel-signature-lead-${uid}`

const panel = ref<HTMLElement | null>(null)
const canvas = ref<HTMLCanvasElement | null>(null)

/** Только draw — mode ref нужен useSignaturePad API. */
const mode = ref<SignatureMode>('draw')
const typedName = ref('')

const { isEmpty, isDrawing, clear, toDataUrl } = useSignaturePad({ canvas, mode, typedName })

function close(): void {
  open.value = false
}

useDialogFocus({ panel, open, onEscape: close })

function confirm(): void {
  const dataUrl = toDataUrl()
  if (!dataUrl) return
  emit('confirm', dataUrl)
  close()
}
</script>

<template>
  <!-- В body, а не на месте: панель обязана лежать над всей страницей, а любой
       overflow или transform у предка сделал бы position: fixed относительным
       к нему и обрезал бы окно. -->
  <Teleport to="body">
    <Transition name="vel-signature">
      <div v-if="open" class="vel-signature">
        <div
          ref="panel"
          class="vel-signature__panel"
          role="dialog"
          aria-modal="true"
          :aria-labelledby="titleId"
          :aria-describedby="leadId"
          tabindex="-1"
        >
          <VelSignatureClose @click="close" />

          <div class="flex flex-col gap-2">
            <p class="vel-label">{{ t('account.signature.overline') }}</p>
            <h2 :id="titleId" class="text-2xl sm:text-3xl">{{ t('account.signature.title') }}</h2>
            <p :id="leadId" class="text-sm text-muted">{{ t('account.signature.leadDraw') }}</p>
          </div>

          <div
            class="vel-signature__area"
            :class="{ 'vel-signature__area--active': isDrawing }"
          >
            <canvas
              ref="canvas"
              class="vel-signature__canvas"
              role="img"
              :aria-label="t('account.signature.canvasLabel')"
            ></canvas>

            <p v-if="isEmpty" class="vel-signature__hint">
              {{ t('account.signature.placeholder') }}
            </p>
          </div>

          <div class="vel-signature__actions">
            <VelButton type="button" variant="outline" :disabled="isEmpty" @click="clear">
              {{ t('account.signature.clear') }}
            </VelButton>

            <VelButton type="button" :disabled="isEmpty" @click="confirm">
              {{ t('account.signature.confirm') }}
            </VelButton>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.vel-signature {
  position: fixed;
  inset: 0;
  z-index: 60;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1rem;
  /* Затемнение собрано из токена текста: сырых значений в проекте нет,
     а смена гаммы перекрашивает подложку вместе со всем остальным. */
  background-color: color-mix(in oklab, var(--color-fg) 55%, transparent);
}

.vel-signature__panel {
  position: relative;
  display: flex;
  width: 100%;
  max-width: 34rem;
  /* Низкое окно (ландшафт на телефоне) — панель прокручивается сама,
     а не вылезает за экран. */
  max-height: min(90dvh, 44rem);
  overflow-y: auto;
  overscroll-behavior: contain;
  flex-direction: column;
  gap: 1.25rem;
  padding: 1.75rem;
  border: 1px solid var(--color-line);
  border-radius: var(--radius-panel);
  background-color: var(--color-surface);
}

/* Фокус приходит сюда программно, только если внутри не нашлось ни одного
   элемента. Рамка была бы шумом; :focus-visible из base остаётся. */
.vel-signature__panel:focus:not(:focus-visible) {
  outline: none;
}

.vel-signature__area {
  /* Гарнитура подписи для режима ввода: её читает useSignaturePad
     с канваса. Значение живёт в CSS, а не константой в коде. */
  --vel-signature-family: 'Segoe Script', 'Bradley Hand', 'Snell Roundhand', 'Brush Script MT',
    cursive;

  position: relative;
  /* Высота растёт с шириной панели, но упирается в разумные края: подписи
     нужна полоса, а не квадрат. */
  height: clamp(9rem, 34vw, 12.5rem);
  border: 2px dashed var(--color-line-strong);
  border-radius: var(--radius-panel);
  background-color: var(--color-ground);
  transition: border-color 150ms;
}

.vel-signature__area--active {
  border-color: var(--color-accent);
}

.vel-signature__canvas {
  position: absolute;
  inset: 0;
  display: block;
  width: 100%;
  height: 100%;
  /* Без этого палец на канвасе прокручивает страницу вместо рисования,
     а браузер отменяет указатель на первом же движении. */
  touch-action: none;
  cursor: crosshair;
}

.vel-signature__hint {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--color-faint);
  font-size: 0.875rem;
  /* Подсказка не должна перехватывать первое касание */
  pointer-events: none;
}

.vel-signature__actions {
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 0.75rem;
}

/* Появление: подложка гаснет, панель приподнимается. Анимация, а не переход —
   элемент приходит через v-if, и Vue снимает классы по animationend. */
.vel-signature-enter-active {
  animation: vel-signature-fade 160ms ease-out;
}

.vel-signature-leave-active {
  animation: vel-signature-fade-out 200ms ease-in both;
}

.vel-signature-enter-active .vel-signature__panel {
  animation: vel-signature-rise 200ms ease-out;
}

.vel-signature-leave-active .vel-signature__panel {
  animation: vel-signature-fall 200ms ease-in both;
}

@keyframes vel-signature-fade {
  from {
    opacity: 0;
  }

  to {
    opacity: 1;
  }
}

@keyframes vel-signature-fade-out {
  from {
    opacity: 1;
  }

  to {
    opacity: 0;
  }
}

@keyframes vel-signature-rise {
  from {
    transform: translateY(0.75rem);
  }

  to {
    transform: translateY(0);
  }
}

@keyframes vel-signature-fall {
  from {
    opacity: 1;
    transform: translateY(0) scale(1);
  }

  to {
    opacity: 0;
    transform: translateY(0.55rem) scale(0.97);
  }
}

@media (prefers-reduced-motion: reduce) {
  /* Сброс из main.css правит только длительность: анимация всё равно
     проигралась бы, просто мгновенно. Здесь снимаем её целиком. */
  .vel-signature-enter-active,
  .vel-signature-leave-active,
  .vel-signature-enter-active .vel-signature__panel,
  .vel-signature-leave-active .vel-signature__panel {
    animation: none;
  }

  .vel-signature__area {
    transition: none;
  }
}
</style>
