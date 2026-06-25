---
name: claude-showcase
description: "Run a short, safe, deterministic demo that exercises every visible Claude Code UI feature — user prompt, thinking, tool calls (Bash/Read/Write/Edit/Grep), a diff, a todo list, a subagent, and a summary — all inside a throwaway sandbox. Use to record the reference asciinema capture for the ghostty-claude-themes visualizer, or any time you want a representative on-screen showcase of Claude Code's interface. Trigger: 'showcase claude', 'run the demo', 'grabá la demo', 'feature showcase', 'capture reference session'."
---

# Claude Code Feature Showcase

Purpose: produce a representative, good-looking sequence of Claude Code's UI on
screen — the exact elements the ghostty-claude-themes visualizer renders per
theme. Intended to be recorded with `asciinema rec --command claude` so the
capture becomes the project's reference session.

## Rules (read first)

- **English only.** Narrate and write everything — thinking, plan, todos,
  comments, summary — in **English**, regardless of the conversation language.
  This capture is the project's public reference session.
- **Sandbox only.** Do everything inside `demo-sandbox/` at the repo root.
  Never touch real project files, never `git commit`/`push`/`deploy`, no
  network calls, nothing destructive outside the sandbox.
- **Deterministic.** Same steps, same order, every run — so captures are
  comparable. Don't improvise extra work.
- **Narrate briefly.** One short sentence before each phase so the transcript
  reads naturally, but keep it tight — this is a visual demo, not a tutorial.
- **Pace for capture.** Let each tool call complete and render before the next.

## The sequence

Run these phases in order. Each is chosen to surface a distinct UI element.

1. **Thinking** — open with a brief genuine reasoning aside (the `✻ Thinking…`
   block) about what the demo will show.

2. **Plan** — state a 3–4 step plan for the demo (a `⏺` plan list). Keep it to
   the steps below; no need to enter plan mode.

3. **Todos** — call TodoWrite with ~4 items mirroring the phases (renders the
   checkbox list, and check them off as you go).

4. **Bash** — `mkdir -p demo-sandbox` then a quick `git status -s` or `ls`
   (shows a `● Bash` call with indented output).

5. **Write** — create `demo-sandbox/theme-preview.js`: a small, real-looking
   module (e.g. an `applyTheme(palette)` function) themed around this project
   (Ghostty palettes / Claude Code colors). **Deliberately seed one runnable
   error** so a later step fails on purpose — e.g. end the file with a
   `console.log(applyTheme(...))` call that references an **undefined variable**
   (a typo like `palettes` vs `palette`, or a missing import). Keep it subtle
   and realistic. Shows a `● Write` call.

6. **Read** — read it back (shows `● Read` with a line count).

7. **Edit** — **modify existing lines, don't only append** — so the diff shows
   both red `-` (removed) and green `+` (added) lines. For example, change two
   existing color values *and* add a `selectionBackground` field, so the block
   renders **at least 2 removals and 3 additions**. A pure-addition diff (only
   green) is not enough — the red removed lines are explicitly wanted, to show
   how a negative diff looks in each theme.

8. **Grep** — search the sandbox for a symbol you just added (shows `● Grep` /
   matches with file:line).

9. **Bash (error → fix)** — run `node demo-sandbox/theme-preview.js`. The seeded
   bug makes it **fail**, rendering the red **`● Bash` error block** (Exit code,
   stack trace) — that's the error state we want on screen. Then **Edit** the
   file to fix the bug (another diff), and run it again so it **succeeds**
   (`✓`-style line). This error→fix→success arc is required, not optional.

10. **Subagent** — launch one `Explore` (or general-purpose) Task agent to
    "map the demo-sandbox" (renders the `● Task(...)` block with the nested
    `⎿` agent lines and the `Done (N tool uses · …)` footer). Keep its scope
    tiny so it returns fast.

11. **Summary** — close with a short "Done. Here's what changed:" bulleted
    recap (the summary block), including a ✓ success and one ⚠ note.

12. **Cleanup** — `rm -rf demo-sandbox` and confirm. Mark all todos complete.

## After the demo

If this was run to capture the reference session, remind the user to stop the
asciinema recording (`/exit` or Ctrl-D) and that the `.cast` will be normalized
into `docs/reference-session.cast` for the visualizer's **Real session** tab.
