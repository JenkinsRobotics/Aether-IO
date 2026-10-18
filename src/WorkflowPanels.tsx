import {
  Button,
  FieldRow,
  NumberField,
  SelectField,
  SettingsCard,
  SignalMonitor,
  EmptyState,
  AetherIcon,
  DataTable,
} from "@aether/ui";
import type { Project, Workspace } from "./model";
import {
  defaultWorkflowSettings,
  type WorkflowSettings,
} from "./workflow-settings";

const choices = (values: string[]) =>
  values.map((value) => ({ value, label: value }));

/** Setup screens intentionally stop at the product backend boundary. */
export function WorkflowPanels({
  workspace,
  project,
  change,
  selected,
  onSelect,
}: {
  workspace: Workspace;
  project: Project;
  change: (project: Project) => void;
  selected: string;
  onSelect: (id: string) => void;
}) {
  const setup = { ...defaultWorkflowSettings, ...project.setup };
  const update = (patch: Partial<WorkflowSettings>) =>
    change({ ...project, setup: { ...setup, ...patch } });
  const select = (
    label: string,
    key: "analysis" | "target" | "layers" | "finish" | "view",
    values: string[],
  ) => (
    <FieldRow label={label}>
      <SelectField
        aria-label={label}
        value={setup[key]}
        options={choices(values)}
        onChange={(e) => update({ [key]: e.target.value })}
      />
    </FieldRow>
  );
  const number = (
    label: string,
    key:
      | "durationS"
      | "timeStepS"
      | "widthMm"
      | "heightMm"
      | "thicknessMm"
      | "quantity",
    unit: string,
    min: number,
    step: number,
  ) => (
    <FieldRow label={label}>
      <NumberField
        aria-label={label}
        value={setup[key]}
        unit={unit}
        min={min}
        step={step}
        onCommit={(value) => update({ [key]: value })}
      />
    </FieldRow>
  );
  if (workspace === "firmware")
    return (
      <div className="io-firmware">
        <header>
          <span>main.ino</span>
          {select("Firmware target", "target", [
            "ESP32",
            "Arduino UNO",
            "Arduino Nano",
          ])}
        </header>
        <textarea
          aria-label="Firmware source"
          spellCheck={false}
          value={project.code}
          onChange={(e) => change({ ...project, code: e.target.value })}
        />
        <footer>
          Source preview · Target selection is saved; no compiler or emulator is
          connected. Changing target does not rewrite your source.
        </footer>
        <div className="io-workflow-actions">
          <Button disabled title="Compiler integration is not connected">
            Build firmware
          </Button>
          <Button disabled title="Microcontroller emulator is not connected">
            Run firmware
          </Button>
          <Button disabled title="Serial transport is not connected">
            Open serial monitor
          </Button>
        </div>
      </div>
    );
  if (workspace === "simulation")
    return (
      <section className="io-workflow" aria-label="Simulation workspace">
        <header>
          <span>TEST BENCH</span>
          <h2>Simulation</h2>
          <p>Configure an analysis and choose signals to inspect.</p>
        </header>
        <div className="io-workflow-grid">
          <SettingsCard title="Analysis setup">
            {select("Analysis type", "analysis", [
              "Transient",
              "DC operating point",
              "AC sweep",
            ])}
            {setup.analysis === "Transient" && (
              <>
                {number("Duration", "durationS", "s", 0.001, 0.1)}
                {number("Time step", "timeStepS", "s", 0.000001, 0.001)}
              </>
            )}
            <p className="io-muted">
              Setup is saved with this project. Solver-specific settings will
              appear when an analysis engine is connected.
            </p>
            <Button disabled title="Circuit solver is not connected">
              Run analysis
            </Button>
          </SettingsCard>
          <SettingsCard title="Probe channels">
            <DataTable
              ariaLabel="Available probe locations"
              rows={project.parts}
              selectedIDs={new Set([selected])}
              onSelect={(ids) => onSelect(ids[0] ?? "")}
              rowID={(p) => p.id}
              columns={[
                { id: "ref", header: "Part", cell: (p) => p.id },
                { id: "value", header: "Value", cell: (p) => p.value },
              ]}
            />
            <p className="io-muted">
              Select voltage/current probes after the netlist service is
              connected. No values have been measured.
            </p>
          </SettingsCard>
        </div>
        <SignalMonitor
          caption="Analysis results · awaiting solver"
          duration="—"
          traces={[]}
        />
        <SettingsCard title="Run log">
          <p role="status">Not connected · No analysis has run.</p>
          <p className="io-muted">
            Diagnostics, convergence warnings and result timestamps will appear
            here.
          </p>
        </SettingsCard>
      </section>
    );
  if (workspace === "3d")
    return (
      <section className="io-workflow" aria-label="3D inspection workspace">
        <header>
          <span>BOARD INSPECTION</span>
          <h2>3D View</h2>
          <p>Inspect the board stack and component clearances.</p>
        </header>
        <SettingsCard title="Display">
          {select("Board view", "view", [
            "Assembled",
            "Bare board",
            "Exploded",
          ])}
          <p className="io-muted">
            Display preference is saved for the future board renderer.
          </p>
        </SettingsCard>
        <div className="io-3d-preview">
          <EmptyState
            icon={<AetherIcon name="cube" style={{ width: 44, height: 44 }} />}
            title="Board model not available"
            description="Assign real footprints and package models to build a 3D preview. The renderer is not connected in this UI draft."
          />
        </div>
        <div className="io-workflow-actions">
          <Button disabled title="3D renderer is not connected">
            Fit board
          </Button>
          <Button disabled title="Package model library is not connected">
            Package models
          </Button>
          <Button disabled title="3D export is not connected">
            Export STEP
          </Button>
        </div>
      </section>
    );
  return (
    <section className="io-workflow" aria-label="Manufacturing workspace">
      <header>
        <span>PREPARE FOR PRODUCTION</span>
        <h2>Manufacture</h2>
        <p>
          Prepare board specifications, review components and package
          fabrication files.
        </p>
      </header>
      <div className="io-workflow-grid">
        <SettingsCard title="Board specification">
          {number("Board width", "widthMm", "mm", 1, 1)}
          {number("Board height", "heightMm", "mm", 1, 1)}
          {number("Board thickness", "thicknessMm", "mm", 0.1, 0.1)}
          {select("Copper layers", "layers", ["2", "4", "6"])}
          {select("Surface finish", "finish", [
            "Lead-free HASL",
            "ENIG",
            "OSP",
          ])}
          {number("Board quantity", "quantity", "boards", 1, 1)}
          <p className="io-muted">
            Specification draft only. These settings do not resize the
            illustrative PCB canvas or generate physical layers.
          </p>
        </SettingsCard>
        <SettingsCard title="Release checklist">
          <ul className="io-release-checks">
            <li>{project.parts.length} components in the design</li>
            <li>{project.wires.length} logical connections</li>
            <li>Footprints and package models: unassigned</li>
            <li>Electrical rule check: not run</li>
            <li>Routing and design rule check: not run</li>
            <li>Fabrication files: not generated</li>
          </ul>
          <div className="io-workflow-actions">
            <Button disabled title="Fabrication exporter is not connected">
              Generate Gerber + drill
            </Button>
            <Button disabled title="Assembly exporter requires real footprints">
              Assembly package
            </Button>
            <Button disabled title="No manufacturing provider is connected">
              Request quote
            </Button>
          </div>
        </SettingsCard>
      </div>
      <SettingsCard title="Bill of materials">
        <DataTable
          ariaLabel="Manufacturing bill of materials"
          rows={project.parts}
          selectedIDs={new Set([selected])}
          onSelect={(ids) => onSelect(ids[0] ?? "")}
          rowID={(p) => p.id}
          columns={[
            { id: "ref", header: "Ref", cell: (p) => p.id },
            { id: "name", header: "Component", cell: (p) => p.name },
            { id: "value", header: "Value", cell: (p) => p.value },
            { id: "package", header: "Footprint", cell: () => "Not assigned" },
          ]}
        />
      </SettingsCard>
    </section>
  );
}
