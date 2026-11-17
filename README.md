# sennable-flow (mod)

The progress band and agents panel for the `/sennable-flow` skill (`~/.claude/skills/sennable-flow`). Jev ([TypeSafe](https://typesafe.ai)) picks the model, effort and skill for each worker task; this mod shows those picks. The skill, the `sennable-worker` agent and the Jev picker are not in this repo: on its own the mod gives you the band, the agents panel and the on/off switch, and the chips fill in when an orchestrator reports tasks through `mcp__sennable-flow__progress`.

- **Band above the prompt**: flow title, phase, accepted/total, then one coloured dot per model with its task count, then two countdowns: `cache` (time left on the main session's prompt cache, 1 h after its last request) and `worker` (the same for the most recent worker request). They turn amber under 10 minutes and say `expired` after. Display only; nothing pings to keep a cache warm.
- **Agents panel** (`/agents-info`): each task gets a chip row `Sonnet 5.5 · medium` · `skill: tdd-workflow` · `Jev 87%`. An amber `default · Jev 48% haiku` chip means Jev was under 60% sure, so the default (Sonnet · medium · no skill) was used; `raised: <reason>` means the orchestrator moved Jev's pick up. Crabs wear one costume per model: Fable astronaut, Opus detective, Sonnet chef, Haiku racer, Jev a magenta cap with the TypeSafe mark (plus a camera for images).
- **Jev tasks** (`classify`, `classify_image`) use the same crab cards: the crab wears the TypeSafe mark in magenta (`Jev 1.13`); image sorts also carry a camera (`Jev 1.13 · images`). They have no Agent run, so the orchestrator reports `state: running` / `done` on the task: the row moves from planned to running (walking crab) to finished (✓) in the panel, the compact crab row, and the band's crab while only Jev is working.

- **On/off switch**: `/sennable on`, `/sennable off` (or `/sennable` for the state), or the `◉ sennable-flow on` / `○ sennable-flow off` button on the band. The flag is saved in `~/.claude/sennable-flow.json`, so it holds in every session and project until switched off. While on, every prompt you type (not slash commands, notifications or other sessions) carries a short note telling the session to orchestrate real work with the skill and answer quick things directly. With no flow running, the band is slim: the switch, what it means right now, and the session cache countdown.

- **agents button**: `agents` on the slim band, `agents ×N` on the full band; opens or closes the agents panel (same as `/agents-info`).
- **keep warm** (this session only, off by default): while on, when nothing has happened for 55 minutes the mod sends one ping, 5 minutes before the main cache would expire. A ping is `$.model.fork`: it re-sends the conversation as last sent, so it is served from cache and the cache's 1-hour clock restarts. It adds nothing to the transcript and runs no tools. It switches itself off after 3 hours. The button shows `◉ keep warm · next ping m:ss · h:mm left`. Cost per ping is a cache read of the whole conversation (about $0.04 at 200k tokens on Opus 5.5); a failed ping is retried after a minute.
- **elephant/goldfish switch**: `/eg on`, `/eg off` (or `/eg` for the state), or the `◉ elephant/goldfish` / `○ elephant/goldfish` button on the band. It exists only in a project whose `.claude/commands` holds at least one `eg-*.md`; elsewhere the button is hidden and the switch does nothing. The flag is saved in `~/.claude/elephant-goldfish.json`. While on, each prompt you type carries a short note sending real work to the matching command file (a bug to `eg-fix-bug.md`, a new feature to `eg-new-feature.md`, an idea to `eg-brainstorm.md`, a spec to `eg-prd.md`, and `eg-precommit-review.md` before any commit) and answering quick things directly.

## Tools

- `mcp__sennable-flow__progress`: the orchestrator reports the plan (tasks with `model`, `effort`, `skill`, `sure`, `fallback`, `guess`, `raised`, `after`), the phase and accepted tasks.
- `mcp__sennable-flow__step`: a worker reports its own steps.

Loaded through `CLAUDE_CODE_PLUGIN_DIRS` in `~/.claude/settings.json`; a change takes effect in a new session. Cost is an estimate from the `PRICES` table in `hooks/register.tsx`. Provenance in `SOURCE.txt`.

`node demo/render-demo.mjs --fixture jev` draws the panel and band into `demo/out/` without loading Claude Code.

## Credit and licence

Forked from [savvy-progress](https://github.com/JohnnyVizz/claude-kit/tree/3008472681c9a8b6a7dd2cf672bc24f3360de95a/plugins/savvy-progress) by johnnyvizz. MIT; see `LICENSE`.
