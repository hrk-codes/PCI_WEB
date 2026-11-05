# PCI Reach: geographic and business evidence

## Geographic assets

`public/geography/earth.json` is derived from Natural Earth's public-domain `ne_50m_land.geojson` and `ne_10m_admin_0_countries_ind.geojson`, hosted by the Natural Earth project at https://github.com/nvkelso/natural-earth-vector/tree/master/geojson. The latter is the India-perspective country geometry. Source licensing: https://www.naturalearthdata.com/about/terms-of-use/.

Run `node scripts/prepare-earth.mjs` to rebuild the local JSON. It retains polygon rings and holes, applies Douglas–Peucker simplification at 0.055 degrees for world land and 0.012 degrees for India, rounds coordinates to three decimal places, and retains small island polygons. The delivered file contains 1,421 world land polygons and 35 India polygons. No geographic service is queried by the running website.

The live globe uses a geographically mapped canvas texture, small land displacement, directional lighting, coastline detail, graticules and an atmospheric rim. The static `public/media/reach-world.webp` is rendered from the same live scene with India facing forward. It is shown before WebGL loads, without JavaScript, or after a WebGL context loss.

## Client-linked states

The relationship source is PCI's published client list, imported into `content/wordpress.json` under `clients`, originally at https://pcicablesindustries.com/clients/. These are published client relationships, not a record of current contracts, exact delivery sites, statewide coverage or transport paths.

All 14 destination points were checked to lie inside the delivered India polygon geometry. They represent state locations. The West Bengal origin (22.68 N, 88.29 E) represents the Dankuni locality approximately, rather than a surveyed factory entrance. Names, coordinates, organisations and source URLs are maintained in `content/reach.ts`.

Organisation-to-state associations were checked on 5 November 2026 using the primary government and utility sources below. Several individual utility sites timed out; the official state-wise directories provided the associations instead.

| State | Published PCI client | State reference |
| --- | --- | --- |
| Assam | APDCL / AEGCL | [APDCL company profile](https://www.apdcl.org/website/About) |
| Bihar | BSPTCL / BSPGCL | [BSPTCL](https://www.bsptcl.in/) and DTL directory |
| Chhattisgarh | CSPDCL | DTL directory |
| Gujarat | GETCO | DTL directory |
| Haryana | UHBVN / HVNL | DTL directory; PCI's published abbreviation HVNL is retained |
| Jharkhand | JBVNL / JUSNL | [JUSNL](https://jusnl.in/) |
| Kerala | KSEB | IPDS directory |
| Madhya Pradesh | MPPKVVCL / MPMKVVCL | IPDS directory |
| Maharashtra | MSEDCL / MSETCL | [MSEDCL](https://www.mahadiscom.in/en/home/) and DTL directory |
| Mizoram | Government of Mizoram | IPDS directory |
| Odisha | TPNODL / TPCODL | [TP Northern Odisha Distribution](https://www.tpnodl.com/) |
| Punjab | PSPCL | [PSPCL](https://www.pspcl.in/) and IPDS directory |
| Rajasthan | AVVNL / JVVNL | IPDS directory |
| Uttar Pradesh | DVVNL / MVVNL | IPDS directory |

Primary directories: [Delhi Transco state-wise power utilities](https://www.dtl.gov.in/content/202_6_stateutgencotranscodiscom.aspx), [Ministry of Power / IPDS utility list](https://www.ipds.gov.in/Form_IPDS_Res/RelatedLink.aspx).

Nepal and Uganda world-view connections retain the first export milestones documented on PCI's Achievements page, also present in the imported public snapshot: cables to Nepal in October 2022 and conductors to Uganda in June 2022. Their marker positions represent the countries, not individual customer facilities.

## Runtime and verification

The scene shares the existing Three.js dependency and loads near its section. World view rotates on a tilted polar axis at approximately one turn per three minutes. India hover is delayed 180ms; hover exit waits 500ms. A click, tap or keyboard selection keeps the India view open until Back to world. The focus transition lasts 1.1 seconds. Domestic arcs originate at West Bengal, are revealed once, and settle. Off-screen or hidden-page rendering is suspended.

World view also supports left-mouse dragging: horizontal movement turns the Earth and vertical movement adjusts the viewing tilt within a 60-degree limit. Pointer capture keeps the gesture working beyond the canvas edge. Dragging suppresses hover activation and clicks, and automatic rotation resumes from the new orientation after the pointer leaves. Touch retains ordinary page scrolling and tap-to-explore behaviour.

Motion pause, the saved background-motion preference and reduced motion are respected. State information is also available in ordinary HTML controls and a server-rendered list. Run `node scripts/test-earth.mjs` against the preview; the same test is included in `pnpm test:production` against an isolated production server.
