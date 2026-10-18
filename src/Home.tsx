import { IO_UPDATES } from "./IOUpdates";
import { documentRequest, encodeDocument, type HostedDocument } from '@aether/session/documents';
import {
  ApplicationListHeading,
  ApplicationListControls,
  AetherIcon,
  FileIcon,
  NewFileDialog,
  ApplicationFileTable,
  Breadcrumbs,
  fileTypeDefinition,
  ApplicationWelcome,
  Button,
  ApplicationSidebar,
  TextField,
  ApplicationHomeFrame,
  ApplicationHomeHeader,
  type LaunchableApp,
  CircuitSymbol,
  type CircuitSymbolKind,
} from "@aether/ui";
import { useEffect, useState } from "react";
import artwork from "@aether/assets/branding/new-aether-2026-09/aether-io.webp";
import hero from "@aether/assets/branding/new-aether-2026-09/aether-io-hero.webp";
import { libraryKey, type Project } from "./model";
import { createDocument } from "./create-document";
type LibraryEntry = HostedDocument & {kind: 'file' | 'folder'; modified: number; owner: string};
export function Home({
  projects,
  onOpen,
  onCreated,
}: {
  projects: Project[];
  onOpen: (p: Project) => void;
  onCreated: (project: Project) => void;
}) {
  const [creating, setCreating] = useState<{blank: boolean} | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [folders, setFolders] = useState<LibraryEntry[]>([]);
  const parent = folders.at(-1)?.id ?? null;
  const [query, setQuery] = useState("");
  const [view, setView] = useState<"home" | "files">("home");
  const [serverFiles,setServerFiles]=useState<LibraryEntry[]>([]),[serverError,setServerError]=useState('');
  const hosted=location.pathname.startsWith('/io/');
  useEffect(()=>{if(!hosted)return;let live=true;void documentRequest<{files:LibraryEntry[]}>('io','list',{view:'personal',parent}).then(result=>{if(live)setServerFiles(result.files);}).catch(e=>{if(live)setServerError(e.message);});return()=>{live=false;};},[hosted,parent]);
  const [apps, setApps] = useState<LaunchableApp[]>([]);
  useEffect(() => {
    const controller = new AbortController();
    void fetch("/api/status", { signal: controller.signal }).then(async (response) => {
      if (!response.ok) return;
      const status = await response.json();
      setApps((status.apps ?? []).filter((app: { enabled: boolean }) => app.enabled)
        .map((app: LaunchableApp & { installed: boolean }) => ({ ...app, comingSoon: !app.installed })));
    }).catch(() => {});
    return () => controller.abort();
  }, []);
  const combined=[...serverFiles.filter(f => f.kind !== 'folder').map(f=>projects.find(p=>p.hostDocumentID===f.id)??{id:f.id,hostDocumentID:f.id,name:f.name.replace(/\.aetherio$/i,''),parts:[],wires:[],code:'',updated:new Date(f.modified * 1000).toISOString()}),...projects.filter(p=>!p.hostDocumentID && !parent)];
  const shown = combined.filter((p) => p.name.toLowerCase().includes(query.toLowerCase()));
  const rows = [
    ...serverFiles.filter(f => f.kind === 'folder' && f.name.toLowerCase().includes(query.toLowerCase())).map(f => ({id:f.id,name:f.name,folder:f,project:null as Project|null,icon:<FileIcon file={{name:f.name,kind:'folder'}} size={24}/>,location:'My files',date:new Date(f.modified * 1000).toLocaleDateString(),owner:f.owner})),
    ...shown.map(p => ({id:p.id,name:`${p.name}.aetherio`,folder:null as LibraryEntry|null,project:p,icon:<FileIcon type={fileTypeDefinition('circuit')} size={24}/>,location:p.hostDocumentID?'My files':'Local files',date:p.updated?new Date(p.updated).toLocaleDateString():'—',owner:'You'})),
  ];
  const openRow = (row: typeof rows[number]) => {
    if (row.folder) { setFolders(previous => [...previous,row.folder!]); setView('files'); setSelected(new Set()); setQuery(''); }
    else if (row.project) onOpen(row.project);
  };
  const templates: {
    name: string;
    description: string;
    kind: CircuitSymbolKind;
    blank?: boolean;
  }[] = [
    {
      name: "ESP32 status indicator",
      description:
        "A connected starter circuit. Explore power, control and an LED output.",
      kind: "mcu",
    },
    {
      name: "Blank circuit",
      description:
        "Start with a clean sheet. Place components and build your connections.",
      kind: "resistor",
      blank: true,
    },
    {
      name: "Hardware bench",
      description:
        "Arrange a controller, power supply and peripherals in the wiring workspace.",
      kind: "connector",
    },
  ];
  return (
    <ApplicationHomeFrame design="studio" className="io-home" layout="header">
      {creating && <NewFileDialog title="New circuit" directory={folders.at(-1)?.name ?? "My files"} onClose={() => setCreating(null)} onCreate={async name => {
        const file = createDocument(name, creating.blank);
        const text = await file.text();
        const project = JSON.parse(text) as Project;
        if (hosted) {
          const stored = await documentRequest<LibraryEntry>('io', 'create', {name: file.name, scope: 'personal', parent, data_base64: encodeDocument(text)});
          project.hostDocumentID = stored.id;
          setServerFiles(previous => [stored, ...previous]);
        } else localStorage.setItem(libraryKey, JSON.stringify([project, ...projects]));
        onCreated(project); setQuery(''); setView('files'); setSelected(new Set([project.id]));
      }} />}
      <ApplicationHomeHeader design="studio" app="io" name="Aether IO" apps={apps} identity search={
        <TextField aria-label="Search Aether IO files" placeholder="Search files and folders"
          value={query} onChange={(e) => setQuery(e.target.value)} />
      } />
      <ApplicationSidebar brand={false} footer={<></>} settings id="io-home" name="Aether IO" homeUrl="/" apps={apps} currentApp="io" action={<Button primary onClick={()=>setCreating({blank:true})}><AetherIcon name="plus"/>Create new</Button>} sections={[{id:'library',items:[{id:'home',label:'Home',icon:'home',current:view==='home',onSelect:()=>{setView('home');setFolders([]);setSelected(new Set());}},{id:'files',label:'My files',icon:'folder',current:view==='files',onSelect:()=>{setView('files');setFolders([]);setSelected(new Set());}}]}]}/>
      <main>{serverError&&<p role="alert">{serverError}</p>}
        {view === "home" && <>
        <ApplicationWelcome
          id="io"
          updates={IO_UPDATES}
          name="Aether IO"
          description="From your first connection to your next invention. A workspace for circuits, boards and the hardware they bring to life."
          artwork={<img src={artwork} alt="" width={1254} height={1254} />}
          wideArtwork={<img src={hero} alt="" width={1672} height={941} />}
          badge="Electronics · Early preview"
        />
        <section>
          <div className="io-section-heading">
            <div>
              <h2>Get started</h2>
            </div>
            <Button primary onClick={() => setCreating({blank: true})}>
              <AetherIcon name="plus" />
              New project
            </Button>
          </div>
          <div className="io-template-grid">
            {templates.map((t) => (
              <button
                key={t.name}
                className="io-template"
                onClick={() => setCreating({blank: !!t.blank})}
              >
                <CircuitSymbol kind={t.kind} width={90} height={65} />
                <strong>{t.name}</strong>
                <span>{t.description}</span>
                <small>Create file</small>
              </button>
            ))}
          </div>
        </section>
        </>}
        <section>
          {view === "files" && <Breadcrumbs items={[{id:'root',label:'My files'},...folders.map(f=>({id:f.id,label:f.name}))]} onNavigate={id => {setFolders(id==='root'?[]:folders.slice(0,folders.findIndex(f=>f.id===id)+1));setSelected(new Set());setQuery('');}} />}
          <ApplicationListHeading>{view === "home" ? "Recently opened" : "My files"}</ApplicationListHeading>
          <ApplicationListControls search={<input aria-label="Filter files by name" placeholder="Filter by name" value={query} onChange={event=>setQuery(event.target.value)}/>}/>
          <div className="io-project-list">
            <ApplicationFileTable label="Circuit files" dateLabel="Modified" columns={[{id:"type",label:"Type",render:row=>row.folder ? "Folder" : "Circuit"},{id:"modified",label:"Modified",render:row=>row.date},{id:"owner",label:"Owner",render:row=>row.owner}]}
              rows={rows} selectedIds={selected} onSelectedIdsChange={setSelected} onSelect={()=>{}} onOpen={openRow}
              renderActions={row => <Button onClick={() => openRow(row)}>Open</Button>} />
            {rows.length === 0 && (
              <p>
                {query ? "No matching projects. Try another search." : "Your recent work will appear here. Create a project or try the ESP32 starter."}
              </p>
            )}
          </div>
        </section>
        <p className="io-local-note">
          {hosted ? 'Files are saved in Aether Drive.' : 'Files are saved on this browser.'} Circuit analysis,
          firmware execution and manufacturing outputs are not connected yet.
        </p>
      </main>
    </ApplicationHomeFrame>
  );
}
