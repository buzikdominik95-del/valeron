<script setup lang="ts">
import { computed, defineAsyncComponent, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useTitle } from '@vueuse/core'
import { storeToRefs } from 'pinia'
import { useWizard } from '@/composables/useWizard'
import { useAppView } from '@/composables/useAppView'
import { useAccountView } from '@/composables/useAccountView'
import { useLandingLogin } from '@/composables/useLandingLogin'
import { useSmoothScroll } from '@/composables/useSmoothScroll'
import { useSimulatorStore } from '@/stores/simulator.store'
import VelRegisterDialog from '@/features/wizard/VelRegisterDialog.vue'

/*
 * ПОЛНОЭКРАННЫЕ ПОТОКИ.
 *
 * VelEmailSent — СИНХРОННЫЙ импорт. Раньше chunk грузился lazy и на 2–3-й
 * регистрации (повторный ?view=email) падал 404 / Failed to fetch dynamically
 * imported module → белый экран вместо анимации письма (бриф, фотка 6).
 * Экран письма небольшой; надёжность важнее split.
 *
 * Кабинет остаётся lazy: он тяжёлый и открывается один раз в конце пути.
 *
 * Мастер — lazy-wizard.ts с предзагрузкой. GSAP в общем бандле (см. ниже).
 */
import VelEmailSent from '@/features/account/VelEmailSent.vue'
const VelAccountFlow = defineAsyncComponent({
  loader: () => import('@/features/account/VelAccountFlow.vue'),
  /* Повтор при сбое сети / смене hash после деплоя. */
  onError(error, retry, fail, attempts) {
    if (attempts <= 2) {
      window.setTimeout(retry, 400 * attempts)
      return
    }
    console.error(error)
    fail()
  },
})
import VelHeader from '@/layout/VelHeader.vue'
import VelFooter from '@/layout/VelFooter.vue'
import VelHero from '@/sections/VelHero.vue'
import VelStats from '@/sections/VelStats.vue'
import VelPrograms from '@/sections/VelPrograms.vue'
import VelTransfers from '@/sections/VelTransfers.vue'
import VelHowWeWork from '@/sections/VelHowWeWork.vue'
import VelBankStrip from '@/sections/VelBankStrip.vue'
import VelMission from '@/sections/VelMission.vue'
import VelFaq from '@/sections/VelFaq.vue'
import VelSiteEnd from '@/sections/VelSiteEnd.vue'
import { VelWizardFlowAsync as VelWizardFlow } from '@/features/wizard/lazy-wizard'

const { t } = useI18n()

// Мастер занимает весь экран: у него своя шапка и своя навигация,
// поэтому обычный сайт на это время не рендерится вовсе.
const { isOpen } = useWizard()

/**
 * Экраны после заявки: письмо и кабинет. Живут в ?view=… и перекрывают
 * мастер — после регистрации возвращаться в него уже некуда.
 */
const { view, isAccount, emailEpoch, openCabinet, backToSite } = useAppView()
const { open: openAccount } = useAccountView()
const landingLogin = useLandingLogin()
const landingLoginOpen = landingLogin.open
const simulator = useSimulatorStore()
const { email: registeredEmail } = storeToRefs(simulator)

/*
 * Прямой ?view=cabinet без своей заявки → назад на лендинг + форма входа.
 * Иначе по ссылке снова открывался бы кабинет с заглушкой Marco.
 */
watch(
  () => view.value === 'cabinet',
  (cabinet) => {
    if (!cabinet) return
    if (landingLogin.hasCabinetAccess()) return
    backToSite()
    landingLogin.show()
  },
  { immediate: true },
)

/** Успешный Accedi с лендинга — в свой кабинет (данные из мастера). */
function onLandingLogin(): void {
  landingLogin.hide()
  openAccount()
}

// Инерционный скролл — только для лендинга: в мастере и кабинете он мешает
// коротким экранам и спорит с программным переводом фокуса при смене шага.
// Композабл зовётся один раз, а Lenis внутри поднимается и сносится по условию.
useSmoothScroll(() => !isOpen.value && !isAccount.value)

// Заголовок вкладки тоже обязан переключаться вместе с языком,
// иначе в русской версии он остаётся итальянским.
useTitle(computed(() => t('meta.title')))
</script>

<template>
  <!-- Порядок ветвей: кабинет перекрывает мастер, мастер — лендинг.
       Ровно один полноэкранный поток на экране, и ровно один <main>. -->
  <VelEmailSent
    v-if="view === 'email'"
    :key="emailEpoch"
    @open-cabinet="openCabinet"
  />

  <!-- Кабинет целиком: оболочка и все её панели по слотам собраны
       в VelAccountFlow.vue — App.vue знает только «показать кабинет». -->
  <VelAccountFlow v-else-if="view === 'cabinet'" />

  <VelWizardFlow v-else-if="isOpen" />

  <template v-else>
    <a class="vel-skip" href="#content">{{ t('common.skipToContent') }}</a>

    <VelHeader />

    <main id="content" tabindex="-1">
      <VelHero />
      <VelStats />
      <VelPrograms />
      <VelTransfers />
      <VelHowWeWork />
      <!-- Лента партнёров стоит сразу за «Как мы работаем»: она договаривает
           ту же мысль — кто именно даёт ставку, о которой шла речь выше -->
      <VelBankStrip />
      <VelMission />
      <VelFaq />
      <VelSiteEnd />
    </main>

    <!-- Подвал вне <main>: только так он получает роль contentinfo -->
    <VelFooter />

    <!-- Accedi с лендинга: только вход, без демо-кабинета Marco -->
    <VelRegisterDialog
      v-model:open="landingLoginOpen"
      start-mode="login"
      login-only
      :known-email="registeredEmail"
      @login="onLandingLogin"
    />
  </template>
</template>

<style scoped>
/* Ссылка видна только при переходе на неё с клавиатуры */
.vel-skip {
  position: absolute;
  left: 0.5rem;
  top: -3rem;
  z-index: 100;
  /* Цель нажатия 44 по высоте: замер до правки давал 203×40.3. Приходят сюда
     с клавиатуры, но нажать могут и мышью, и на планшете — контрол видимый,
     значит и правило размера на него распространяется. inline-flex, чтобы
     min-block-size реально управлял высотой, а текст остался по центру. */
  display: inline-flex;
  align-items: center;
  min-block-size: 2.75rem;
  padding: 0.6rem 1rem;
  border-radius: var(--radius-control);
  background-color: var(--color-accent);
  color: var(--color-accent-ink);
  font-size: 0.85rem;
  font-weight: 600;
  text-decoration: none;
  transition: top 150ms ease;
}

.vel-skip:focus-visible {
  top: 0.5rem;
}

/* Наведение и нажатие: ссылка видимая и кликабельная, значит обязана
   отвечать на курсор — до правки у неё был только фокус. */
.vel-skip:hover {
  background-color: var(--color-accent-dim);
}

.vel-skip:active {
  background-color: var(--color-accent-deep);
}

main:focus {
  outline: none;
}

@media (prefers-reduced-motion: reduce) {
  .vel-skip {
    transition: none;
  }
}
</style>
