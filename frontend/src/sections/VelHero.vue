<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import VelBadge from '@/components/ui/VelBadge.vue'
import VelReveal from '@/components/ui/VelReveal.vue'
import VelHeroCanvas from '@/components/art/VelHeroCanvas.vue'
import VelHeroTitle from '@/sections/VelHeroTitle.vue'
import VelSimulator from '@/features/simulator/VelSimulator.vue'
import { AMOUNT_MAX } from '@/stores/simulator.store'

const { t, n } = useI18n()

/** Потолок берём из константы калькулятора, а не из строки локали. */
const maxAmountText = computed(() => n(AMOUNT_MAX, 'currency'))
</script>

<template>
  <!-- relative + isolate: канвас растягивается по секции и лежит под содержимым,
       не перехватывая ни клики, ни выделение текста -->
  <section id="top" class="relative isolate overflow-hidden border-b border-line">
    <VelHeroCanvas />

    <div
      class="vel-section vel-section--lead relative mx-auto grid w-full max-w-6xl gap-10 px-5 lg:grid-cols-[1.05fr_minmax(0,26rem)] lg:items-center lg:gap-16"
    >
      <!-- immediate: первый экран не проявляется, он виден сразу — иначе
           главный заголовок сначала моргнул бы пустотой -->
      <!-- gap-8 вместо gap-7: 28px не лежат на шаге ритма, см. main.css -->
      <VelReveal immediate class="flex flex-col items-start gap-8">
        <!-- Заголовок вынесен в свой файл: он несёт разбор на слова,
             очередь их появления и доступное имя целой строкой -->
        <VelHeroTitle />

        <div class="flex flex-wrap gap-2">
          <VelBadge accent>{{ t('hero.badgeAmount', { amount: maxAmountText }) }}</VelBadge>
          <VelBadge>{{ t('hero.badgeRate') }}</VelBadge>
          <VelBadge>{{ t('hero.badgeSpeed') }}</VelBadge>
        </div>

        <p class="flex items-center gap-2.5 text-sm text-muted">
          <span class="size-1.5 bg-accent" aria-hidden="true"></span>
          {{ t('hero.partners') }}
        </p>
      </VelReveal>

      <VelReveal immediate class="flex flex-col gap-4">
        <h2 class="vel-label">{{ t('simulator.heading') }}</h2>
        <VelSimulator />
      </VelReveal>
    </div>
  </section>
</template>
