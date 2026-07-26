<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import VelReveal from '@/components/ui/VelReveal.vue'
import VelStage from '@/components/ui/VelStage.vue'
import VelSplitHeading from '@/components/ui/VelSplitHeading.vue'
import { useSiteLinks } from '@/composables/useSiteLinks'

/**
 * Перелинковка на посадочные страницы. Подвал вынесен в VelFooter:
 * <footer> обязан лежать вне <main>, иначе теряет роль contentinfo.
 * Ссылки — заглушки href="#", навигации на сайте пока нет.
 */
const { t } = useI18n()
const { seoGroups } = useSiteLinks()
</script>

<template>
  <!-- Сцена секции: заголовок, кнопка и две группы ссылок одной пачкой -->
  <VelStage class="border-b border-line" aria-labelledby="site-end-title">
    <div class="vel-section mx-auto w-full max-w-6xl px-5">
      <!-- gap-8 вместо gap-7: 28px не лежат на шаге ритма, см. main.css -->
      <div
        class="flex flex-col gap-8 border-b border-line pb-10 lg:flex-row lg:items-end lg:justify-between lg:gap-12"
      >
        <!-- id остаётся на заголовке: на него ссылается aria-labelledby секции.
             Имя секции при этом не рассыпается: доступное имя заголовка даёт
             aria-label с полной строкой, см. шапку VelSplitHeading -->
        <VelSplitHeading
          id="site-end-title"
          :lines="[{ text: t('siteEnd.title') }]"
          class="max-w-xl text-3xl sm:text-4xl lg:text-5xl"
        />

        <VelReveal
          as="a"
          href="#"
          class="inline-flex items-center gap-3 self-start rounded-control bg-accent px-6 py-4 text-base font-semibold tracking-tight text-accent-ink transition-colors duration-150 hover:bg-accent-dim active:bg-accent-deep sm:text-lg lg:self-auto"
        >
          {{ t('siteEnd.ctaLabel') }}
          <span aria-hidden="true">&rarr;</span>
        </VelReveal>
      </div>

      <div class="grid gap-10 pt-10 sm:grid-cols-2 sm:gap-12">
        <VelReveal v-for="group in seoGroups" :key="group.id">
          <h3 :id="group.id" class="vel-label">{{ group.title }}</h3>
          <!-- gap-2 = 8px — минимальный просвет между соседними целями нажатия.
               Высоту 44px держит сама ссылка (.vel-link), см. main.css -->
          <ul class="mt-4 flex flex-col gap-2" :aria-labelledby="group.id">
            <li v-for="item in group.items" :key="item">
              <a href="#" class="vel-link text-sm">{{ item }}</a>
            </li>
          </ul>
        </VelReveal>
      </div>
    </div>
  </VelStage>
</template>
