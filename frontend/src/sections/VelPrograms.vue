<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, useTemplateRef } from 'vue'
import { useI18n } from 'vue-i18n'
import { useMediaQuery } from '@vueuse/core'
import VelReveal from '@/components/ui/VelReveal.vue'
import VelStage from '@/components/ui/VelStage.vue'
import VelSplitHeading from '@/components/ui/VelSplitHeading.vue'
import VelProgramCard from '@/sections/VelProgramCard.vue'
import guaranteePhoto from '@/img/garanzia-approvata.webp'
import officePhoto from '@/img/ufficio-open-space.webp'
import approvedPhoto from '@/img/cliente-approvata.webp'
import expertPhoto from '@/img/consulente-tablet.webp'

const { t } = useI18n()

const PROGRAM_PHOTOS: Record<string, string> = {
  grants: officePhoto,
  rate: guaranteePhoto,
  guarantor: approvedPhoto,
  patents: expertPhoto,
}

const PROGRAM_KEYS = ['grants', 'rate', 'guarantor', 'patents'] as const

const programs = computed(() =>
  PROGRAM_KEYS.map((key) => ({
    key,
    title: t(`programs.items.${key}.title`),
    text: t(`programs.items.${key}.text`),
    photo: PROGRAM_PHOTOS[key] ?? '',
  })),
)

/** Mobile carousel (< sm); desktop stays grid. */
const isMobile = useMediaQuery('(max-width: 639px)')
const track = useTemplateRef<HTMLElement>('track')
const active = ref(0)

function updateActive(): void {
  const el = track.value
  if (!el || !isMobile.value) return
  const cards = el.querySelectorAll<HTMLElement>('.vel-programs__card')
  if (cards.length === 0) return

  const mid = el.scrollLeft + el.clientWidth / 2
  let best = 0
  let bestDist = Infinity
  cards.forEach((card, i) => {
    const c = card.offsetLeft + card.offsetWidth / 2
    const d = Math.abs(c - mid)
    if (d < bestDist) {
      bestDist = d
      best = i
    }
  })
  active.value = best
}

function goTo(index: number): void {
  const el = track.value
  if (!el) return
  const cards = el.querySelectorAll<HTMLElement>('.vel-programs__card')
  const card = cards[index]
  if (!card) return
  const left = card.offsetLeft - (el.clientWidth - card.offsetWidth) / 2
  el.scrollTo({ left: Math.max(0, left), behavior: 'smooth' })
  active.value = index
}

onMounted(() => {
  const el = track.value
  if (!el) return
  el.addEventListener('scroll', updateActive, { passive: true })
  updateActive()
})

onUnmounted(() => {
  track.value?.removeEventListener('scroll', updateActive)
})
</script>

<template>
  <VelStage class="border-b border-line">
    <div class="vel-section mx-auto flex w-full max-w-6xl flex-col gap-10 px-5 lg:gap-12">
      <div class="flex flex-col gap-3">
        <VelReveal as="p" class="vel-label">{{ t('programs.label') }}</VelReveal>
        <VelSplitHeading
          :lines="[{ text: t('programs.title') }]"
          class="max-w-3xl text-3xl sm:text-4xl"
        />
      </div>

      <!--
        Mobile: карусель Calipso-style (peek next card + dots).
        sm+: сетка 2 / 4, без точек.
      -->
      <div class="vel-programs">
        <ul
          ref="track"
          role="list"
          class="vel-depth vel-programs__track"
          :aria-roledescription="isMobile ? 'carousel' : undefined"
        >
          <VelReveal
            v-for="(program, index) in programs"
            :key="program.key"
            as="li"
            tilt
            class="vel-programs__card flex flex-col overflow-hidden rounded-panel border border-line bg-surface"
            :aria-current="isMobile && index === active ? 'true' : undefined"
          >
            <VelProgramCard
              :title="program.title"
              :text="program.text"
              :photo="program.photo"
            />
          </VelReveal>
        </ul>

        <!-- Точки-слайдер: только mobile, в стиле сайта -->
        <div
          v-if="isMobile"
          class="vel-programs__dots"
          role="tablist"
          :aria-label="t('programs.label')"
        >
          <button
            v-for="(program, index) in programs"
            :key="program.key"
            type="button"
            role="tab"
            class="vel-programs__dot"
            :class="{ 'vel-programs__dot--on': index === active }"
            :aria-selected="index === active"
            :aria-label="program.title"
            @click="goTo(index)"
          />
        </div>
      </div>
    </div>
  </VelStage>
</template>

<style scoped>
.vel-programs {
  display: flex;
  flex-direction: column;
  gap: 1.15rem;
  min-inline-size: 0;
}

/* ── Desktop / tablet: grid ── */
.vel-programs__track {
  display: grid;
  gap: 1rem;
  margin: 0;
  padding: 0;
  list-style: none;
}

@media (min-width: 640px) {
  .vel-programs__track {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (min-width: 1024px) {
  .vel-programs__track {
    grid-template-columns: repeat(4, minmax(0, 1fr));
  }
}

/* ── Mobile carousel ── */
@media (max-width: 639px) {
  .vel-programs__track {
    display: flex;
    gap: 0.85rem;
    overflow-x: auto;
    overflow-y: hidden;
    scroll-snap-type: x mandatory;
    scroll-padding-inline: 1.25rem;
    -webkit-overflow-scrolling: touch;
    /* прячем scrollbar — навигация через точки */
    scrollbar-width: none;
    margin-inline: -1.25rem;
    padding-inline: 1.25rem;
    padding-block-end: 0.25rem;
  }

  .vel-programs__track::-webkit-scrollbar {
    display: none;
  }

  .vel-programs__card {
    flex: 0 0 min(82vw, 19.5rem);
    scroll-snap-align: center;
    /* лёгкая «карточка в ряду» */
    box-shadow: 0 0.5rem 1.35rem color-mix(in oklab, var(--color-fg) 7%, transparent);
  }
}

/* ── Dots (Calipso-style, Velora tokens) ── */
.vel-programs__dots {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.45rem;
  padding-block: 0.15rem 0.35rem;
}

.vel-programs__dot {
  flex: 0 0 auto;
  width: 0.45rem;
  height: 0.45rem;
  padding: 0;
  border: none;
  border-radius: var(--radius-round);
  background: color-mix(in oklab, var(--color-fg) 16%, transparent);
  cursor: pointer;
  transition:
    width 220ms cubic-bezier(0.22, 1, 0.36, 1),
    background-color 220ms ease,
    transform 180ms ease;
  /* touch target ≥ 44px через padding hit-area */
  box-shadow: 0 0 0 0.55rem transparent;
}

.vel-programs__dot:hover {
  background: color-mix(in oklab, var(--color-accent) 45%, var(--color-fg));
}

.vel-programs__dot:focus-visible {
  outline: 2px solid var(--color-accent);
  outline-offset: 4px;
}

/* активная — «пилюля» акцента */
.vel-programs__dot--on {
  width: 1.15rem;
  background: var(--color-accent-deep);
  transform: scale(1.02);
}

@media (hover: hover) {
  .vel-programs__card {
    transition:
      border-color 260ms ease,
      box-shadow 260ms ease;
  }

  .vel-programs__card:hover {
    border-color: var(--color-accent);
    box-shadow: 0 0.75rem 1.75rem color-mix(in oklab, var(--color-fg) 12%, transparent);
  }

  .vel-programs__card:hover :deep(.vel-program__photo) {
    transform: scale(1.045);
  }
}

@media (prefers-reduced-motion: reduce) {
  .vel-programs__dot {
    transition: none;
  }

  .vel-programs__card:hover :deep(.vel-program__photo) {
    transform: none;
  }
}
</style>
