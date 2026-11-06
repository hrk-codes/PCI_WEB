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

The homepage About section combines a real-time Three.js cable scene with the earlier original PCI product images. The main scene has separate procedural cable jackets, armour, coloured insulation and individually modelled aluminium strands. Scroll changes the view and gently separates the inner layers, then moves the composition from the centre to the left before revealing the story. Pointer movement adds subtle parallax. The original AAC, ACSR and ECO Panther product images sit below it.

The generated studio image is retained as a fallback for no JavaScript, unavailable WebGL or a lost rendering context. These models and generated artwork are illustrative and are not technical specifications for a PCI product. The original company catalogue documents remain the source for product details. See [ARTWORK.md](ARTWORK.md) for the fallback generation prompt and rendering approach.

On viewports wider than 820px and taller than 700px, the scene stays beneath the measured header through 240 viewport heights of natural scrolling. All stages follow scroll position and reverse when scrolling upward. On smaller screens the final cable composition sits above the copy in normal flow. Reduced motion, the saved Quick info motion preference, and Skip animation show the final composition without the extended scroll area. The full story is server rendered and remains readable without JavaScript.

Run `node scripts/test-about.mjs` against the local preview (or set `PCI_BROWSER_URL`) to verify the forward and reverse sequence, restored scroll position, keyboard access, motion preferences, mobile layout, resizing, static fallback and automated accessibility checks. Review the generated `test-results/about-*.png` screenshots for the individual stages.

## Our Reach: a living Earth

The navy and teal palette is retained on a live Three.js globe with accurate Natural Earth land geometry. India starts facing the visitor. Hovering over India previews a curved close view; click or touch locks it open. Raised arcs link the Dankuni hub to 17 client-linked destination states and seven international client locations. Compact map labels and keyboard-focusable points identify the organisations; the former large information panel and dropdown are removed. Nepal and Uganda retain their dated export milestones in the source records. Motion controls, static geographic artwork, state lists, pointer and keyboard interaction are documented and tested. See [geography and evidence notes](GEOGRAPHY.md).

## Homepage clients: a live showcase

The homepage shows eight client logos in a four-column, two-row display. Each column draws from one of the four published client groups, so the first view is balanced. Individual tiles crossfade in sequence through all 34 logos in the local collection. Names remain visible beneath the logos. The display runs only while in view and pauses on hover, keyboard focus, the local Pause control, the site motion setting, or reduced-motion preference. Without JavaScript, the initial eight remain visible. The category tabs and full directory remain at `/clients/`. Run `node scripts/test-client-showcase.mjs` with the local site running to verify the sequence, responsive layout, and motion controls.
