/** One spark of a burst: where it is on screen, its own velocity through space in columns and rows a frame, its age in frames, and its colour. */
export type Spark = { x: number; y: number; vx: number; vy: number; age: number; color: string }

/** `n` counts every frame, `h` the frames he flew and `idle` the frames since Claude last worked; `spin` is the frames of his celebration turn still to go; the stars have scrolled `pos` at the speed `gear` selects, the trail `trailPos` at `trailSpeed`; `trail[d]` is his height when column `d` behind him was released, or null while idle. */
export type Sky = {
  n: number
  h: number
  pos: number
  gear: number
  idle: number
  spin: number
  trailPos: number
  trailSpeed: number
  trail: (number | null)[]
  sparks: Spark[]
}

declare module 'claude-code' {
  interface PluginState {
    'sparkly-hippo': { nebula: Sky; isDemo: boolean }
  }
}
