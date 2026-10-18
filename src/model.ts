import type { CircuitSymbolKind } from "@aether/ui";
import type { WorkflowSettings } from "./workflow-settings";
export type Workspace =
  | "schematic"
  | "pcb"
  | "wiring"
  | "firmware"
  | "simulation"
  | "3d"
  | "manufacture";
export type Point = { x: number; y: number };
export interface Part {
  id: string;
  kind: CircuitSymbolKind;
  name: string;
  value: string;
  position: Point;
  board: Point;
}
export interface Wire {
  id: string;
  from: string;
  to: string;
}
export interface Project {
  hostDocumentID?: string;
  setup?: WorkflowSettings;
  id: string;
  name: string;
  updated: string;
  parts: Part[];
  wires: Wire[];
  code: string;
}
export const catalog: {
  kind: CircuitSymbolKind;
  name: string;
  value: string;
  ref: string;
}[] = [
  { kind: "mcu", name: "ESP32 controller", value: "ESP32-WROOM-32", ref: "U" },
  { kind: "resistor", name: "Resistor", value: "330 Ω", ref: "R" },
  { kind: "capacitor", name: "Capacitor", value: "100 nF", ref: "C" },
  { kind: "led", name: "Status LED", value: "Green · 0603", ref: "D" },
  {
    kind: "connector",
    name: "Power connector",
    value: "3.3 V input",
    ref: "J",
  },
  { kind: "switch", name: "Push button", value: "Normally open", ref: "SW" },
];
export function pins(part: Part) {
  return part.kind === "mcu"
    ? [
        { id: "vcc", name: "3V3", x: 0, y: 35 },
        { id: "gnd", name: "GND", x: 0, y: 85 },
        { id: "en", name: "EN", x: 0, y: 135 },
        { id: "gpio2", name: "GPIO2", x: 180, y: 35 },
        { id: "gpio21", name: "GPIO21", x: 180, y: 85 },
        { id: "gpio22", name: "GPIO22", x: 180, y: 135 },
      ]
    : [
        { id: "a", name: part.kind === "led" ? "A" : "+", x: 0, y: 40 },
        { id: "b", name: part.kind === "led" ? "K" : "−", x: 120, y: 40 },
      ];
}
export function endpoint(
  project: Project,
  key: string,
  workspace: Workspace,
): Point | null {
  const [id, pin] = key.split(":");
  const part = project.parts.find((p) => p.id === id);
  if (!part) return null;
  const port = pins(part).find((p) => p.id === pin);
  if (!port) return null;
  const pos = workspace === "pcb" ? part.board : part.position;
  return { x: pos.x + port.x, y: pos.y + port.y };
}
export function connect(project: Project, from: string, to: string): Project {
  if (
    from === to ||
    !endpoint(project, from, "schematic") ||
    !endpoint(project, to, "schematic")
  )
    return project;
  if (
    project.wires.some(
      (w) =>
        (w.from === from && w.to === to) || (w.from === to && w.to === from),
    )
  )
    return project;
  return {
    ...project,
    wires: [...project.wires, { id: crypto.randomUUID(), from, to }],
  };
}
export function removePart(project: Project, id: string): Project {
  return {
    ...project,
    parts: project.parts.filter((p) => p.id !== id),
    wires: project.wires.filter(
      (w) => !w.from.startsWith(id + ":") && !w.to.startsWith(id + ":"),
    ),
  };
}
export function createProject(name: string, blank = false): Project {
  const parts: Part[] = blank
    ? []
    : [
        {
          id: "J1",
          kind: "connector",
          name: "Power input",
          value: "3.3 V",
          position: { x: 110, y: 250 },
          board: { x: 290, y: 235 },
        },
        {
          id: "U1",
          kind: "mcu",
          name: "Controller",
          value: "ESP32-WROOM-32",
          position: { x: 460, y: 250 },
          board: { x: 520, y: 260 },
        },
        {
          id: "R1",
          kind: "resistor",
          name: "LED resistor",
          value: "330 Ω",
          position: { x: 740, y: 245 },
          board: { x: 760, y: 250 },
        },
        {
          id: "D1",
          kind: "led",
          name: "Status LED",
          value: "Green · 0603",
          position: { x: 950, y: 245 },
          board: { x: 800, y: 440 },
        },
        {
          id: "C1",
          kind: "capacitor",
          name: "Decoupling",
          value: "100 nF",
          position: { x: 290, y: 130 },
          board: { x: 320, y: 410 },
        },
        {
          id: "SW1",
          kind: "switch",
          name: "Reset button",
          value: "Normally open",
          position: { x: 280, y: 470 },
          board: { x: 550, y: 480 },
        },
      ];
  const pairs = [
    ["J1:a", "U1:vcc"],
    ["J1:b", "U1:gnd"],
    ["U1:gpio2", "R1:a"],
    ["R1:b", "D1:a"],
    ["D1:b", "U1:gnd"],
    ["C1:a", "U1:vcc"],
    ["C1:b", "U1:gnd"],
    ["SW1:a", "U1:en"],
    ["SW1:b", "U1:gnd"],
  ];
  return {
    id: crypto.randomUUID(),
    name,
    updated: new Date().toISOString(),
    parts,
    wires: blank
      ? []
      : pairs.map(([from, to], i) => ({ id: `net${i}`, from, to })),
    code: "// ESP32 status indicator\n// Source editor preview — compilation is not connected.\nconst int LED_PIN = 2;\n\nvoid setup() {\n  pinMode(LED_PIN, OUTPUT);\n}\n\nvoid loop() {\n  digitalWrite(LED_PIN, HIGH);\n  delay(500);\n  digitalWrite(LED_PIN, LOW);\n  delay(500);\n}\n",
  };
}
export function addPart(
  project: Project,
  kind: CircuitSymbolKind,
  position: Point,
): Project {
  const entry = catalog.find((c) => c.kind === kind)!;
  let n = 1;
  while (project.parts.some((p) => p.id === entry.ref + n)) n++;
  return {
    ...project,
    parts: [
      ...project.parts,
      {
        id: entry.ref + n,
        kind,
        name: entry.name,
        value: entry.value,
        position,
        board: position,
      },
    ],
  };
}
export const libraryKey = "aether-io.projects.v1";
export function readProjects(): Project[] {
  try {
    const value = JSON.parse(localStorage.getItem(libraryKey) || "[]");
    return Array.isArray(value)
      ? value.filter(
          (p) =>
            p &&
            typeof p.id === "string" &&
            typeof p.name === "string" &&
            Array.isArray(p.parts) &&
            Array.isArray(p.wires) &&
            typeof p.code === "string",
        )
      : [];
  } catch {
    return [];
  }
}
