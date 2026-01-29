# Image Mode (Future Feature)

A "Codenames Pictures" style game mode where cards show images instead of words.

## Concept

- 25 image cards in a 5×5 grid instead of words
- Hinter gives one-word clues describing visual connections between images
- Same team/trap/neutral mechanics as word mode

## Image Requirements

### Pack Size

| Pack Size | Experience |
|-----------|------------|
| 100 images | Minimum — some repetition after 4-5 games |
| 150 images | Good variety (recommended) |
| 200+ images | Great replayability |

**Target: 150-200 images per pack** to match word pack variety.

### Image Specifications

| Spec | Value | Rationale |
|------|-------|-----------|
| **Resolution** | 512×512px | 4x max card size, crisp on all displays |
| **Aspect ratio** | 1:1 (square) | Matches current card layout |
| **Format** | JPEG or WebP | WebP preferred (~30% smaller) |
| **File size** | ~30-50KB each | 150 images ≈ 5-7MB total |

### Why Single Resolution?

Using one 512×512 file per image (no separate thumbnails):
- Browser CSS scales down beautifully for the 65-128px grid cards
- Popup zoom shows the full cached image instantly (no extra load)
- Simpler asset management — one file per image
- ~1.25MB for 25 cards is acceptable on any modern connection

### Current Card Sizes (for reference)

| Device | Card Size |
|--------|-----------|
| iPhone SE (375px) | ~67px |
| iPhone 14 (390px) | ~70px |
| Desktop (max-w-2xl) | ~128px |

## Data Model Changes

```typescript
// Card type supporting both modes
export interface Card {
  word?: string;           // For word mode
  imageUrl?: string;       // For image mode  
  imageId?: string;        // For tracking/attribution
  team: Team;
  revealed: boolean;
  revealedBy?: string;
}

// Game mode type
export type GameMode = "words" | "images";

// Image pack definition
export interface ImagePack {
  id: string;
  name: string;
  images: {
    id: string;
    url: string;
    attribution?: string;
  }[];
}
```

## Component Changes

- `GameBoard.tsx` — Render `<img>` instead of text, add tap-to-zoom
- `LobbyView.tsx` — Add Words/Images mode toggle
- New `ImageZoomModal.tsx` — Fullscreen image popup
- Card aspect ratio — Keep square (1:1) to match current layout

## Tap-to-Zoom Feature

Allow players to tap/click a card to see a larger version of the image.

### UX Flow

1. Player taps on any image card
2. Modal overlay appears with:
   - Larger image (512×512 or fills available space)
   - Team color border (visible to clue giver)
   - Vote count badge (if votes exist)
   - "Vote" button (if player can vote)
   - "Reveal" button (if threshold met)
3. Tap outside, press Escape, or tap X to close

### Why This Matters

- Small 67-128px cards may not show enough detail
- Abstract/surreal images benefit from closer inspection
- Mobile users especially need zoom capability
- Doesn't slow down experienced players (zoom is optional)

## Clue Validation

Simpler for images (no board word matching):
- Single word only
- Profanity check
- Length limit

## Royalty-Free Image Sources

### Option 1: Curated Static Pack (Simplest)

Store images in `/public/images/packs/`:

| Source | License | Notes |
|--------|---------|-------|
| **Unsplash** | Free commercial | Best quality, attribution link appreciated |
| **StockSnap.io** | CC0 | No attribution needed |
| **Piqsels** | CC0 | Large collection |
| **OpenGameArt.org** | CC0 | Has abstract textures |

**Pros**: Fast loading, works offline, no API costs
**Cons**: Increases bundle size, limited variety

### Option 2: Unsplash API (Dynamic)

```typescript
const response = await fetch(
  `https://api.unsplash.com/photos/random?count=25&query=abstract&client_id=${KEY}`
);
```

**Pros**: Infinite variety
**Cons**: API key needed, must hotlink images, network dependency

### Option 3: AI-Generated (Custom)

Generate custom pack with DALL-E/Midjourney/Stable Diffusion:
- "Abstract surreal illustration, simple shapes, dreamlike, board game card"
- "Minimalist symbolic image, single concept, colorful"

**Pros**: Unique to HintGrid, no licensing concerns
**Cons**: Upfront generation cost/effort

## Recommended Approach

1. Start with curated static pack (~150 images from CC0 sources)
2. Validate gameplay experience
3. Expand to API/AI-generated if popular

## Image Style Guidelines

Best images for this game mode:
- Abstract or surreal (multiple interpretations possible)
- Single dominant subject/concept
- Clear silhouettes and shapes
- Not too busy or detailed
- Recognizable at 70px (mobile) but rewarding at 512px (zoomed)

Bad choices:
- Photos of text/words (defeats the purpose)
- Very similar images (all sunsets, all cats)
- Too abstract (just colors/gradients — nothing to describe)
- Fine details only visible when zoomed (frustrating on mobile)
- Offensive or disturbing content

## Potential Image Pack Themes

- **Abstract** — Surreal art, shapes, patterns
- **Objects** — Everyday items, tools, food
- **Nature** — Animals, plants, landscapes
- **Fantasy** — Creatures, magic, mythology
- **Retro** — Vintage illustrations, old posters
