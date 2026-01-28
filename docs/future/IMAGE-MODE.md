# Image Mode (Future Feature)

A "Codenames Pictures" style game mode where cards show images instead of words.

## Concept

- 25 image cards in a 5×5 grid instead of words
- Hinter gives one-word clues describing visual connections between images
- Same team/trap/neutral mechanics as word mode

## Image Requirements

| Pack Size | Experience |
|-----------|------------|
| 100 images | Minimum — some repetition after 4-5 games |
| 150 images | Good variety (recommended) |
| 200+ images | Great replayability |

**Target: 150-200 images per pack** to match word pack variety.

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

- `GameBoard.tsx` — Render `<img>` instead of text
- `LobbyView.tsx` — Add Words/Images mode toggle
- Card aspect ratio — Images likely need 4:3 or 16:9 vs current square
- Mobile responsiveness adjustments

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
- Works at small card size (~100×100px thumbnail)

Bad choices:
- Photos of text/words
- Very similar images (all sunsets, all cats)
- Too abstract (just colors/gradients)
- Offensive or disturbing content

## Potential Image Pack Themes

- **Abstract** — Surreal art, shapes, patterns
- **Objects** — Everyday items, tools, food
- **Nature** — Animals, plants, landscapes
- **Fantasy** — Creatures, magic, mythology
- **Retro** — Vintage illustrations, old posters
