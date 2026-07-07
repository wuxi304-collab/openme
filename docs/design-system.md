# OpenMe Design System

OpenMe UI should feel like a serious desktop workspace: quiet, readable, reliable and fast.

## Principles

1. **Local first is visible**
   - Show when files remain local.
   - Show when an action leaves the local boundary.

2. **Boundaries are product features**
   - If a preview is approximate, say so.
   - If a codec fails, explain it and provide system open.
   - If CAD fidelity is not native, do not imply otherwise.

3. **Work before decoration**
   - UI exists to move the file workflow forward.
   - Avoid ornamental detail that does not improve clarity.

4. **Chinese identity through order**
   - Use 格物、开卷、归档、知新 as operating language.
   - Use China red sparingly.
   - Do not use decorative clichés.

## Layout

### Shell

```text
Title Bar
Tab Bar
Sidebar
Main Viewer
Status Bar
```

### Future workspace shell

```text
Workspace
  Recent Files
  Projects
  Collections
  Pinned
  Pack Suggestions
  Actions
```

## Typography

Use system fonts first.

```css
font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
```

Chinese fallback:

```css
font-family: "Microsoft YaHei", "PingFang SC", "Noto Sans CJK SC", sans-serif;
```

## Spacing

Use an 8 px rhythm.

| Token | Value |
| --- | --- |
| xs | 4 px |
| sm | 8 px |
| md | 16 px |
| lg | 24 px |
| xl | 32 px |
| 2xl | 48 px |
| 3xl | 64 px |

## Radius

| Use | Radius |
| --- | --- |
| Small chip | 8 px |
| Button | 12 px |
| Card | 16 px |
| Panel | 20 px |
| Hero surface | 28 px |

## Color tokens

```css
--om-text: #0F172A;
--om-text-secondary: #475569;
--om-text-muted: #64748B;
--om-bg: #F8FAFC;
--om-surface: #FFFFFF;
--om-border: #E2E8F0;
--om-red: #C91F37;
--om-blue: #2563EB;
```

## Buttons

Primary buttons should be restrained.

```text
background: #0F172A
text: #FFFFFF
radius: 12px
```

Accent state:

```text
border or underline: #C91F37
```

Do not use emoji in buttons.

## Cards

Cards should communicate one unit of work.

Good card types:

- file summary
- pack suggestion
- support boundary
- workspace item
- action result
- warning

Each card should have:

- title
- short description
- evidence or status
- next action when useful

## Viewer states

Every viewer should support these states:

| State | Requirement |
| --- | --- |
| loading | clear local loading indicator |
| ready | viewer plus status/support boundary |
| unsupported | system open fallback |
| risky | explicit boundary warning |
| failed | reason plus recovery action |

## Motion

Use minimal motion. Prefer:

- fade
- small scale-in
- short slide

Avoid:

- bouncing decorative motion
- distracting loops
- novelty effects

## Accessibility

- Keyboard shortcuts must be documented.
- Focus states must be visible.
- Error cards must use `role="alert"` where appropriate.
- Status updates should use `aria-live` when relevant.

## README and app consistency

README claims must match UI claims.

If README says a format has fallback behavior, the app should show that fallback.

If the app marks a preview as experimental, README and `SUPPORT_MATRIX.md` must use the same language.
