<script setup lang="ts">
import { ref, watchEffect } from 'vue'
import { useI18n } from 'vue-i18n'
import { useBankRowMotion } from '@/composables/useBankRowMotion'
import { ROW_CLASS, STATUS_CLASS, STATUS_LABEL } from '@/features/wizard/bank-row-status'
import { CHECK_AVG_MS } from '@/composables/useBankAnalysis'
import type { BankRow } from '@/composables/useBankAnalysis'
import VelBankMark from '@/features/wizard/VelBankMark.vue'

/**
 * Одна строка опроса банков: знак банка, имя, статус и подсветка проверки.
 * Очередь и таймеры живут в useBankAnalysis — сюда строка приходит готовой,
 * поэтому компонент остаётся чистым отображением одного объекта.
 *
 * Три статуса идут подряд в одном списке, поэтому разведены по трём признакам
 * сразу — цвет, фигура и слово:
 *
 *   pending  — нейтральная строка: рамка line, подпись muted, знак с монограммой;
 *   checking — акцент: рамка accent, фон raised, вокруг знака кольцо, под
 *              содержимым бежит полоса — движение есть только у активной строки;
 *   verified — успех: подпись success, в знаке вместо букв прочерченная галочка,
 *              рамка success прозрачностью 40% — проверенная строка обязана
 *              уходить в фон, а не соперничать взглядом с той, что в работе.
 *
 * Цвет здесь — ускоритель, а не носитель смысла: яркостной контраст success к
 * accent 1.33, при дальтонизме статусы по цвету не различаются. Смысл несут
 * подпись словом (t(...)) и фигура (галочка вместо букв). Сами таблицы ролей
 * лежат в bank-row-status.
 *
 * Цвет и форма ПОДЛОЖКИ знака к статусу отношения не имеют: они опознают банк
 * и постоянны от «в очереди» до «проверен» — см. VelBankMark.
 *
 * ДВИЖЕНИЕ. Строка сама показывает, что с ней происходит: пока идёт проверка —
 * наклон и бегущая полоса под содержимым, в момент «проверен» — один общий жест
 * (см. useBankRowMotion). Всё остальное — цвета и текст — делают классы.
 */
interface Props {
  bank: BankRow
}

const props = defineProps<Props>()

const { t } = useI18n()

/* Корень остаётся здесь: к нему привязан ref="root" в шаблоне, а движение
   берёт его ссылкой. Статус уходит геттером, а не значением: композабл обязан
   видеть каждую смену, а развёрнутый проп отдал бы ему один снимок. */
const root = ref<HTMLElement | null>(null)

useBankRowMotion(root, () => props.bank.status)

/*
 * Длительность заливки приходит из useBankAnalysis, а не стоит числом в CSS.
 * Полоса обязана добегать до края ровно тогда, когда банк становится
 * проверенным: свои полторы секунды против семи у таймера означали бы, что
 * полоса пять с половиной секунд стоит полной у строки «идёт проверка».
 *
 * Через setProperty, а не инлайновым стилем: инлайн в проекте запрещён, и это
 * тот же приём, что в VelRange. flush: 'post' обязателен — до отрисовки узла
 * ставить на него свойство некуда.
 */
watchEffect(
  () => {
    root.value?.style.setProperty('--vel-bank-load-ms', `${CHECK_AVG_MS}ms`)
  },
  { flush: 'post' },
)
</script>

<template>
  <!-- Класса-состояния вроде is-checking у строки нет: цвета приходят ролями
       из ROW_CLASS, а движением заведует наблюдатель за статусом в композабле.
       Класс, который ничего не включает, живёт до первой правки и врёт. -->
  <div ref="root" role="listitem" class="vel-bank" :class="ROW_CLASS[bank.status]">
    <!--
      ВОЛНА ПО ПРОВЕРЯЕМОЙ СТРОКЕ. Одна полоса света идёт слева направо и
      уходит — «строку сейчас читают». Раньше здесь одновременно работали
      три эффекта: луч по рамке, сканирующая линия и вспышка вокруг знака.
      Каждый по отдельности хорош, вместе они спорили за внимание, и строка
      выглядела не «в работе», а неисправной.

      Полоса живёт только в состоянии checking: в покое её в разметке нет.
    -->
    <span v-if="bank.status === 'checking'" class="vel-bank__sweep" aria-hidden="true"></span>

    <VelBankMark :name="bank.name" :status="bank.status" />

    <span class="grow text-sm text-fg">{{ bank.name }}</span>

    <span
      class="vel-bank__status flex items-center gap-1.5 text-xs"
      :class="STATUS_CLASS[bank.status]"
    >
      <!-- Вторая галочка рядом с подписью — не дубль знака слева, а привязка
           формы к слову: знак стоит у левого края строки, подпись у правого, и
           без неё «сделано» у правого края снова держалось бы на одном цвете. -->
      <svg
        v-if="bank.status === 'verified'"
        class="vel-check"
        viewBox="0 0 12 12"
        aria-hidden="true"
      >
        <path d="M1.5 6.4 4.4 9.3 10.5 2.7" />
      </svg>

      <!-- Подпись обёрнута в span намеренно: auto-animate двигает только
           элементы, голого текстового узла он не видит — и подпись прыгала бы
           вправо рывком в тот же кадр, в котором появляется галочка. -->
      <span>{{ t(STATUS_LABEL[bank.status]) }}</span>
    </span>

    <!-- Тонкая полоса внизу строки: она наливается слева направо, пока идёт
         проверка. Волна выше говорит «сейчас читают», эта — «сколько ещё». -->
    <span v-if="bank.status === 'checking'" class="vel-bank__load" aria-hidden="true"></span>
  </div>
</template>

<style scoped>
.vel-bank {
  position: relative;
  /* Обрезает волну и полосу загрузки по скруглениям строки: без этого свет
     вылезал бы за её углы прямоугольником. */
  overflow: hidden;
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.625rem 0.875rem;
  /* Только ширина и стиль: цвет рамки приходит классом-ролью из ROW_CLASS.
     Сокращённое `border: 1px solid` писать нельзя — оно доставит
     border-color: currentColor и погасит утилиту. */
  border-width: 1px;
  border-style: solid;
  border-radius: var(--radius-control);
  transform-origin: center bottom;
  /*
    В переходе остались только цвета. transform его покинул сознательно: им
    распоряжается GSAP — наклон при входе в проверку, возврат при галочке,
    общая волна в конце списка. Двух хозяев у одного свойства быть не может.
  */
  transition:
    border-color 220ms ease,
    background-color 220ms ease;
}

/*
  Вспышка — свет ПО РАМКЕ, а не заливка строки. Заливка была бы очевиднее, но
  она ложится под текст: success на белом даёт 5.00, а под зелёной пеленой в 14%
  подпись «Verificata» просела бы до 4.14 — ниже AA на всё время вспышки.
  Рамка светит там, где текста нет, поэтому контраст подписи не меняется вовсе.

  Отдельный слой, а не box-shadow на самой строке: анимируется одна лишь
  opacity, цвет остаётся ролью в стилях и в аргументы твина не попадает.
  Гаснет вспышка ровно в ту рамку success/40, которая остаётся у проверенной
  строки, — «подсветилась и успокоилась» буквально.
*/
.vel-bank__halo {
  position: absolute;
  inset: 0;
  border-radius: inherit;
  box-shadow: 0 0 0 2px var(--color-success);
  opacity: 0;
  pointer-events: none;
}

/*
  ВОЛНА ПО СТРОКЕ. Полоса света шириной в треть строки идёт слева направо и
  уходит за край; период — полторы секунды, примерно столько же длится одна
  проверка, поэтому на строку приходится один проход, а не суетливое мелькание.

  overflow: hidden у самой строки обрезает полосу по скруглениям, поэтому
  собственных отступов ей не нужно — в отличие от прежней сканирующей линии,
  которую приходилось вручную отодвигать от краёв.

  Градиент, а не движущийся блок: у полосы нет края, она втекает и вытекает.
  Резкая граница читалась бы как шов, а не как свет.
*/
.vel-bank__sweep {
  position: absolute;
  inset: 0;
  background-image: linear-gradient(
    100deg,
    transparent 0%,
    color-mix(in oklab, var(--color-accent) 16%, transparent) 45%,
    color-mix(in oklab, var(--color-accent) 22%, transparent) 50%,
    transparent 100%
  );
  background-repeat: no-repeat;
  background-size: 45% 100%;
  animation: vel-bank-sweep 1.5s linear infinite;
  pointer-events: none;
}

@keyframes vel-bank-sweep {
  from {
    background-position: -50% 0;
  }

  to {
    background-position: 150% 0;
  }
}

/*
  Полоса загрузки у нижнего края строки: наливается слева направо за время
  одной проверки. Волна выше отвечает «строку читают сейчас», эта — «сколько
  осталось». Ширина ведётся от 0 к 100% и не возвращается: строка после
  проверки уходит в состояние verified, и полоса вместе с ней исчезает.
*/
.vel-bank__load {
  position: absolute;
  inset-block-end: 0;
  inset-inline-start: 0;
  block-size: 2px;
  border-radius: var(--radius-round);
  background-color: var(--color-accent);
  /* Длительность ставит скрипт (--vel-bank-load-ms) от таймера проверки.
     Запасное значение — на случай, если узел отрисовался раньше эффекта. */
  animation: vel-bank-load var(--vel-bank-load-ms, 7s) ease-out forwards;
  pointer-events: none;
}

@keyframes vel-bank-load {
  from {
    inline-size: 0;
  }

  to {
    inline-size: 100%;
  }
}

/* Подпись статуса не переносится по словам. Это не косметика: при появлении
   галочки auto-animate ведёт ширину подписи от старой к новой, и на середине
   перехода строка вроде «In verifica» успела бы разорваться на две. */
.vel-bank__status {
  white-space: nowrap;
}

.vel-check {
  width: 0.75rem;
  height: 0.75rem;
  fill: none;
  stroke: currentColor;
  stroke-width: 1.7;
  stroke-linecap: square;
}

@media (prefers-reduced-motion: reduce) {
  .vel-bank {
    transition: none;
  }

  /*
    Волна уходит целиком, а полоса загрузки ОСТАЁТСЯ — заполненной. Это не
    придирка к букве правила: без движения строка «в проверке» иначе ничем не
    отличалась бы от строки в очереди, и человек, попросивший систему убрать
    анимацию, потерял бы единственный признак того, что происходит.
  */
  .vel-bank__sweep {
    animation: none;
    background-image: none;
  }

  .vel-bank__load {
    inline-size: 100%;
    animation: none;
  }
}
</style>
