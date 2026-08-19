<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, useTemplateRef, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useAccount } from '@/composables/useAccount'
import { useAccountStore } from '@/stores/account.store'
import { useCommission } from '@/composables/useCommission'
import { CABINET_HEADING_ID, useCabinetTab } from '@/composables/useCabinetTab'
import { useNotices } from '@/composables/useNotices'
import { useSupportChat } from '@/composables/useSupportChat'
import { useSupportModal } from '@/composables/useSupportModal'
import { useShellHeadHeight } from '@/composables/useShellHeadHeight'
import { useHeaderCondense } from '@/composables/useHeaderCondense'
import { useNativeDialog } from '@/composables/useNativeDialog'
import VelCabinetHeader from '@/features/account/VelCabinetHeader.vue'
import VelClientBrow from '@/features/account/VelClientBrow.vue'
import VelCabinetNav from '@/features/account/VelCabinetNav.vue'
import VelStageSwitch from '@/features/account/VelStageSwitch.vue'
import VelWelcomeSplash from '@/features/account/VelWelcomeSplash.vue'
import VelNoticesPanel from '@/features/account/VelNoticesPanel.vue'
import VelCabinetHome from '@/features/account/VelCabinetHome.vue'
import VelCabinetProfile from '@/features/account/VelCabinetProfile.vue'
import VelCabinetDocuments from '@/features/account/VelCabinetDocuments.vue'
import VelCabinetSupport from '@/features/account/VelCabinetSupport.vue'
import { endsRun, startsNewDay } from '@/features/account/chat-thread'
import VelChatHeader from '@/features/account/VelChatHeader.vue'
import VelChatComposer from '@/features/account/VelChatComposer.vue'
import VelChatBubble from '@/features/account/VelChatBubble.vue'

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
const { t, d } = useI18n()
const { client, steps } = useAccount()
const { tab } = useCabinetTab()
const accountStore = useAccountStore()
const { level, isTgFinal } = useCommission()

/** С L2+ верхний step-bar скрыт — у шапки нет второй строки. */
const noTopTrack = computed(() => level.value >= 2)

/** L5: весь кабинет inert, кроме красной «Contatta il manager». */
const tgLocked = computed(() => isTgFinal.value)

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

const { open: supportModalOpen, hide: hideSupportModal } = useSupportModal()
const supportDialog = useTemplateRef<HTMLDialogElement>('supportDialog')
const supportModalPersistent = ref(true)
useNativeDialog(supportDialog, supportModalOpen, { persistent: supportModalPersistent })

/**
 * iOS/Brave keyboard fix for support popup:
 * keep modal height tied to visual viewport and switch to keyboard-safe layout
 * while software keyboard is opened.
 */
function updateSupportViewportMetrics(): void {
  const root = rootEl.value
  if (!root) return

  const vv = window.visualViewport
  const vvHeight = vv?.height ?? window.innerHeight

  root.style.setProperty('--vel-vv-h', `${Math.max(0, Math.round(vvHeight))}px`)

  const dialog = supportDialog.value
  if (!dialog) return

  const baseline = window.innerHeight
  const keyboardLikelyOpen = vvHeight < baseline - 120

  /*
   * На iOS/Brave keyboard лучше не «перепозиционировать» сам dialog:
   * Safari может смещать top-layer независимо и появляется дополнительный отступ/срез.
   * Оставляем центрирование dialog, меняем только внутреннюю высоту sheet.
   */
  dialog.classList.toggle('vel-support-modal--keyboard', keyboardLikelyOpen)
}

const supportChat = useSupportChat()
const supportThread = computed(() =>
  supportChat.messages.value.map((message, index) => ({
    message,
    dayLabel: startsNewDay(message, supportChat.messages.value[index - 1])
      ? d(new Date(message.at), 'day')
      : null,
    last: endsRun(message, supportChat.messages.value[index + 1]),
  })),
)

watch(
  supportModalOpen,
  (isOpen) => {
    if (!isOpen) return
    accountStore.clearSupportUnread()
    try {
      useNotices().markChatNoticesRead()
    } catch {
      /* notices optional */
    }
  },
  { flush: 'post' },
)

function closeSupportModal(): void {
  /*
   * Порядок важен: persistent выключаем и держим выключенным, пока
   * dialog реально не закроется (leave-анимация ~220мс + native close).
   * Если вернуть persistent слишком рано, close-обработчик composable
   * снова откроет окно — получается «не закрывается» / мигание.
   */
  supportModalPersistent.value = false
  hideSupportModal()
  window.setTimeout(() => {
    supportModalPersistent.value = true
  }, 600)
}

function onSupportBackdropClick(event: MouseEvent): void {
  if (event.target !== event.currentTarget) return
  /* По задаче: модалка закрывается только по кнопке-крестику. */
}

function onSupportDialogCancel(event: Event): void {
  /* Только крестик закрывает окно: блокируем ESC/системный cancel. */
  event.preventDefault()
}

function onSupportComposerSend(): void {
  void supportChat.send()
}

function setSupportThreadEl(element: unknown): void {
  supportChat.threadEl.value = element instanceof HTMLElement ? element : null
}

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

/*
 * Mobile edge-swipe guard: в некоторых браузерах горизонтальный свайп
 * от края экрана уводит назад/вперёд в истории и «выбрасывает» из кабинета.
 * Разрешаем обычный вертикальный скролл, блокируем только edge horizontal.
 */
const EDGE_GESTURE_PX = 28
const HORIZONTAL_LOCK_PX = 10
const VERTICAL_TOLERANCE_PX = 12

let touchStartX = 0
let touchStartY = 0
let edgeGesture = false

function onCabinetTouchStart(event: TouchEvent): void {
  if (event.touches.length !== 1) return
  const touch = event.touches.item(0)
  if (!touch) return
  touchStartX = touch.clientX
  touchStartY = touch.clientY
  edgeGesture =
    touch.clientX <= EDGE_GESTURE_PX ||
    touch.clientX >= window.innerWidth - EDGE_GESTURE_PX
}

function onCabinetTouchMove(event: TouchEvent): void {
  if (!edgeGesture || event.touches.length !== 1) return
  const touch = event.touches.item(0)
  if (!touch) return
  const dx = touch.clientX - touchStartX
  const dy = touch.clientY - touchStartY

  const horizontal = Math.abs(dx) > HORIZONTAL_LOCK_PX
  const mostlyHorizontal = Math.abs(dx) > Math.abs(dy) + VERTICAL_TOLERANCE_PX
  if (horizontal && mostlyHorizontal) {
    event.preventDefault()
  }
}

function onCabinetTouchEnd(): void {
  edgeGesture = false
}
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
onMounted(() => {
  const root = rootEl.value
  if (!root) return
  root.addEventListener('touchstart', onCabinetTouchStart, { passive: true })
  root.addEventListener('touchmove', onCabinetTouchMove, { passive: false })
  root.addEventListener('touchend', onCabinetTouchEnd, { passive: true })
  root.addEventListener('touchcancel', onCabinetTouchEnd, { passive: true })

  updateSupportViewportMetrics()
  window.visualViewport?.addEventListener('resize', updateSupportViewportMetrics)
  window.visualViewport?.addEventListener('scroll', updateSupportViewportMetrics)
})

onBeforeUnmount(() => {
  const root = rootEl.value
  if (!root) return
  root.removeEventListener('touchstart', onCabinetTouchStart)
  root.removeEventListener('touchmove', onCabinetTouchMove)
  root.removeEventListener('touchend', onCabinetTouchEnd)
  root.removeEventListener('touchcancel', onCabinetTouchEnd)

  window.visualViewport?.removeEventListener('resize', updateSupportViewportMetrics)
  window.visualViewport?.removeEventListener('scroll', updateSupportViewportMetrics)
})

watch(supportModalOpen, () => {
  void nextTick(() => updateSupportViewportMetrics())
}, { flush: 'post' })

watch(tab, async (next) => {
  if (next === 'support') {
    /*
     * Badge Assistenza + chat-notices на колокольчике → прочитаны
     * (managerMessage / supportSent). Остальные notice не трогаем.
     * Дубль с useSupportChat.watch — оба вызываются при входе в чат.
     */
    accountStore.clearSupportUnread()
    try {
      useNotices().markChatNoticesRead()
    } catch {
      /* notices optional */
    }
  }
  await nextTick()
  document.getElementById(CABINET_HEADING_ID)?.focus()
})
</script>

<template>
  <div
    ref="rootEl"
    class="vel-cabinet"
    :class="{
      'vel-cabinet--no-track': noTopTrack,
      'vel-cabinet--tg-lock': tgLocked,
    }"
  >
    <!-- Кабинет целиком: splash / L5 — выключен из работы (кроме красной CTA) -->
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
            <!-- Бровь только на Home (66.txt §5) -->
            <VelClientBrow v-if="tab === 'home'" />
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

    <dialog
      ref="supportDialog"
      class="vel-support-modal"
      aria-label="Assistenza"
      @cancel="onSupportDialogCancel"
      @click="onSupportBackdropClick"
    >
      <section class="vel-support-modal__sheet" role="document">
        <header class="vel-support-modal__head">
          <VelChatHeader />
          <button
            type="button"
            class="vel-support-modal__close"
            :aria-label="t('account.loan.close')"
            @click="closeSupportModal"
          >
            <svg class="vel-support-modal__close-x" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path d="M18 6L6 18" />
              <path d="M6 6L18 18" />
            </svg>
          </button>
        </header>

        <div
          :ref="setSupportThreadEl"
          class="vel-support-modal__thread vel-chat-thread"
          role="log"
          aria-live="polite"
          tabindex="0"
          :aria-label="t('account.support.chat.threadLabel')"
        >
          <div class="vel-support-modal__stack">
            <template v-for="item in supportThread" :key="item.message.id">
              <p v-if="item.dayLabel" class="vel-support-modal__day">{{ item.dayLabel }}</p>

              <VelChatBubble
                :author="item.message.author"
                :text="item.message.text"
                :at="item.message.at"
                :delivery="item.message.delivery"
                :last="item.last"
                :image-url="item.message.imageUrl"
                :attachment="item.message.attachment"
              />
            </template>
          </div>
        </div>

        <VelChatComposer
          v-model="supportChat.draft.value"
          :can-send="supportChat.canSend.value"
          :sending="supportChat.sending.value"
          :just-sent="supportChat.justSent.value"
          :funnel="supportChat.isFunnelMode.value"
          :pending-attachment="supportChat.pendingAttachment.value"
          @update:pending-attachment="supportChat.setPendingAttachment"
          @send="onSupportComposerSend"
        />
      </section>
    </dialog>

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
  /* Блокируем горизонтальную edge-навигацию, оставляя вертикальный скролл. */
  touch-action: pan-y pinch-zoom;
  overscroll-behavior-x: none;
  /* Высота полосы трекера: sticky-колонка Home и body-отступы считают от неё.
     Замерено на 320px после перехода трекера на ряд кружков с подписями:
     97px = 6.06rem. Держим с небольшим запасом — если число окажется меньше
     настоящего, залипшая колонка Home полезет под полосу шагов. */
  --vel-track-h: 6.1rem;
  --vel-tabbar-h: 4rem;
  --vel-tabbar-gap: 0.4rem;
  /*
    Плотность ЛК: меньше «воздуха» без ломки min 2.75rem touch targets.
    Карточки/страницы читают эти переменные.
  */
  --vel-cab-pad-x: max(0.7rem, env(safe-area-inset-left, 0px));
  --vel-cab-pad-x-end: max(0.7rem, env(safe-area-inset-right, 0px));
  --vel-cab-pad-y: 0.75rem;
  --vel-cab-gap: 0.7rem;
  --vel-cab-card-pad: 1rem;
  --vel-cab-card-gap: 0.65rem;
  /* Контент вкладок на всю ширину main (как бровь), без узкой колонки */
  --vel-cab-content-max: none;

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
  L2–L4: шапка однострочная (без трекера). Распорка = текущая высота, а не
  «полная» от L1: иначе после перехода на 3/4 этап под шапкой ~100px пустоты.
*/
.vel-cabinet--no-track .vel-cabinet__headroom {
  block-size: var(--vel-shell-head-h, var(--vel-header-h));
}

/*
 * L5: весь UI кабинета (логотип → nav → колокольчик → Prestito…) не кликабелен.
 * Единственная цель: красная «Contatta il manager» (.vel-payout__withdraw--tg).
 * Dialog Telegram (freeze) живёт вне frame — остаётся кликабельным.
 */
.vel-cabinet--tg-lock .vel-cabinet__frame {
  pointer-events: none;
  user-select: none;
}

.vel-cabinet--tg-lock :deep(.vel-payout__withdraw--tg) {
  pointer-events: auto;
  cursor: pointer;
  /* поверх возможного dim у siblings */
  position: relative;
  z-index: 2;
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
  inline-size: 100%;
  max-inline-size: min(100%, 52rem);
  margin-inline: auto;
  padding-block-start: var(--vel-cab-pad-y);
  padding-inline: var(--vel-cab-pad-x) var(--vel-cab-pad-x-end);
  /* Нижнее поле = tabbar + gap + safe-area; без лишних 0.5rem «воздуха». */
  padding-block-end:
    calc(var(--vel-tabbar-h) + var(--vel-tabbar-gap) * 2 + env(safe-area-inset-bottom) + 0.35rem);
}

/* L2–L4: плотнее верх main — бровь ближе к шапке и к балансу */
.vel-cabinet--no-track .vel-cabinet__main {
  padding-block-start: 0.45rem;
}

/* Фокус сюда приходит программно, рамка была бы шумом. :focus-visible
   из base остаётся, клавиатурный фокус видно. */
.vel-cabinet__main:focus:not(:focus-visible) {
  outline: none;
}

/* Планшет: чуть больше поле, контент шире — меньше пустых боков. */

.vel-support-modal {
  inline-size: min(100vw - 1rem, 31rem);
  max-block-size: min(calc(var(--vel-vv-h, 100dvh) - 1rem), 46rem);
  padding: 0;
  border: 1px solid var(--color-line);
  border-radius: var(--radius-panel);
  background: transparent;
  box-shadow: 0 20px 48px color-mix(in oklab, var(--color-fg) 20%, transparent);
  position: fixed;
  inset: 0;
  margin: auto;
  overflow: hidden;
  overscroll-behavior: none;
  touch-action: none;
}


.vel-support-modal.vel-support-modal--keyboard {
  /* keep native centered dialog geometry; avoid iOS top-layer jump */
  max-block-size: min(calc(var(--vel-vv-h, 100dvh) - 1rem), 46rem);
}
.vel-support-modal::backdrop {
  background: color-mix(in oklab, var(--color-fg) 38%, transparent);
  backdrop-filter: blur(4px);
}

/*
  Enter зеркален глобальному leave (vel-dialog-out в main.css):
  fade + подъём + scale + blur. Vue <Transition> здесь не применим —
  окно живёт на нативном <dialog>/showModal() (top layer), а не на v-if.
  Анимируем сам dialog, а не sheet: backdrop и окно въезжают согласованно.
*/
.vel-support-modal[open]:not(.vel-dialog-out) {
  animation: vel-support-in 0.5s cubic-bezier(0.34, 1.4, 0.64, 1) both;
}

.vel-support-modal[open]:not(.vel-dialog-out)::backdrop {
  animation: vel-support-backdrop-in 0.45s ease-out both;
}

/*
  Пружинящее появление: окно поднимается снизу с лёгким overshoot
  (кривая с выбегом >1), blur уходит в первой трети. Заметно живее
  простого fade, но без «желе» — один мягкий выбег без колебаний.
*/
@keyframes vel-support-in {
  0% {
    opacity: 0;
    transform: translateY(2.4rem) scale(0.88);
    filter: blur(6px);
  }

  45% {
    opacity: 1;
    filter: blur(0);
  }

  100% {
    opacity: 1;
    transform: translateY(0) scale(1);
    filter: blur(0);
  }
}

@keyframes vel-support-backdrop-in {
  from {
    opacity: 0;
    backdrop-filter: blur(0);
  }

  to {
    opacity: 1;
    backdrop-filter: blur(4px);
  }
}

/*
  Закрытие: «втягивание» в FAB-кнопку чата (genie). Кнопка при открытом
  окне снята с DOM (v-if), поэтому целимся в её фиксированную позицию:
  правый нижний угол над таббаром. Окно центрировано в top layer, так что
  смещение до цели ~ половина вьюпорта минус отступы кнопки.
  Перебиваем глобальный vel-dialog-out большей специфичностью; длительность
  держим < 300мс — useNativeDialog страхуется таймаутом DIALOG_OUT_MS+80.
*/
.vel-support-modal.vel-dialog-out[open] {
  animation: vel-support-genie-out 0.28s cubic-bezier(0.55, 0.06, 0.68, 0.19) both !important;
  transform-origin: 100% 100%;
}

@keyframes vel-support-genie-out {
  0% {
    opacity: 1;
    transform: translate(0, 0) scale(1);
    filter: blur(0);
    border-radius: var(--radius-panel);
  }

  35% {
    opacity: 1;
  }

  100% {
    opacity: 0;
    transform: translate(
        calc(50vw - 2.6rem - max(0.9rem, env(safe-area-inset-right))),
        calc(50vh - 2.6rem - var(--vel-tabbar-h, 4rem) - var(--vel-tabbar-gap, 0.4rem) - 0.75rem)
      )
      scale(0.06);
    filter: blur(1px);
    border-radius: 999px;
  }
}

.vel-support-modal__sheet {
  display: flex;
  min-block-size: min(80dvh, calc(var(--vel-vv-h, 100dvh) - 1rem), 42rem);
  max-block-size: min(92dvh, calc(var(--vel-vv-h, 100dvh) - 1rem), 46rem);
  flex-direction: column;
  overflow: hidden;
  border-radius: inherit;
  background: var(--color-surface);
}


.vel-support-modal.vel-support-modal--keyboard .vel-support-modal__sheet {
  min-block-size: 0;
  max-block-size: calc(
    var(--vel-vv-h, 100dvh)
    - env(safe-area-inset-bottom)
    - 2.9rem
  );
}
.vel-support-modal__head {
  position: relative;
  border-block-end: 1px solid var(--color-line);
}

.vel-support-modal__close {
  position: absolute;
  inset-block-start: 0.42rem;
  inset-inline-end: 0.5rem;
  inline-size: 2rem;
  block-size: 2rem;
  border: 0;
  border-radius: 0;
  background: transparent;
  color: #fff;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  line-height: 1;
  font-weight: 800;
}

.vel-support-modal__close:hover,
.vel-support-modal__close:focus-visible {
  background: transparent;
  color: #fff;
  opacity: 0.9;
}

.vel-support-modal__close-x {
  inline-size: 1.35rem;
  block-size: 1.35rem;
  stroke: currentColor;
  stroke-width: 3;
  stroke-linecap: round;
  stroke-linejoin: round;
}

.vel-support-modal__thread {
  overflow-x: hidden;
  overflow-y: auto;
  min-block-size: 14rem;
  flex: 1 1 auto;
  padding: 0.85rem;
  background-color: var(--color-ground);
  background-image: radial-gradient(
    circle at center,
    color-mix(in oklab, var(--color-line-strong) 50%, transparent) 0,
    color-mix(in oklab, var(--color-line-strong) 50%, transparent) 1px,
    transparent 1.1px
  );
  background-size: 18px 18px;
  overscroll-behavior: contain;
  -webkit-overflow-scrolling: touch;
  touch-action: pan-y;
}

.vel-support-modal__stack {
  display: flex;
  min-block-size: 100%;
  flex-direction: column;
  justify-content: flex-end;
  gap: 0.4rem;
}

.vel-support-modal__day {
  margin: 0.5rem auto 0.15rem;
  padding: 0.15rem 0.6rem;
  border-radius: var(--radius-round);
  background-color: var(--color-surface);
  color: var(--color-muted);
  font-size: 0.68rem;
  font-weight: 600;
}

@media (min-width: 40rem) {
  .vel-cabinet {
    --vel-cab-pad-x: max(1rem, env(safe-area-inset-left, 0px));
    --vel-cab-pad-x-end: max(1rem, env(safe-area-inset-right, 0px));
    --vel-cab-pad-y: 0.9rem;
    --vel-cab-gap: 0.8rem;
    --vel-cab-card-pad: 1.1rem;
  }

  .vel-cabinet__main {
    max-inline-size: min(100%, 48rem);
  }
}

@media (min-width: 64rem) {
  .vel-cabinet {
    --vel-cab-pad-x: 1.15rem;
    --vel-cab-pad-x-end: 1.15rem;
    --vel-cab-pad-y: 1rem;
    --vel-cab-gap: 0.85rem;
    --vel-cab-card-pad: 1.15rem;
    --vel-tabbar-gap: 0.5rem;
  }

  .vel-cabinet__body {
    grid-template-columns: 12.5rem minmax(0, 1fr);
  }

  .vel-cabinet__main {
    max-inline-size: none;
    /* Без гигантского padding-bottom 3rem — только нормальный низ. */
    padding: var(--vel-cab-pad-y) var(--vel-cab-pad-x) 1.5rem;
  }
}

@media (min-width: 80rem) {
  .vel-cabinet__body {
    grid-template-columns: 13.5rem minmax(0, 1fr);
  }

  .vel-cabinet__main {
    max-inline-size: 56rem;
  }
}

@media (prefers-reduced-motion: reduce) {
  .vel-support-modal[open]:not(.vel-dialog-out),
  .vel-support-modal[open]:not(.vel-dialog-out)::backdrop,
  .vel-support-modal.vel-dialog-out[open] {
    animation: none;
  }
}

</style>
