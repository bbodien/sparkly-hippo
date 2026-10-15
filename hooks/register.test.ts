import { expect, test } from 'claude-code/testing'

import type { Sky } from '../types'
import { burstOut, celebrate, DARK, LIGHT, paletteFor, scene, speedOf, tick } from './register'

const props = (isWorking: boolean, maxRows = 20) => ({
  hasSurvey: false,
  isWorking,
  maxRows,
  bodyColumns: 60,
  scroll: { offset: 0, bodyRows: 20 },
  view: {},
})
const text = (sky: Sky) => scene(sky, 60).map(row => row.map(run => run.text).join('')).join('\n')
const run = (sky: Sky, frames: number, isActive: boolean) =>
  Array.from({ length: frames }).reduce<Sky>(s => tick(s, isActive), sky)
const start: Sky = { n: 0, h: 0, pos: 0, gear: 0, idle: 0, spin: 0, trailPos: 0, trailSpeed: 0.25, trail: [], sparks: [] }

test('every scene row fills the band exactly, flying or resting', () => {
  let sky = start
  for (let i = 0; i < 80; i++) {
    sky = tick(sky, i % 30 < 20)
    for (const row of scene(sky, 60)) {
      expect([...row.map(r => r.text).join('')].length).toBe(60)
    }
  }
})

test('the hippo paddles while flying', () => {
  expect(text(start)).toContain("Xx'xX")
  expect(text(run(start, 2, true))).toContain("´nm'nm")
})

test('at rest he holds still and releases nothing, while released glitter drifts on', () => {
  const flown = run(start, 43, true)
  const rested = run(flown, 8, false)
  const drifted = rested.trail.length - flown.trail.length

  expect(rested.h).toBe(40)
  expect(text(rested)).toContain("Xx'xX")
  expect(text(rested).split('\n')[0]).not.toContain('>=<')
  expect(drifted).toBeGreaterThan(0)
  expect(rested.trail.slice(0, drifted).every(release => release === null)).toBe(true)
  expect(rested.trail.slice(drifted)).toEqual(flown.trail)
})

test('the sky speeds up over 5s of work and slows back to a drift at rest', () => {
  expect(speedOf(run(start, 20, true).gear)).toBeGreaterThan(1)
  expect(speedOf(run(start, 39, true).gear)).toBeLessThan(2)
  expect(speedOf(run(start, 40, true).gear)).toBe(2)
  expect(speedOf(run(run(start, 40, true), 40, false).gear)).toBe(0.25)

  const trickle = run(start, 8, true).trail.length
  const stream = run(run(start, 40, true), 8, true).trail.length - run(start, 40, true).trail.length
  expect(trickle).toBeLessThan(stream)
})

test('is drawn above the prompt whether Claude is working or idle', async ($, on) => {
  on('ui.render', { component: 'AbovePrompt' }, () => ({ type: 'engine', ref: 0 }))
  for (const isWorking of [true, false]) {
    for (const surface of ['terminal', 'desktop'] as const) {
      const ui = await $.ui.mount({ plugin: 'sparkly-hippo', surface, component: 'AbovePrompt', props: props(isWorking) })
      expect(await ui.find({ text: '>=<' })).toBeDefined()
    }
  }
})

test('/sparkly-hippo toggles flying while idle', async $ => {
  const toggle = { command: 'sparkly-hippo', args: '', origin: { kind: 'composer' }, presentation: { isFullscreen: false, columns: 80 } } as const

  expect((await $.command.run(toggle)).text).toContain('takes flight')
  expect((await $.command.run(toggle)).text).toContain('rests')
})

test('the trail fades to near the background by 80% of its length', () => {
  const flown = run(start, 200, true)
  const colours = (from: number, to: number) =>
    scene(flown, 100).flatMap(row => {
      let col = 0
      return row.flatMap(r => {
        const at = col
        col += [...r.text].length
        return at >= from && at < to && r.text.trim() && r.color ? [r.color] : []
      })
    })
  const brightness = (hex: string) => [1, 3, 5].reduce((sum, i) => sum + parseInt(hex.slice(i, i + 2), 16), 0)
  const near = colours(15, 25).filter(c => c !== '#8A7FB0' && !c.startsWith('#D7') && c !== '#FF9EDB')

  expect(Math.max(...near.map(brightness))).toBeGreaterThan(500)
  expect(colours(84, 100).filter(c => c !== '#8A7FB0').every(c => brightness(c) < brightness('#3A3C4B') + 60)).toBe(true)
})

test('he blinks now and then while awake', () => {
  const eyes = (sky: Sky) => text(sky).split('\n')[2]!.slice(4, 15)
  expect(eyes({ ...start, n: 36 })).toContain(".-''")
  expect(eyes({ ...start, n: 37 })).toContain('.---')
})

test('after 2 minutes idle he falls asleep, and wakes as Claude starts work', () => {
  const nearly = run(start, 959, false)
  const asleep = tick(nearly, false)
  const snoring = (sky: Sky) => [8, 16, 24].some(dn => /[zZ]/.test(text({ ...sky, n: sky.n + dn })))

  expect(snoring(nearly)).toBe(false)
  expect(text({ ...asleep, n: 36 })).toContain('.---')
  expect(snoring(asleep)).toBe(true)

  const woken = tick(asleep, true)
  expect(woken.idle).toBe(0)
  expect(snoring(woken)).toBe(false)
})

test('a tool call explodes gold sparks out of his backside, some overtaking him, gone within 2s', () => {
  const cruising = run(start, 60, true)
  const burst = burstOut(cruising)
  const spread = run(burst, 4, true)
  const origin = burst.sparks[0]!

  expect(burst.sparks).toHaveLength(24)
  expect(burst.sparks.every(spark => spark.x === origin.x && spark.y === origin.y)).toBe(true)
  expect(spread.sparks.some(spark => spark.x < origin.x - 2)).toBe(true)
  expect(spread.sparks.some(spark => spark.x > origin.x + 2)).toBe(true)
  expect(spread.sparks.some(spark => spark.y < origin.y - 0.5)).toBe(true)
  expect(spread.sparks.some(spark => spark.y > origin.y + 0.5)).toBe(true)
  expect(text(spread)).toMatch(/✦/)
  expect(run(burst, 4, true).sparks.some(spark => spark.x < 4 && Math.round(spark.y) >= 0 && Math.round(spark.y) < 5)).toBe(true)

  expect(run(burst, 15, true).sparks).toHaveLength(24)
  expect(run(burst, 16, true).sparks).toHaveLength(0)
})

test('when he brakes, the stars slow to a drift while the trail keeps its pace', () => {
  const cruising = run(start, 40, true)
  const braked = run(cruising, 40, false)

  expect(braked.pos - cruising.pos).toBeLessThan(40 * 2)
  expect(braked.trailPos - cruising.trailPos).toBe(40 * 2)
  expect(braked.trail.slice(80)).toEqual(cruising.trail.slice(0, 220))

  const resumed = tick(braked, true)
  expect(resumed.trailSpeed).toBe(speedOf(resumed.gear))
})

test('when a turn finishes he spins and sets off a starburst in every trail colour', () => {
  const done = celebrate(run(start, 60, true))
  const facings = Array.from({ length: 9 }, (_, i) => text(run(done, i, false)).includes(",.--'") ? 'R' : 'L').join('')

  expect(facings).toBe('RRLLRRLLL')
  expect(done.sparks).toHaveLength(40)
  expect(new Set(done.sparks.map(spark => spark.color))).toEqual(new Set(DARK.sparkles))
})

test('he takes his colours from the theme', () => {
  expect(paletteFor('light')).toBe(LIGHT)
  expect(paletteFor('light-daltonized')).toBe(LIGHT)
  expect(paletteFor('dark')).toBe(DARK)
  expect(paletteFor(undefined)).toBe(DARK)

  const colours = (palette: typeof DARK) => scene(run(start, 60, true), 60, palette).flat().map(r => r.color)
  expect(colours(LIGHT)).toContain(LIGHT.body)
  expect(colours(LIGHT)).not.toContain(DARK.body)
})

test('the thinking line reads "Sparkly Hippo is thinking", keeping the engine\'s timer', async ($, on) => {
  let word = ''
  on('ui.render', { component: 'Spinner' }, ($, e) => {
    word = e.props.word
    return { type: 'engine', ref: 0 }
  })
  await $.ui.mount({ plugin: 'sparkly-hippo', surface: 'terminal', component: 'Spinner', props: { word: 'Sauteing', message: null, suffix: '…', mode: 'thinking' } })
  expect(word).toBe('Sparkly Hippo is thinking')
})

test('on a short terminal he shrinks to his two body rows, and hides when there is no room', async ($, on) => {
  on('ui.render', { component: 'AbovePrompt' }, () => ({ type: 'engine', ref: 0 }))
  const mount = (maxRows: number) =>
    $.ui.mount({ plugin: 'sparkly-hippo', surface: 'terminal', component: 'AbovePrompt', props: props(true, maxRows) })

  const compact = await mount(3)
  expect(await compact.find({ text: '>=<' })).toBeUndefined()
  expect(await compact.find({ text: "'--.," })).toBeDefined()

  const hidden = await mount(1)
  expect(await hidden.find({ text: "'--.," })).toBeUndefined()
})
