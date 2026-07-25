# Board Shelf — Design Direction

## Product intent

Board Shelf is a personal board-game library for discovering what to play, tracking a collection, finding a game for a group, understanding BGTI taste, and sharing a curated playlist. The product should feel like a quiet, premium game library: game box art is the visual hero; collection data is clear, calm, and useful.

## Reference direction

Take the visual language from the supplied **Board Game Collection Manager / Lumina Library** Stitch reference:

- Dark, cinematic midnight-navy environment with restrained radial blue light.
- High-fidelity board-game covers on open shelves and in horizontal rails.
- Glassmorphic surfaces, only where grouping or interaction needs a surface.
- Modern, compact, data-literate typography with generous section spacing.
- Sky-blue interaction colour, warm sand only for secondary emphasis such as ratings.

Do not turn the experience into a generic dashboard, bento grid, or a white Ant Design admin panel. Avoid decorative pills, fake metrics, dense chrome, or excessive borders.

## Foundations

### Colour

| Token | Value | Use |
| --- | --- | --- |
| `canvas` | `#0B192E` | Midnight base canvas |
| `canvas-deep` | `#0E0E10` | Page edge / deep overlays |
| `surface-glass` | `rgba(255,255,255,0.08)` | Cards, menus, inputs |
| `surface-glass-strong` | `rgba(255,255,255,0.13)` | Selected / raised glass |
| `border-glass` | `rgba(255,255,255,0.12)` | Subtle surface outline |
| `text` | `#E4E2E4` | Primary text |
| `text-muted` | `#C5C6CD` | Supporting text |
| `accent` | `#00A3FF` | Primary action, focus, active nav |
| `accent-bright` | `#4DCCFF` | Gradient endpoint / hover |
| `rating` | `#E4C099` | Rating and warm secondary detail |
| `danger` | `#FFB4AB` | Destructive feedback |

Use a very subtle radial gradient behind featured content (`#0B192E` into a slightly lighter navy). Never place a colour wash over game-cover imagery; use a bottom image gradient only when legibility requires it.

### Typography

- Font: **Hanken Grotesk** (fallback: `Pretendard`, `system-ui`, sans-serif).
- Display / desktop page title: 40px / 48px / 700 / -0.02em.
- Mobile page title: 28px / 36px / 700.
- Section title: 28px / 36px / 700; mobile 24px / 32px.
- Card title: 18px / 24px / 600.
- Body: 16px / 24px / 400; compact data text: 14px / 20px.
- Metadata labels: 12px / 16px / 700 / 0.05em, uppercase only for short categories.

### Shape, depth, spacing

- 8px spacing grid. Desktop content gutters 32px; mobile gutters 20px.
- Standard glass card: 16px radius, 1px glass border, 12–20px backdrop blur.
- Featured surface: 24px radius. Buttons: 12px radius; small chips may be pill-shaped.
- No harsh black shadows. Active surfaces receive a soft, diffused blue glow.
- Pressed controls scale to 0.98; respect reduced-motion preferences.

## App shell and responsiveness

### Desktop (1440px reference)

- Fixed left rail: logo, `홈 / 게임 목록 / 모임 추천 / BGTI / 플레이리스트`, plus bottom profile and `게임 추가` action.
- Main canvas begins after the rail; top bar contains page title, contextual search or action, and profile controls.
- Content is constrained to approximately 1240px and uses open sections rather than card-wrapped page layouts.

### Mobile (390px reference)

- Compact top bar: wordmark, current page title, search/menu actions.
- Use a bottom navigation for the five primary destinations. Put `게임 추가` inside the menu or as a clear top-level contextual action.
- Preserve 20px side gutters and 16px gaps. Horizontal game rails intentionally reveal the next cover; do not squeeze them into unreadable grids.
- Forms stack to one column; detail panes become content sections; destructive/admin actions remain secondary.

## Component rules

- **Primary button:** solid `accent`, dark navy text or high-contrast white as needed; minimum 44px touch target.
- **Secondary button:** translucent glass, border, light text.
- **Search/input:** glass field with leading icon; focused border and icon become `accent`.
- **Game card:** cover is dominant; image has 3:4 ratio; title and compact player/time/rating stats sit below or in a lower image gradient. Never use a generic placeholder illustration.
- **Cover rail:** open horizontal strip with 16px gaps and intentional next-card peek on mobile.
- **Tags/BGTI:** subdued outlined or low-opacity blue chips; tags must not compete with titles or covers.
- **Data rows:** use quiet dividers and aligned labels rather than nested cards.
- **Dialogs/drawers:** strong backdrop blur, clear single primary action, 24px radius.
- **Icons:** simple rounded outline icons, 20–24px, consistent stroke; do not use text glyphs for controls.

## Screen inventory

Create both desktop and mobile designs for each core experience:

1. **홈 / Dashboard** — welcome, featured game, recently played rail, collection highlights, recent playlist.
2. **게임 목록 / Collection** — search, filter/sort, game-cover grid on desktop and two-column/rail-friendly layout on mobile.
3. **모임 추천 / Group recommendation** — participant count, play-time and style controls, recommendation results with concise rationale.
4. **BGTI** — four-axis visual result, type profile, compatible game suggestions, clear entry to the questionnaire.
5. **플레이리스트** — existing playlists and an ordered game-picker/planning flow.
6. **게임 추가 / Registration** — Boardlife search-first flow, selected result, minimal metadata and cover review.
7. **게임 상세 / Game detail** — large cover and title, key facts, description, personal rating/review, play records, tags and video links.
8. **공유 플레이리스트** — public, no-app-shell reading surface with a concise hero and ordered game list.
9. **공유 게임** — public game summary that preserves cover, facts, description and external/reference actions.

## Required design review criteria

- All core screens have a 1440px desktop and 390px mobile design.
- The navigation, primary actions, cover treatment, typography and glass surfaces are consistent across all screens.
- Mobile shows a deliberate information hierarchy, not a compressed desktop layout.
- The designs preserve existing functionality and Korean product vocabulary; no invented product features.
- Admin-only editing remains available but visually secondary to collection browsing.
