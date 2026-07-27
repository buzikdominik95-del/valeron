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
        Mobile: карусель Calipso-style (peek next card + capsule dots).
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
            :class="{ 'vel-programs__card--active': isMobile && index === active }"
            :aria-current="isMobile && index === active ? 'true' : undefined"
          >
            <VelProgramCard
              :title="program.title"
              :text="program.text"
              :photo="program.photo"
            />
          </VelReveal>
        </ul>

        <!--
          Капсула-индикатор (как у Calipso): тёмный активный «хвост» +
          точки. Не нативный scrollbar. Виден только на mobile.
        -->
        <div
          class="vel-programs__pager"
          role="tablist"
          :aria-label="t('programs.label')"
        >
          <div class="vel-programs__capsule" aria-hidden="false">
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
            >
              <span class="vel-programs__dot-core" aria-hidden="true" />
            </button>
          </div>
        </div>
      </div>
    </div>
  </VelStage>
</template>

<style scoped>
.vel-programs {
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
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
    overscroll-behavior-x: contain;
    /* полностью прячем нативный scrollbar — навигация через капсулу */
    scrollbar-width: none;
    -ms-overflow-style: none;
    margin-inline: -1.25rem;
    padding-inline: 1.25rem;
    padding-block-end: 0.15rem;
  }

  .vel-programs__track::-webkit-scrollbar {
    display: none;
    width: 0;
    height: 0;
    background: transparent;
  }

  .vel-programs__card {
    flex: 0 0 min(84vw, 20rem);
    scroll-snap-align: center;
    box-shadow: 0 0.55rem 1.5rem color-mix(in oklab, var(--color-fg) 8%, transparent);
    transition:
      transform 280ms cubic-bezier(0.22, 1, 0.36, 1),
      opacity 280ms ease,
      border-color 260ms ease,
      box-shadow 260ms ease;
    opacity: 0.72;
    transform: scale(0.965);
  }

  .vel-programs__card--active {
    opacity: 1;
    transform: scale(1);
    border-color: color-mix(in oklab, var(--color-accent) 35%, var(--color-line));
    box-shadow:
      0 0.75rem 1.85rem color-mix(in oklab, var(--color-fg) 12%, transparent),
      0 0 0 1px color-mix(in oklab, var(--color-accent) 12%, transparent);
  }
}

/* ── Pager: Calipso-style capsule ── */
.vel-programs__pager {
  display: flex;
  align-items: center;
  justify-content: center;
  padding-block: 0.1rem 0.2rem;
}

/*
  Капсула-пейджер — только для mobile-карусели. С sm вверх карточки лежат
  сеткой (2 / 4), листать нечего, и точки лишние.

  ПОРЯДОК ВАЖЕН. Это правило стоит ПОСЛЕ базового .vel-programs__pager
  { display: flex } намеренно: специфичность у них равная, и решает источник.
  Раньше скрытие жило в блоке @media (min-width: 640px) ВЫШЕ базового flex —
  и flex, будучи позже по файлу, перебивал display:none. Точки показывались
  на десктопе поверх сетки. Теперь скрытие идёт последним и выигрывает.
*/
@media (min-width: 640px) {
  .vel-programs__pager {
    display: none;
  }
}

.vel-programs__capsule {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.35rem;
  padding: 0.4rem 0.55rem;
  border-radius: var(--radius-round);
  background: color-mix(in oklab, var(--color-accent-deep) 92%, #000);
  box-shadow:
    0 0.35rem 0.9rem color-mix(in oklab, var(--color-accent-deep) 28%, transparent),
    inset 0 1px 0 color-mix(in oklab, #fff 10%, transparent);
}

.vel-programs__dot {
  position: relative;
  display: grid;
  place-items: center;
  flex: 0 0 auto;
  width: 0.5rem;
  height: 0.5rem;
  padding: 0;
  margin: 0;
  border: none;
  border-radius: var(--radius-round);
  background: transparent;
  cursor: pointer;
  transition:
    width 280ms cubic-bezier(0.22, 1, 0.36, 1),
    transform 180ms ease;
  /* hit-area ≥ 44px без раздувания визуала */
  isolation: isolate;
}

.vel-programs__dot::before {
  content: '';
  position: absolute;
  inset: -0.55rem;
  border-radius: var(--radius-round);
}

.vel-programs__dot-core {
  display: block;
  width: 100%;
  height: 100%;
  border-radius: var(--radius-round);
  background: color-mix(in oklab, #fff 38%, transparent);
  transition:
    background-color 220ms ease,
    box-shadow 220ms ease;
}

/* активная — удлинённая «пилюля» белым/акцентом на тёмной капсуле */
.vel-programs__dot--on {
  width: 1.35rem;
}

.vel-programs__dot--on .vel-programs__dot-core {
  background: #fff;
  box-shadow: 0 0 0.45rem color-mix(in oklab, #fff 45%, transparent);
}

.vel-programs__dot:hover:not(.vel-programs__dot--on) .vel-programs__dot-core {
  background: color-mix(in oklab, #fff 62%, transparent);
}

.vel-programs__dot:focus-visible {
  outline: 2px solid var(--color-accent);
  outline-offset: 4px;
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
  .vel-programs__dot,
  .vel-programs__dot-core,
  .vel-programs__card {
    transition: none;
  }

  .vel-programs__card:hover :deep(.vel-program__photo) {
    transform: none;
  }
}
</style>
