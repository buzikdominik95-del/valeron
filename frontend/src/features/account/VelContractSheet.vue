<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { useContractData } from '@/features/account/contract-data'
import VelLogo from '@/components/ui/VelLogo.vue'
import VelContractTerms from '@/features/account/VelContractTerms.vue'
import VelContractSchedule from '@/features/account/VelContractSchedule.vue'
import VelContractClauses from '@/features/account/VelContractClauses.vue'
import VelContractSignatures from '@/features/account/VelContractSignatures.vue'

/**
 * Лист договора под карточкой подписания: белая страница пропорций A4,
 * лежащая на подложке, — то, что человек подписывает, видно прямо на экране,
 * а не только после скачивания PDF.
 *
 * КАРКАС И НАЧИНКА РАЗДЕЛЕНЫ. Здесь — шапка, заголовок, дата с номером и рамка
 * страницы; реквизиты сторон и денежные условия живут в VelContractTerms, план
 * погашения — в VelContractSchedule, пункты условий с юридической сноской —
 * в VelContractClauses, подписи и плашка успеха — в VelContractSignatures.
 * Порог простой: файл, который не читают целиком, начинают править вслепую.
 *
 * ЗНАЧЕНИЯ НЕ ЗАШИТЫ В РАЗМЕТКУ. Всё до последней цифры приходит из
 * useContractData() — а тот считает по @/lib/loan-schedule и сторам кабинета.
 * Числа в шаблоне означали бы второй, расходящийся с кабинетом договор.
 *
 * ПРОПОРЦИИ A4 ЗАДАНЫ МИНИМУМОМ ВЫСОТЫ, а не aspect-ratio: у блочного элемента
 * заданное соотношение сторон не растягивается под содержимое, и договор
 * с планом на 84 платежа просто вывалился бы за края страницы. min-block-size
 * в единицах контейнера (141.4cqi — это и есть отношение сторон A4) даёт
 * ровно то, что нужно: пустой лист выглядит листом, а длинный растёт вниз.
 */
const { t } = useI18n()

/* Разбираем на месте: все поля — computed-ссылки, и в шаблоне Vue разворачивает
   их сам. Через объект пришлось бы писать contract.number.value в разметке. */
const {
  number,
  issuedDate,
  fields,
  amountText,
  monthlyText,
  durationText,
  rateText,
  purposeText,
  months,
  rows,
  totals,
  signed,
  signedAt,
} = useContractData()
</script>

<template>
  <section class="vel-csheet" :aria-label="t('contract.preview.region')">
    <!-- Полоса-заголовок предпросмотра: слева разрядка прописными, справа
         светлая пилюля состояния. -->
    <div class="vel-csheet__bar">
      <p class="vel-csheet__bar-title">{{ t('contract.preview.title') }}</p>
      <span class="vel-csheet__badge">{{ t('contract.preview.badge') }}</span>
    </div>

    <div class="vel-csheet__stage">
      <article class="vel-csheet__paper">
        <header class="vel-csheet__head">
          <VelLogo />
          <p class="vel-csheet__issuer">{{ t('contract.sheet.issuer') }}</p>
        </header>

        <div class="vel-csheet__titles">
          <h2 class="vel-csheet__title">{{ t('contract.sheet.title') }}</h2>
          <p class="vel-csheet__subtitle">{{ t('contract.sheet.subtitle') }}</p>
        </div>

        <div class="vel-csheet__meta">
          <p class="vel-csheet__meta-item">
            {{ t('contract.sheet.madeAt', { place: t('contract.sheet.place') }) }}
            <span class="vel-num vel-csheet__ink">{{ issuedDate }}</span>
          </p>

          <p class="vel-csheet__meta-item">
            {{ t('contract.sheet.numberLabel') }}
            <span class="vel-num vel-csheet__ink">{{ number }}</span>
          </p>
        </div>

        <VelContractTerms
          :fields="fields"
          :amount-text="amountText"
          :monthly-text="monthlyText"
          :duration-text="durationText"
          :rate-text="rateText"
          :purpose-text="purposeText"
        />

        <VelContractSchedule :rows="rows" :totals="totals" />

        <VelContractClauses :months="months" />

        <VelContractSignatures :signed="signed" :signed-at="signedAt" />
      </article>
    </div>
  </section>
</template>

<style scoped>
.vel-csheet {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  min-inline-size: 0;
}

.vel-csheet__bar {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem 1rem;
}

.vel-csheet__bar-title {
  margin: 0;
  color: var(--color-muted);
  font-family: var(--font-mono);
  font-size: 0.68rem;
  font-weight: 600;
  letter-spacing: 0.14em;
  line-height: 1.3;
  text-transform: uppercase;
}

.vel-csheet__badge {
  display: inline-flex;
  align-items: center;
  padding: 0.2rem 0.65rem;
  border: 1px solid var(--color-line);
  border-radius: var(--radius-round);
  background-color: var(--color-surface);
  color: var(--color-muted);
  font-size: 0.68rem;
  font-weight: 600;
  line-height: 1.6;
}

/*
  Подложка под листом. Единица cqi ниже считается от ЕЁ содержимого, поэтому
  контейнер объявлен именно здесь, а не на самой странице: контейнер не может
  измерять сам себя.
*/
.vel-csheet__stage {
  container-type: inline-size;
  min-inline-size: 0;
  padding: 0.75rem;
  border: 1px solid var(--color-line);
  border-radius: var(--radius-panel);
  background-color: var(--color-raised);
}

.vel-csheet__paper {
  display: flex;
  flex-direction: column;
  gap: 1.1rem;
  /* Отношение сторон A4 (1 : 1,414) как МИНИМУМ высоты — см. шапку файла. */
  min-block-size: 141.4cqi;
  min-inline-size: 0;
  padding: 1.25rem 1rem;
  border-radius: var(--radius-control);
  background-color: var(--color-surface);
  color: var(--color-fg);
  box-shadow: 0 0.5rem 1.5rem color-mix(in oklab, var(--color-fg) 10%, transparent);
}

.vel-csheet__head {
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
  padding-block-end: 0.9rem;
  border-block-end: 1px solid var(--color-line);
}

.vel-csheet__issuer {
  margin: 0;
  color: var(--color-muted);
  font-size: 0.68rem;
  line-height: 1.4;
}

.vel-csheet__titles {
  display: flex;
  flex-direction: column;
  gap: 0.3rem;
  text-align: center;
}

.vel-csheet__title {
  margin: 0;
  color: var(--color-fg);
  font-size: 1.05rem;
  font-weight: 600;
  letter-spacing: 0.04em;
  line-height: 1.25;
  text-transform: uppercase;
}

.vel-csheet__subtitle {
  margin: 0;
  color: var(--color-muted);
  font-size: 0.72rem;
  line-height: 1.4;
}

.vel-csheet__meta {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  justify-content: space-between;
  gap: 0.35rem 1rem;
}

.vel-csheet__meta-item {
  margin: 0;
  color: var(--color-muted);
  font-size: 0.72rem;
  line-height: 1.5;
}

/* Значение «вписано от руки»: тот же приём, что у полей договора выше. */
.vel-csheet__ink {
  border-block-end: 1px solid var(--color-line-strong);
  color: var(--color-fg);
  font-weight: 600;
}

@media (min-width: 48rem) {
  .vel-csheet__stage {
    padding: 1.5rem;
  }

  .vel-csheet__paper {
    gap: 1.35rem;
    padding: 2.25rem 2rem;
  }

  .vel-csheet__title {
    font-size: 1.2rem;
  }
}
</style>
