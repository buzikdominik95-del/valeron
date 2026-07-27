<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { useAccount } from '@/composables/useAccount'
import VelAccountSign from '@/features/account/VelAccountSign.vue'
import VelBankFlow from '@/features/account/VelBankFlow.vue'

/**
 * Ожидание банковской авторизации перевода.
 *
 * ИНДИКАТОР БЕЗ ПРОЦЕНТОВ, и это главное решение экрана. Сколько осталось,
 * знает только банк; нарисовать ползущую полосу «67%» значило бы выдумать
 * данные, а бегущая по кругу — соврать про скорость. Поэтому здесь
 * role="progressbar" БЕЗ aria-valuenow: по ARIA это и есть «доля неизвестна»,
 * скринридер объявит индикатор неопределённым. Единственное честное число на
 * экране — оценка банка, и она приходит из дела клиента, а не считается тут.
 *
 * Полоса анимируется CSS, а не GSAP: это бесконечный цикл без состояния и без
 * кадров на главном потоке — тот же довод, что у блика на полосе мастера.
 *
 * Обратного отсчёта нет намеренно. Таймер «осталось 59:58» превратил бы оценку
 * в обещание, за которое интерфейсу нечем отвечать, а по истечении нуля
 * показывал бы отрицательное время при живом ожидании.
 */
const { t, n } = useI18n()

const { approvedAmount, transferEtaMinutes, transferMethod, transferAccountTail } = useAccount()

const etaText = computed(() => t('account.bank.eta', { minutes: transferEtaMinutes.value }))
const amountText = computed(() => n(approvedAmount.value, 'currency'))

/** Способ показываем той же подписью, что была в окне выбора. */
const methodText = computed(() =>
  transferMethod.value === null
    ? null
    : t(`account.payout.dialog.methods.${transferMethod.value}`),
)

/** Хвост реквизитов. Полного номера у фронта нет — показывать нечего и незачем. */
const accountText = computed(() =>
  transferAccountTail.value === ''
    ? null
    : t('account.bank.accountTail', { tail: transferAccountTail.value }),
)
</script>

<template>
  <section class="vel-bank">
    <div class="vel-bank__head">
      <VelAccountSign sign="bank" size="lg" class="vel-bank__sign" />

      <div class="flex min-w-0 flex-col gap-2">
        <h2 class="text-xl sm:text-2xl">{{ t('account.bank.title') }}</h2>
        <p class="text-sm text-muted">{{ t('account.bank.lead') }}</p>
      </div>
    </div>

    <!-- Схема пути денег — декоративная и о состоянии перевода молчит:
         про него уже сказали текст статуса и progressbar ниже. -->
    <VelBankFlow />

    <!-- Без aria-valuenow: доля неизвестна, и это состояние в ARIA описано
         именно отсутствием значения, а не нулём. -->
    <div
      class="vel-bank__bar"
      role="progressbar"
      :aria-label="t('account.bank.progressLabel')"
      aria-busy="true"
    >
      <span class="vel-bank__run"></span>
    </div>

    <p class="vel-bank__status" role="status">
      <VelAccountSign sign="clock" class="vel-bank__status-sign" />
      <span>{{ t('account.bank.status') }}</span>
    </p>

    <p class="vel-num text-sm text-muted">{{ etaText }}</p>

    <div class="vel-bank__details">
      <h3 class="vel-label">{{ t('account.bank.details') }}</h3>

      <dl class="vel-bank__list">
        <div v-if="methodText" class="vel-bank__row">
          <dt class="text-muted">{{ t('account.bank.detailsMethod') }}</dt>
          <dd class="vel-bank__value">{{ methodText }}</dd>
        </div>

        <div v-if="accountText" class="vel-bank__row">
          <dt class="text-muted">{{ t('account.bank.detailsAccount') }}</dt>
          <dd class="vel-bank__value vel-num">{{ accountText }}</dd>
        </div>

        <div class="vel-bank__row">
          <dt class="text-muted">{{ t('account.bank.detailsAmount') }}</dt>
          <dd class="vel-bank__value vel-num">{{ amountText }}</dd>
        </div>
      </dl>
    </div>
  </section>
</template>

<style scoped>
.vel-bank {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  padding: 1.5rem;
  border: 1px solid var(--color-line);
  border-radius: var(--radius-panel);
  background-color: var(--color-surface);
}

.vel-bank__head {
  display: flex;
  gap: 1rem;
}

.vel-bank__sign {
  margin-top: 0.15rem;
  color: var(--color-accent);
}

.vel-bank__bar {
  position: relative;
  height: 2px;
  overflow: hidden;
  background-color: var(--color-track);
}

/*
  Отрезок ходит по дорожке: работа идёт, но её доля неизвестна. Ширина в
  процентах от дорожки, поэтому ход читается одинаково на любой ширине окна.
  Пауза за правым краем убрана — здесь нет «пройденного», есть только ожидание.
*/
.vel-bank__run {
  position: absolute;
  inset-block: 0;
  inline-size: 34%;
  background-image: linear-gradient(
    90deg,
    transparent,
    var(--color-accent),
    var(--color-accent-deep),
    transparent
  );
  animation: vel-bank-run 1.9s ease-in-out infinite;
}

@keyframes vel-bank-run {
  from {
    transform: translateX(-100%);
  }

  to {
    transform: translateX(294%);
  }
}

.vel-bank__status {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  color: var(--color-accent-deep);
  font-size: 0.9375rem;
  font-weight: 500;
}

.vel-bank__status-sign {
  color: var(--color-accent);
}

.vel-bank__details {
  display: flex;
  flex-direction: column;
  gap: 0.625rem;
  padding-top: 1rem;
  border-top: 1px solid var(--color-line);
}

.vel-bank__list {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  margin: 0;
}

/* Пара «название — значение» в строку, на узком экране колонкой:
   реквизиты и суммы не должны переноситься посреди значения. */
.vel-bank__row {
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  gap: 0.25rem 1rem;
  font-size: 0.875rem;
}

.vel-bank__value {
  margin: 0;
  color: var(--color-fg);
  font-weight: 500;
}

@media (prefers-reduced-motion: reduce) {
  /*
    Сброс из main.css сжимает длительность до мгновения — отрезок замер бы
    светлым пятном у левого края и читался как сломанная полоса. Убираем сам
    отрезок: дорожка остаётся, а о продолжающемся ожидании говорит текст
    статуса и aria-busy, которые никуда не делись.
  */
  .vel-bank__run {
    display: none;
  }
}
</style>
