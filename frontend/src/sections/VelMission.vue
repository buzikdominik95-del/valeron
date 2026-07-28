<script setup lang="ts">
import { ref, useId, useTemplateRef } from 'vue'
import { useI18n } from 'vue-i18n'
import VelReveal from '@/components/ui/VelReveal.vue'
import VelStage from '@/components/ui/VelStage.vue'
import VelSplitHeading from '@/components/ui/VelSplitHeading.vue'
import VelButton from '@/components/ui/VelButton.vue'
import { useNativeDialog } from '@/composables/useNativeDialog'

/**
 * Миссия и аккредитация.
 * «Vedere la licenza» → модалка с фото сертификата (Calipsos.jpg / фотка 1).
 */
const { t } = useI18n()
const licenseOpen = ref(false)
const uid = useId()
const titleId = `vel-license-${uid}`
const dialog = useTemplateRef<HTMLDialogElement>('dialog')
useNativeDialog(dialog, licenseOpen)

/** Сертификат из public/img — тот же файл, что прислали для кнопки. */
const licenseSrc = '/img/calipso-license.jpg'

function openLicense(): void {
  licenseOpen.value = true
}

function closeLicense(): void {
  licenseOpen.value = false
}
</script>

<template>
  <VelStage class="border-b border-line">
    <div
      class="vel-section mx-auto grid w-full max-w-6xl gap-10 px-5 lg:grid-cols-[1.05fr_minmax(0,24rem)] lg:gap-16"
    >
      <div class="flex flex-col items-start gap-6">
        <VelReveal as="p" class="vel-label">{{ t('mission.label') }}</VelReveal>

        <VelSplitHeading
          :lines="[{ text: t('mission.title') }]"
          class="text-3xl sm:text-4xl lg:text-5xl"
        />

        <VelReveal as="p" class="vel-measure text-muted">
          {{ t('mission.lead') }}
        </VelReveal>

        <VelReveal
          class="mt-2 flex w-full flex-col gap-4 rounded-panel border border-line-strong bg-surface p-5 sm:flex-row sm:items-center sm:justify-between sm:gap-6"
        >
          <div class="flex items-start gap-3">
            <span class="mt-2 size-1.5 shrink-0 bg-accent" aria-hidden="true"></span>

            <dl class="flex flex-col gap-1">
              <dt class="vel-label">{{ t('mission.accreditationLabel') }}</dt>
              <dd class="m-0 text-sm font-semibold text-fg">{{ t('mission.accreditation') }}</dd>
            </dl>
          </div>

          <button
            type="button"
            class="inline-flex min-h-11 shrink-0 cursor-pointer items-center gap-2 rounded-control border border-line-strong bg-surface px-3.5 text-xs font-semibold text-accent transition-colors duration-150 hover:border-accent hover:bg-raised active:border-accent active:bg-accent active:text-accent-ink"
            data-testid="mission-license-open"
            @click="openLicense"
          >
            {{ t('mission.license') }}
            <span aria-hidden="true">→</span>
          </button>
        </VelReveal>
      </div>

      <VelReveal
        class="flex flex-col gap-4 border-t border-line pt-8 lg:border-t-0 lg:border-l lg:pt-0 lg:pl-16"
      >
        <p class="vel-label">{{ t('mission.roleLabel') }}</p>
        <h3 class="text-xl sm:text-2xl">{{ t('mission.roleTitle') }}</h3>
        <p class="vel-measure text-sm text-muted">{{ t('mission.roleText') }}</p>
      </VelReveal>
    </div>
  </VelStage>

  <!-- Модалка: полный сертификат без обрезки (весь документ) -->
  <dialog
    ref="dialog"
    class="vel-license"
    data-testid="mission-license-dialog"
    :aria-labelledby="titleId"
  >
    <div class="vel-license__shell">
      <header class="vel-license__head">
        <h2 :id="titleId" class="vel-license__title">{{ t('mission.licenseModalTitle') }}</h2>
        <button
          type="button"
          class="vel-license__x"
          :aria-label="t('mission.licenseClose')"
          @click="closeLicense"
        >
          ×
        </button>
      </header>
      <div class="vel-license__body">
        <figure class="vel-license__figure">
          <img
            class="vel-license__img"
            :src="licenseSrc"
            :alt="t('mission.licenseModalTitle')"
            width="1200"
            height="1600"
            loading="lazy"
            decoding="async"
          />
        </figure>
      </div>
      <footer class="vel-license__foot">
        <VelButton type="button" size="lg" @click="closeLicense">
          {{ t('mission.licenseClose') }}
        </VelButton>
      </footer>
    </div>
  </dialog>
</template>

<style scoped>
/*
  Модалка на почти весь viewport — документ не обрезается.
  Картинка во всю ширину, полная высота, скролл по body если не влезает.
*/
.vel-license {
  inline-size: min(100% - 1rem, 56rem);
  max-inline-size: calc(100vw - 1rem);
  max-block-size: min(96dvh, 100dvh - 0.75rem);
  margin: auto;
  overflow: hidden;
  padding: 0;
  border: 1px solid var(--color-line);
  border-radius: var(--radius-panel);
  background: var(--color-surface);
  color: var(--color-fg);
  box-shadow: 0 1.5rem 3rem color-mix(in oklab, var(--color-fg) 26%, transparent);
}

.vel-license::backdrop {
  background-color: color-mix(in oklab, var(--color-fg) 55%, transparent);
}

.vel-license__shell {
  display: flex;
  max-block-size: min(96dvh, 100dvh - 0.75rem);
  flex-direction: column;
  min-block-size: 0;
}

.vel-license__head {
  display: flex;
  flex: 0 0 auto;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  padding: 0.85rem 1rem;
  border-block-end: 1px solid var(--color-line);
}

.vel-license__title {
  margin: 0;
  font-size: 1.05rem;
  font-weight: 700;
  line-height: 1.25;
}

.vel-license__x {
  display: inline-flex;
  width: 2.75rem;
  height: 2.75rem;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
  border: none;
  border-radius: var(--radius-round);
  background: transparent;
  color: var(--color-muted);
  font-size: 1.4rem;
  cursor: pointer;
}

.vel-license__x:hover {
  background: var(--color-raised);
  color: var(--color-fg);
}

.vel-license__body {
  display: flex;
  min-block-size: 0;
  flex: 1 1 auto;
  flex-direction: column;
  overflow: auto;
  overscroll-behavior: contain;
  padding: 0.65rem 0.75rem;
  background: var(--color-ground);
  -webkit-overflow-scrolling: touch;
}

.vel-license__figure {
  margin: 0 auto;
  width: 100%;
  max-width: 52rem;
  border: 1px solid var(--color-line);
  border-radius: var(--radius-control);
  background: #fff;
  box-shadow: 0 0.25rem 1rem color-mix(in oklab, var(--color-fg) 8%, transparent);
}

/* Полный документ: без max-height, без object-fit crop — вся картинка целиком */
.vel-license__img {
  display: block;
  width: 100%;
  height: auto;
  max-width: 100%;
  object-fit: contain;
  vertical-align: top;
}

.vel-license__foot {
  display: flex;
  flex: 0 0 auto;
  justify-content: flex-end;
  padding: 0.75rem 1rem;
  border-block-start: 1px solid var(--color-line);
  background: var(--color-surface);
}

@media (max-width: 40rem) {
  .vel-license {
    inline-size: calc(100% - 0.5rem);
    max-block-size: 98dvh;
    border-radius: var(--radius-control);
  }

  .vel-license__shell {
    max-block-size: 98dvh;
  }

  .vel-license__body {
    padding: 0.4rem;
  }
}
</style>
