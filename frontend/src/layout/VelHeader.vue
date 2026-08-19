<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { storeToRefs } from 'pinia'
import { useWindowScroll } from '@vueuse/core'
import { useAccountView } from '@/composables/useAccountView'
import { useSimulatorStore } from '@/stores/simulator.store'
import { hasAuthToken } from '@/api/session'
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
 * «Accedi» — форма входа, а не прямой вход в кабинет.
 * Без своей заявки (мастер + регистрация) в кабинет с заглушкой Marco
 * не пускаем: open() в useAccountView открывает диалог useLandingLogin.
 *
 * После регистрации (имя + email) — «Torna all'area personale» и сразу ЛК.
 */
const { open: openAccount } = useAccountView()
const { email, firstName, surname } = storeToRefs(useSimulatorStore())

/*
 * «Torna all'area personale» — только пока жива авторизованная сессия
 * (Bearer token). После Esci токен отозван, и вход требует пароль —
 * подпись обязана честно сказать «Accedi», а не обещать возврат.
 */
const hasCabinet = computed(
  () =>
    email.value.trim() !== '' &&
    (firstName.value.trim() !== '' || surname.value.trim() !== '') &&
    hasAuthToken(),
)

const loginLabel = computed(() =>
  hasCabinet.value ? t('nav.backToCabinet') : t('nav.login'),
)

function onLoginClick(): void {
  openAccount()
}
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

      <!-- Accedi / Torna all'area personale — справа -->
      <VelButton
        class="ml-auto shrink-0"
        :class="{ 'vel-back-pulse': hasCabinet }"
        variant="outline"
        data-testid="nav-login"
        @click="onLoginClick"
      >
        {{ loginLabel }}
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

.vel-back-pulse {
  animation: vel-back-pulse 1.8s ease-in-out infinite;
}

@keyframes vel-back-pulse {
  0%, 100% {
    transform: scale(1);
    box-shadow: 0 0 0 0 rgba(37, 99, 235, 0.28);
  }
  50% {
    transform: scale(1.03);
    box-shadow: 0 0 0 7px rgba(37, 99, 235, 0);
  }
}

@media (prefers-reduced-motion: reduce) {
  header {
    transition: none;
  }

  .vel-home {
    transition: none;
  }

  .vel-back-pulse {
    animation: none;
  }
}
</style>
