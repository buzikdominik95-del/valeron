// Только типы: с verbatimModuleSyntax такой импорт стирается полностью
// и в бандл не попадает. Рантайм-модуль грузится динамически в createHeroScene().
import type * as ThreeModule from 'three'
import { buildGrid, buildMark, updateWave } from '@/features/hero/hero-canvas-geometry'

/**
 * three.js-сцена амбиентного фона первого экрана: сетка точек, идущая волной,
 * и поверх неё каркас знака Velora.
 *
 * Без Vue: строится в переданном
 * узле, кадры получает снаружи, убирается по требованию зовущего. Так весь
 * WebGL собран в одном файле, а компоненту остаётся единственный вопрос —
 * КОГДА сцену заводить, крутить и сносить.
 *
 * Числа сетки и знака живут в @/features/hero/hero-canvas-geometry; здесь —
 * материалы, камера, порядок кадра и уборка.
 */

type ThreeApi = typeof ThreeModule

/**
 * Всё, что придётся достать снова: часть — на каждом кадре, часть — на уборке.
 * Держать эти объекты в reactive нельзя, зовущий кладёт состояние в shallowRef.
 */
export interface HeroSceneState {
  renderer: ThreeModule.WebGLRenderer
  scene: ThreeModule.Scene
  camera: ThreeModule.PerspectiveCamera
  group: ThreeModule.Group
  gridGeometry: ThreeModule.BufferGeometry
  gridMaterial: ThreeModule.PointsMaterial
  gridAttribute: ThreeModule.BufferAttribute
  gridData: Float32Array
  markGeometry: ThreeModule.BufferGeometry
  markMaterial: ThreeModule.LineBasicMaterial
}

/** Цвет берём из темы, а не константой: смена гаммы перекрашивает сцену.
    Токен мог не доехать — тогда оставляем дефолт three, сырых значений не держим.
    Принимаем готовый Color, а не пространство имён three: переданный целиком
    неймспейс убивает tree-shaking, и чанк раздувается на четверть мегабайта. */
function themeColor(color: ThreeModule.Color, name: string): ThreeModule.Color {
  const raw = getComputedStyle(document.documentElement).getPropertyValue(name).trim()
  if (raw) color.set(raw)
  return color
}

/**
 * Собирает сцену внутри host и добавляет туда канвас.
 *
 * @param stillNeeded спрашивается ровно один раз — сразу после того, как
 * приехал чанк three, и до создания контекста WebGL. Ожидание чанка занимает
 * заметное время, за которое зовущего могли размонтировать; контекст, созданный
 * для исчезнувшего компонента, пришлось бы тут же сносить, а их на вкладку
 * отпущено по пальцам.
 * @returns null, если сцена больше не нужна или WebGL недоступен.
 */
export async function createHeroScene(
  host: HTMLElement,
  stillNeeded: () => boolean,
): Promise<HeroSceneState | null> {
  // Динамический импорт: three уезжает в отдельный чанк и не тормозит
  // первую отрисовку страницы.
  const three: ThreeApi = await import('three')
  if (!stillNeeded()) return null

  // Канвас заводим сами: своему three прописал бы инлайновый display: block
  const canvas = document.createElement('canvas')
  let renderer: ThreeModule.WebGLRenderer
  try {
    renderer = new three.WebGLRenderer({ canvas, alpha: true, antialias: true })
  } catch {
    // WebGL недоступен (старая машина, отключён флагом) — фона просто не будет.
    return null
  }
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2))

  const scene = new three.Scene()
  const camera = new three.PerspectiveCamera(42, 1, 0.1, 100)
  camera.position.set(0, 0, 13)

  const gridData = buildGrid()
  const gridAttribute = new three.BufferAttribute(gridData, 3)
  gridAttribute.setUsage(three.DynamicDrawUsage) // массив переписывается каждый кадр
  const gridGeometry = new three.BufferGeometry()
  gridGeometry.setAttribute('position', gridAttribute)
  const gridMaterial = new three.PointsMaterial({
    color: themeColor(new three.Color(), '--color-accent'),
    size: 0.055,
    sizeAttenuation: true,
    transparent: true,
    opacity: 0.42,
    depthWrite: false,
  })

  const markGeometry = new three.BufferGeometry()
  markGeometry.setAttribute('position', new three.BufferAttribute(buildMark(), 3))
  const markMaterial = new three.LineBasicMaterial({
    color: themeColor(new three.Color(), '--color-accent-deep'),
    transparent: true,
    opacity: 0.55,
    depthWrite: false,
  })

  const group = new three.Group()
  group.add(new three.Points(gridGeometry, gridMaterial))
  group.add(new three.LineSegments(markGeometry, markMaterial))
  group.rotation.x = -0.22
  scene.add(group)

  host.appendChild(renderer.domElement)
  // prettier-ignore
  return {
    renderer, scene, camera, group,
    gridGeometry, gridMaterial, gridAttribute, gridData, markGeometry, markMaterial,
  }
}

/** Подгоняет камеру и буфер под контейнер. Нулевой размер (контейнер ещё не
    разложен) пропускаем: 0/0 дало бы NaN в аспекте и пустую матрицу проекции. */
export function resizeHeroScene(state: HeroSceneState, host: HTMLElement): void {
  const width = host.clientWidth
  const height = host.clientHeight
  if (width === 0 || height === 0) return

  state.camera.aspect = width / height
  state.camera.updateProjectionMatrix()
  // updateStyle = false: три не трогает style канваса, размер держит CSS.
  state.renderer.setSize(width, height, false)
  state.renderer.render(state.scene, state.camera)
}

/**
 * Один кадр. Секунды приходят снаружи уже накопленными: пока сцена на паузе,
 * они не растут, и возврат на вкладку не даёт скачка фазы волны.
 */
export function renderHeroFrame(state: HeroSceneState, seconds: number): void {
  updateWave(state.gridData, seconds)
  state.gridAttribute.needsUpdate = true

  // Разворот, а не полный оборот: с изнанки «V» читалась бы зеркально.
  state.group.rotation.y = Math.sin(seconds * 0.15) * 0.42
  state.group.rotation.x = -0.22 + Math.cos(seconds * 0.1) * 0.07

  state.renderer.render(state.scene, state.camera)
}

/** Уборка: геометрии, материалы, контекст и сам канвас. */
export function disposeHeroScene(state: HeroSceneState): void {
  state.gridGeometry.dispose()
  state.gridMaterial.dispose()
  state.markGeometry.dispose()
  state.markMaterial.dispose()
  state.renderer.dispose()
  // Одного dispose() мало: контекст живёт до сборки мусора и упирается в лимит.
  state.renderer.forceContextLoss()
  state.renderer.domElement.remove()
}
