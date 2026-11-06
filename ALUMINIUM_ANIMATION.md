# PCI reference video: aluminum core edit

The approved approach is a direct color edit of the supplied video. Its cable geometry, layer opening, camera choreography, 1280 × 720 resolution, 307 frames, and 25 fps timing are preserved. Copper-colored cores are changed to neutral silver aluminum. Blue, yellow, red, and black insulation remain colored. Audio is removed.

`/animation-preview/` is the unlinked, noindex review page. It offers clean and PCI branded MP4/WebM downloads. `AluminiumCableFeature` uses the corrected video and poster, supports removable HTML or baked branding, and respects reduced motion and the site's motion preference. Portrait containers contain the original wide frame without cropping its structure.

Rebuild with `pnpm render:cable -- "C:/path/to/reference.mp4"`. Without an argument it uses the supplied Downloads file. `scripts/aluminum-color.mjs` selects connected copper color regions while separating yellow bedding. `scripts/edit-reference-cable.mjs` applies that correction to every frame and encodes silent outputs in `public/media/pci-reference-aluminum-*`.

Run `pnpm test:cable` against the local server for duration, dimensions, playback, branding, mobile layout, and reduced motion. The earlier procedural Three.js concept remains in source as a draft; it is no longer used in the review page or active video component.

The homepage uses the optional interactive presentation: a continuous navy scene with feathered film edges, 88% brightness, soft shadows, and restrained desktop pointer depth. Its transparent keyboard-accessible artwork button toggles playback without native video controls. Deliberate pauses persist across visibility changes; reduced motion and the site motion setting show the poster. The review page retains its existing media controls. The cable test also verifies homepage click, keyboard and touch playback, pause persistence, blocked-autoplay recovery, and media fallback.
