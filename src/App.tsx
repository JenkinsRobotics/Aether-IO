import { useContextCommands } from '@aether/ui';
import { useStudioApplications } from "@aether/session/applications";
import { useHostedDocument } from '@aether/session/useHostedDocument';
import { useDocumentConnection } from '@aether/session/useDocumentConnection';
import { WorkflowPanels } from "./WorkflowPanels";
import { IOObjects, IOComponents, IOProperties, IOAgent } from "./Panels";
import { type AssistantMessage } from "@aether/ui/concept-widgets";
import { useEffect, useState } from "react";
import {
  AetherIcon,
  StudioDocumentBar as DocumentBar,
  WorkspaceSwitcher, WorkspaceFileBar, NewFileDialog,
  MenuButton,
  StudioWorkspace as WorkspaceShell,
  standardWorkspacePanels,
  WorkspaceRibbon,
  SidebarDesignMenu,
  StudioModeButton,
  WorkspaceWindowMenu,
  Button,
  SettingsWindow,
  SettingsCard,
  SettingsRow,
  SelectField,
  SignalMonitor,
  CircuitSymbol,
  DataTable,
  type SidebarDesign,
  type LayoutPreset,
  type CircuitSymbolKind,
  type AetherIconName,
} from "@aether/ui";
import { Home } from "./Home";
import { CircuitCanvas } from "./CircuitCanvas";
import {
  createProject,
  addPart,
  catalog,
  connect,
  libraryKey,
  readProjects,
  removePart,
  type Project,
  type Workspace,
} from "./model";
import "./io.css";
const workspaces = [
  { id: "schematic", label: "Schematic" },
  { id: "pcb", label: "PCB Layout" },
  { id: "wiring", label: "Wiring" },
  { id: "firmware", label: "Firmware" },
  { id: "simulation", label: "Simulation" },
  { id: "3d", label: "3D View" },
  { id: "manufacture", label: "Manufacture" },
];
function preference<T extends string>(
  key: string,
  options: readonly T[],
  fallback: T,
): T {
  try {
    const value = localStorage.getItem(key);
    return options.find((v) => v === value) ?? fallback;
  } catch {
    return fallback;
  }
}
export default function App() {
  const applications = useStudioApplications();
  const [creatingDocument,setCreatingDocument]=useState(false);
  const [projects, setProjects] = useState(readProjects),
    [project, setProject] = useState<Project | null>(null),
    [workspace, setWorkspace] = useState<Workspace>("schematic");
  const [selected, setSelected] = useState("U1"),
    [wireMode, setWireMode] = useState(false),
    [running, setRunning] = useState(false),
    [settings, setSettings] = useState(false),
    [messages, setMessages] = useState<AssistantMessage[]>([]);
  const [preset, setPreset] = useState<LayoutPreset>(() =>
    preference("aether-io.layout", ["docked", "floating", "canvas"], "floating"),
  );
  const [sidebar, setSidebar] = useState<SidebarDesign>(() =>
    preference(
      "aether-io.editor-sidebar.v2",
      ["rail", "tabs-top", "tabs-bottom"],
      "rail",
    ),
  );
  const [history, setHistory] = useState<Project[]>([]),
    [future, setFuture] = useState<Project[]>([]),
    [notice, setNotice] = useState("Ready"),
    [saved, setSaved] = useState(true),
    [bottom, setBottom] = useState("signals");
  const [documentIdentity,setDocumentIdentity]=useState('initial');
  const hosted=location.pathname.startsWith('/io/');
  const persistence=useHostedDocument({app:'io',identity:documentIdentity,text:project?JSON.stringify(project):null,name:`${project?.name??'Untitled circuit'}.aetherio`,onLoad:(text,file)=>{
    const loaded=JSON.parse(text) as Project;
    if(!loaded.id||!Array.isArray(loaded.parts)||!Array.isArray(loaded.wires)||typeof loaded.code!=='string')throw new Error('This is not an Aether IO project.');
    setProject({...loaded,...(file?{hostDocumentID:file.id}:{})});setSelected(loaded.parts[0]?.id??'');setHistory([]);setFuture([]);
  },onSaved:file=>setProject(p=>p&&p.hostDocumentID!==file.id?{...p,hostDocumentID:file.id}:p)});
  const documentConnection=useDocumentConnection({app:'io',id:persistence.file?.id,name:project?.name??'Circuit',writable:persistence.file?.writable,flush:persistence.flush,saveCopy:persistence.saveCopy});
  useEffect(() => {
    const openSettings = (event: Event) => { event.preventDefault(); setSettings(true); };
    document.addEventListener("aether-open-settings", openSettings);
    return () => document.removeEventListener("aether-open-settings", openSettings);
  }, []);
  const isCanvas = ["schematic", "pcb", "wiring"].includes(workspace);
  const part = project?.parts.find((p) => p.id === selected);
  useEffect(() => {
    try {
      localStorage.setItem("aether-io.layout", preset);
      localStorage.setItem("aether-io.editor-sidebar.v2", sidebar);
    } catch {}
  }, [preset, sidebar]);
  useEffect(() => {
    if (!project) return;
    try {
      const next = [
        { ...project, updated: new Date().toISOString() },
        ...readProjects().filter((p) => p.id !== project.id),
      ];
      localStorage.setItem(libraryKey, JSON.stringify(next));
      setProjects(next);
      setSaved(true);
    } catch {
      setSaved(false);
      setNotice(
        "Browser storage is unavailable. Download your project to keep changes.",
      );
    }
  }, [project]);
  const change = (next: Project) => {
    if (!project || next === project) return;
    setHistory((h) => [...h.slice(-39), project]);
    setFuture([]);
    setProject(next);
    setRunning(false);
  };
  const open = (p: Project) => { void (async()=>{
    if(hosted&&project)await persistence.flush();
    const q=new URLSearchParams();if(p.hostDocumentID)q.set('document',p.hostDocumentID);
    window.history.replaceState(null,'',`${location.pathname}?${q}`);setDocumentIdentity(crypto.randomUUID());
    setProject(p);
    setHistory([]);
    setFuture([]);
    setWorkspace(p.name === "Hardware bench" ? "wiring" : "schematic");
    setSelected(p.parts[0]?.id ?? "");
    setRunning(false);
  })().catch(e=>setNotice(e.message)); };
  const undo = () => {
    if (!project || !history.length) return;
    setFuture((f) => [project, ...f]);
    setProject(history[history.length - 1]);
    setHistory((h) => h.slice(0, -1));
    setRunning(false);
  };
  const redo = () => {
    if (!project || !future.length) return;
    setHistory((h) => [...h, project]);
    setProject(future[0]);
    setFuture((f) => f.slice(1));
  };
  useContextCommands([
    { id:'undo', label:'Undo', heading:'Edit', shortcut:'Mod+Z', disabled:!(history.length > 0), run:undo },
    { id:'redo', label:'Redo', shortcut:'Mod+Shift+Z', disabled:!(future.length > 0), run:redo },
  ]);

  const place = (kind: CircuitSymbolKind, pos = { x: 550, y: 490 }) => {
    if (!project || !catalog.some((c) => c.kind === kind)) return;
    const next = addPart(project, kind, pos);
    change(next);
    setSelected(next.parts.at(-1)!.id);
    setNotice("Component placed. Drag to arrange; use Wire to connect pins.");
  };
  const download = () => {
    if (!project) return;
    const url = URL.createObjectURL(
      new Blob([JSON.stringify(project, null, 2)], {
        type: "application/json",
      }),
    );
    const a = document.createElement("a");
    a.href = url;
    a.download = project.name + ".aetherio";
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };
  const command = (id: string) => {
    if (!project) return;
    if (id === "select") setWireMode(false);
    else if (id === "wire") {
      setWireMode(true);
      setNotice("Select a start pin and an end pin.");
    } else if (id === "delete" && part) {
      change(removePart(project, part.id));
      setSelected("");
    } else if (id === "undo") undo();
    else if (id === "redo") redo();
    else if (id === "export") download();
    else if (id === "demo") {
      setRunning((r) => !r);
      setBottom("signals");
      setNotice(
        "Scripted blink preview only — circuit and firmware are not evaluated.",
      );
    } else if (id === "check") {
      setBottom("review");
      setNotice(
        "Connection inventory opened. Electrical rule checking is not connected.",
      );
    } else if (catalog.some((c) => c.kind === id))
      place(id as CircuitSymbolKind);
  };
  const tool = (
    id: string,
    label: string,
    icon: AetherIconName,
    disabled = false,
  ) => ({
    id,
    label,
    icon: <AetherIcon name={icon} />,
    disabled,
    active:
      (id === "wire" && wireMode) ||
      (id === "select" && !wireMode) ||
      (id === "demo" && running),
  });
  const goHome = () => { void (async()=>{if(hosted)await persistence.flush();window.history.replaceState(null,'',location.pathname);setProject(null);setDocumentIdentity(crypto.randomUUID());setRunning(false);})().catch(e=>setNotice(e.message)); };
  const fileActions = <MenuButton label="Document controls" items={[
        { id: "undo", label: "Undo", icon: <AetherIcon name="undo" />, disabled: !history.length },
        { id: "redo", label: "Redo", icon: <AetherIcon name="redo" />, disabled: !future.length },
        { id: "export", label: "Download project", icon: <AetherIcon name="export" />, separatorBefore: true },
        { id: "library", label: "Project library", icon: <AetherIcon name="folder" /> },
        { id: "settings", label: "Settings", icon: <AetherIcon name="settings" />, separatorBefore: true },
        { id: "studio", label: "Aether Studio", icon: <AetherIcon name="aether" /> },
      ]} onSelect={(id) => {
        if (id === "library") goHome();
        else if (id === "settings") setSettings(true);
        else if (id === "studio") location.assign("/");
        else command(id);
      }}><AetherIcon name="menu" /></MenuButton>;
  const header = (
    <DocumentBar className="io-document-bar" application={{ apps: applications, id: "io", name: "Aether IO", onHome: event => { event.preventDefault(); goHome(); }, onSettings: () => setSettings(true) }} documentName={project?.name} viewControls={<>
      <div className="aui-studio-chrome-group">
        <StudioModeButton preset={preset} onChange={setPreset} />
        <SidebarDesignMenu value={sidebar} onChange={setSidebar} />
        <WorkspaceWindowMenu />
      </div>
    </>} />
  );
  const settingsWindow = (
    <SettingsWindow
      open={settings}
      title="Aether IO settings"
      sections={[
        { title: "General", panes: [{ id: "workspace", label: "Workspace" }] },
      ]}
      activePaneID="workspace"
      onSelectPane={() => {}}
      onClose={() => setSettings(false)}
    >
      <SettingsCard title="Workspace">
        <SettingsRow label="Layout">
          <SelectField
            aria-label="Workspace layout"
            value={preset}
            options={["docked", "floating", "canvas"].map((value) => ({
              value,
              label: value,
            }))}
            onChange={(e) => setPreset(e.target.value as LayoutPreset)}
          />
        </SettingsRow>
        <SettingsRow label="Sidebar design">
          <SidebarDesignMenu value={sidebar} onChange={setSidebar} />
        </SettingsRow>
      </SettingsCard>
    </SettingsWindow>
  );
  if (!project)
    return (
      <div className="io-app aui-studio-app">
        <Home
          projects={projects}
          onOpen={open}
          onCreated={created => setProjects(previous => [created, ...previous])}
        />
        {settingsWindow}
      </div>
    );
  const objects = (
    <IOObjects
      project={project}
      selected={selected}
      setSelected={setSelected}
      place={place}
      command={command}
    />
  );
  const library = <IOComponents place={place} />;
  const properties = (
    <IOProperties
      project={project}
      selected={selected}
      change={change}
      command={command}
    />
  );
  const agent = (
    <IOAgent project={project} messages={messages} setMessages={setMessages} />
  );
  return (
    <div className="io-app">
      {header}
      {creatingDocument&&<NewFileDialog title="New circuit" directory="My files" onClose={()=>setCreatingDocument(false)} onCreate={async name=>{
        if(hosted) await persistence.flush();
        open(createProject(name,true));setCreatingDocument(false);
      }}/>}
      <WorkspaceShell
        workspaceControls={<WorkspaceSwitcher workspaces={workspaces} workspaceID={workspace} onSelect={id=>{setWorkspace(id as Workspace);setWireMode(false);setRunning(false);}}/>}
        toolbarSpan="center" pinnedPanels={["objects"]} defaultOpenLeft={["objects"]}
        bottom={<WorkspaceFileBar fileActions={fileActions} tabs={[{id:project.id,label:project.name,status:hosted?(persistence.state.phase==='saved'?'Saved':persistence.state.phase==='saving'||persistence.state.phase==='pending'?'Saving…':persistence.ready?'Not saved':'Opening…'):(saved?'Saved locally':'Unsaved changes'),statusTitle:persistence.state.message,icon:<AetherIcon name="file-circuit"/>}]} activeID={project.id} onSelect={()=>{}} onAdd={()=>setCreatingDocument(true)} addLabel="Create new circuit" trailing={<span className="aui-workspace-file-status" role="status">{notice}</span>}
          manager={{connection:documentConnection,activeID:selected,documentGroups:[{id:"components",label:"Components",items:project.parts.map(part=>({id:part.id,name:`${part.id} · ${part.name}`,kind:"component",detail:part.kind,icon:<CircuitSymbol kind={part.kind}/>}))}],onOpenItem:item=>setSelected(item.id)}}/>}
        contentPresentation={isCanvas ? "canvas" : "framed"}
        preset={preset}
        sidebarVariant={sidebar}
        style={{ flex: 1, minHeight: 0 }}
        defaultPanelState={{
          objects: { placement: "docked" },
          properties: { placement: "docked" },
        }}
        toolbar={
          <WorkspaceRibbon compactTools defaultDensity="compact" workspaceLayout="none"
            workspaceID={workspace}
            workspaces={[]}
            onWorkspaceSelect={(id) => {
              setWorkspace(id as Workspace);
              setWireMode(false);
              setRunning(false);
            }}
            activeTabID="tools"
            onTabSelect={() => {}}
            onCommand={command}
            tabs={[
              {
                id: "tools",
                label:
                  workspace === "firmware"
                    ? "DEVELOP"
                    : isCanvas
                      ? "DESIGN"
                      : "PREPARE",
                groups: !isCanvas
                  ? [
                      {
                        id: "firmware",
                        label: "Project",
                        tools: [
                          tool("export", "Save project", "export"),
                          tool("undo", "Undo", "undo", !history.length),
                          tool("redo", "Redo", "redo", !future.length),
                          ...(workspace === "firmware"
                            ? [
                                {
                                  ...tool("compile", "Compile", "play", true),
                                  disabledReason:
                                    "Compiler integration is not connected.",
                                },
                              ]
                            : []),
                        ],
                      },
                    ]
                  : [
                      {
                        id: "select",
                        label: "Select",
                        tools: [
                          tool("select", "Select", "cursor"),
                          tool("wire", "Wire", "link"),
                        ],
                      },
                      {
                        id: "place",
                        label: "Place",
                        tools: catalog.map((c) => ({
                          id: c.kind,
                          label: c.name,
                          icon: (
                            <CircuitSymbol
                              kind={c.kind}
                              width={24}
                              height={24}
                            />
                          ),
                        })),
                      },
                      {
                        id: "edit",
                        label: "Edit",
                        tools: [
                          tool("undo", "Undo", "undo", !history.length),
                          tool("redo", "Redo", "redo", !future.length),
                          tool("delete", "Delete", "delete", !part),
                        ],
                      },
                      {
                        id: "test",
                        label: "Inspect",
                        tools: [
                          tool("check", "Review", "view"),
                          tool(
                            "demo",
                            running ? "Stop demo" : "Blink demo",
                            "play",
                          ),
                          tool("export", "Export draft", "export"),
                        ],
                      },
                    ],
              },
            ]}
          />
        }
        leftPanels={standardWorkspacePanels([
          {
            id: "objects",
            title: "Objects",
            icon: <AetherIcon name="layers" />,
            collection: true,
            content: objects,
          },
          {
            id: "library",
            title: "Components",
            icon: <AetherIcon name="plus" />,
            content: library,
          },
          {
            id: "agent",
            title: "Aether Agent",
            icon: <AetherIcon name="aether" />,
            content: agent,
          },
        ], { features: "objects", advisor: "agent",  }, documentConnection).filter(panel=>panel.id!=="part-manager")}
        rightPanels={[
          {
            id: "properties",
            title: "Properties",
            icon: <AetherIcon name="settings" />,
            content: properties,
          },
        ]}

      >
        <div className="io-work-area">
          {!isCanvas ? (
            <WorkflowPanels
              workspace={workspace}
              project={project}
              change={change}
              selected={selected}
              onSelect={setSelected}
            />
          ) : (
            <CircuitCanvas
              key={workspace + wireMode}
              project={project}
              workspace={workspace}
              selected={selected}
              onSelect={setSelected}
              wireMode={wireMode}
              running={running}
              onMove={(id, pos) =>
                change({
                  ...project,
                  parts: project.parts.map((p) =>
                    p.id === id
                      ? {
                          ...p,
                          [workspace === "pcb" ? "board" : "position"]: pos,
                        }
                      : p,
                  ),
                })
              }
              onPlace={place}
              onConnect={(a, b) => change(connect(project, a, b))}
            />
          )}
          {isCanvas && (
            <div className="io-bottom">
              <div className="io-bottom-tabs">
                {[
                  ["signals", "Signals"],
                  ["bom", "Components"],
                  ["review", "Review"],
                ].map(([id, label]) => (
                  <Button
                    key={id}
                    aria-pressed={bottom === id}
                    onClick={() => setBottom(id)}
                  >
                    {label}
                  </Button>
                ))}
                <span>
                  {running
                    ? "Scripted demonstration running"
                    : "Design preview"}
                </span>
              </div>
              {bottom === "signals" ? (
                <SignalMonitor
                  caption={
                    running
                      ? "Blink demo · illustrative, not simulated"
                      : "Example signal trace · not measured"
                  }
                  duration="2 s"
                  traces={[
                    {
                      id: "gpio",
                      label: "GPIO2 · example digital output",
                      values: Array.from(
                        { length: 80 },
                        (_, i) => Math.floor(i / 10) % 2,
                      ),
                    },
                    {
                      id: "power",
                      label: "3V3 · example supply",
                      values: [1, 1, 1, 1],
                      color: "var(--aether-color-ok)",
                    },
                  ]}
                />
              ) : bottom === "bom" ? (
                <div className="io-bottom-scroll">
                  <DataTable
                    ariaLabel="Bill of materials"
                    rows={project.parts}
                    rowID={(p) => p.id}
                    selectedIDs={new Set([selected])}
                    onSelect={(ids) => setSelected(ids[0] ?? "")}
                    columns={[
                      { id: "id", header: "Ref", cell: (p) => p.id },
                      { id: "name", header: "Component", cell: (p) => p.name },
                      { id: "value", header: "Value", cell: (p) => p.value },
                    ]}
                  />
                </div>
              ) : (
                <div className="io-review">
                  <strong>Connection inventory</strong>
                  <p>
                    {project.parts.length} components · {project.wires.length}{" "}
                    saved connections. Electrical rule checking and board
                    manufacturability checks are not yet available.
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </WorkspaceShell>
      {settingsWindow}
    </div>
  );
}
