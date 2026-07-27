<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { useEmailSentProgress } from '@/composables/useEmailSentProgress'
import VelLogo from '@/components/ui/VelLogo.vue'
import VelEmailStage from '@/features/account/VelEmailStage.vue'
import VelStepDots from '@/features/account/VelStepDots.vue'

/**
 * Экран «письмо отправлено»: подтверждение регистрации.
 *
 * Порядок с эталонного видео: марка сверху, крупный конверт по центру,
 * индикатор из трёх сегментов снизу. Оформление наше, светлое.
 *
 * Экран самостоятельный и занимает всё окно: у него своя шапка и свой <main>.
 * Внутрь оболочки мастера его класть нельзя — VelWizard уже рендерит <main>,
 * и вторая такая область на странице недопустима.
 *
 * ГРАНИЦА. Экран ничего не утверждает от имени банка: ни суммы, ни ставки,
 * ни результата проверки здесь нет и быть не должно. Он сообщает ровно один
 * факт — письмо ушло, — и предлагает перейти в кабинет.
 */
const { t } = useI18n()

/** Куда вести дальше — решает родитель. Зовётся теперь по таймеру, а не по
    нажатию: экран проходной. */
const emit = defineEmits<{ openCabinet: [] }>()

/**
 * ЭКРАН ПРОХОДИТ СЕБЯ САМ. Кнопки «Apri la mia area personale» здесь больше
 * нет: три сегмента заполняются по очереди, под конвертом меняется подпись
 * текущей фазы, и по последней экран уходит в кабинет без участия человека.
 *
 * Прежний вариант требовал нажать кнопку на экране, который ничего не
 * спрашивает и ни о чём не просит — он только сообщает, что письмо ушло.
 * Нажатие в такой точке не решение, а препятствие.
 *
 * Очередь фаз и таймер живут в композабле: почему именно так, написано в его
 * шапке. Ни одна фаза ничего не проверяет — сервера нет, и подписи описывают
 * ожидание, а не его результат.
 */
const { current, total, phaseKey } = useEmailSentProgress(() => emit('openCabinet'))

const stepsLabel = computed(() =>
  t('account.emailSent.stepsLabel', { current: current.value, total }),
)

const phaseText = computed(() => t(`account.emailSent.phases.${phaseKey.value}`))
</script>

<template>
  <div class="flex min-h-dvh flex-col bg-ground">
    <header class="border-b border-line bg-surface">
      <div class="mx-auto flex h-16 w-full max-w-4xl items-center px-5">
        <VelLogo />
      </div>
    </header>

    <!-- justify-center безопасен: main — растущий flex-элемент (min-height auto),
         и содержимое выше экрана раздвигает страницу, а не уезжает за край. -->
    <main
      class="mx-auto flex w-full max-w-2xl flex-1 flex-col items-center justify-center gap-8 px-5 py-10 lg:py-14"
    >
      <section
        class="flex w-full flex-col items-center gap-7 rounded-panel border border-line bg-surface px-6 py-12 text-center sm:px-10 sm:py-14"
      >
        <!--
          Кадр текущей фазы: конверт → проверка данных → подтверждение на
          телефоне. :key обязателен — без него Vue переиспользовал бы узел
          между фазами, и css-анимации второй и третьей сцены не запустились
          бы вовсе: они играют один раз при появлении узла.

          Цвет контура — роль текста: внутри сцены весь штрих идёт currentColor.
        -->
        <VelEmailStage :key="phaseKey" :phase="phaseKey" class="text-accent-deep" />

        <!--
          Состояние экрана объявляется вслух: role="status" — вежливая живая
          область, она не перебивает пользователя. Заголовок и подпись лежат
          внутри целиком, поэтому объявление звучит фразой, а не обрывком.
          Экран появляется на месте предыдущего, без перехода по адресу, —
          сам по себе такой обмен разметки скринридер не комментирует.
        -->
        <div class="flex flex-col items-center gap-3" role="status">
          <h1 class="text-3xl sm:text-4xl">{{ t('account.emailSent.title') }}</h1>
          <p class="max-w-md text-sm text-muted">{{ t('account.emailSent.subtitle') }}</p>
        </div>

        <!--
          Строка текущей фазы. role="status" отдельно от заголовка выше: там
          объявляется появление экрана целиком, здесь — смена фазы, и склеивать
          их в одну живую область нельзя, иначе скринридер перечитывал бы
          заголовок с подписью на каждом шаге.

          Точка слева пульсирует — это единственное движение строки: подпись
          меняется текстом, а не выездом, чтобы её успевали дочитать.
        -->
        <p class="vel-mail__phase" role="status">
          <span class="vel-mail__pulse" aria-hidden="true"></span>
          {{ phaseText }}
        </p>
      </section>

      <VelStepDots :label="stepsLabel" :total="total" :current="current" />
    </main>
  </div>
</template>

<style scoped>
.vel-mail__phase {
  display: inline-flex;
  align-items: center;
  gap: 0.55rem;
  min-block-size: 1.25rem;
  color: var(--color-muted);
  font-size: 0.875rem;
}

/*
  Пульсирующая точка — признак «идёт», а не украшение: подпись меняется раз в
  две секунды, и между сменами экран обязан оставаться живым, иначе читается
  как зависший.

  Цветом она ничего не сообщает: что именно происходит, сказано словом рядом
  (WCAG 1.4.1), и при выключенных цветах строка не теряет смысла.
*/
.vel-mail__pulse {
  inline-size: 0.5rem;
  block-size: 0.5rem;
  flex: 0 0 auto;
  border-radius: var(--radius-round);
  background-color: var(--color-accent);
  animation: vel-mail-pulse 1.4s ease-in-out infinite;
}

@keyframes vel-mail-pulse {
  0%,
  100% {
    opacity: 0.35;
    transform: scale(0.85);
  }

  50% {
    opacity: 1;
    transform: scale(1);
  }
}

@media (prefers-reduced-motion: reduce) {
  /*
    Сброс из main.css правит длительность, но оставляет бесконечное повторение —
    точка продолжала бы мигать, просто мгновенно. Гасим целиком и оставляем её
    видимой: как признак «идёт» она работает и неподвижной, рядом со словом.
  */
  .vel-mail__pulse {
    opacity: 1;
    animation: none;
  }
}
</style>
