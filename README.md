# Sparkly Hippo

A Claude Code mod: a sparkly hippo who flies above your prompt, Nyan Cat style, while Claude works.

```
       >=<       *✧✧˚ ⋆˚          ** *✦             ·             ·
    .-''  '--.,⋆ · ⋆ · ·✧   ˚⋆✦˚ *✧ *˚  ˚ · ✧    ˚                     ⋆
    '._,'  (  )✦˚         *⋆    ˚        ✦  ⋆⋆ ·˚        ✧   ·  ⋆··
         Xx'xX                     ˚  ˚                      ˚  ˚
```

- **Flies while Claude works.** He paddles and bobs, leaving a wavy trail of glitter that fades into the background as it drifts away. The stars speed up over five seconds as he gets going.
- **Bursts on every tool call.** Gold sparks explode from his backside, fast enough that some overtake him.
- **Celebrates each finished reply** with a spin and a starburst.
- **Rests while Claude is idle.** The stars drift slowly past, and he blinks now and then. After two minutes he falls asleep.
- **Fits your terminal.** He uses a deeper palette on light themes, and shrinks to a two-row strip on short terminals.
- **Renames the thinking line** to "Sparkly Hippo is thinking…".

## Install

At the prompt of a Claude Code session in a terminal:

```
/plugin install sparkly-hippo --marketplace bbodien/sparkly-hippo
```

Answer `y` to add the marketplace, then press Enter to install for your user. He appears straight away.

From a shell:

```
claude plugin install sparkly-hippo --marketplace bbodien/sparkly-hippo
```

In the desktop app, where `/plugin` does not run: click + next to the prompt box, then Plugins, Add marketplace with `bbodien/sparkly-hippo`, then Add plugin.

## Use

He needs no setup. `/sparkly-hippo` toggles flying even while Claude is idle; run it again to let him rest.

If you also use the [skins](https://github.com/hellosverre/claude-skins) mod, it replaces the thinking line's word with its own. Run `/skin words claude` to let "Sparkly Hippo is thinking…" through. If the line then shows Claude Code's usual words instead, also run `/skin shimmer off`.

## Development

```
claude plugin validate .
claude plugin test .
```

## Credits

The hippo is by **Asik**, from [ascii.co.uk/art/hippo](https://ascii.co.uk/art/hippo). It is mirrored to face left, and the original drawing is used for his spin. The artwork is Asik's and is not covered by this project's MIT license.
