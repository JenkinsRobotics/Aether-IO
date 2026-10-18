import { useRef, useState } from "react";
import { CircuitSymbol, type CircuitSymbolKind, Button } from "@aether/ui";
import {
  endpoint,
  pins,
  type Project,
  type Workspace,
  type Point,
} from "./model";
export function CircuitCanvas({
  project,
  workspace,
  selected,
  onSelect,
  onMove,
  onPlace,
  onConnect,
  wireMode,
  running,
}: {
  project: Project;
  workspace: Workspace;
  selected: string;
  onSelect: (id: string) => void;
  onMove: (id: string, pos: Point) => void;
  onPlace: (kind: CircuitSymbolKind, pos: Point) => void;
  onConnect: (from: string, to: string) => void;
  wireMode: boolean;
  running: boolean;
}) {
  const svg = useRef<SVGSVGElement>(null),
    drag = useRef<{ id: string; start: Point; position: Point } | null>(null);
  const [draft, setDraft] = useState<{ id: string; position: Point } | null>(
      null,
    ),
    [pending, setPending] = useState<string | null>(null),
    [zoom, setZoom] = useState(1);
  const point = (x: number, y: number) => {
    const node = svg.current!;
    const pt = node.createSVGPoint();
    pt.x = x;
    pt.y = y;
    return pt.matrixTransform(node.getScreenCTM()!.inverse());
  };
  const preview = draft
    ? {
        ...project,
        parts: project.parts.map((p) =>
          p.id === draft.id
            ? {
                ...p,
                [workspace === "pcb" ? "board" : "position"]: draft.position,
              }
            : p,
        ),
      }
    : project;
  const pinClick = (key: string) => {
    if (!wireMode) return;
    if (pending) {
      onConnect(pending, key);
      setPending(null);
    } else setPending(key);
  };
  return (
    <div
      className={`io-canvas io-canvas--${workspace}`}
      onDragOver={(e) => e.preventDefault()}
      onDrop={(e) => {
        e.preventDefault();
        const kind = e.dataTransfer.getData(
          "aether-io-part",
        ) as CircuitSymbolKind;
        if (kind) onPlace(kind, point(e.clientX, e.clientY));
      }}
    >
      <div className="io-canvas-heading" data-workspace-overlay="top left right">
        <div>
          <span>
            {workspace === "pcb"
              ? "BOARD EDITOR"
              : workspace === "wiring"
                ? "HARDWARE BENCH"
                : "SCHEMATIC EDITOR"}
          </span>
          <h2>
            {workspace === "pcb"
              ? "Controller board"
              : workspace === "wiring"
                ? "System connections"
                : project.name}
          </h2>
        </div>
        <span>
          {workspace === "pcb"
            ? "2 layers · placement study"
            : workspace === "wiring"
              ? "Component assembly preview"
              : "Sheet 01 / 01"}
        </span>
      </div>
      <svg
        ref={svg}
        viewBox={`${600 - 600 / zoom} ${350 - 350 / zoom} ${1200 / zoom} ${700 / zoom}`}
        role="img"
        aria-label={`${workspace} design canvas`}
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === "Escape") setPending(null);
        }}
        onPointerDown={(e) => {
          if (e.target === e.currentTarget) {
            onSelect("");
            setPending(null);
          }
        }}
        onPointerMove={(e) => {
          if (!drag.current) return;
          const p = point(e.clientX, e.clientY);
          setDraft({
            id: drag.current.id,
            position: {
              x:
                Math.round(
                  (drag.current.position.x + p.x - drag.current.start.x) / 10,
                ) * 10,
              y:
                Math.round(
                  (drag.current.position.y + p.y - drag.current.start.y) / 10,
                ) * 10,
            },
          });
        }}
        onPointerUp={() => {
          if (draft) onMove(draft.id, draft.position);
          drag.current = null;
          setDraft(null);
        }}
        onPointerCancel={() => {
          drag.current = null;
          setDraft(null);
        }}
      >
        {workspace === "pcb" ? (
          <g className="io-board">
            <rect x="240" y="170" width="720" height="450" rx="24" />
            {[
              [265, 195],
              [935, 195],
              [265, 595],
              [935, 595],
            ].map(([cx, cy]) => (
              <circle key={`${cx}:${cy}`} cx={cx} cy={cy} r="10" />
            ))}
            <text x="275" y="575">
              AETHER IO / REV A
            </text>
          </g>
        ) : (
          <g className="io-circuit-regions">
            <text x="95" y="210">
              01 / POWER
            </text>
            <text x="445" y="210">
              02 / CONTROL
            </text>
            <text x="740" y="210">
              03 / OUTPUT
            </text>
            <path d="M90 225H350M440 225H650M735 225H1095" />
          </g>
        )}
        {preview.wires.map((w, i) => {
          const a = endpoint(preview, w.from, workspace),
            b = endpoint(preview, w.to, workspace);
          if (!a || !b) return null;
          const offset = 30 + (i % 4) * 16;
          return (
            <path
              key={w.id}
              className={`io-wire${workspace === "pcb" ? " io-wire--board" : ""}`}
              d={
                workspace === "wiring"
                  ? `M${a.x},${a.y} C${a.x + offset + 50},${a.y - 45} ${b.x - offset - 50},${b.y - 45} ${b.x},${b.y}`
                  : `M${a.x},${a.y} H${a.x + offset} V${b.y} H${b.x}`
              }
            />
          );
        })}
        {preview.parts.map((part) => {
          const pos = workspace === "pcb" ? part.board : part.position;
          const mcu = part.kind === "mcu";
          return (
            <g
              key={part.id}
              transform={`translate(${pos.x} ${pos.y})`}
              className={`io-part ${selected === part.id ? "is-selected" : ""} ${part.kind === "led" && running ? "is-powered" : ""}`}
              role="button"
              tabIndex={0}
              aria-label={`Select ${part.id} ${part.name}`}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  onSelect(part.id);
                }
              }}
              onPointerDown={(e) => {
                if ((e.target as Element).closest("[data-pin]")) return;
                e.stopPropagation();
                onSelect(part.id);
                if (!wireMode) {
                  e.currentTarget.setPointerCapture(e.pointerId);
                  drag.current = {
                    id: part.id,
                    start: point(e.clientX, e.clientY),
                    position: pos,
                  };
                }
              }}
            >
              <rect
                className="io-part-hit"
                x="-15"
                y="-22"
                width={mcu ? 210 : 150}
                height={mcu ? 210 : 120}
                rx="9"
              />
              {mcu ? (
                <>
                  <rect
                    className="io-chip"
                    x="20"
                    y="8"
                    width="140"
                    height="152"
                    rx="4"
                  />
                  <CircuitSymbol
                    kind="mcu"
                    x="57"
                    y="53"
                    width="66"
                    height="50"
                  />
                  <text
                    className="io-chip-title"
                    x="90"
                    y="32"
                    textAnchor="middle"
                  >
                    ESP32
                  </text>
                  <text
                    className="io-part-value"
                    x="90"
                    y="123"
                    textAnchor="middle"
                  >
                    WROOM-32
                  </text>
                </>
              ) : (
                <CircuitSymbol
                  kind={part.kind}
                  lit={running}
                  x="0"
                  y="0"
                  width="120"
                  height="80"
                />
              )}
              <text className="io-reference" y="-10">
                {part.id}
              </text>
              <text className="io-part-value" y={mcu ? 183 : 96}>
                {part.value}
              </text>
              {pins(part).map((pin) => (
                <g
                  key={pin.id}
                  data-pin="true"
                  className="io-pin"
                  role="button"
                  tabIndex={wireMode ? 0 : -1}
                  aria-label={`Connect ${part.id} ${pin.name}`}
                  onPointerDown={(e) => e.stopPropagation()}
                  onClick={(e) => {
                    e.stopPropagation();
                    pinClick(`${part.id}:${pin.id}`);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.stopPropagation();
                      pinClick(`${part.id}:${pin.id}`);
                    }
                  }}
                >
                  {mcu && (
                    <>
                      <path
                        d={`M${pin.x} ${pin.y}h${pin.x === 0 ? 20 : -20}`}
                      />
                      <text
                        x={pin.x === 0 ? 25 : 155}
                        y={pin.y + 4}
                        textAnchor={pin.x === 0 ? "start" : "end"}
                      >
                        {pin.name}
                      </text>
                    </>
                  )}
                  <circle
                    cx={pin.x}
                    cy={pin.y}
                    r="10"
                    fill="transparent"
                    stroke="none"
                  />
                  <circle
                    className="io-pin-dot"
                    cx={pin.x}
                    cy={pin.y}
                    r={pending === `${part.id}:${pin.id}` ? 6 : 3.5}
                  />
                  <rect
                    x={pin.x === 0 ? -12 : pin.x - (mcu ? 50 : 12)}
                    y={pin.y - 12}
                    width={mcu ? 62 : 24}
                    height="24"
                    fill="transparent"
                    stroke="none"
                  />
                </g>
              ))}
            </g>
          );
        })}
      </svg>
      <div className="io-canvas-footer" data-workspace-overlay="bottom left right">
        <span>
          {wireMode
            ? pending
              ? "Choose another pin · Escape cancels"
              : "Select two pins to create a connection"
            : "Select a component · Drag to move · 10-unit grid"}
        </span>
        <div>
          <Button
            onClick={() => setZoom(Math.max(0.6, zoom - 0.2))}
            aria-label="Zoom out"
          >
            −
          </Button>
          <Button onClick={() => setZoom(1)}>Fit</Button>
          <span>{Math.round(zoom * 100)}%</span>
          <Button
            onClick={() => setZoom(Math.min(2, zoom + 0.2))}
            aria-label="Zoom in"
          >
            +
          </Button>
        </div>
      </div>
    </div>
  );
}
