# F24 Frontend

3D geometria- és kompozit anyag tervező alkalmazás.

## Tech stack

- **Framework**: React 18 + TypeScript 5.9
- **Build**: Vite 7.3 (dev szerver port: 5124)
- **3D**: Three.js 0.182
- **B-Rep / NURBS**: OpenCascade.js (a `/nurbs` és `/composition` route-okon)
- **UI**: shadcn/ui (Radix UI primitives) + Tailwind CSS 3.4
- **Routing**: React Router DOM 7
- **Deploy**: Vercel (SPA rewrite `vercel.json`-ben)

## Parancsok

```bash
npm run dev      # Dev szerver (localhost:5124)
npm run build    # tsc + vite build
npm run preview  # Produkciós build előnézet
```

## Projekt struktúra

```
src/
├── components/
│   ├── MainNav.tsx              # Fő navigáció — sticky, gradient bar + nav (NAV_ITEMS exportált)
│   ├── Footer.tsx               # eCon Engineering branding lábléc (SVG logo placeholder)
│   ├── PagePlaceholder.tsx      # Közös stub layout aloldalakhoz ("Coming soon")
│   ├── PropertyFormTab.tsx      # Sidebar + form body — Material edit Mechanical/Fatigue tab-jaihoz
│   ├── NewGeometryModal.tsx     # "Project configuration" modal a Geometry létrehozáshoz
│   ├── BladeScene.tsx           # Three.js full-bleed 3D scene a GeometryEdit-en (tapered blade placeholder)
│   ├── BladeThumbnail.tsx       # SVG szárny thumbnail a Geometry grid kártyákon
│   ├── BezierEditor.tsx         # Interaktív cubic Bézier editor (drag + zoom + pan + yMin/yMax)
│   ├── ProfileDistributionPanel.tsx  # GeometryEdit "Profile distribution" tab — 3 szekció bezier + table
│   ├── ProfilesPanel.tsx        # GeometryEdit "Profiles" tab — profil lista + popover detail (NACA params)
│   ├── StackingPanel.tsx        # GeometryEdit "Stacking" tab — Sweep + Dihedral bezier-szerkesztő
│   ├── AirfoilPreview.tsx       # 2D NACA airfoil SVG (paraméterezhető m / p / t)
│   ├── LayupBuilder.tsx         # LayupNew "Layup building" tab — drag-and-drop ply table + PlyStackViz
│   ├── PlyStackViz.tsx          # Izometrikus SVG ply-stack (parallelogramma + fiber lines)
│   ├── GeometryCard.tsx         # Geometry kártya (Geometry list grid + CompositionNew picker)
│   ├── LayupPickerDialog.tsx    # Layup chooser modal a Layup mapping táblázathoz
│   ├── LayupMappingBezierDialog.tsx  # Bezier modal per layup-mapping row (longitudinal × transversal)
│   ├── Layout.tsx               # Passthrough wrapper — minden page maga rendereli MainNav+Footer
│   ├── BackgroundScene.tsx      # 3D háttér jelenet a Composition route-on
│   ├── CadViewer.tsx            # Szélturbina 3D megjelenítő
│   ├── NurbsViewer.tsx          # NURBS felület vizualizáció
│   ├── LoftViewer.tsx           # Loft felület készítő (OpenCascade.js)
│   ├── BezierPanel.tsx          # Bezier görbe szerkesztő panel
│   ├── BoxViewer.tsx            # Doboz geometria megjelenítő
│   ├── SplitView.tsx            # Osztott nézetablak
│   ├── TopNav.tsx               # ⚠️ Régi nav — már nem használt, lehet törölni
│   ├── CompositionContent.tsx
│   ├── LayupMappingSection.tsx
│   ├── GradientBar.tsx
│   └── ui/                      # shadcn/ui komponensek (badge, button, card, checkbox, input, label, slider, tabs, textarea)
├── pages/
│   ├── Home.tsx                 # / — Dashboard (Add new / Recently edited / What's new) — Figma 576:19645
│   ├── Material.tsx             # /material — Data table accordion-soros expand-dal — Figma 576:19313 / 584:15263
│   ├── MaterialNew.tsx          # /material/new — 3 tab: General / Mechanical / Fatigue — Figma 584:15600 / 596:2160 / 584:15789
│   ├── Geometry.tsx              # /geometry — List/Grid view toggle — Figma 600:22786 / 600:22858
│   ├── GeometryEdit.tsx         # /geometry/:id — Full-bleed Three.js + floating panel — Figma 596:22661
│   ├── Layup.tsx                # /layup — Layup data table list — Figma 600:23689
│   ├── LayupNew.tsx             # /layup/new — General + Layup building tabs — Figma 600:27124 / 600:24328
│   ├── Composition.tsx          # /composition — Composition list page (table) — Figma 600:27699
│   ├── CompositionNew.tsx       # /composition/new — General + Geometry + Layup mapping + Transversal mapping — Figma 600:27773 + 600:29097 + 600:28625 + 600:27811
│   ├── LoadGroup.tsx            # /load-group — stub
│   ├── Calculation.tsx          # /calculation — stub
│   ├── Report.tsx               # /report — stub
│   ├── Settings.tsx             # /settings — stub (jobb felső ⚙ ikonról)
│   ├── Game.tsx                 # Szélturbina demo (nem routed)
│   └── Nurbs.tsx                # /nurbs — teljes képernyős NURBS/Loft szerkesztő (nav nélkül)
├── data/
│   ├── materials.ts             # Material[] mock + típusok (cseréld API hívásra)
│   ├── materialFormFields.ts    # MECHANICAL_SECTIONS + FATIGUE_SECTIONS — PropertyFormTab data
│   ├── geometries.ts            # Geometry[] mock + típusok
│   ├── profiles.ts              # Profile[] mock + PROFILE_TYPES — Profiles tab data
│   ├── layups.ts                # Layup[] mock — Layup list page data
│   └── compositions.ts          # Composition[] mock — Composition list page data
├── lib/utils.ts                 # cn() segédfüggvény (clsx + tailwind-merge)
├── types/                       # TypeScript típusok
├── App.tsx                      # Router konfiguráció
├── main.tsx                     # Belépési pont
└── index.css                    # Tailwind direktívák + CSS változók
```

## Routing

| Útvonal | Komponens | Leírás |
|---------|-----------|--------|
| `/` | `Home` | Dashboard: Add new + Recently edited + What's new — Figma 576:19645 |
| `/material` | `Material` | Material data table accordion-szerű expand-dal — Figma 576:19313 |
| `/material/new` | `MaterialNew` | Új material létrehozás 3 tab-bal — Figma 584:15600 |
| `/geometry` | `Geometry` | Geometry list + grid view toggle — Figma 600:22786 / 600:22858 |
| `/geometry/:id` | `GeometryEdit` | Geometry edit full-bleed Three.js canvas-szal. Sub-tabs: Global properties (596:22661), Profile distribution (596:19816), Profiles (596:19631), Stacking (596:20399), Spars (placeholder) |
| `/geometry?new=1` | `Geometry` | Lista + auto-nyíló New geometry modal (Home dashboard-ról jövő flow) |
| `/layup` | `Layup` | Layup list page (table) — Figma 600:23689 |
| `/layup/new` | `LayupNew` | New layup (General + Layup building) — Figma 600:27124 / 600:24328 |
| `/composition` | `Composition` | Composition list page (table) — Figma 600:27699 |
| `/composition/new` | `CompositionNew` | New composition (General + Geometry + Layup mapping + Transversal mapping) — Figma 600:27773 + 600:29097 + 600:28625 + 600:27811 |
| `/load-group` | `LoadGroup` | Stub |
| `/calculation` | `Calculation` | Stub |
| `/report` | `Report` | Stub |
| `/settings` | `Settings` | Stub (jobb felső ⚙ ikonról) |
| `/nurbs` | `Nurbs` | Teljes képernyős NURBS szerkesztő, nav nélkül |

## Konvenciók

- **Page szerkezet** (standard list / dashboard): minden routed page maga rendereli a `MainNav` + `Footer`-t.
  ```tsx
  <div className="flex min-h-screen w-full flex-col bg-[#f8fafc]">
    <MainNav />
    <main className="flex-1 px-4 py-6 sm:px-8 lg:px-16">
      <div className="mx-auto w-full max-w-[1400px]">...</div>
    </main>
    <Footer />
  </div>
  ```
- **Edit page szerkezet** (`MaterialNew`, `GeometryEdit`): sub-toolbar a MainNav alatt, sticky `top-[69px] h-[52px]`, tartalmazza a tabs + középre pozícionált címet + Exit edit mode gombot. Részletek `design.md`-ben.
- **Full-bleed canvas page** (`GeometryEdit`): a `<main>` `relative overflow-hidden`, a Three.js canvas `absolute inset-0`, minden UI overlay (sub-toolbar, panel, gizmó) z-index-szel felette, transparent háttérrel. **Footer eltávolítva** (edit mode).
- **Kivételek**: `Nurbs` (fullscreen, nincs nav, nincs footer), `Composition` (nincs footer), `GeometryEdit` (nincs footer).
- **Layout** (`src/components/Layout.tsx`) szándékosan passthrough — történelmi okból maradt.
- **Stílusok**: Tailwind utility classok inline. Pixel-pontos Figma illesztéshez **hex literálok** (`text-[#0a0a0a]`, `rounded-[14px]`) — nem CSS változókon keresztül abstraction.
- **shadcn primitívek**: `src/components/ui/` — `npx shadcn add <name>` az új komponensekhez. Nem módosítjuk közvetlenül.
- **Mock adatok**: `src/data/` — típusos export, később lecserélhető API hívásra ugyanazzal a shape-pel.
- **Path alias**: `@` = `src/` (vite.config.ts-ben konfigurálva)
- **Prettier**: 100 char szélesség, single quotes (package.json-ben)

## Fontos konfigurációs részletek

- **Vite**: CORS fejlécek WebAssembly-hez (`Cross-Origin-Opener-Policy`, `Cross-Origin-Embedder-Policy`), `opencascade.js` kizárva a dep optimizalasbol
- **Tailwind**: `tailwind.config.js` — CSS variable alapú színrendszer, `tailwindcss-animate` plugin
- **TypeScript**: strict mód, `tsconfig.json`

## Figma workflow

A kódbázis Figma-vezérelt. Új oldal / komponens implementáció előtt:

1. Figma desktop appban Dev Mode bekapcsolva (`</>` ikon jobb felül), MCP server jobb sidebar-on aktív
2. Megfelelő file az aktív tab (ellenőrzés: `mcp__Figma__get_metadata` "no node could be found" hibát dob, ha rossz tab van nyitva)
3. `mcp__Figma__get_screenshot` + `get_metadata` + `get_variable_defs` a Figma node ID-vel
4. Pixel-pontos implementáció `design.md`-ben felsorolt tokenek és pattern-ek alapján

A Figma MCP setup gotchákat lásd: `lessons.md` és a felhasználói memory (`~/.claude/projects/.../memory/reference_figma_mcp_setup.md`).

## Megjegyzések

- A `README.md` jelenleg elavult (Angular-t ír, de ez egy React projekt) — frissíteni kellene
- Font: Geist Sans (CDN-ről töltve az `index.html`-ben)
- A `src/components/TopNav.tsx` régi, már nem használt — törölhető
- Részletes design tokenek + komponens katalógus: `design.md`
- Tanulságok / gotchák: `lessons.md`
