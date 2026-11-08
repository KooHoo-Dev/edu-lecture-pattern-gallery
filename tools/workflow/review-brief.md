# Specimen review brief (shared by all reviewers)

You review specimens for the Pattern Gallery: interactive lessons on game programming patterns for a Unity 6.3 LTS course (C# 9, new Input System). Each specimen applies one pattern to one game situation. Do a critical code and content review. Write the report in Korean.

## How a specimen is built

- `unity/<id>/Core/*.cs`: the pattern as plain C# (no UnityEngine). This is the source of truth students copy.
- `unity/<id>/Unity/*.cs`: thin MonoBehaviour adapters (Input System, lifecycle, visuals).
- `unity/<id>/Naive/*.cs`: the common bad code without the pattern. The web "effect off" mode shows it. `// [!]` marks the problem lines.
- `truth/<id>/Target.cs`: harness adapter. `node tools/truth.mjs <id>` runs Core and Naive under dotnet (C# 9) for every scenario in meta and writes `truth/<id>/<scenario>(.naive).log`.
- `src/specimens/<id>/sim.ts`: the same Core and Naive ported to TypeScript line by line (float math via Math.fround). The web stage runs it. The check compares its log with the dotnet log line by line.
- `src/specimens/<id>/meta.ts`: texts, params (key = `[SerializeField]` field name in Unity/), presets, events (= inputs), scenarios (first one is the auto demo), diagram, steps (`// [n]` markers in code), offNote, mistakes, Unity setup/pitfalls (these go into copyable AI prompts).
- Stage: `src/stage/ScenarioStage.tsx`, `runner.ts`, `draw.ts`, `types.ts`. Prompts and Skill: `src/ai.ts`. Domain lint: `src/gallery.config.tsx`, `tools/check-domain.mjs`.
- Rules: `docs/specimen-guide.md` (if present) and the shared kit rules in `node_modules/@koohoo/gallery-kit/docs/kit-guide.md`.

## Already verified (do not re-report)

`gallery check <id>` passes (meta lint, stage renders, effect-off and steps differ, events, auto demo). dotnet logs and sim logs match for all scenarios. All C# compiles with Unity 6000.3's Roslyn against Unity + Input System references (C# 9). The compile check does not run anything inside Unity.

## Files for you (read only)

- The specimen files listed above for your id.
- Web stage captures in `_review/<id>/` (made by `node tools/workflow/review-shots.mjs <id>`), all with the auto demo (first scenario) frozen at the given time: `live-t<sec>-*` and `live-t<sec>-off-*` (effect off) at 1.3 s, the middle and the end of the demo; `live-bug-<k>-*` effect off 0.05 s after each ✖ kind first appears; `live-step<N>-*` step N at the middle of the demo (the step text may describe events that happen later; check those in code and logs); `live-scn-<scenario>-t<sec>(-off)-*` every later scenario at its middle and end (paths the auto demo does not show); `live-param-<key>-min|max-*` each range param at its minimum and maximum (end of the demo) and `live-param-<key>-min|max-mid-off-*` the same at the middle with effect off; `live-preset-<id>-*` each preset at the end of the demo (check overlaps at parameter extremes and that each preset's `look` text matches).
- Logs in `truth/<id>/`.

## What to report

1. Defects ranked by severity. Each: file and line, what is wrong, and a concrete failure scenario (what a student or the gallery would see). Cover:
   - Unity runtime correctness of `Unity/` adapters: lifecycle (Awake/OnEnable/OnDisable/OnDestroy order across objects), Input System usage (InputAction serialization, Reset defaults, enable/disable, callbacks), null risks, frame timing, anything that compiles but misbehaves at runtime.
   - Correctness and teaching quality of `Core/`: does it actually demonstrate the pattern well, are there edge cases (re-entrancy, events during iteration, timers, state left behind)?
   - Is `Naive/` a believable common mistake, and does the effect-off screen show its bug clearly?
   - Does every claim in meta.ts (goals, steps, offNote, mistakes, setup, verify, pitfalls) match the code? Setup steps must work in Unity 6.3 exactly as written (menu names, component fields).
   - Do sim.ts and the C# match beyond what the logs cover (paths no scenario exercises)?
   - Korean writing: clear, short, no awkward machine-like sentences. Content policy: no game names outside inspiredBy, code written fresh.
2. Claims in the text that the code does not support.
3. Verdict: mergeable as is, mergeable after listed fixes, or needs rework, with the exact fix list, required first.
4. Separately: anything the stage, tools, or guide should change.

Do not modify, create or delete files. Do not run tools that write. Reading files and viewing images is fine. Keep the report under about 80 lines, defects first.
