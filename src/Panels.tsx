import {
  AetherIcon,
  TreePanel,
  CircuitSymbol,
  FieldRow, Inspector, InspectorSection, InspectorActions,
  TextField,
  Button,
  type CircuitSymbolKind,
} from "@aether/ui";
import {
  AssistantPanel,
  type AssistantMessage,
} from "@aether/ui/concept-widgets";
import type { Dispatch, SetStateAction } from "react";
import { catalog, pins, type Project } from "./model";
export function IOObjects({
  project,
  selected,
  setSelected,
  place,
  command,
}: {
  project: Project;
  selected: string;
  setSelected: (id: string) => void;
  place: (kind: CircuitSymbolKind) => void;
  command: (id: string) => void;
}) {
  const part = project.parts.find((p) => p.id === selected);
  return (
    <TreePanel
      title="Objects"
      ariaLabel="Circuit objects"
      nodes={[
        {
          id: "root",
          label: project.name,
          icon: <AetherIcon name="folder" />,
          children: project.parts.map((p) => ({
            id: p.id,
            label: `${p.id} · ${p.name}`,
            icon: <CircuitSymbol kind={p.kind} width={18} height={18} />,
          })),
        },
      ]}
      selectedIDs={new Set([selected])}
      onSelect={(ids) => setSelected(ids[0] ?? "")}
      controls={[
        {
          id: "add",
          label: "Add resistor",
          icon: <AetherIcon name="plus" />,
          onClick: () => place("resistor"),
        },
        {
          id: "delete",
          label: "Delete selected component",
          icon: <AetherIcon name="delete" />,
          disabled: !part,
          onClick: () => command("delete"),
        },
      ]}
      secondary={
        <div className="io-tree-summary">
          <span>{project.parts.length} components</span>
          <span>{project.wires.length} connections</span>
        </div>
      }
    />
  );
}

export function IOComponents({ place }: { place: (kind: CircuitSymbolKind) => void }) {
  return (
    <div className="io-inspector">
      <div className="io-panel-title">
        <span>COMPONENT LIBRARY</span><h3>Build your circuit</h3>
        <p>Drag onto the canvas or select to place.</p>
      </div>
      {catalog.map(c => (
        <button className="io-library-part" key={c.kind} draggable
          onDragStart={e => e.dataTransfer.setData("aether-io-part", c.kind)} onClick={() => place(c.kind)}>
          <CircuitSymbol kind={c.kind} width={45} height={36} />
          <span><strong>{c.name}</strong><small>{c.value}</small></span><AetherIcon name="plus" />
        </button>
      ))}
    </div>
  );
}

export function IOProperties({ project, selected, change, command }: {
  project: Project; selected: string; change: (p: Project) => void; command: (id: string) => void;
}) {
  const part = project.parts.find(p => p.id === selected);
  return (
    <Inspector><InspectorSection title={part ? `${part.id} · ${part.name}` : "Project"}>
      {!part && <FieldRow label="Project name">
        <TextField
          aria-label="Project name"
          value={project.name}
          onChange={(e) => change({ ...project, name: e.target.value })}
        />
      </FieldRow>}
      {part && (
        <>
          <FieldRow label="Component name">
            <TextField
              aria-label="Component name"
              value={part.name}
              onChange={(e) =>
                change({
                  ...project,
                  parts: project.parts.map((p) =>
                    p.id === part.id ? { ...p, name: e.target.value } : p,
                  ),
                })
              }
            />
          </FieldRow>
          <FieldRow label="Value">
            <TextField
              aria-label="Component value"
              value={part.value}
              onChange={(e) =>
                change({
                  ...project,
                  parts: project.parts.map((p) =>
                    p.id === part.id ? { ...p, value: e.target.value } : p,
                  ),
                })
              }
            />
          </FieldRow>
          <InspectorSection title="Pin connections">
          {pins(part).map((pin) => (
            <div className="io-pin-row" key={pin.id}>
              <strong>{pin.name}</strong>
              <span>
                {
                  project.wires.filter(
                    (w) =>
                      w.from === `${part.id}:${pin.id}` ||
                      w.to === `${part.id}:${pin.id}`,
                  ).length
                }{" "}
                connections
              </span>
            </div>
          ))}
          </InspectorSection>
          <InspectorActions><Button
            disabled
            title="Footprint library integration is not connected"
          >
            Assign footprint
          </Button>
          <Button onClick={() => command("delete")}>Delete component</Button></InspectorActions>
        </>
      )}
      <p className="io-muted">
        UI preview · Values and connections are saved, but not electrically
        validated.
      </p>
    </InspectorSection></Inspector>
  );
}

export function IOAgent({
  project,
  messages,
  setMessages,
}: {
  project: Project;
  messages: AssistantMessage[];
  setMessages: Dispatch<SetStateAction<AssistantMessage[]>>;
}) {
  return (
    <AssistantPanel
      title="Aether Agent"
      heading="AI Advisor"
      onRate={(id, rating) => setMessages(current => current.map(message => message.id === id ? {...message, rating} : message))}
      detail={project.name}
      layout="agent"
      status="Not connected"
      showModes={false}
      messages={messages}
      suggestions={[
        "Explain this circuit",
        "Help plan a power supply",
        "Review my connections",
      ]}
      notice="Draft conversation only. Connectors and circuit-aware AI tools are not enabled in this preview."
      onSubmit={(text) =>
        setMessages((m) => [
          ...m,
          { id: crypto.randomUUID(), role: "user", text },
          {
            id: crypto.randomUUID(),
            role: "assistant",
            text: "Your prompt is kept in this session. Live AI assistance for Aether IO is not connected yet.",
          },
        ])
      }
    />
  );
}
