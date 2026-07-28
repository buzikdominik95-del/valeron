<script setup lang="ts">
import { useTemplateRef, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { usePreferredReducedMotion } from '@vueuse/core'
import VelLogo from '@/components/ui/VelLogo.vue'
import VelButton from '@/components/ui/VelButton.vue'
import VelTextAnimate from '@/components/magic/VelTextAnimate.vue'
import VelBlurFade from '@/components/magic/VelBlurFade.vue'
import VelBorderBeam from '@/components/magic/VelBorderBeam.vue'
import { useAccountView } from '@/composables/useAccountView'
import { useCabinetExistsGate } from '@/composables/useCabinetExistsGate'

/**
 * Полноэкран: «Hai già un'area personale» + CTA в кабинет.
 * Показывается, если пользователь снова жмёт квиз после регистрации.
 */
const open = defineModel<boolean>('open', { default: false })

const { t } = useI18n()
const { open: openCabinet } = useAccountView()
const gate = useCabinetExistsGate()
const reduced = usePreferredReducedMotion()
const panel = useTemplateRef<HTMLElement>('panel')

watch(open, (isOpen) => {
  if (isOpen && panel.value) {
    panel.value.focus({ preventScroll: true })
  }
})

function enterCabinet(): void {
  open.value = false
  gate.hide()
  openCabinet()
}

function stayOnSite(): void {
  open.value = false
  gate.hide()
}
</script>

<template>
  <Teleport to="body">
    <Transition name="vel-cgate">
      <div
        v-if="open"
        ref="panel"
        class="vel-cgate"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="vel-cgate-title"
        aria-describedby="vel-cgate-body"
        tabindex="-1"
        data-testid="cabinet-exists-gate"
      >
        <div class="vel-cgate__scrim" aria-hidden="true" />
        <div class="vel-cgate__panel">
          <VelBorderBeam :duration-ms="5200" :size="64" />

          <div class="vel-cgate__logo-wrap" aria-hidden="true">
            <span class="vel-cgate__ring" />
            <VelLogo class="vel-cgate__logo" />
          </div>

          <template v-if="open">
            <VelTextAnimate
              id="vel-cgate-title"
              as="h2"
              class="vel-cgate__title"
              animation="blurUp"
              :stagger-ms="reduced === 'reduce' ? 0 : 36"
              :duration-ms="reduced === 'reduce' ? 0 : 420"
              :delay-ms="80"
              :text="t('nav.cabinetGate.title')"
            />

            <VelBlurFade :delay-ms="240" :duration-ms="480" :offset-px="10">
              <p id="vel-cgate-body" class="vel-cgate__body m-0">
                {{ t('nav.cabinetGate.body') }}
              </p>
            </VelBlurFade>

            <VelBlurFade :delay-ms="380" :duration-ms="460" :offset-px="8">
              <div class="vel-cgate__actions">
                <VelButton
                  size="lg"
                  class="vel-cgate__cta"
                  data-testid="cabinet-exists-enter"
                  @click="enterCabinet"
                >
                  {{ t('nav.cabinetGate.cta') }}
                </VelButton>
                <button
                  type="button"
                  class="vel-cgate__link"
                  data-testid="cabinet-exists-dismiss"
                  @click="stayOnSite"
                >
                  {{ t('nav.cabinetGate.dismiss') }}
                </button>
              </div>
            </VelBlurFade>
          </template>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.vel-cgate {
  position: fixed;
  inset: 0;
  z-index: 90;
  display: grid;
  place-items: center;
  padding: 1.25rem;
}

.vel-cgate__scrim {
  position: absolute;
  inset: 0;
  background:
    radial-gradient(
      ellipse 80% 60% at 50% 35%,
      color-mix(in oklab, var(--color-accent) 28%, transparent),
      color-mix(in oklab, var(--color-fg) 72%, #0a0a14) 75%
    );
  backdrop-filter: blur(6px) saturate(0.92);
  animation: vel-cgate-scrim 0.55s ease-out both;
}

.vel-cgate__panel {
  position: relative;
  z-index: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.9rem;
  inline-size: min(100%, 24rem);
  padding: 2rem 1.5rem 1.6rem;
  border: 1px solid color-mix(in oklab, var(--color-accent) 32%, var(--color-line));
  border-radius: var(--radius-panel);
  background: var(--color-surface);
  text-align: center;
  box-shadow:
    0 1.5rem 3rem color-mix(in oklab, var(--color-fg) 28%, transparent),
    inset 0 1px 0 color-mix(in oklab, #fff 70%, transparent);
  animation: vel-cgate-panel 0.55s cubic-bezier(0.22, 1, 0.36, 1) both;
}

.vel-cgate__logo-wrap {
  position: relative;
  display: grid;
  place-items: center;
  inline-size: 4.5rem;
  block-size: 4.5rem;
}

.vel-cgate__ring {
  position: absolute;
  inset: 0;
  border: 2px solid color-mix(in oklab, var(--color-accent) 45%, transparent);
  border-radius: 999px;
  animation: vel-cgate-ring 1.8s ease-out infinite;
}

.vel-cgate__logo {
  position: relative;
  z-index: 1;
  transform: scale(1.15);
}

.vel-cgate__title {
  margin: 0.25rem 0 0;
  color: var(--color-fg);
  font-size: clamp(1.15rem, 3.8vw, 1.4rem);
  font-weight: 800;
  letter-spacing: -0.02em;
  line-height: 1.2;
}

.vel-cgate__body {
  color: var(--color-muted);
  font-size: 0.92rem;
  line-height: 1.45;
  max-inline-size: 22rem;
}

.vel-cgate__actions {
  display: flex;
  flex-direction: column;
  align-items: stretch;
  gap: 0.65rem;
  inline-size: 100%;
  margin-block-start: 0.35rem;
}

.vel-cgate__cta {
  width: 100%;
}

.vel-cgate__link {
  margin: 0;
  padding: 0.45rem;
  border: 0;
  background: transparent;
  color: var(--color-muted);
  font: inherit;
  font-size: 0.85rem;
  font-weight: 600;
  cursor: pointer;
  text-decoration: underline;
  text-underline-offset: 0.15em;
}

.vel-cgate__link:hover {
  color: var(--color-fg);
}

.vel-cgate-enter-active,
.vel-cgate-leave-active {
  transition: opacity 0.32s ease;
}

.vel-cgate-enter-from,
.vel-cgate-leave-to {
  opacity: 0;
}

@keyframes vel-cgate-scrim {
  from {
    opacity: 0;
  }

  to {
    opacity: 1;
  }
}

@keyframes vel-cgate-panel {
  from {
    opacity: 0;
    transform: translateY(0.85rem) scale(0.96);
  }

  to {
    opacity: 1;
    transform: none;
  }
}

@keyframes vel-cgate-ring {
  0% {
    opacity: 0.7;
    transform: scale(0.85);
  }

  100% {
    opacity: 0;
    transform: scale(1.35);
  }
}

@media (prefers-reduced-motion: reduce) {
  .vel-cgate__scrim,
  .vel-cgate__panel,
  .vel-cgate__ring {
    animation: none;
  }

  .vel-cgate-enter-active,
  .vel-cgate-leave-active {
    transition: none;
  }
}
</style>
