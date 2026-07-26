<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import VelLogo from '@/components/ui/VelLogo.vue'
import VelButton from '@/components/ui/VelButton.vue'
import VelArtEnvelope from '@/components/art/VelArtEnvelope.vue'
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

/** Единственное действие экрана: куда вести дальше — решает родитель. */
const emit = defineEmits<{ openCabinet: [] }>()

/**
 * Положение экрана в цепочке регистрации: письмо → подтверждение → готово.
 *
 * Это состояние самого интерфейса, а не ответ сервера: экран показан — значит
 * письмо отправлено, заполнен первый сегмент. Подтверждение почты ещё не
 * получено, и вторым сегментом мы его не рисуем.
 *
 * Трекер заявки в кабинете — другая сущность из пяти шагов, она живёт
 * в account.store (ACCOUNT_STEPS) и сюда не относится. Появится состояние
 * регистрации на бэкенде — оба числа переедут в стор, разметка не изменится.
 */
const REGISTRATION_STEPS = 3
const CURRENT_STEP = 1

const stepsLabel = computed(() =>
  t('account.emailSent.stepsLabel', { current: CURRENT_STEP, total: REGISTRATION_STEPS }),
)
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
        <!-- Ширину рисунку задаёт этот класс, цвет контура — роль текста:
             внутри конверта весь штрих идёт currentColor. -->
        <VelArtEnvelope class="w-40 text-accent-deep sm:w-48" />

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

        <VelButton type="button" size="lg" @click="emit('openCabinet')">
          {{ t('account.openCabinet') }}
          <span aria-hidden="true">→</span>
        </VelButton>
      </section>

      <VelStepDots :label="stepsLabel" :total="REGISTRATION_STEPS" :current="CURRENT_STEP" />
    </main>
  </div>
</template>
