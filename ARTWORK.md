# About PCI cable artwork

Built-in image generation was used for the reference-inspired studio artwork. It is a marketing illustration, not a technical product specification. The original PNG remains in the Codex generated-images folder. An optimised WebP with the original alpha channel is saved in `public/media/pci-cable-sculpture-v3.webp` (1254 × 1254, approximately 274 KB).

## Generation prompt

Use case: product-mockup. Generate a premium photorealistic 3D industrial cable product group for a PCI Cables website. Three distinct isolated cable cutaways arranged as one carefully balanced sculpture on a genuinely TRANSPARENT background, no text no branding no pedestal no background. Primary tall thick black armoured four-core power cable rising diagonally from lower left towards upper right: black outer sheath, fine silver steel armour ring, four red yellow blue and dark cores with exposed closely packed silver aluminium strand end faces. Beside it to the right and slightly lower, a smaller black aerial-bunched three-core aluminium cable with subtle yellow stripe, ends showing real cylindrical silver strands. Behind on left a simple black covered aluminium single core cable, thinner, showing its compact silver wire bundle. All three fully visible from cut tips to clean cropped lower ends, isolated with generous 6% transparent margin. View in three-quarter perspective with visible cross-sections. Heavy realistic dark rubber with subtle satin softbox highlights and fine aluminium brushing, razor-sharp individual strand definition, realistic smooth cylindrical geometry, dimensional ambient occlusion and restrained natural contact shadows within the group. Soft warm studio key from upper left plus cool rim light, neutral silver, near-black and small coloured insulation accents. Overall sculptural bouquet composition wider at top, lower ends aligned near bottom, compact group portrait-to-square aspect suitable for a central website hero moving left. This must look like an expensive industrial CAD product render, not a flat illustration, diagram, plastic toy, bent ribbons or stylised cartoon. Faithful typical constructions, avoid impossible fused cores, no detached parts. Output transparent alpha high-resolution.

## Runtime presentation

The live scene (`lib/cable-scene.ts`) is procedural: bevelled cable jackets, instanced steel armour wires, separate coloured insulation cores, instanced aluminium strand bundles, and helical strand geometry for the bare aluminium conductor and the galvanised earth wire. The four-core armoured cable is built as separate layer groups (sheath, armour, bedding, insulation, strands) so the anatomy beat can pull them apart along the cable's length. Each layer carries an anchor point that the scene projects to the screen on every rendered frame to draw the leader lines. The energy pulse is a scrolling soft band on additive shells around the conductors, with no post-processing.

**Projection rule.** The leader lines share a coordinate space with `.about-art`. The canvas and every element between it and `.about-art` may only be moved with CSS `translate`; adding CSS rotation or scale there would detach the lines from the cable. Rotation and scale belong in the scene.

The homepage shows two transparent WebP frames (1280 × 800) until the canvas first draws, and again if WebGL is unavailable or the context is lost: `about-cable-opening.webp` is the exploded anatomy pose and `about-cable-settled.webp` is the finished composition. After changing the geometry or poses, regenerate both with the site running:

```
node scripts/capture-about-cable.mjs
```

The 3D code loads near the section, renders on demand (the pulse runs a time-limited loop only while visible), caps pixel density, stops rendering off screen, and disposes GPU resources on unmount. Reduced motion and the saved pause setting render a stationary final pose. The earlier generated studio image above is kept for reference only.
