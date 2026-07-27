<script setup lang="ts">
import { computed, nextTick, ref, useTemplateRef, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useAccount } from '@/composables/useAccount'
import { useAccountStore } from '@/stores/account.store'
import { useCommission } from '@/composables/useCommission'
import { CABINET_HEADING_ID, useCabinetTab } from '@/composables/useCabinetTab'
import { useShellHeadHeight } from '@/composables/useShellHeadHeight'
import { useHeaderCondense } from '@/composables/useHeaderCondense'
import VelCabinetHeader from '@/features/account/VelCabinetHeader.vue'
import VelCabinetNav from '@/features/account/VelCabinetNav.vue'
import VelStageSwitch from '@/features/account/VelStageSwitch.vue'
import VelWelcomeSplash from '@/features/account/VelWelcomeSplash.vue'
import VelNoticesPanel from '@/features/account/VelNoticesPanel.vue'
import VelCabinetHome from '@/features/account/VelCabinetHome.vue'
import VelCabinetProfile from '@/features/account/VelCabinetProfile.vue'
import VelCabinetDocuments from '@/features/account/VelCabinetDocuments.vue'
import VelCabinetSupport from '@/features/account/VelCabinetSupport.vue'

/**
 * ОБОЛОЧКА личного кабинета: шапка, навигация, заставка входа и ОДНО место
 * под содержимое открытого раздела.
 *
 * ЧТО ИЗМЕНИЛОСЬ И ЗАЧЕМ. Кабинет был одной длинной колонкой: карточка,
 * трекер, полис, документы, договор — всё смонтировано разом, одно под другим.
 * В эталоне это четыре РАЗДЕЛА (Home, Profilo, Documenti, Assistenza), между
 * которыми переключаются, а не скроллят. Теперь так же: разделы живут в
 * ?tab=… (useCabinetTab), а оболочка только даёт им место.
 *
 * ЧТО ОБОЛОЧКА РИСУЕТ САМА: раму кабинета, место под раздел и заставку. Полоса
 * шапки (логотип, переключатель языка, блок пользователя, колокольчик) вместе
 * с трекером вынесена в VelCabinetHeader, меню — в VelCabinetNav; сам раздел
 * рисуют страницы VelCabinetHome / Profile / Documents / Support.
 *
 * СЛОТЫ НЕ ПРОПАЛИ. Панели, которые собирает VelAccountFlow (сумма, ожидание
 * банка, полис, документы, договор, боковая колонка), пробрасываются на
 * вкладку Home под теми же именами. Разложить их по разделам — следующий шаг,
 * и делать его будут другие; здесь важно, чтобы до тех пор с экрана ничего
 * не пропало.
 *
 * ФОКУС ПРИ СМЕНЕ РАЗДЕЛА переезжает на заголовок нового раздела. Без этого
 * с клавиатуры человек остаётся в меню: экран сменился, а фокус нет, и
 * следующий Tab уводит по старому месту.
 */
const { t } = useI18n()
const { client, steps } = useAccount()
const { tab } = useCabinetTab()
const accountStore = useAccountStore()
const { level } = useCommission()

/** С L2+ верхний step-bar скрыт — у шапки нет второй строки. */
const noTopTrack = computed(() => level.value >= 2)

/**
 * Загрузка удостоверения (паспорт / ID):
 *   · пока не принято — Documenti;
 *   · после verify — анимация ОСТАЁТСЯ на Documenti (не исчезает);
 *   · ушёл с Documenti (Home и т.д.) → «паркуется» в Profilo.
 */
const docsAccepted = computed(
  () =>
    accountStore.documentsUploaded === true ||
    steps.value.find((s) => s.id === 'documents')?.status === 'done',
)

/** Показать карточку на Documenti: ещё не verified, либо verified, но ещё не уходили. */
const showDocsOnDocuments = computed(
  () => docsAccepted.value === false || accountStore.docsParkedInProfile === false,
)

/** В Profilo — только после ухода с Documenti (или restore с уже parked). */
const showDocsOnProfile = computed(
  () => docsAccepted.value === true && accountStore.docsParkedInProfile === true,
)

/*
 * Уход с Documenti после verify → паркуем карточку в Profilo.
 * Reload с уже загруженными docs: сразу Profilo (анимацию уже видели).
 */
watch(
  tab,
  (next, prev) => {
    if (docsAccepted.value && prev === 'documents' && next !== 'documents') {
      accountStore.docsParkedInProfile = true
    }
  },
)

watch(
  docsAccepted,
  (ok) => {
    if (!ok) {
      accountStore.docsParkedInProfile = false
      return
    }
    /* Restore: уже verified и не на Documenti — сразу в профиле. */
    if (tab.value !== 'documents') {
      accountStore.docsParkedInProfile = true
    }
  },
  { immediate: true },
)

/**
 * Панель уведомлений открывает оболочка, а не шапка.
 *
 * Кнопка живёт в шапке, но панель обязана лежать выше неё по z-index и уметь
 * закрываться щелчком мимо — то есть знать про весь экран, а не про свою
 * строку. Оболочка это знает: у неё же заставка входа, которая на время
 * своего показа выключает кабинет целиком.
 *
 * Эмит наружу остался: снаружи на кабинете по-прежнему висит notices — вдруг
 * кому-то понадобится узнать о нажатии, не отменяя панель.
 */
const emit = defineEmits<{ notices: [] }>()

const noticesOpen = ref(false)

function onNotices(): void {
  noticesOpen.value = !noticesOpen.value
  emit('notices')
}

/**
 * Заставка на экране. Значение приходит от самой заставки: она и решает,
 * показываться ли (один раз за сессию, и не при отключённых анимациях).
 * Пока она видна, кабинет под ней выключен из работы — inert и aria-hidden,
 * иначе фокус и скринридер проваливаются на невидимый экран.
 */
const splashOpen = ref(false)

/*
 * Настоящая высота залипающей шапки уезжает переменной на корень: от неё
 * считают своё залипание меню слева и колонка обзора на Home. Почему
 * замером, а не числом в CSS, — в самом композабле.
 *
 * $el у компонента шапки — её корневой <header>: у VelCabinetHeader он
 * единственный, поэтому обращение однозначно.
 */
const rootEl = useTemplateRef<HTMLElement>('rootEl')
const headComp = useTemplateRef<{ $el: HTMLElement }>('headEl')
const headEl = computed<HTMLElement | null>(() => headComp.value?.$el ?? null)

/*
 * Сжатие шапки решает ОБОЛОЧКА, а не сама шапка.
 *
 * Состояние нужно двоим: шапке (что рисовать) и замеру высот (какую высоту
 * считать разжатой). Оставь его внутри шапки — замер о нём не узнает и
 * запишет в распорку высоту сжатой шапки, то есть вернёт петлю прокрутки,
 * ради которой распорка и появилась.
 */
const { condensed } = useHeaderCondense()

useShellHeadHeight(headEl, rootEl, () => condensed.value)

/*
 * Смена раздела переводит фокус на его заголовок. nextTick — потому что до
 * перерисовки заголовка нового раздела в документе ещё нет. Идентификатор
 * один на все четыре страницы: одновременно открыт ровно один раздел.
 *
 * Открытие Assistenza гасит бейдж непрочитанных: человек уже «прочитал».
 */
watch(tab, async (next) => {
  if (next === 'support') accountStore.clearSupportUnread()
  await nextTick()
  document.getElementById(CABINET_HEADING_ID)?.focus()
})
</script>

<template>
  <div ref="rootEl" class="vel-cabinet" :class="{ 'vel-cabinet--no-track': noTopTrack }">
    <!-- Кабинет целиком: пока сверху лежит заставка, он выключен из работы -->
    <div
      class="vel-cabinet__frame"
      :inert="splashOpen || undefined"
      :aria-hidden="splashOpen || undefined"
    >
      <!-- Распорка держит место под РАЗЖАТУЮ шапку. Сама шапка вынута из
             потока: сжимаясь, она иначе меняла бы высоту документа, браузер
             компенсировал бы это привязкой прокрутки, и шапка дёргалась бы
             каждый кадр — см. useShellHeadHeight. -->
        <div class="vel-cabinet__headroom">
          <VelCabinetHeader ref="headEl" :condensed="condensed" @notices="onNotices" />
        </div>

      <div class="vel-cabinet__body">
        <VelCabinetNav />

        <main id="vel-account-content" tabindex="-1" class="vel-cabinet__main">
          <!--
            Заголовок первого уровня скрыт визуально намеренно: экран открывает
            содержимое раздела, и надпись «Личный кабинет» над ним была бы
            шумом. Скринридеру он обязателен — без h1 страница остаётся
            безымянной. Заголовок раздела ниже — второго уровня.
          -->
          <h1 class="sr-only">{{ t('account.shell.title') }}</h1>

          <!--
            ДОКУМЕНТЫ И ДОГОВОР ЖИВУТ В СВОЁМ РАЗДЕЛЕ, А НЕ НА ГЛАВНОЙ. Раньше
            обе панели стояли на Home, и вместе с листом договора он вырастал
            до 6358px на телефоне — лента, до конца которой не доходят. Раздел
            «Documenti» ровно для этого и есть: там загрузка снимков и там же
            договор с предпросмотром, как на эталоне.

            На Home от них остались строки списка шагов со ссылками «Vai» —
            они и ведут сюда, так что путь не потерялся.
          -->
          <!--
            Home держим смонтированным (v-show), а не v-if: после отказа L2/L4
            сцена freeze + карточка должны ОСТАВАТЬСЯ при уходе в Assistenza
            и возврате на Home. v-if + VelStageSwitch уничтожали DOM → анимация
            «пропадала».
          -->
          <div
            v-show="tab === 'home'"
            class="vel-cabinet__page"
            :inert="tab !== 'home' || undefined"
            :aria-hidden="tab !== 'home' || undefined"
          >
            <VelCabinetHome>
              <template #summary><slot name="summary" /></template>
              <template #transfer><slot name="transfer" /></template>
              <template #policy><slot name="policy" /></template>
              <template #side><slot name="side" /></template>
            </VelCabinetHome>
          </div>

          <VelStageSwitch v-if="tab !== 'home'" :stage-key="tab">
            <VelCabinetProfile v-if="tab === 'profile'">
              <!-- После verify + ухода с Documenti — карточка с анимацией здесь -->
              <template v-if="showDocsOnProfile" #documents>
                <slot name="documents" />
              </template>
            </VelCabinetProfile>

            <VelCabinetDocuments v-else-if="tab === 'documents'">
              <!--
                Карточка паспорта: idle/checking/verified.
                После verify остаётся здесь, пока пользователь не уйдёт с вкладки
                (тогда showDocsOnProfile = true).
              -->
              <template v-if="showDocsOnDocuments" #upload>
                <slot name="documents" />
              </template>
              <template #contract><slot name="signature" /></template>
            </VelCabinetDocuments>

            <!-- Messenger / waiting вшиты в сам чат (useSupportChat), без слота-надстройки. -->
            <VelCabinetSupport v-else />
          </VelStageSwitch>
        </main>
      </div>
    </div>

    <!-- Панель уведомлений — сосед рамы, а не её потомок: она обязана
         лежать поверх залипшей шапки, и вложенная внутрь она обрезалась бы
         её границами на узком экране. -->
    <VelNoticesPanel v-model:open="noticesOpen" />

    <VelWelcomeSplash v-model:open="splashOpen" :name="client.fullName" />
  </div>
</template>

<style scoped>
/*
  ДВА ЧИСЛА ОБОЛОЧКИ — переменными, а не константами по файлам. От высоты шапки
  считается залипание меню, от высоты нижней панели — нижнее поле контента.
  Разъехавшись, они дали бы либо меню, наезжающее на шапку, либо последнюю
  карточку под панелью навигации.

  Объявлены здесь, на корне кабинета: вниз по дереву они наследуются, и шапка
  (VelCabinetHeader), меню (VelCabinetNav) и колонка Home читают те же числа.
*/
.vel-cabinet {
  --vel-header-h: 3.5rem;
  /* Высота полосы трекера: sticky-колонка Home и body-отступы считают от неё.
     Замерено на 320px после перехода трекера на ряд кружков с подписями:
     97px = 6.06rem. Держим с небольшим запасом — если число окажется меньше
     настоящего, залипшая колонка Home полезет под полосу шагов. */
  --vel-track-h: 6.1rem;
  --vel-tabbar-h: 4rem;
  --vel-tabbar-gap: 0.5rem;

  display: flex;
  min-block-size: 100dvh;
  flex-direction: column;
  background-color: var(--color-ground);
}

/* L2+: step-bar нет — fallback высоты шапки без полосы */
.vel-cabinet--no-track {
  --vel-track-h: 0px;
}

/*
  РАСПОРКА ПОД ШАПКОЙ. Держит в потоке высоту РАЗЖАТОЙ шапки и не меняется,
  когда та сжимается. Из-за этого высота документа постоянна, браузеру нечего
  компенсировать привязкой прокрутки, и петля «сжалась → прокрутка уехала →
  разжалась» невозможна по построению.

  Запасное значение — сумма двух объявленных высот; оно работает до первого
  кадра, пока замер из useShellHeadHeight не пришёл.
*/
.vel-cabinet__headroom {
  block-size: var(--vel-shell-head-full, calc(var(--vel-header-h) + var(--vel-track-h, 0px)));
}

.vel-cabinet__frame {
  display: flex;
  min-block-size: 100dvh;
  flex: 1 1 auto;
  flex-direction: column;
}

.vel-cabinet__body {
  display: grid;
  flex: 1 1 auto;
  grid-template-columns: minmax(0, 1fr);
}

.vel-cabinet__page {
  display: block;
  width: 100%;
}

.vel-cabinet__main {
  min-inline-size: 0;
  padding-block-start: 1.25rem;
  /* Боковые поля не меньше 0.875rem и не меньше бокового выреза — в ландшафте
     с viewport-fit=cover текст иначе уходит под «бровь». */
  padding-inline:
    max(0.875rem, env(safe-area-inset-left))
    max(0.875rem, env(safe-area-inset-right));
  /* Нижнее поле считается из тех же двух переменных, что и сама панель, плюс
     безопасная зона телефона: под панелью не должно оставаться содержимого. */
  padding-block-end:
    calc(var(--vel-tabbar-h) + var(--vel-tabbar-gap) * 2 + env(safe-area-inset-bottom) + 0.5rem);
}

/* Фокус сюда приходит программно, рамка была бы шумом. :focus-visible
   из base остаётся, клавиатурный фокус видно. */
.vel-cabinet__main:focus:not(:focus-visible) {
  outline: none;
}

@media (min-width: 64rem) {
  .vel-cabinet__body {
    grid-template-columns: 14rem minmax(0, 1fr);
  }

  .vel-cabinet__main {
    inline-size: 100%;
    max-inline-size: 72rem;
    margin-inline: auto;
    padding: 1.5rem 1.5rem 3rem;
  }
}
</style>
