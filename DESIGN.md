# PCI Cables design and delivery

The PCI homepage recording sets the layout and palette: navy framing, warm orange actions, cable imagery, an editorial company story, product cards, proof of capability, news and the inquiry section. Published PCI material supplies the photos, documents and company facts. Updated PCI materials can replace these through the next content review.

| Reference | What carries into PCI |
| --- | --- |
| PCI prototype recording | Two manually controlled cable slides, factory story, featured products, presence, facts, client groups, milestones, testing and the inquiry section. |
| Moving icon recording | Small line drawings of a cable drum, transmission tower, circuit, shield and document. The motion runs once when the section enters view and settles in under five seconds. Decorations stay behind the content and are hidden from assistive technology. |
| Dynamic Cables screen recording | Photo banners on key inner pages, clearly separated product families, and a floating shortcut for useful company information. |

The Quick info panel keeps the product catalogue, product range, quote request and phone number in reach. It opens on demand, traps focus while open, closes with Escape, and returns focus to the trigger. The motion switch is saved on the device. The site also honors the operating system’s reduced motion setting.

Review the homepage, catalogue, product pages and forms at desktop and phone widths. Verify that the motion never hides text or controls, links keep their original meaning, and the site works with just a keyboard. Run the production checks against a separate database, then review the public copy and email delivery in protected staging before changing the domain.

## Homepage hero: the "Current" film

The first screen is a full-height film behind an editorial introduction: the kicker "PCI Cables · Dankuni, India", the headline (editable through the CMS `home` entry), a supporting line, *Explore our products* and *Request a quote*, chapter chips, a facts strip and a pause/play button.

The film is original: a 12-second seamless loop rendered offline from the site's own procedural cable models (`lib/hero-film-scene.ts`, sharing builders with the About scene through `lib/cable-models.ts`). It is illustrative, not a technical specification.

1. **Conductors (0–4 s).** An ACSR conductor is stranded live: the galvanised steel core and two aluminium layers turn with opposite lay and run through a closing die. The layers step down like a cutaway so the structure is visible.
2. **Cables (4–8 s).** The camera pulls back from a four-core armoured cable while its armour wires drop into place and the cores twist together, with a wound cable drum and companion conductors behind.
3. **Earth wire (8–12 s).** A dusk transmission line with lattice towers, disc insulator strings, vibration dampers and the earth wire at the peaks. A drum pays conductor up to the first tower and an orange pulse travels along the line.

The encoded video starts 8.5 s into the film, so its first frame and the poster are the dusk line. Short dips to navy hide each cut and the loop point. The chapter chips (Conductors · Cables · Earth wire) follow the film's playback position and link to each product family.

The poster image is the LCP element; the video uses `preload="none"` and only downloads when it is allowed to play. It pauses off screen and in hidden tabs. Reduced motion and the saved Quick info pause show the poster without downloading the film; the play button still lets a visitor start it. Phones in portrait get a 1080 × 1350 cut. The text stays readable without JavaScript.

To re-render after changing the scene, run the site (`pnpm dev`) and then `pnpm render:hero` (optionally `--layout=landscape` or `--layout=portrait`). Preview the film live, or freeze a frame, at `/hero-film/` (`?t=4.5`); the page is not indexed. Run `node scripts/test-hero.mjs` to check playback, chapter sync, the pause button, off-screen pausing, motion preferences, the phone film, the no-JavaScript poster and accessibility.

## About PCI: inside every connection

The homepage About section tells one story in three beats on a single pinned stage. The shared timeline lives in `lib/about-timeline.ts` and drives both the CSS variables and the Three.js scene.

1. **Anatomy (progress 0–0.38).** A real-time four-core armoured cable lies across the centre of the stage and separates along its length: outer sheath, galvanised steel armour (fanning outwards), inner bedding, colour-coded XLPE cores and stranded aluminium. Five labels sit in fixed slots either side of the artwork, and live leader lines connect each one to its layer as it moves. Outlined background type ("CABLES · CONDUCTORS · EARTH WIRE") drifts with scroll.
2. **Range (0.34–0.70).** The layers close, the artwork settles into the left column and the companion models (single core, aerial bunched cable, bare conductor, earth wire) fly in. A soft orange energy pulse runs along the conductors. The headline fills word by word from outline to solid ink.
3. **Reach (0.68–1).** The story copy appears and the figures count up: 14 products, 17 Indian states, 7 export countries, making cable since 2013. Chapter ticks and a progress bar track the beats along the baseline.

These models and the captured fallback frames are illustrative and are not technical specifications for a PCI product. The original company catalogue documents remain the source for product details. See [ARTWORK.md](ARTWORK.md) for the rendering approach and how to regenerate the fallbacks.

On viewports wider than 820px and taller than 700px, the stage stays beneath the measured header through 240 viewport heights of natural scrolling. Every stage follows scroll position and reverses when scrolling upward. The energy pulse animates only while it is on screen, at about 30 frames per second, and rests after six seconds without scrolling. On smaller screens the finished composition sits in normal flow: the cable, a numbered layer legend, the copy, and the figures. Reduced motion, the saved Quick info motion preference, Skip animation and keyboard focus on any link in the section show the finished composition without the extended scroll area. The full story, including the layer list and figures, is server rendered and remains readable without JavaScript; decorative layers are hidden from assistive technology.

Run `node scripts/test-about.mjs` against the local preview (or set `PCI_BROWSER_URL`) to verify the three beats, label placement at 1440 × 950 and 1055 × 772, the pulse lifecycle, the forward and reverse sequence, restored scroll position, keyboard access, motion preferences, the phone layout, resizing, context loss, the static fallback and automated accessibility checks. Review the generated `test-results/about-*.png` screenshots for the individual stages.

## Featured products: the conductor span

Right after the About story, "Featured products." shows PCI's six overhead conductors (AAC, AAAC, ACSR, AACSR, ACAR, ECO Panther) and a copper control cable hanging from a drawn transmission span between two lattice towers (`components/conductor-line.tsx`). Each product clips onto the wire where it sags and links to its product page. Seven smaller illustrations fit the span, with a copper-coloured connector identifying control cable. The note distinguishes overhead networks from control-cable applications. The section replaces the earlier three photo cards, whose diagrams did not match the site's look.

The towers are proportioned lattice drawings (tapered, braced legs, two crossarms with disc insulator strings, an earth-wire peak and a small warning light) in the section's muted greys; they keep their shape at every width while the wires stretch between them. While the reader scrolls toward the section only the towers show. The span plays once each time it comes to rest fully in view: the line draws from the left tower to the right (1.5 s), each conductor drops onto the wire as the drawing reaches it, the left tower's light glows, a soft orange spark crosses the span lighting each clamp as it passes (1.75–4.35 s), and the right tower's light answers. It settles in under six seconds; scrolling the span fully out of view re-arms it, so it plays again on the next visit. Keyboard focus reveals it immediately. Reduced motion, the saved pause setting and a page without JavaScript show the finished span with no animation. On phones the conductors become a swipeable row of cards. Run `node scripts/test-featured.mjs` to check the links, the entrance, the sag layout, the phone row, motion preferences, no-JS and accessibility.
## Our Reach: a living Earth

The navy and teal palette is retained on a live Three.js globe with accurate Natural Earth land geometry. India starts facing the visitor. Hovering over India previews a curved close view; click or touch locks it open. Raised arcs link the Dankuni hub to 17 client-linked destination states and seven international client locations. Compact map labels and keyboard-focusable points identify the organisations; the former large information panel and dropdown are removed. Nepal and Uganda retain their dated export milestones in the source records. Motion controls, static geographic artwork, state lists, pointer and keyboard interaction are documented and tested. See [geography and evidence notes](GEOGRAPHY.md).

## Homepage clients: a live showcase

The homepage shows eight client logos in a four-column, two-row display. Each column draws from one of the four published client groups, so the first view is balanced. Individual tiles crossfade in sequence through all 34 logos in the local collection. Names remain visible beneath the logos. The display runs only while in view and pauses on hover, keyboard focus, the local Pause control, the site motion setting, or reduced-motion preference. Without JavaScript, the initial eight remain visible. The category tabs and full directory remain at `/clients/`. Run `node scripts/test-client-showcase.mjs` with the local site running to verify the sequence, responsive layout, and motion controls.
