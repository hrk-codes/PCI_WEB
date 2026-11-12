# PCI reference video: aluminum core edit

The approved approach is a direct color edit of the supplied video. Its cable geometry, layer opening, camera choreography, 1280 × 720 resolution, 307 frames, and 25 fps timing are preserved. Copper-colored cores are changed to neutral silver aluminum. Blue, yellow, red, and black insulation remain colored. Audio is removed.

`/animation-preview/` is the unlinked, noindex review page. It offers clean and PCI branded MP4/WebM downloads. `AluminiumCableFeature` uses the corrected video and poster, supports removable HTML or baked branding, and respects reduced motion and the site's motion preference. Portrait containers contain the original wide frame without cropping its structure.

Rebuild with `pnpm render:cable -- "C:/path/to/reference.mp4"`. Without an argument it uses the supplied Downloads file. `scripts/aluminum-color.mjs` selects connected copper color regions while separating yellow bedding. `scripts/edit-reference-cable.mjs` applies that correction to every frame and encodes silent outputs in `public/media/pci-reference-aluminum-*`.

Run `pnpm test:cable` against the local server for duration, dimensions, playback, branding, mobile layout, and reduced motion. The earlier procedural Three.js concept remains in source as a draft; it is no longer used in the review page or active video component.

## Homepage: the cable film with live layers

The homepage "Explore the range" section (`components/cable-build-film.tsx`) uses an enhanced version of the approved edit, `public/media/pci-cable-film.mp4` (H.264, 1920 × 1080 at 50 fps, about 9 MB; it plays and seeks well in every browser, and a VP9 WebM came out twice the size), made by `node scripts/enhance-product-film.mjs`:

- **Smoother and sharper.** Motion interpolation from 25 to 50 fps, then a Lanczos upscale from 1280 × 720 to full HD, 1920 × 1080, with light denoising and sharpening.
- **No studio room.** A chroma matte separates the cable from its slate backdrop (the backdrop has a steady blue tint; metals are neutral and the jackets saturated) and removes backdrop spill from soft edges.
- **Blends into the page.** The cable is composited over the section's carbon tone with a soft glow baked in, and the film's edges are feathered with CSS masks so it emerges from the dark.
- **Light to load.** About 9 MB, downloaded only once the section is on screen, with keyframes every 20 frames for quick starts. Transparent WebP posters (`pci-cable-film-final.webp`, `-start.webp`) are used before playback and for reduced motion.

The film plays on its own, muted and looping, once the section is on screen, and pauses when it scrolls away or the tab is hidden; page scrolling is never affected. A list of the five layers (conductor, insulated cores, inner sheath, wire armour, outer sheath) follows playback: the layer being added expands with a short description and a progress bar, earlier layers stay highlighted, and a caption beside the cable names the current layer. The film's 6–11 s armour close-up keeps the armour step active ("Armour, up close") before the finished cable completes the list. A progress line under the section tracks the film, and a pause/play button sits on the film's corner. The film only downloads once the section is on screen.

Reduced motion and the saved Quick info pause show the finished-cable poster and the complete list without loading the film; the play button still lets a visitor start it. Without JavaScript the poster and list are shown.

Run `node scripts/test-product-film.mjs` against the local server for autoplay on screen, normal scrolling, layers following playback, pause and play, off-screen pausing, the phone layout, motion preferences, no-JS and accessibility. `pnpm test:cable` now covers only the review page.
