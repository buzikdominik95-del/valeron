/**
 * Геометрия амбиентного фона первого экрана: сетка точек и каркас знака Velora.
 *
 * Модуль намеренно ничего не знает о three — здесь только числа и Float32Array
 * в том виде, в каком его принимает BufferAttribute. Форму знака и плотность
 * сетки правят на порядок чаще, чем настройки рендерера, и держать их рядом с
 * созданием контекста WebGL — значит каждый раз перечитывать сцену целиком.
 *
 * Сетка и волна лежат вместе не случайно: массив строится один раз в buildGrid,
 * а updateWave переписывает его НА МЕСТЕ на каждом кадре. Формат у них общий и
 * неявный (тройки x, y, z подряд), так что разъехавшись по разным файлам они
 * рано или поздно разойдутся и по раскладке.
 */

/** Точка сцены. Тройку только читают, наружу она не отдаётся — отсюда readonly. */
type Vec3 = readonly [number, number, number]

// Плотность сетки: 32×16 ≈ 500 вершин — не жадно даже для слабых GPU
const COLUMNS = 32
const ROWS = 16
const STEP = 0.52
const WAVE_HEIGHT = 0.62

/** Опорные точки знака: спуск влево-вниз и восходящий штрих с превышением. */
const MARK: readonly (readonly [number, number])[] = [
  [-4.1, 3.4],
  [-0.5, -3.6],
  [4.1, 4.3],
]
const MARK_LAYERS = 5
const MARK_DEPTH = 2.4

/** Плоская сетка точек, центрированная по нулю: волна поднимет её потом. */
export function buildGrid(): Float32Array {
  const data = new Float32Array(COLUMNS * ROWS * 3)
  let offset = 0
  for (let col = 0; col < COLUMNS; col += 1) {
    for (let row = 0; row < ROWS; row += 1) {
      data[offset] = (col - (COLUMNS - 1) / 2) * STEP
      data[offset + 1] = (row - (ROWS - 1) / 2) * STEP
      data[offset + 2] = 0
      offset += 3
    }
  }
  return data
}

/** Волна правит только Z: X и Y лежат в том же массиве и не пересчитываются. */
export function updateWave(data: Float32Array, seconds: number): void {
  for (let i = 0; i < data.length; i += 3) {
    const x = data[i] ?? 0
    const y = data[i + 1] ?? 0
    data[i + 2] =
      Math.sin(x * 0.44 + seconds * 0.55) * Math.cos(y * 0.36 - seconds * 0.38) * WAVE_HEIGHT
  }
}

function pushSegment(target: number[], from: Vec3 | undefined, to: Vec3 | undefined): void {
  if (!from || !to) return
  target.push(from[0], from[1], from[2], to[0], to[1], to[2])
}

/** Знак в объёме: копии контура по глубине плюс рёбра между соседними слоями. */
export function buildMark(): Float32Array {
  const vertices: number[] = []
  let previous: Vec3[] | null = null

  for (let layer = 0; layer < MARK_LAYERS; layer += 1) {
    const ratio = layer / (MARK_LAYERS - 1)
    const depth = (ratio - 0.5) * MARK_DEPTH
    // Крайние слои уже центрального — контур читается как объёмный штрих.
    const scale = 1 - Math.abs(ratio - 0.5) * 0.36
    const current: Vec3[] = MARK.map(([x, y]) => [x * scale, y * scale, depth])

    for (let i = 0; i + 1 < current.length; i += 1) {
      pushSegment(vertices, current[i], current[i + 1])
    }
    if (previous) {
      for (let i = 0; i < current.length; i += 1) pushSegment(vertices, previous[i], current[i])
    }
    previous = current
  }

  return new Float32Array(vertices)
}
