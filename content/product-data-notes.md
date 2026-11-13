# Product catalogue data

The product pages use the supplied `D:/Hrithik_pci/htdocs/Catalogue.pdf`, titled `catalogue (Part -1)-2026`, with 30 PDF viewer pages. A byte-identical copy is hosted at `/media/catalogue.pdf` and replaces the previous 28-page catalogue. Its SHA-256 is `b8382eb6a3ce8189d9750d458df998e555045e3a47e984eee20653a2c935af0a`.

`product-specifications.json` contains 48 tables and 784 entries. Every table records its source document and PDF viewer page. Rows remain strings to preserve decimal precision, code words, slash notation and scientific notation. These are catalogue entries across standards and physical/electrical tables, rather than 784 distinct product SKUs.

| Product | Construction pages | Technical pages | Entries |
| --- | --- | --- | --- |
| AAC | 5 | 8, 9, 13 | 108 |
| AAAC | 5 | 12, 14 | 75 |
| ACSR | 5 | 9–12 | 161 |
| AACSR | 6 | 13 | 33 |
| AL-59 | 5 | 15 | 10 |
| ECO series | 7 | 15 | 3 |
| GI earth wire | 7 | 16, 17 | 65 |
| PVC power cable | 4 | 18–22 | 166 |
| Aerial bunched cable | 4 | 23 | 6 |
| LT XLPE cable | 4 | 24–27 | 131 |
| Covered conductor | 4 | Dedicated MVCC sheet, pages 1, 2 | 26 |

ACAR, control cable and service cable have construction descriptions without numerical size tables in this catalogue. Their pages provide the available information and a specification enquiry. The separate `control-pvc-cable.pdf` contains PVC power-cable tables, so it is not presented as a control-cable size sheet. The existing 14-product collection is retained. TACSR is also described on catalogue page 6 and remains available in the complete PDF.

## Extraction and source ambiguities

Tables were extracted locally using pdfplumber and visually compared with rendered catalogue pages. Headers were rewritten in readable English, with units placed beside their respective fields. AL-59 on page 15 needed text-line extraction because detected table rules split digits between the resistance and current columns. Its first row ends with `0.943`, `120` and `142`, which was checked against the page image.

Merged reference-standard cells in the ECO table are repeated for their applicable rows. Missing numeric cells remain dashes. Values were not recomputed or corrected using guessed engineering formulas. Source issues are disclosed beside their relevant tables.

- AAC pages 8 and 9 contain unusual stranding strings, punctuation and numerical entries. Examples include the British ANT strength of `84`, American `712.78`, and the Canadian resistance of `5.5341` for POPPY. These are preserved as printed.
- ACSR page 9 prints `713.18` for ZEBRA steel stranding and `118 50` for DOG total area. Page 10 has inconsistent German mass headings and values. Its column order is retained and the issue is identified in the table note.
- The French ACSR table on page 12 prints `SL1` in code labels. These labels are retained.
- ECO page 15 uses inconsistent spellings of the SS reference number and unusual voltage prefixes. The original strings appear in each expanded entry, with a source note. The ECO DOG row is identified as part of the wider ECO series.
- PVC page 22 repeats the three-core heading while giving different cable dimensions. It is labelled “Additional three-core table” with the ambiguity stated explicitly. The repeated aluminium heading over the second current group is identified in the note. That group is presented with its adjacent copper resistance and material columns.
- AAAC covered-conductor page 1 of `mvcc.pdf` prints `19.4.02` for the 33 kV, 241 mm² lay-up. Page 2 repeats a tensile-strength heading above a column measured in amperes. Its A unit and the corresponding 33 kV table identify that column as current capacity. Both issues are documented in the interface.

The source values require PCI confirmation before issuing an order specification. Source links open the exact PDF viewer page for review.

## Product artwork

All 14 product pages have a manual Three.js construction view and a local 1800 × 1350 WebP fallback in `public/media/products/`. The models reuse the site's conductor and cable geometry, with constructions informed by the catalogue and PCI's recorded display samples. AAC and ACSR demonstrate 61-wire constructions, the earth wire has 19 steel wires, and the XLPE sample has four cores with armour. The control-cable model uses four colour-coded copper cores, steel armour and a black sheath, following the new `D:/Hrithik_pci/htdocs/product_details/Control cable.mp4` reference. Its copper material depicts a clean finish. The ECO outer layers use AL-59 alloy material.

These are representative family cutaways. Exact variant dimensions remain in the technical directory. The control model has clear radial spacing between its outer sheath, armour, inner sheath, insulation and copper strands. Its upright view follows the new sample. Layer separation reveals the exposed cutaway sections in outside-to-inside order and keeps each copper bundle aligned with its insulation. Hidden buried sections complete the assembled model and are omitted in the exploded view. Visible bounds are recalculated so the separated construction remains centred. The new control artwork uses `products/control-cable-copper.webp` and its matching transparent span thumbnail uses `conductors/control-cable-copper.webp`.

The viewer supports pointer/keyboard rotation, zoom, end view and manual layer separation. It renders on demand, suspends off-screen drawing, caps pixel density and disposes GPU resources on unmount. Manual interaction remains available with reduced motion, with no automatic rotation or video playback.

Where a PCI sample recording exists, an extracted still is available under “View PCI’s display sample reference”. The control-cable reference uses the frame at seven seconds in the new recording, saved as `samples/control-cable-copper.webp`. The earlier 12-core recording remains a separate archived sample. The sample's printed tag is kept distinct from the catalogue's size entries. No product-page video element is rendered.

Regenerate the fallback images with `node scripts/render-product-posters.mjs` against the local preview. Run `node scripts/test-product-details.mjs` to check data counts, representative source values, all 14 models, manual interaction, filtering, in-place pagination, phone layout, accessibility and static fallbacks. The existing `test-product-samples.mjs` entry runs the same checks.
