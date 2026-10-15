import { atom, read, update } from 'claude-code'
import type { Register } from 'claude-code'

import type { Sky, Spark } from '../types'

const IDLE_SPEED = 0.25
const MAX_SPEED = 2
// Full speed 40 frames (5s) after Claude starts working; idle speed 5s after it stops.
const TOP_GEAR = 40
export const speedOf = (gear: number) => IDLE_SPEED + ((MAX_SPEED - IDLE_SPEED) * gear) / TOP_GEAR
const BLINK_EVERY = 37
// Two minutes of 125ms frames.
const SLEEP_AFTER = 960
const SPARK_COUNT = 24
// Two seconds of 125ms frames.
const SPARK_LIFE = 16
const SPARK_DRAG = 0.88
const STARBURST_COUNT = 40
// One second of turning: he faces right then left, twice, two frames each.
const SPIN_FRAMES = 8

const sky = atom({ plugin: 'sparkly-hippo', key: 'nebula' } as const, { n: 0, h: 0, pos: 0, gear: 0, idle: 0, spin: 0, trailPos: 0, trailSpeed: IDLE_SPEED, trail: [], sparks: [] } as Sky)
const isDemo = atom({ plugin: 'sparkly-hippo', key: 'isDemo' } as const, false)

// Hippo art by Asik, from https://ascii.co.uk/art/hippo: FACING_RIGHT is the original, HIPPO its mirror image.
const HIPPO = [
  ["   >=<     ", ".-''  '--.,", "'._,'  (  )", "     Xx'xX "],
  ["   >=<     ", ".-''  '--.,", "'._,'  (  )", "    ´nm'nm "],
]
const FACING_RIGHT = [
  ["     >=<   ", ",.--'  ''-.", "(  )  ',_.'", " Xx'xX     "],
  ["     >=<   ", ",.--'  ''-.", "(  )  ',_.'", " mn'mn`    "],
]
const SNORE: [number, number, string][][] = [
  [],
  [[0, 7, 'z']],
  [[0, 7, 'z'], [-1, 9, 'Z']],
  [[-1, 9, 'Z'], [-1, 11, 'Z']],
]
const HIPPO_WIDTH = 11
const ROWS = 5
const COMPACT_ROWS = 2
// A terminal shorter than this gets the two-row hippo.
const SHORT_TERMINAL = 30
const HIPPO_X = 4
const TRAIL_START = HIPPO_X + HIPPO_WIDTH
const MAX_TRAIL = 300

const TWINKLE = ['✦', '✧', '⋆', '·', '˚', '*']

export type Palette = {
  background: string
  body: string
  ears: string
  glint: string
  shimmer: string
  star: string
  snore: string
  gold: string[]
  sparkles: string[]
}
// shortcut: each background is a guess at the terminal's (dark sampled from one screenshot); trails fade toward it, so a different terminal background shows them as faint marks.
export const DARK: Palette = {
  background: '#3A3C4B',
  body: '#D7B8FF',
  ears: '#FF9EDB',
  glint: '#FFFFFF',
  shimmer: '#FFD866',
  star: '#8A7FB0',
  snore: '#C8A8FF',
  gold: ['#FFD866', '#FFF3B0'],
  sparkles: ['#FFD866', '#FFFFFF', '#FF9EDB', '#C8A8FF', '#A8F0FF'],
}
export const LIGHT: Palette = {
  background: '#FFFFFF',
  body: '#7B4FD0',
  ears: '#D6338A',
  glint: '#3A1F8F',
  shimmer: '#C99000',
  star: '#B9B0D6',
  snore: '#7B4FD0',
  gold: ['#C99000', '#E0A800'],
  sparkles: ['#C99000', '#7B4FD0', '#D6338A', '#1F8FA8', '#E07A00'],
}
export const paletteFor = (theme: unknown) => (String(theme).startsWith('light') ? LIGHT : DARK)

const mix = (from: string, to: string, t: number) =>
  '#' +
  [1, 3, 5]
    .map(i => Math.round(parseInt(from.slice(i, i + 2), 16) * (1 - t) + parseInt(to.slice(i, i + 2), 16) * t))
    .map(v => v.toString(16).padStart(2, '0'))
    .join('')

type Cell = { ch: string; color?: string; isBold?: boolean }
export type Run = { text: string; color?: string; isBold?: boolean }

const hash = (x: number, y: number) => {
  let h = Math.imul(x, 374761393) + Math.imul(y, 668265263)
  h = Math.imul(h ^ (h >>> 13), 1274126177)
  return (h ^ (h >>> 16)) >>> 0
}

const bob = (h: number) => 1 - ((h >> 2) & 1)

export const tick = ({ n, h, pos, gear, idle, spin, trailPos, trailSpeed, trail, sparks }: Sky, isActive: boolean): Sky => {
  // At rest he settles on his low, standing frame: one row clear above him and below.
  const flown = isActive ? h + 1 : h - (h % 8)
  const nextGear = isActive ? Math.min(TOP_GEAR, gear + 1) : Math.max(0, gear - 1)
  // The stars slow with him; released glitter keeps the pace it had when Claude stopped.
  const nextTrailSpeed = isActive ? speedOf(nextGear) : trailSpeed
  const nextTrailPos = trailPos + nextTrailSpeed
  return {
    n: n + 1,
    h: flown,
    pos: pos + speedOf(nextGear),
    gear: nextGear,
    idle: isActive ? 0 : Math.min(SLEEP_AFTER, idle + 1),
    spin: Math.max(0, spin - 1),
    trailPos: nextTrailPos,
    trailSpeed: nextTrailSpeed,
    trail: [...Array<number | null>(Math.floor(nextTrailPos) - Math.floor(trailPos)).fill(isActive ? bob(flown) : null), ...trail].slice(0, MAX_TRAIL),
    sparks: sparks
      // Like the trail, a spark is swept back at the trail's pace once drag has bled off the speed it was thrown with.
      .map(spark => ({ ...spark, vx: spark.vx * SPARK_DRAG, vy: spark.vy * SPARK_DRAG, age: spark.age + 1 }))
      .map(spark => ({ ...spark, x: spark.x + spark.vx + nextTrailSpeed, y: spark.y + spark.vy }))
      .filter(spark => spark.age < SPARK_LIFE),
  }
}

// A ring of sparks from his backside, between his two body rows.
const explode = (sky: Sky, colors: string[], count: number): Spark[] =>
  Array.from({ length: count }, (_, i) => {
    const seed = hash(sky.n, i + 100)
    const angle = ((i + (seed % 100) / 200) / count) * 2 * Math.PI
    // Thrown faster than he flies, so the ones thrown forward overtake him.
    const speed = 4 + ((seed >>> 8) % 100) / 33
    // Flattened to stay in a band only five rows tall.
    const vy = Math.sin(angle) * speed * 0.25
    return { x: TRAIL_START - 1, y: bob(sky.h) + 1.5, vx: Math.cos(angle) * speed - sky.trailSpeed, vy, age: 0, color: colors[seed % colors.length]! }
  })

export const burstOut = (sky: Sky, palette = DARK): Sky => ({ ...sky, sparks: [...sky.sparks, ...explode(sky, palette.gold, SPARK_COUNT)] })

export const celebrate = (sky: Sky, palette = DARK): Sky => ({
  ...sky,
  spin: SPIN_FRAMES,
  sparks: [...sky.sparks, ...explode(sky, palette.sparkles, STARBURST_COUNT)],
})

export const scene = ({ n, h, pos, idle, spin, trailPos, trail, sparks }: Sky, columns: number, palette = DARK): Run[][] => {
  const isAsleep = idle >= SLEEP_AFTER
  const eyes = isAsleep || n % BLINK_EVERY === 0 ? '--' : "''"
  const grid: Cell[][] = Array.from({ length: ROWS }, (_, row) =>
    Array.from({ length: columns }, (_, col) =>
      hash(col - Math.floor(pos * 2), row) % 29 === 0 ? { ch: hash(col, row) % 2 ? '·' : '˚', color: palette.star } : { ch: ' ' },
    ),
  )

  // Nyan-style: the hippo holds his place facing left; the glitter he releases drifts off to the right.
  const x = HIPPO_X
  const y = bob(h)
  const trailLength = columns - TRAIL_START

  for (let col = TRAIL_START; col < columns; col++) {
    const height = trail[col - TRAIL_START]
    if (height == null) continue
    const density = 0.75 * Math.max(0.12, 0.9 - (col - TRAIL_START) / trailLength)
    // Stepped so neighbouring sparkles share a colour and merge into one run.
    const fade = 0.92 * Math.min(1, Math.round(((col - TRAIL_START) / (0.8 * trailLength)) * 12) / 12)
    // The trail leaves his body rows, below the bow.
    for (const dr of [1, 2]) {
      const s = hash(col - Math.floor(trailPos), dr + 7)
      if ((s % 100) / 100 < density) {
        const color = mix(palette.sparkles[(s >>> 8) % palette.sparkles.length]!, palette.background, fade)
        grid[height + dr]![col] = { ch: TWINKLE[(s + n) % TWINKLE.length]!, color }
      }
    }
  }

  for (const spark of sparks) {
    const col = Math.round(spark.x)
    const row = Math.round(spark.y)
    if (col < 0 || col >= columns || row < 0 || row >= ROWS) continue
    const life = spark.age / SPARK_LIFE
    const color = mix(spark.color, palette.background, Math.min(1, Math.round(life * 8) / 8))
    grid[row]![col] = { ch: life < 0.35 ? '✦' : life < 0.7 ? '✧' : '·', color }
  }

  const shine = (n % 24) - 6
  const isFacingRight = Math.ceil(spin / 2) % 2 === 0 && spin > 0
  ;(isFacingRight ? FACING_RIGHT : HIPPO)[(h >> 1) & 1]!.forEach((sprite, dy) => {
    const line = dy === 1 ? sprite.replace("''", eyes) : sprite
    const left = line.search(/\S/)
    const right = line.trimEnd().length
    ;[...line].forEach((ch, dx) => {
      if (dx < left || dx >= right) return
      if (ch === ' ') return void (grid[y + dy]![x + dx] = { ch })
      const glint = Math.abs(dx - shine)
      grid[y + dy]![x + dx] =
        glint <= 1 ? { ch, color: palette.glint, isBold: true }
        : glint === 2 ? { ch, color: palette.shimmer }
        : { ch, color: dy === 0 ? palette.ears : palette.body }
    })
  })

  // Asleep he is at rest, so y is 1 and the top row is free for the rising Z.
  if (isAsleep) {
    for (const [dy, dx, ch] of SNORE[Math.floor(n / 8) % SNORE.length]!) {
      grid[y + dy]![x + dx] = { ch, color: palette.snore }
    }
  }

  return grid.map(cells =>
    cells.reduce<Run[]>((runs, { ch, color, isBold }) => {
      const last = runs.at(-1)
      if (last && last.color === color && last.isBold === isBold) last.text += ch
      else runs.push({ text: ch, color, isBold })
      return runs
    }, []),
  )
}

export const register: Register = on => {
  let isActive = false
  let palette = DARK

  on('session.start', async ($, e, next) => {
    await $.command.register({
      name: 'sparkly-hippo',
      description: 'Toggle Sparkly Hippo flying even while Claude is idle',
    })
    palette = paletteFor((await $.config.list()).find(row => row.key === 'theme')?.value)
    $.clock.every(125, () => update($, sky, s => tick(s, isActive)))
    return next(e)
  })

  on('config.set', { key: 'theme' }, async ($, e, next) => {
    const result = await next(e)
    palette = paletteFor(e.value)
    return result
  })

  on('tool.call', ($, e, next) => {
    void update($, sky, s => burstOut(s, palette))
    return next(e)
  })

  on('turn.complete', ($, e, next) => {
    if (e.agentId === undefined && e.reason === 'answer') void update($, sky, s => celebrate(s, palette))
    return next(e)
  })

  on('ui.render', { component: 'Spinner' }, ($, e, next) => next({ ...e, props: { ...e.props, word: 'Sparkly Hippo is thinking' } }))

  on('command.run', { command: 'sparkly-hippo' }, async $ => {
    const isOn = await update($, isDemo, was => !was)
    return { text: isOn ? 'Sparkly Hippo takes flight ✦' : 'Sparkly Hippo rests while Claude is idle.' }
  })

  on('ui.render', { component: 'AbovePrompt' }, async ($, e, next) => {
    isActive = e.props.isWorking || (await read($, isDemo))
    const columns = e.props.bodyColumns
    if (e.props.hasSurvey || columns < HIPPO_WIDTH + 20 || e.props.maxRows < COMPACT_ROWS) {
      return next(e)
    }

    const { Box, Text } = $.ui.resolve(e)
    const state = await read($, sky)
    const drawn = scene(state, columns, palette)
    const isCompact = e.props.maxRows < ROWS || (e.viewport?.rows ?? Infinity) < SHORT_TERMINAL
    // Compact, he shows as his two body rows and the trail that leaves them.
    const top = bob(state.h) + 1
    const rows = isCompact ? drawn.slice(top, top + COMPACT_ROWS) : drawn

    return (
      <Box flexDirection="column">
        {rows.map((runs, row) => (
          <Text key={String(row)} wrap="truncate">
            {runs.map((run, i) => (
              <Text key={String(i)} color={run.color} weight={run.isBold ? 'bold' : undefined}>
                {run.text}
              </Text>
            ))}
          </Text>
        ))}
      </Box>
    )
  })
}
