<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { useWindowScroll } from '@vueuse/core'
import { useAccountView } from '@/composables/useAccountView'
import VelButton from '@/components/ui/VelButton.vue'
import VelLogo from '@/components/ui/VelLogo.vue'

/**
 * Шапка. Линия снизу появляется только после прокрутки —
 * на самом верху экран остаётся цельным. Скролл слушает VueUse.
 */
const { t } = useI18n()

const { y } = useWindowScroll()
const scrolled = computed(() => y.value > 8)

/**
 * «Accedi» открывает личный кабинет. Формы входа в проекте нет и не будет до
 * бэкенда, поэтому кнопка ведёт прямо на экран кабинета: обещать вход, которого
 * не существует, хуже, чем показать то, что уже работает. Когда появится
 * авторизация, между ними встанет её экран — правится одна строка.
 */
const { open: openAccount } = useAccountView()
</script>

<template>
  <header
    class="sticky top-0 z-50 bg-ground/90 backdrop-blur transition-colors duration-200"
    :class="scrolled ? 'border-b border-line' : 'border-b border-transparent'"
  >
    <!--
      Зазор и поля сужаются на самом узком экране. Правило появилось, когда в
      строке стоял ещё и переключатель языка: на 320px содержимое просило на
      15.6px больше, чем есть, весь дефицит доставался ему, и подпись «RU»
      разрезало пополам собственной обрезкой группы.

      Переключатель убран — язык теперь один, — и строка помещается с запасом:
      86.7 (логотип) + 86.9 (кнопка входа) + зазор. Суженные поля оставлены
      намеренно: на 320px они дают воздух вокруг кнопки, а не впритык к краю
      экрана, и держат запас на случай, если подпись кнопки станет длиннее.
    -->
    <div
      class="mx-auto flex h-16 w-full max-w-6xl items-center gap-2 px-4 sm:gap-4 sm:px-5"
    >
      <a href="#top" class="vel-home shrink-0">
        <VelLogo />
      </a>

      <span class="hidden text-xs text-faint lg:block">
        {{ t('brand.accredited') }}
      </span>

      <!-- Accedi — справа (как на референсе: логотип слева, вход у правого края). -->
      <VelButton class="ml-auto shrink-0" variant="outline" @click="openAccount">
        {{ t('nav.login') }}
      </VelButton>
    </div>
  </header>
</template>

<style scoped>
/*
  Ссылка «на главную» на знаке. Пять состояний контрола: покой, наведение,
  фокус (правило из @layer base), нажатие; заблокированной ссылка не бывает.
  Красится не сам знак, а его прозрачность — двухцветный логотип иначе
  пришлось бы перекрашивать по частям, и он потерял бы себя.
*/
.vel-home {
  display: inline-flex;
  align-items: center;
  min-block-size: 2.75rem;
  transition: opacity 150ms ease;
}

.vel-home:hover {
  opacity: 0.75;
}

.vel-home:active {
  opacity: 0.55;
}

@media (prefers-reduced-motion: reduce) {
  header {
    transition: none;
  }

  .vel-home {
    transition: none;
  }
}
</style>
