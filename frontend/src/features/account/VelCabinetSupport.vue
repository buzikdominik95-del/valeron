<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { CABINET_HEADING_ID } from '@/composables/useCabinetTab'
import { useSupportChat } from '@/composables/useSupportChat'
import { endsRun, startsNewDay } from '@/features/account/chat-thread'
import VelChatBubble from '@/features/account/VelChatBubble.vue'
import VelChatHeader from '@/features/account/VelChatHeader.vue'
import VelChatComposer from '@/features/account/VelChatComposer.vue'
import VelDotField from '@/components/magic/VelDotField.vue'

/**
 * Раздел «Assistenza»: переписка с поддержкой.
 *
 * ЭТО ПЕРЕПИСКА, А НЕ ФОРМА ОБРАЩЕНИЯ. Здесь стояла анкета — выбрать тему из
 * списка, набрать текст, нажать «отправить», получить предпросмотр
 * отправленного. Такая форма спрашивает у человека то, чего ему неоткуда
 * знать («какая у моего вопроса тема?»), и обрывает разговор на первом же
 * сообщении: ответить на ответ в ней нельзя. Лента реплик не спрашивает
 * ничего и продолжается сколько нужно.
 *
 * ПОРЯДОК СНИЗУ ВВЕРХ, как в мессенджерах: новое внизу. Сделано раскладкой, а
 * не прокруткой при загрузке — колонка с justify-content: flex-end прижимает
 * короткую переписку к низу, и ей не нужен скачок скролла на первом кадре.
 *
 * ЧЕСТНОСТЬ ЛЕНТЫ. Автоответов от поддержки здесь нет. Сообщение поддержки
 * ровно одно — приветствие, и оно ничего не обещает; всё остальное написал
 * человек. Подставить «оператор печатает…» и ответ по таймеру было бы
 * технически проще всего и означало бы соврать, что его прочитали. Под лентой
 * прямо сказано: до подключения сервера сообщения остаются в браузере.
 *
 * ЭТО НЕ ЧАТ «ПОДТВЕРДИТЕ ОПЛАТУ». Никаких заготовленных реплик про комиссии
 * и никаких кнопок оплаты здесь нет и быть не должно: человек пишет свой
 * вопрос своими словами.
 */
const { t, d } = useI18n()
/*
 * threadEl помечен void намеренно.
 *
 * Лента прокручивается к новому сообщению внутри useSupportChat, и ссылку на
 * неё композабл получает сам — через ref="threadEl" в шаблоне ниже. Но vue-tsc
 * СТРОКОВУЮ ссылку за использование переменной не считает и роняет сборку с
 * TS6133 «объявлено и не прочитано». Правка `:ref="threadEl"` тут не годится:
 * в шаблоне ref разворачивается, и композаблу пришёл бы сам элемент вместо
 * ссылки на него. Пустое обращение — самый дешёвый честный способ сказать
 * проверяльщику, что переменная нужна.
 */
const { messages, draft, canSend, send, threadEl } = useSupportChat()
void threadEl

/**
 * Лента для разметки: к каждому сообщению добавлены два ответа, которые иначе
 * пришлось бы считать прямо в шаблоне через messages[index - 1] — выражение,
 * которое читается хуже, чем называется.
 */
const thread = computed(() =>
  messages.value.map((message, index) => ({
    message,
    dayLabel: startsNewDay(message, messages.value[index - 1])
      ? d(new Date(message.at), 'day')
      : null,
    last: endsRun(message, messages.value[index + 1]),
  })),
)
</script>

<template>
  <div class="vel-chat">
    <!-- Заголовок раздела скрыт глазами: над перепиской он был бы третьей
         строкой подряд, называющей одно и то же (пункт меню, шапка ленты,
         заголовок). Скринридеру он обязателен — на него уходит фокус при
         смене раздела. -->
    <h2 :id="CABINET_HEADING_ID" tabindex="-1" class="sr-only">
      {{ t('account.pages.support.title') }}
    </h2>

    <section class="vel-chat__card" :aria-label="t('account.pages.support.title')">
      <VelChatHeader />

      <!--
        role="log" + aria-live="polite": лента дописывается снизу, и скринридер
        обязан объявить новое сообщение, не перебивая текущее чтение.
        tabindex="0" — прокрутить её нужно уметь и с клавиатуры.
      -->
      <div
        ref="threadEl"
        class="vel-chat__thread"
        role="log"
        aria-live="polite"
        tabindex="0"
        :aria-label="t('account.support.chat.threadLabel')"
      >
        <!-- Фактура фона: порт Magic UI Dot Pattern. Даёт ленте поверхность,
             на которой пузыри читаются как объекты, а не как текст на пустом
             месте. Слой декоративный и лежит под содержимым. -->
        <VelDotField class="vel-chat__texture" :gap="18" :radius="1" :opacity="0.5" />

        <div class="vel-chat__stack">
          <!-- Приветствие рисуется всегда и в ленте не хранится: это начало
               разговора, а не его событие, и времени у него нет. -->
          <VelChatBubble
            author="agent"
            :text="t('account.support.chat.greeting')"
            at=""
            delivery="sent"
            :last="false"
          />

          <template v-for="item in thread" :key="item.message.id">
            <p v-if="item.dayLabel" class="vel-chat__day">{{ item.dayLabel }}</p>

            <VelChatBubble
              :author="item.message.author"
              :text="item.message.text"
              :at="item.message.at"
              :delivery="item.message.delivery"
              :last="item.last"
            />
          </template>
        </div>
      </div>

      <VelChatComposer v-model="draft" :can-send="canSend" @send="send" />
    </section>

    <p class="vel-chat__note">{{ t('account.support.chat.localNote') }}</p>
  </div>
</template>

<style scoped>
/*
  НА ТЕЛЕФОНЕ ПЕРЕПИСКА ЗАНИМАЕТ ВЕСЬ ЭКРАН — так же, как в любом мессенджере.

  Высота считается от места, которое раздел реально получил: из динамической
  высоты окна вычтены залипшая шапка (замеренная --vel-shell-head-h), нижняя
  панель навигации с её зазором и вырез телефона, плюс поля самого раздела.
  Все слагаемые — те же переменные, которыми эти полосы себя и рисуют, так
  что разъехаться с ними число не может.

  dvh, а не vh: на телефоне адресная строка браузера то появляется, то
  исчезает, и vh считает от БОЛЬШЕГО значения — поле ввода пряталось бы под
  ней ровно тогда, когда в него метят пальцем.

  Зачем вообще на весь экран. С прежним потолком в 60dvh под лентой оставалась
  полоса пустоты, а страница при этом ещё и прокручивалась — то есть человек
  мог увезти поле ввода за край, ничего этим не добившись. Занимая экран
  целиком, переписка ведёт себя предсказуемо: прокручивается лента, поле
  всегда на месте.
*/
.vel-chat {
  /*
    ЧТО ЗАНЯТО НИЖЕ ЛЕНТЫ. На телефоне это плавающая панель навигации с её
    зазором и вырез телефона, плюс строка-сноска под карточкой. Все слагаемые —
    те же переменные, которыми панель себя и рисует, поэтому разъехаться с ней
    число не может.
  */
  --vel-chat-reserve: calc(
    var(--vel-tabbar-h, 4rem) + var(--vel-tabbar-gap, 0.5rem) * 2 +
      env(safe-area-inset-bottom) + 3.25rem
  );

  display: flex;
  flex-direction: column;
  gap: 0.6rem;
  /* Ширину не режем: колонка раздела уже ограничена 72rem и отцентрована, а
     второй потолок поверх неё оставлял бы справа полосу пустоты — ровно то,
     из-за чего экран выглядел незаполненным. Читаемость держит не карточка,
     а сам пузырь: он не шире min(85%, 32rem). */
  block-size: calc(100dvh - var(--vel-shell-head-h, 9.6rem) - var(--vel-chat-reserve));
  min-block-size: 22rem;
}

.vel-chat__card {
  display: flex;
  overflow: hidden;
  min-block-size: 0;
  flex: 1 1 auto;
  flex-direction: column;
  border: 1px solid var(--color-line);
  border-radius: var(--radius-panel);
  background-color: var(--color-surface);
}

@media (min-width: 64rem) {
  /*
    На широком экране нижней панели нет — меню уехало в колонку слева, — и
    внизу занят только нижний отступ раздела со сноской. Формула та же, меняется
    одно слагаемое: высота по-прежнему считается, а не задаётся заново.

    Раньше здесь стояло block-size: auto, и карточка схлопывалась по
    содержимому: на пустой переписке она занимала верхнюю четверть экрана, а
    под ней лежала полоса пустоты в два экрана. Лента обязана занимать своё
    место в обоих режимах — сжиматься на телефоне и разворачиваться на
    большом экране, а не только первое.
  */
  .vel-chat {
    --vel-chat-reserve: 4.5rem;
  }
}

/*
  ВЫСОТА ЛЕНТЫ ОГРАНИЧЕНА, И ЭТО НАМЕРЕННО. Без потолка переписка растит
  страницу, и поле ввода уезжает вниз: чтобы ответить, пришлось бы сперва
  пролистать весь разговор. С потолком прокручивается лента, а поле всегда
  на месте — как в мессенджере.

  dvh, а не vh: на телефоне адресная строка браузера то появляется, то
  исчезает, и vh считает от большего значения — поле ввода пряталось бы под
  ней ровно тогда, когда в него метят пальцем.
*/
.vel-chat__thread {
  position: relative;
  overflow-y: auto;
  min-block-size: 12rem;
  flex: 1 1 auto;
  padding: 0.85rem;
  /* Дотянув ленту до края, палец не должен утаскивать за собой страницу. */
  overscroll-behavior-block: contain;
  background-color: var(--color-ground);
}

/* Фактура — под содержимым, но над заливкой. Цвет берёт от ленты через
   currentColor, поэтому отдельного токена под него не нужно. */
.vel-chat__texture {
  z-index: 0;
  color: var(--color-line-strong);
}

.vel-chat__stack {
  position: relative;
  z-index: 1;
}

.vel-chat__thread:focus-visible {
  outline: 2px solid var(--color-accent);
  outline-offset: -2px;
}

/*
  Короткая переписка прижата к низу: одно приветствие наверху и полоса пустоты
  под ним выглядят как незагрузившийся экран.
*/
.vel-chat__stack {
  display: flex;
  min-block-size: 100%;
  flex-direction: column;
  justify-content: flex-end;
  gap: 0.35rem;
}

.vel-chat__day {
  margin: 0.5rem auto 0.15rem;
  padding: 0.15rem 0.6rem;
  border-radius: var(--radius-round);
  background-color: var(--color-surface);
  color: var(--color-muted);
  font-size: 0.68rem;
  font-weight: 600;
}

.vel-chat__note {
  margin: 0;
  color: var(--color-faint);
  font-size: 0.72rem;
  line-height: 1.4;
}
</style>
