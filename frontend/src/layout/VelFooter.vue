<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { useSiteLinks } from '@/composables/useSiteLinks'

/**
 * Подвал сайта. Монтируется вне <main>, иначе браузер не отдаёт ему
 * роль contentinfo и он перестаёт быть ориентиром для скринридера.
 *
 * Ссылки без href — те же заглушки и по той же причине, что в перелинковке;
 * разбор написан в шапке @/sections/VelSiteEnd.vue.
 */
const { t } = useI18n()
const { footerGroups } = useSiteLinks()
</script>

<template>
  <footer class="bg-surface">
    <div class="vel-section mx-auto w-full max-w-6xl px-5">
      <h2 class="sr-only">{{ t('siteEnd.footerTitle') }}</h2>

      <div class="grid gap-10 sm:grid-cols-2 sm:gap-12 lg:grid-cols-3">
        <div v-for="group in footerGroups" :key="group.id">
          <h3 :id="group.id" class="vel-label">{{ group.title }}</h3>
          <!-- gap-2 = 8px — минимальный просвет между соседними целями нажатия.
               Сама ссылка (.vel-link) держит 44px по высоте, поэтому шаг строки
               здесь 52px: промахнуться пальцем по соседней строке уже нечем. -->
          <ul class="mt-4 flex flex-col gap-2" :aria-labelledby="group.id">
            <li v-for="item in group.items" :key="item.href + item.label">
              <a class="vel-link text-sm" :href="item.href">{{ item.label }}</a>
            </li>
          </ul>
        </div>
      </div>
    </div>
  </footer>
</template>
