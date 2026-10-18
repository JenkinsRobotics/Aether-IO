# Aether IO

Electronics workspace, initial UI draft (2026-10-01). Uses `@aether/ui` for its
home, document header, ribbon, three-column shell, trees, fields, tables,
sidebars, settings and agent conversation. Electronics state belongs here;
there is no dependency on CAD's engine or an external simulator.

## Run

```sh
cd aether-io
npm install
npm run dev
```

Open http://localhost:5184. `npm run build` produces `dist/`, registered with
the Studio host at `/io/`. Restart a pre-existing host to load the new package
registry entry. `npm test` checks connection/deletion and placement behavior.
The isolated host/browser scenarios live in
`../aether-map/e2e/io-preview.spec.ts` and run through that app's existing
Playwright harness (`npm run e2e -- io-preview.spec.ts --workers=1`).

## Working draft

- Home with starter circuits, recent projects and search.
- Schematic: add components from the ribbon/library or drag them onto the
  canvas; move on the grid; select Wire and click two pins to connect.
- Selected-component properties, deletion, undo/redo and connection inventory.
- PCB Layout: independent component positions on an illustrative board.
- Wiring: curved leads and module presentation of the same connection graph.
- Firmware: editable source retained with the project.
- Local browser persistence and `.aetherio` JSON download.
- Shared light/dark and theme controls, docking modes, side rail/top/bottom
  sidebar choices. Product layout preferences persist independently.
- Right-side agent conversation and bottom signal, component and review tabs.
- Simulation setup with saved analysis/duration/time step, empty results and log.
- 3D inspection screen with saved view preference and renderer-unavailable state.
- Manufacturing specifications, BOM, release checklist and pending export/quote actions.
- Firmware target selection (ESP32/UNO/Nano) and pending compile/run/serial actions.

All seven workspaces are accessible from the ribbon workspace menu. Setup is
saved with the project, including through refresh. Backend-dependent actions
remain unavailable with an explanation; choosing a target is not simulation.

## Explicit preview limits

The **Blink demo is scripted**, and the signal chart uses labelled example
data. Neither evaluates the circuit or firmware. The MCU symbol exposes six
representative pins, not a complete or validated ESP32 pinout. PCB shapes are
placement illustrations, not manufacturing footprints; links are not routed
copper. Connection inventory is not ERC/DRC. No SPICE solver, compiler,
microcontroller emulator, 3D renderer, live hardware, AI provider, Gerber/drill
export, quoting or board ordering is connected. JSON download is a draft
document snapshot; there is no import or cloud-save integration yet.

## Shared assets

The electrical Aether master is `core/assets/branding/new-aether-2026-09/aether-io.png`,
with shared PNG/ICO derivatives in `core/assets/branding/apps/`. It preserves
Studio’s faceted A silhouette with circuit traces. The six
electrical symbols live in `core/assets/electronics/`. `CircuitSymbol` and
`SignalMonitor` are shared UI components. Review them in Aether UI → Widgets →
Panels → **Electronics + instruments**. The logo also appears in the shared
app-icon collection. Existing artwork/themes remain available.

Next stages and reference links: [Aether IO roadmap](../dev/docs/roadmap/Aether_IO.md).

Detailed future implementation packet: [Backend development](BACKEND_DEVELOPMENT.md)
— feature checklist, current document model, UI integration points, proposed
service responsibilities and acceptance gates.
