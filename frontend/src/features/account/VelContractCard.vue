<script setup lang="ts">
import { computed, useId } from 'vue'
import { useI18n } from 'vue-i18n'
import VelContractActions from '@/features/account/VelContractActions.vue'

/**
 * Карточка подписания договора — шапка шага «Firma».
 *
 * Слева квадратная плитка с замком, рядом две строки (надзаголовок и название
 * документа), справа три действия столбиком — они живут в VelContractActions.
 *
 * КАРТОЧКА НИЧЕГО НЕ РЕШАЕТ. Готовность документов, наличие ссылки на PDF,
 * внесён ли IBAN и подписан ли договор — всё приходит пропами сверху. Никаких
 * «проверено банком» здесь не появляется ни при каких условиях: такие слова
 * вправе сказать только ответ API.
 *
 * ЕДИНСТВЕННОЕ УСЛОВИЕ ПОДПИСИ — ПРИНЯТЫЕ ДОКУМЕНТЫ, и IBAN на него не влияет.
 * Это не недосмотр: реквизиты в этом кабинете спрашивают и после подписи, в
 * окне вывода средств. Запирай подпись за IBAN — маршрут замкнулся бы сам на
 * себя на первой же заявке, где человек ещё не выбрал счёт. Кнопка «Inserisci
 * IBAN» здесь стоит как удобный ярлык (счёт сразу попадает в лист договора
 * ниже), а не как пропуск к подписи.
 *
 * НА УЗКОМ ЭКРАНЕ действия уезжают ПОД текст и выстраиваются в ряд с
 * переносом, а не жмутся к правому краю: три кнопки в колонке шириной в треть
 * экрана превращаются в три строки рваного текста. Решает ширина САМОЙ
 * КАРТОЧКИ (@container), а не окна: карточка может оказаться и в узкой колонке
 * при широком окне.
 */
interface Props {
  /**
   * Ссылка на файл договора. Приезжает с бэкенда вместе с самим документом;
   * пока её нет — открывать нечего, и кнопка заперта.
   */
  pdfUrl?: string
  /** Шаг документов закрыт — сервер принял всё, что просил. Считает страница. */
  documentsReady?: boolean
  /** Счёт для зачисления уже указан — вместо кнопки стоит состояние с галочкой. */
  ibanProvided?: boolean
  /** Договор уже подписан — подписывать второй раз нечего. */
  signed?: boolean
}

const props = defineProps<Props>()

/**
 * Все три действия отдаём наверх. Открывать окно из карточки нельзя: адрес
 * документа знает страница, а всплывающее окно и модалки — её решение.
 */
const emit = defineEmits<{
  openPdf: []
  enterIban: []
  sign: []
}>()

const { t } = useI18n()

const titleId = `vel-contract-${useId()}`

const hasPdf = computed(() => (props.pdfUrl ?? '') !== '')
const isSigned = computed(() => props.signed === true)
const hasIban = computed(() => props.ibanProvided === true)
const canSign = computed(() => props.documentsReady === true && !isSigned.value)
</script>

<template>
  <section class="vel-contract-card" :aria-labelledby="titleId">
    <div class="vel-contract-card__row">
      <div class="vel-contract-card__intro">
        <!-- Плитка со знаком: замок читается как «документ под подписью»,
             рядом есть текст, поэтому сам знак декоративен. -->
        <span class="vel-contract-card__tile" aria-hidden="true">
          <svg class="vel-contract-card__tile-icon" viewBox="0 0 24 24">
            <path d="M8 10.5V7.5a4 4 0 0 1 8 0v3" />
            <path d="M5.5 10.5h13v10h-13z" />
            <path d="M12 14.5v2.5" />
          </svg>
        </span>

        <div class="vel-contract-card__text">
          <!-- Прописные и разрядку делает CSS: в словаре строка лежит обычным
               образом, как и у .vel-label по всему проекту. -->
          <p class="vel-contract-card__lead">{{ t('contract.card.lead') }}</p>
          <h2 :id="titleId" class="vel-contract-card__title">{{ t('contract.card.title') }}</h2>
        </div>
      </div>

      <!-- Раскладку ряда кнопок (перенос на узкой карточке, колонка на широкой)
           держит сам VelContractActions — почему именно так, написано в его
           стилях рядом с контейнерным запросом. -->
      <VelContractActions
        :has-pdf="hasPdf"
        :can-sign="canSign"
        :has-iban="hasIban"
        :is-signed="isSigned"
        @open-pdf="emit('openPdf')"
        @enter-iban="emit('enterIban')"
        @sign="emit('sign')"
      />
    </div>

    <!-- Причина, по которой кнопка недоступна, написана словами: заблокированная
         кнопка сама по себе не объясняет ничего. -->
    <div v-if="!hasPdf || !canSign" class="vel-contract-card__notes">
      <p v-if="!hasPdf" class="vel-contract-card__note">{{ t('contract.card.pdfWaiting') }}</p>
      <p v-if="!canSign && !isSigned" class="vel-contract-card__note">
        {{ t('contract.card.signLocked') }}
      </p>
    </div>
  </section>
</template>

<style scoped>
.vel-contract-card {
  /* Раскладку решает ширина самой карточки, см. шапку файла. */
  container: vel-contract-card / inline-size;
  display: flex;
  flex-direction: column;
  gap: 1rem;
  min-inline-size: 0;
  padding: 1.25rem;
  border: 1px solid var(--color-line);
  border-radius: var(--radius-panel);
  background-color: var(--color-surface);
}

.vel-contract-card__row {
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
  min-inline-size: 0;
}

.vel-contract-card__intro {
  display: flex;
  align-items: center;
  gap: 0.875rem;
  min-inline-size: 0;
}

.vel-contract-card__tile {
  display: flex;
  flex: 0 0 auto;
  align-items: center;
  justify-content: center;
  inline-size: 3rem;
  block-size: 3rem;
  border-radius: var(--radius-control);
  background-color: var(--color-raised);
  color: var(--color-accent-deep);
}

.vel-contract-card__tile-icon {
  inline-size: 1.5rem;
  block-size: 1.5rem;
  fill: none;
  stroke: currentColor;
  stroke-width: 1.6;
  stroke-linecap: butt;
  stroke-linejoin: miter;
}

.vel-contract-card__text {
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
  min-inline-size: 0;
}

.vel-contract-card__lead {
  margin: 0;
  color: var(--color-accent);
  font-family: var(--font-mono);
  font-size: 0.68rem;
  font-weight: 600;
  letter-spacing: 0.14em;
  line-height: 1.3;
  text-transform: uppercase;
}

.vel-contract-card__title {
  margin: 0;
  color: var(--color-fg);
  font-size: 1.35rem;
  font-weight: 600;
  letter-spacing: -0.02em;
  line-height: 1.15;
}

.vel-contract-card__notes {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.vel-contract-card__note {
  margin: 0;
  color: var(--color-faint);
  font-size: 0.75rem;
  line-height: 1.4;
}

@container vel-contract-card (min-width: 34rem) {
  .vel-contract-card {
    padding: 1.5rem;
  }

  .vel-contract-card__row {
    flex-direction: row;
    align-items: center;
    justify-content: space-between;
    gap: 1.5rem;
  }
}
</style>
