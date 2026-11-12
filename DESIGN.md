# PCI Cables design and delivery

The PCI homepage recording sets the layout and palette: navy framing, warm orange actions, cable imagery, an editorial company story, product cards, proof of capability, news and the inquiry section. Published PCI material supplies the photos, documents and company facts. Updated PCI materials can replace these through the next content review.

| Reference | What carries into PCI |
| --- | --- |
| PCI prototype recording | Two manually controlled cable slides, factory story, featured products, presence, facts, client groups, milestones, testing and the inquiry section. |
| Moving icon recording | Small line drawings of a cable drum, transmission tower, circuit, shield and document. The motion runs once when the section enters view and settles in under five seconds. Decorations stay behind the content and are hidden from assistive technology. |
| Dynamic Cables screen recording | Photo banners on key inner pages, clearly separated product families, and a floating shortcut for useful company information. |

The Quick info panel keeps the product catalogue, product range, quote request and phone number in reach. It opens on demand, traps focus while open, closes with Escape, and returns focus to the trigger. The motion switch is saved on the device. The site also honors the operating system’s reduced motion setting.

Review the homepage, catalogue, product pages and forms at desktop and phone widths. Verify that the motion never hides text or controls, links keep their original meaning, and the site works with just a keyboard. Run the production checks against a separate database, then review the public copy and email delivery in protected staging before changing the domain.

## About PCI: inside every connection

The homepage About section tells one story in three beats on a single pinned stage. The shared timeline lives in `lib/about-timeline.ts` and drives both the CSS variables and the Three.js scene.

1. **Anatomy (progress 0–0.38).** A real-time four-core armoured cable lies across the centre of the stage and separates along its length: outer sheath, galvanised steel armour (fanning outwards), inner bedding, colour-coded XLPE cores and stranded aluminium. Five labels sit in fixed slots either side of the artwork, and live leader lines connect each one to its layer as it moves. Outlined background type ("CABLES · CONDUCTORS · EARTH WIRE") drifts with scroll.
2. **Range (0.34–0.70).** The layers close, the artwork settles into the left column and the companion models (single core, aerial bunched cable, bare conductor, earth wire) fly in. A soft orange energy pulse runs along the conductors. The headline fills word by word from outline to solid ink, and six overhead conductors (AAC, AAAC, ACSR, AACSR, ACAR, ECO Panther) arrive along a drawn power line between two towers. Each conductor is a real link to its product page.
3. **Reach (0.68–1).** The story copy appears, the power line finishes drawing, and the figures count up: 14 products, 17 Indian states, 7 export countries, making cable since 2013. Chapter ticks and a progress bar track the beats along the baseline.

These models and the captured fallback frames are illustrative and are not technical specifications for a PCI product. The original company catalogue documents remain the source for product details. See [ARTWORK.md](ARTWORK.md) for the rendering approach and how to regenerate the fallbacks.

On viewports wider than 820px and taller than 700px, the stage stays beneath the measured header through 240 viewport heights of natural scrolling. Every stage follows scroll position and reverses when scrolling upward. The energy pulse animates only while it is on screen, at about 30 frames per second, and rests after six seconds without scrolling. On smaller screens the finished composition sits in normal flow: the cable, a numbered layer legend, the copy, a swipeable conductor row and the figures. Reduced motion, the saved Quick info motion preference, Skip animation and keyboard focus on any link in the section show the finished composition without the extended scroll area. The full story, including the layer list, product links and figures, is server rendered and remains readable without JavaScript; decorative layers are hidden from assistive technology.

Run `node scripts/test-about.mjs` against the local preview (or set `PCI_BROWSER_URL`) to verify the three beats, label placement at 1440 × 950 and 1055 × 772, the pulse lifecycle, the forward and reverse sequence, restored scroll position, keyboard access, motion preferences, the phone layout, resizing, context loss, the static fallback and automated accessibility checks. Review the generated `test-results/about-*.png` screenshots for the individual stages.

## Our Reach: a living Earth

The navy and teal palette is retained on a live Three.js globe with accurate Natural Earth land geometry. India starts facing the visitor. Hovering over India previews a curved close view; click or touch locks it open. Raised arcs link the Dankuni hub to 17 client-linked destination states and seven international client locations. Compact map labels and keyboard-focusable points identify the organisations; the former large information panel and dropdown are removed. Nepal and Uganda retain their dated export milestones in the source records. Motion controls, static geographic artwork, state lists, pointer and keyboard interaction are documented and tested. See [geography and evidence notes](GEOGRAPHY.md).

## Homepage clients: a live showcase

The homepage shows eight client logos in a four-column, two-row display. Each column draws from one of the four published client groups, so the first view is balanced. Individual tiles crossfade in sequence through all 34 logos in the local collection. Names remain visible beneath the logos. The display runs only while in view and pauses on hover, keyboard focus, the local Pause control, the site motion setting, or reduced-motion preference. Without JavaScript, the initial eight remain visible. The category tabs and full directory remain at `/clients/`. Run `node scripts/test-client-showcase.mjs` with the local site running to verify the sequence, responsive layout, and motion controls.
