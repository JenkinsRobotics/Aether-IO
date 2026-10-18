# Aether IO — backend development handoff

Updated 2026-10-01. **This document describes future work, not implemented
services.** The app is a launchable UI preview. No circuit solver, compiler,
emulator, 3D board renderer, AI provider or manufacturing integration is
currently connected.

## Launch and ownership

```sh
cd aether-io
npm install
npm run dev       # http://localhost:5184
npm test
npm run build     # Studio serves dist/ at /io/
```

The Studio host registers `io` in `core/host/server.py`. An already-running host
must restart to discover a changed registry. Applications can be enabled by an
administrator through Studio; the standalone development app needs no account.

- `aether-io/` owns electrical documents, connectivity, board geometry,
  analysis, firmware integration and manufacturing preparation.
- `core/host/` and `core/session/` own accounts, access, sessions and generic
  document storage. Extend their contracts through the active contributor
  briefing before editing both sides.
- `core/ui/` owns reusable presentation; `core/assets/` owns artwork. Never
  put netlist, solver or MCU semantics there or import CAD's parked engine.
- Future engine adapters should expose capabilities. Unsupported actions stay
  visibly unavailable; success indicators require actual backend results.

## UI-to-backend inventory

| UI surface | What works now | Backend still required |
| --- | --- | --- |
| Home / recent projects | Templates, search and local reopen | Server documents, permissions, revisions, recovery, import |
| Schematic | Parts, properties, grid movement, pin connections, undo/redo | Complete symbols/pin maps, named nets, sheet hierarchy, ERC |
| PCB Layout | Independent positions on an illustrative board | Footprints, physical board outline, stackup, copper routing, DRC |
| Wiring | Module/curved-wire view of the same connection graph | Connectors, cables, harness pin mapping, interactive peripheral state |
| Firmware | Source editor and saved ESP32/UNO/Nano target preference | Toolchains, diagnostics, artifacts, MCU emulation, serial console |
| Simulation | Saved analysis type/duration/time step, empty results/log | DC/transient/AC analysis, probes, result streaming, cancellation |
| 3D View | Saved assembled/bare/exploded preference, empty viewport | Board mesh, package models, scene/camera, clearance inspection, export |
| Manufacture | Saved board specification, BOM and unchecked release checklist | Validated Gerber/drill/assembly outputs, quotes and ordering |
| Properties | Editable names/values and actual saved connection counts | Typed electrical parameters, tolerances, package assignment |
| Signals / review | Labelled demonstration waveforms and connection inventory | Measured quantities, units, scope controls, real ERC/DRC issues |
| Aether Agent | Session-only conversation UI | Shared authenticated plugin/provider, circuit tools, reviewable edits |

All seven workspaces are reachable from the shared ribbon's workspace menu.
The simulation, manufacturing and firmware execution buttons are disabled with
specific reasons. A requested analysis/MCU target in settings does **not** mean
that backend supports it. The separate Blink demo remains scripted.

## Current document and migration requirements

`src/model.ts` holds the draft `Project`:

- `id`, `name`, `updated`, `parts`, `wires`, `code`, optional `setup`.
- Part: designator `id`, drawing `kind`, freeform `name`/`value`, canvas
  `position`, independent PCB `board` placement. These are **UI coordinates**,
  not physical dimensions. Wiring currently shares schematic positions.
- Wire: `id`, `from`, `to`, with endpoints represented as `partID:pinID`.
  There is no named-net/junction/sheet model yet. Crossing lines do not imply
  an electrical junction. The six MCU pins are illustrative, not a device map.
- `setup` comes from `workflow-settings.ts`: analysis, durationS, timeStepS,
  target, widthMm, heightMm, thicknessMm, layers, finish, quantity and view.
  Board specifications do not yet alter board geometry.
- Local storage key: `aether-io.projects.v1`. Export downloads this object as
  `.aetherio` JSON; import is not implemented. Browser storage is not cloud save.

Before building a backend, introduce a versioned schema and an explicit
migration for these drafts. Separate immutable object IDs from editable
designators. Validate values, finite coordinates, enum choices and endpoint
references on both document load and command acceptance. Include asset/library
references and separate schematic, board and assembly positions. Use explicit
units: seconds, volts, amperes, ohms and farads; physical geometry must have a
documented unit conversion. Keep user-facing value strings separate from parsed
quantities. Never infer a safe operating voltage from a drawing's color.

## Phase 1 — authoritative documents and connectivity

- [ ] Versioned electrical document, schema validator and migration fixtures.
- [ ] Stable components, pins, junctions, buses, named nets and sheets.
- [ ] Reusable library IDs and full pin maps, including power/ground domains.
- [ ] Typed values/tolerances and package mapping.
- [ ] Document commands with atomic undo/redo and referential integrity.
- [ ] Local import/export round trips, then host save/open/revisions and conflict
  handling. Never overwrite newer saved work silently.
- [ ] ERC diagnostics linked to exact object IDs and severity, with selection
  back into the appropriate view.

Acceptance: save/reopen produces the same connectivity; renaming a component
does not break wires; deleting it removes only incident connections; undo
restores exact identities. Test branched nets and crossings independently.

## Phase 2 — circuit simulation and instruments

Evaluate a suitable solver adapter and its redistribution/license requirements;
no engine choice has been finalized. Keep compilation/netlist generation and
numerical evaluation outside React. A browser worker or isolated local service
is a deployment choice to resolve during implementation.

- [ ] Capabilities: supported analyses, components, parameter limits and units.
- [ ] Netlist generation with diagnostics for unsupported or invalid elements.
- [ ] DC operating point, then transient analysis, then AC sweep as supported.
- [ ] Probe definitions bound to stable net/element IDs, with voltage/current
  units and actual sample timestamps.
- [ ] Jobs: queued/running/completed/failed/cancelled, bounded resources and
  cleanup on cancellation or document close.
- [ ] Stream/chunk results without flooding React; scope axes, cursors,
  channels, time windows and measurement export.
- [ ] Distinguish stale results from the current document revision.

Acceptance: verify resistor-divider voltages and RC step responses against
analytic values with documented tolerances. Surface floating-node and convergence
errors. A failed/cancelled run cannot display successful measured outputs.

## Phase 3 — firmware and interactive hardware

- [ ] Supported target catalog and toolchain versions; begin with one verified
  target. ESP32, Arduino UNO and Nano currently appear only as requested targets.
- [ ] Compiler jobs with file/line/column diagnostics and reproducible artifacts.
- [ ] Emulator adapter: reset/run/pause/step/stop, virtual time, clock rate,
  GPIO, ADC/PWM and serial events for supported devices.
- [ ] Deterministic coupling of MCU pins, circuit solver and interactive
  switches/LEDs/displays. Do not tie virtual execution speed to display FPS.
- [ ] Serial console and upload/emulation logs, with clear hardware-versus-
  simulation destinations. Physical device flashing is a separate explicit flow.
- [ ] Isolated compilation/execution, cancellation and resource limits.

Acceptance: a compiled blink program controls the LED through the mapped GPIO;
changing delay changes observed timing. A switch input changes program output.
Test reset, failed compilation, incompatible target and stop cleanup. Never
substitute the existing scripted blink when execution fails.

## Phase 4 — physical board and assembly

- [ ] Licensed footprint library and pin-to-pad mapping, including package
  variations. No placeholder drawing should be accepted as a real footprint.
- [ ] Physical board outline, cutouts, holes, stackup, placement and rotations.
- [ ] Routed copper/vias, net classes, widths and clearance rules; synchronize
  schematic intent with the physical board without inventing connections.
- [ ] DRC with positioned violations, unrouted-net reporting and revision tags.
- [ ] Independent assembly placement, connector/harness pin mapping and cable
  metadata. Components remain the same document entities across views.
- [ ] Board/package 3D generation and renderer integration. UI assembled/bare/
  exploded choices should drive the same physical model. Add STEP export only
  once geometry is validated.

Acceptance: schematic/board net correspondence, pad maps, edge clearances,
overlaps and missing-footprint errors have deterministic fixtures. Verify
physical dimensions and export units against an independent viewer/importer.

## Phase 5 — fabrication and manufacturing

- [ ] Generate board-layer Gerber files and drill outputs from physical geometry.
- [ ] BOM with real manufacturer identifiers/package references; pick-and-place
  output with explicit origin, orientation, side and units.
- [ ] Deterministic release bundle, manifest/revision, checksums and preflight
  report. Missing data must remain blocking or explicitly acknowledged.
- [ ] Provider-independent quote request using reviewed board specifications;
  show currency, lead time, validity and available assembly options from actual
  provider responses.
- [ ] Separate quote, checkout/approval, submission and order-status flows.
  Requesting a quote must never place an order.

Acceptance: inspect generated files in an independent fabrication viewer;
validate outline/holes/pads/units and trace the release to its document revision.
Do not label the current JSON snapshot as a fabrication export.

## Phase 6 — suite AI and collaboration

- [ ] Reuse Studio's account-based plugin/provider connection rather than
  creating product-specific credentials or an additional login system.
- [ ] Explicit contextual inputs: document revision, selected components,
  connectivity, diagnostic results and optionally an approved screenshot.
- [ ] Read-only explain/review tools first; generated circuit/code changes
  become reviewable document commands with undo and validation.
- [ ] Cancellation, provider failures, unavailable capabilities and session
  recovery in the existing shared agent panel.
- [ ] Collaborative edits/comments later, following the host document model.

Saved designs and deterministic simulation must not require an AI connection.

## Proposed service boundary — review before implementation

These are responsibilities, **not existing endpoints or an approved wire API**:

| Operation | Input | Output |
| --- | --- | --- |
| Discover capabilities | Engine/library versions | Supported targets, analyses, formats, limits |
| Validate/compile document | Schema version, revision, document snapshot | Netlist/model or object-linked diagnostics |
| Start analysis | Revision, analysis configuration, probes | Job ID and progress/result events |
| Compile firmware | Target/toolchain, source files | Diagnostics, artifact hash and metadata |
| Start emulation | Artifact hash, document revision, pin map | Runtime/serial/pin events |
| Build board preview | Physical board revision, package references | Model assets and missing-model diagnostics |
| Export fabrication | Validated physical board revision, release config | Artifact manifest and preflight report |
| Quote | Reviewed manifest and board/order specification | Provider quote, currency and expiration |

Every asynchronous result needs a request/job ID and source revision. UI must
not apply stale completions to a different open project. Define cancellation,
disconnect/reconnect, error codes, size limits, authentication and asset
ownership with the host/backend lane before shipping the protocol.

## Where to connect the UI

- `App.tsx`: workspace routing, document change/undo, local save, actions.
- `WorkflowPanels.tsx`: simulation setup/results/log, firmware target/editor,
  3D state and manufacturing specification/release controls.
- `Panels.tsx`: component library, properties, footprint assignment and agent.
- `CircuitCanvas.tsx`: view-only geometry/gestures; it must not become a solver.
- `model.ts`: temporary local document helpers, to be migrated deliberately.
- `core/ui/src/SignalMonitor.tsx`: display samples supplied by callers; extend
  shared instrument UI when needed, keeping analysis meaning in IO.

## Verification gates

The initial UI has model unit tests and production-host browser coverage in
`aether-map/e2e/io-preview.spec.ts`. Extend those flows as services become real.
Every phase needs deterministic domain tests plus UI loading, failure, empty,
cancel and successful states. Keep demonstrations visually distinct from real
results. Record shipped behavior in STATUS and leave unfinished checkboxes here.
