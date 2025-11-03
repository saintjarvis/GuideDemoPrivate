"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";

/**
 * BEACON | FIND Control Dashboard — Enterprise Edition
 * v1.1.0 (Dark mode)
 *
 * Notes:
 * - Private sector demo with billing, invoices, contracts, service records
 * - Source explorer, linked/manual attributes, results matrix + expand, CSV export,
 *   Exception Summary new-tab export wiring.
 */

/********************* TYPES *********************/
interface QueryItem {
    label: string;
    query: string;
    selected: boolean;
}

interface DocHeader {
    vendor: string;
    accountNumber: string;
    amount: string;
    status: string;
    date: string;
    location: string;
}

interface EvidenceLine {
    label: string;
    term: string;
    sentence: string;
}

interface DocResult {
    id: string;
    docName: string;
    header: DocHeader;
    matches: Record<string, boolean>;
    evidence: EvidenceLine[];
    narrativeText: string;
}

interface Results {
    count: number;
    attributes: string[];
    documents: DocResult[];
    sources: string[];
    locations: string[];
}

/********************* THEME *********************/
// function useTheme() {
//     const [theme, setTheme] = useState(
//         typeof window !== 'undefined'
//             ? localStorage.getItem('beacon_theme') || (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
//             : 'light'
//     );
//     useEffect(() => {
//         if (typeof document !== 'undefined') {
//             document.documentElement.classList.toggle('dark', theme === 'dark');
//             localStorage.setItem('beacon_theme', theme);
//         }
//     }, [theme]);
//     return { theme, setTheme } as const;
// }
// function ThemeToggle(){
//     const { theme, setTheme } = useTheme();
//     const [mounted, setMounted] = useState(false);
//
//     useEffect(() => {
//         setMounted(true);
//     }, []);
//
//     return (
//         <button
//             onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
//             className="rounded-xl px-3 py-1 text-sm bg-gray-200 text-gray-800 dark:bg-gray-700 dark:text-gray-100 border border-transparent dark:border-gray-600"
//             title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
//             suppressHydrationWarning
//         >
//             <span suppressHydrationWarning>
//                 {mounted ? (theme === 'dark' ? 'Light mode' : 'Dark mode') : 'Dark mode'}
//             </span>
//         </button>
//     );
// }

/********************* UI PRIMITIVES *********************/
const Card = ({ children, className = "" }: { children: React.ReactNode; className?: string }) => (
    <div className={`rounded-2xl shadow-sm border ${className} bg-white border-gray-200 dark:bg-gray-900 dark:border-gray-800`}>{children}</div>
);
const CardHeader = ({ children }: { children: React.ReactNode }) => <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-800">{children}</div>;
const CardTitle = ({ children }: { children: React.ReactNode }) => <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">{children}</h2>;
const CardContent = ({ children, className = "" }: { children: React.ReactNode; className?: string }) => <div className={`px-4 py-4 ${className} text-gray-800 dark:text-gray-200`}>{children}</div>;
const Button = ({ children, disabled = false, onClick, className = "" }: { children: React.ReactNode; disabled?: boolean; onClick?: () => void; className?: string }) => (
    <button onClick={onClick} disabled={disabled} className={`rounded-2xl px-4 py-2 font-medium shadow-sm border border-transparent disabled:opacity-50 disabled:cursor-not-allowed ${disabled ? "bg-gray-300 text-gray-700 dark:bg-gray-700 dark:text-gray-300" : "bg-blue-700 hover:bg-blue-800 text-white dark:bg-blue-600 dark:hover:bg-blue-700"} ${className}`}>{children}</button>
);
const Input = ({ value, onChange, placeholder, className = "", disabled = false }: { value: string; onChange: (e: React.ChangeEvent<HTMLInputElement>) => void; placeholder?: string; className?: string; disabled?: boolean }) => (
    <input value={value} onChange={onChange} placeholder={placeholder} disabled={disabled} className={`w-full rounded-xl border border-gray-300 dark:border-gray-700 px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 dark:disabled:bg-gray-800 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 ${className}`} />
);
const ProgressBar = ({ value = 0 }: { value?: number }) => (
    <div className="w-full h-3 bg-gray-200 dark:bg-gray-800 rounded-full overflow-hidden"><div className="h-full bg-blue-600 dark:bg-blue-500 transition-all" style={{ width: `${Math.min(100, Math.max(0, value))}%` }} /></div>
);

/********************* DEMO HELPERS *********************/
const ATTRIBUTES_BASE = [
    "Payment Terms","Renewal Date","SLA Compliance","Dispute Flag","Overdue Amount",
    "Service Level","Contract Value","Termination Clause","Billing Cycle","Usage Overage"
];

const VENDORS = ["Acme Supplies","Northwind Traders","Wayne Enterprises","Globex Corp","Stark Industries","Umbrella Corp","Initech","Cyberdyne Systems","Massive Dynamic","Soylent Corp"];
const LOCATIONS = ["Atlanta, GA","Jackson, MS","Nashville, TN","Oklahoma City, OK","Memphis, TN","Birmingham, AL","Little Rock, AR","Louisville, KY"];
const STATUSES = ["Paid","Pending","Overdue","Disputed","In Review","Approved","Rejected"];

function seededRand(seed: number){ let x = Math.imul(1779033703 ^ seed, 3432918353); return function(){ x = Math.imul(x ^ (x >>> 13), 461845907); x = (x ^ (x >>> 16)) >>> 0; return x / 2**32; }; }

function makeHeader(index: number, id: string): DocHeader{
    const r = seededRand(index + 1);
    const vendor = VENDORS[Math.floor(r()*VENDORS.length)];
    const accountNumber = `ACC-${100000 + Math.floor(r()*899999)}`;
    const amount = `$${(Math.floor(r()*50000) + 100).toLocaleString()}.${Math.floor(r()*100).toString().padStart(2,"0")}`;
    const status = STATUSES[Math.floor(r()*STATUSES.length)];
    const location = LOCATIONS[Math.floor(r()*LOCATIONS.length)];
    const y = 2024+Math.floor(r()*2), m=1+Math.floor(r()*12), d=1+Math.floor(r()*28);
    const date=`${y}-${String(m).padStart(2,"0")}-${String(d).padStart(2,"0")}`;
    return { vendor, accountNumber, amount, status, date, location };
}

const EVIDENCE_TEMPLATES: Record<string, string> = {
    "Payment Terms":"Invoice specifies {term} payment terms with net 30 days.",
    "Renewal Date":"Contract renewal scheduled for {term}.",
    "SLA Compliance":"Service level agreement shows {term} compliance rate.",
    "Dispute Flag":"Account marked with {term} dispute status.",
    "Overdue Amount":"Outstanding balance of {term} past due date.",
    "Service Level":"Agreement tier classified as {term}.",
    "Contract Value":"Total contract value estimated at {term}.",
    "Termination Clause":"Document includes {term} termination provision.",
    "Billing Cycle":"Billing processed on {term} cycle.",
    "Usage Overage":"Service usage exceeded baseline by {term}.",
};

const TERM_EXAMPLES: Record<string, string> = {
    "Payment Terms":"net 30",
    "Renewal Date":"2026-03-15",
    "SLA Compliance":"98.5%",
    "Dispute Flag":"active",
    "Overdue Amount":"$2,340.00",
    "Service Level":"Gold",
    "Contract Value":"$125,000",
    "Termination Clause":"30-day notice",
    "Billing Cycle":"monthly",
    "Usage Overage":"15%",
};

const buildEvidenceLine = (label: string): EvidenceLine => {
    const t=EVIDENCE_TEMPLATES[label]||"Document references {term} under {label}.";
    const term=TERM_EXAMPLES[label]||label.toLowerCase();
    return { label, term, sentence: t.replace("{term}",term).replace("{label}",label) };
};

/********************* DATA: SOURCE TREE *********************/
const SOURCE_TREE = [
    { key:"invoices" as const, label:"Invoices", count:1250, children:[{label:"2025",count:640},{label:"2024",count:610}]},
    { key:"contracts" as const, label:"Contracts", count:410, children:[{label:"Active",count:280},{label:"Expired",count:130}]},
    { key:"billing" as const, label:"Billing", count:980, children:[{label:"Current Cycle",count:520},{label:"Past Due",count:120},{label:"Disputed",count:40}]},
    { key:"service" as const, label:"Service Records", count:730, children:[{label:"Install",count:210},{label:"Repair",count:360},{label:"Maintenance",count:160}]},
];

const SOURCE_ATTRIBUTE_PRESETS: Record<string, string[]> = {
    invoices:["Vendor/Customer","PO Reference","Amount","Payment Status","Invoice Date"],
    contracts:["Parties","Renewal Date","Termination Clause","SLA Reference","Jurisdiction"],
    billing:["Account #","Cycle","Usage","Amount Due","Dispute Flag"],
    service:["Request ID","Technician","Type","SLA Compliance","Rating"],
};

// High-level repository locations (for selection in UI)
const LOCATION_CHOICES = [
    "SharePoint",
    "MS Teams",
    "OneDrive",
    "CRM",
    "Billing & Charging System",
    "Operations Support System (OSS)"
];

/********************* COMPONENT ************************/
export default function GuideFindDashboard(){
    const [progress,setProgress]=useState(0); const [running,setRunning]=useState(false); const [docTarget,setDocTarget]=useState(1000);
    const [openNodes,setOpenNodes]=useState({invoices:true,contracts:true,billing:true,service:true});
    const [sourceSelected,setSourceSelected]=useState({invoices:true,contracts:true,billing:true,service:true});
    // Locations selection state
    const [locations,setLocations]=useState<Record<string, boolean>>(()=>{
        const init: Record<string, boolean> = {};
        LOCATION_CHOICES.forEach((k)=>{ init[k]=true; });
        return init;
    });
    // Filters state
    const [filterDateFrom,setFilterDateFrom]=useState("");
    const [filterDateTo,setFilterDateTo]=useState("");
    const [filterCaseOwner,setFilterCaseOwner]=useState("");
    const [filterRegion,setFilterRegion]=useState("");
    const [linkedToSources,setLinkedToSources]=useState(true);
    const [manualQueries,setManualQueries]=useState<QueryItem[]>(ATTRIBUTES_BASE.map(a=>({label:a,query:a,selected:true})));
    const [customAttributes,setCustomAttributes]=useState<QueryItem[]>([]); const [queryOverrides,setQueryOverrides]=useState<Record<string, string>>({}); const [deselected,setDeselected]=useState<Record<string, boolean>>({}); const [newAttr,setNewAttr]=useState("");
    const [results,setResults]=useState<Results | null>(null); const [expanded,setExpanded]=useState<Record<string, boolean>>({});
    const intervalRef=useRef<NodeJS.Timeout | null>(null); const mountedRef=useRef(true);
    useEffect(()=>{
        mountedRef.current=true;
        return ()=>{
            mountedRef.current=false;
            if(intervalRef.current) clearInterval(intervalRef.current);
        };
    },[]);

    const derivedQueries = useMemo(()=>{
        const labels=new Set<string>();
        Object.entries(sourceSelected).forEach(([k,on])=>{ if(!on) return; (SOURCE_ATTRIBUTE_PRESETS[k]||[]).forEach(l=>labels.add(l)); });
        const rows: QueryItem[]=Array.from(labels).map(label=>({label,query:queryOverrides[label]??label,selected:!deselected[label]}));
        const seen=new Set(labels);
        customAttributes.forEach(c=>{ if(!seen.has(c.label)) rows.push({...c});});
        return rows;
    },[sourceSelected,customAttributes,queryOverrides,deselected]);
    const currentQueries = linkedToSources ? derivedQueries : manualQueries;

    const startRun=()=>{
        if(intervalRef.current) clearInterval(intervalRef.current);
        setRunning(true);
        setProgress(0);
        const active=currentQueries.filter(q=>q.selected);
        const activeLabels=active.map(q=>q.label);
        const seededFlag=(label: string, idx: number)=>{ let h=0; for(let i=0;i<label.length;i++) h=(h*31+label.charCodeAt(i))|0; h^=(idx+1)*1103515245; return ((h>>>0)%2)===0; };
        const CASES=10;
        let value=0;

        intervalRef.current=setInterval(()=>{
            value+=10;

            if(!mountedRef.current){
                clearInterval(intervalRef.current!);
                return;
            }

            if(value>=100){
                value=100;
                clearInterval(intervalRef.current!);
                intervalRef.current=null;
                setProgress(value);
                setRunning(false);

                const cases: DocResult[]=Array.from({length:CASES}).map((_,i)=>{
                    const id=`DOC-${1000+i}`;
                    const matches: Record<string, boolean>={};
                    activeLabels.forEach(lbl=>matches[lbl]=seededFlag(lbl,i));
                    const positives=activeLabels.filter(l=>matches[l]);
                    const evidence=positives.map(buildEvidenceLine);
                    const header=makeHeader(i,id);
                    const narrativeText=[
                        `Transaction processed on ${header.date} for ${header.vendor} (Account ${header.accountNumber}) in ${header.location}.`,
                        `Amount: ${header.amount}, Status: ${header.status}.`,
                        evidence.length?evidence.map(e=>e.sentence).join(" "):"No specific attributes were identified in the documentation reviewed.",
                        "Additional details available in source documentation."
                    ].join(" ");
                    return {id,docName:`${header.vendor}-${header.accountNumber}`,header,matches,evidence,narrativeText};
                });
                const sources=Object.entries(sourceSelected).filter(([,v])=>v).map(([k])=>k);
                const selectedLocations = Object.entries(locations).filter(([,v])=>v).map(([k])=>k);
                setResults({count:docTarget,attributes:activeLabels,documents:cases,sources, locations: selectedLocations});
                return;
            }
            setProgress(value);
        },250);
    };

    // CSV helpers
    const buildExceptionSummaryRows=(result: Results | null)=>{
        if(!result) return [];
        return (result.documents||[]).map(c=>{
            const positives=(result.attributes||[]).filter(a=>c.matches[a]);
            if(positives.length===0) return null;
            const evidence=(c.evidence||[]).map(e=>e.sentence).join(" ");
            return {case_id:c.id,name:c.header?.vendor||"",dob:c.header?.date||"",county:c.header?.location||"",caregiver:c.header?.status||"",opened:c.header?.date||"",positive_attributes:positives.join("; "),evidence};
        }).filter(Boolean);
    };
    const toCSV=(rows: Record<string, string>[])=>{
        const headers=["case_id","name","dob","county","caregiver","opened","positive_attributes","evidence"];
        const csvEscape=(v: string)=>{ if(v==null) return ""; const s=String(v); return /[",\n]/.test(s)?'"'+s.replace(/"/g,'""')+'"':s; };
        const lines=[headers.join(",")];
        (rows||[]).forEach(r=>lines.push(headers.map(h=>csvEscape(r[h])).join(",")));
        return lines.join("\n");
    };
    const exportExceptionSummary=()=>{
        const rows=buildExceptionSummaryRows(results)||[];

        // Persist payload + meta so Exception Summary can hydrate
        try{
            localStorage.setItem("beacon_exception_rows", JSON.stringify(rows));
            localStorage.setItem("beacon_exception_meta", JSON.stringify({
                sources: results?.sources || [],
                locations: results?.locations || [],
                runId: Date.now(),
            }));
        }catch{ /* ignore if storage blocked */ }

        // Navigate to the report page
        window.location.href = "/report";
    };

    return (
        <div className="p-6 bg-gray-50 dark:bg-gray-950 min-h-screen">
            {/* Header */}
            <div className="flex items-center justify-between mb-6 p-4 bg-gradient-to-r from-gray-800 to-slate-900 rounded-2xl shadow-md">
                <div className="flex items-center gap-4 text-white">
                    <img src="/beacon.png" alt="Virtus BEACON" className="w-12 h-12" />
                    <div>
                        <h1 className="text-2xl font-bold">Virtus BEACON</h1>
                        <p className="text-xs tracking-wider text-blue-500">MODULAR DECISION SYSTEM</p>
                    </div>
                </div>
            </div>

            {/* Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Sources */}
                <Card>
                    <CardHeader><CardTitle>Source Repositories</CardTitle></CardHeader>
                    <CardContent className="space-y-3">
                        {/* Repository Locations */}
                        <div className="rounded-xl border border-gray-200 dark:border-gray-800 p-3">
                            <div className="flex items-center justify-between mb-2">
                                <div className="text-sm font-medium text-gray-800 dark:text-gray-200">Locations</div>
                                <div className="flex gap-2">
                                    <Button onClick={()=>{ const all: Record<string, boolean> = {}; LOCATION_CHOICES.forEach(k=>all[k]=true); setLocations(all); }}>Select All</Button>
                                    <Button onClick={()=>{ const none: Record<string, boolean> = {}; LOCATION_CHOICES.forEach(k=>none[k]=false); setLocations(none); }}>Clear All</Button>
                                </div>
                            </div>
                            <div className="flex flex-wrap gap-2">
                                {LOCATION_CHOICES.map((loc)=> (
                                    <label key={loc} className={`flex items-center gap-2 px-3 py-1 rounded-full border text-sm ${locations[loc]? 'bg-blue-50 border-blue-200 text-blue-700 dark:bg-blue-900/30 dark:border-blue-800 dark:text-blue-300' : 'bg-white border-gray-200 text-gray-700 dark:bg-gray-800 dark:border-gray-700 dark:text-gray-300'}`}>
                                        <input type="checkbox" checked={locations[loc]} onChange={(e)=>setLocations((p)=>({...p,[loc]:e.target.checked}))} />
                                        {loc}
                                    </label>
                                ))}
                            </div>
                        </div>
                        <div className="flex items-center justify-between">
                            <div className="text-sm text-gray-600 dark:text-gray-300">Choose repositories to include</div>
                            <div className="flex gap-2">
                                <Button onClick={()=>{const all: Record<string, boolean>={}; SOURCE_TREE.forEach(n=>all[n.key]=true); setSourceSelected(all as {invoices: boolean, contracts: boolean, billing: boolean, service: boolean});}}>Select All</Button>
                                <Button onClick={()=>{const none: Record<string, boolean>={}; SOURCE_TREE.forEach(n=>none[n.key]=false); setSourceSelected(none as {invoices: boolean, contracts: boolean, billing: boolean, service: boolean});}}>Clear All</Button>
                            </div>
                        </div>
                        <div className="rounded-xl border border-gray-200 dark:border-gray-800">
                            {SOURCE_TREE.map(node=> (
                                <div key={node.key} className="border-b last:border-b-0 border-gray-200 dark:border-gray-800">
                                    <div className="flex items-center gap-2 px-3 py-2 hover:bg-gray-50 dark:hover:bg-gray-800/60 cursor-pointer" onClick={()=>setOpenNodes(p=>({...p,[node.key]:!p[node.key]}))}>
                                        <input type="checkbox" checked={!!sourceSelected[node.key]} onChange={(e)=>{e.stopPropagation(); setSourceSelected(p=>({...p,[node.key]:e.target.checked}));}} />
                                        <span className="w-5 text-gray-600 dark:text-gray-400">{openNodes[node.key]?"▾":"▸"}</span>
                                        <span className="font-medium text-gray-900 dark:text-gray-100">{node.label}</span>
                                        <span className="ml-auto text-sm text-gray-600 dark:text-gray-300">{node.count.toLocaleString()} items</span>
                                    </div>
                                    {openNodes[node.key] && (
                                        <div className="pl-10 pb-2 space-y-1">
                                            {node.children.map((c,idx)=>(
                                                <div key={idx} className="flex items-center gap-2 px-3 py-1">
                                                    <span className="w-5 text-gray-400">•</span>
                                                    <span className="text-gray-700 dark:text-gray-300">{c.label}</span>
                                                    <span className="ml-auto text-sm text-gray-500 dark:text-gray-400">{c.count.toLocaleString()}</span>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>

                        {/* Filter Section */}
                        <div className="rounded-xl border border-gray-200 dark:border-gray-800 p-3 mt-3">
                            <div className="text-sm font-medium text-gray-800 dark:text-gray-200 mb-3">Filters</div>
                            <div className="space-y-3">
                                {/* Date/Date Range */}
                                <div>
                                    <div className="text-xs text-gray-600 dark:text-gray-400 mb-1">Date Range</div>
                                    <div className="flex items-center gap-2">
                                        <input type="date" value={filterDateFrom} onChange={(e)=>setFilterDateFrom(e.target.value)} className="flex-1 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 px-3 py-1.5 text-sm" placeholder="From" />
                                        <span className="text-gray-500 dark:text-gray-400">to</span>
                                        <input type="date" value={filterDateTo} onChange={(e)=>setFilterDateTo(e.target.value)} className="flex-1 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 px-3 py-1.5 text-sm" placeholder="To" />
                                    </div>
                                </div>

                                {/* Case Owner */}
                                {/*<div>*/}
                                {/*    <div className="text-xs text-gray-600 dark:text-gray-400 mb-1">Case Owner</div>*/}
                                {/*    <input type="text" value={filterCaseOwner} onChange={(e)=>setFilterCaseOwner(e.target.value)} className="w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 px-3 py-1.5 text-sm" placeholder="Enter case owner name" />*/}
                                {/*</div>*/}

                                {/* Location */}
                                <div>
                                    <div className="text-xs text-gray-600 dark:text-gray-400 mb-1">Location/Region</div>
                                    <select value={filterRegion} onChange={(e)=>setFilterRegion(e.target.value)} className="w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 px-3 py-1.5 text-sm">
                                        <option value="">All Regions</option>
                                        {LOCATION_CHOICES.map(county=>(<option key={county} value={county}>{county}</option>))}
                                    </select>
                                </div>

                                {/* Clear Filters Button */}
                                <div className="flex justify-end pt-1">
                                    <button onClick={()=>{setFilterDateFrom(""); setFilterDateTo(""); setFilterCaseOwner(""); setFilterRegion("");}} className="text-xs text-blue-700 dark:text-blue-400 hover:underline">Clear all filters</button>
                                </div>
                            </div>
                        </div>

                        <div className="flex items-center gap-3 pt-3">
                            <span className="text-sm text-gray-700 dark:text-gray-300">Documents to read</span>
                            <select value={docTarget} onChange={(e)=>setDocTarget(parseInt(e.target.value,10))} className="rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 px-3 py-2">
                                {[100,500,1000,2500].map(n=>(<option key={n} value={n}>{n.toLocaleString()}</option>))}
                            </select>
                            <span className="ml-auto text-xs text-gray-600 dark:text-gray-400">Selected: {Object.values(sourceSelected).filter(Boolean).length}/{SOURCE_TREE.length}</span>
                        </div>
                    </CardContent>
                </Card>

                {/* Attributes */}
                <Card>
                    <CardHeader>
                        <div className="flex items-center justify-between">
                            <CardTitle>Attributes to Extract and Activate</CardTitle>
                            <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300"><input type="checkbox" checked={linkedToSources} onChange={(e)=>setLinkedToSources(e.target.checked)} /> Linked to sources</label>
                        </div>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        {linkedToSources && (
                            <div className="flex flex-wrap gap-2">
                                {Object.entries(sourceSelected).filter(([,v])=>v).map(([k])=> (
                                    <span key={k} className="px-3 py-1 rounded-full bg-blue-50 text-blue-700 text-xs border border-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-800">{SOURCE_TREE.find((n)=>n.key===k)?.label||k}</span>
                                ))}
                                {Object.values(sourceSelected).every(v=>!v) && <span className="text-xs text-gray-500 dark:text-gray-400">No sources selected</span>}
                            </div>
                        )}
                        <div className="flex flex-wrap items-center gap-2 mb-2">
                            {linkedToSources ? (<>
                                <Button onClick={()=>{const upd: Record<string, boolean>={}; currentQueries.forEach(q=>upd[q.label]=false); setDeselected(upd);}}>Select All</Button>
                                <Button onClick={()=>{const upd: Record<string, boolean>={}; currentQueries.forEach(q=>upd[q.label]=true); setDeselected(upd);}}>Clear All</Button>
                            </>) : (<>
                                <Button onClick={()=>setManualQueries(prev=>prev.map(q=>({...q,selected:true})))}>Select All</Button>
                                <Button onClick={()=>setManualQueries(prev=>prev.map(q=>({...q,selected:false})))}>Clear All</Button>
                            </>)}
                            <span className="text-sm text-gray-600 dark:text-gray-300">Selected: {currentQueries.filter(q=>q.selected).length}/{currentQueries.length}</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <Input value={newAttr} onChange={(e)=>setNewAttr(e.target.value)} placeholder="Add custom attribute (e.g., Hearing Venue)" className="flex-1" />
                            <Button onClick={()=>{ const label=newAttr.trim(); if(!label) return; const exists=currentQueries.some(q=>q.label.toLowerCase()===label.toLowerCase()); if(exists) return; if(linkedToSources) setCustomAttributes(p=>[...p,{label,query:label,selected:true}]); else setManualQueries(p=>[...p,{label,query:label,selected:true}]); setNewAttr(""); }}>Add</Button>
                        </div>
                        <div className="space-y-2 max-h-[800px] overflow-auto pr-2">
                            {currentQueries.map((q,i)=> (
                                <div key={q.label+i} className="grid grid-cols-12 items-center gap-2">
                                    <div className="col-span-1 flex justify-center"><input type="checkbox" checked={q.selected} onChange={(e)=>{ if(linkedToSources) setDeselected(p=>({...p,[q.label]:!e.target.checked})); else setManualQueries(prev=>{const c=[...prev]; c[i]={...c[i],selected:e.target.checked}; return c;}); }} /></div>
                                    <div className="col-span-4 text-sm font-medium text-gray-800 dark:text-gray-200 truncate">{q.label}</div>
                                    <div className="col-span-7"><Input value={q.query} onChange={(e)=>{ const v=e.target.value; if(linkedToSources) setQueryOverrides(p=>({...p,[q.label]:v})); else setManualQueries(prev=>{const c=[...prev]; c[i]={...c[i],query:v}; return c;}); }} placeholder={`Query for ${q.label}`} /></div>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Actions */}
            <div className="mt-8 flex flex-col items-center gap-4">
                <div className="flex items-center gap-3">
                    <Button onClick={startRun} disabled={running} className="px-8 py-2 text-lg">{running?"Running...":"Run FIND"}</Button>
                </div>
                {running && (<div className="w-full max-w-3xl"><ProgressBar value={progress} /><div className="mt-1 text-center text-sm text-gray-600 dark:text-gray-300">Processing {docTarget.toLocaleString()} documents… {progress}%</div></div>)}
                {!running && progress===100 && (<p className="text-green-700 dark:text-green-400 font-medium">FIND complete. Results ready.</p>)}
            </div>

            {/* Results */}
            {results && (
                <Card className="mt-8">
                    <CardHeader><CardTitle>Results — Documents × Attributes</CardTitle></CardHeader>
                    <CardContent>
                        <div className="text-sm text-gray-600 dark:text-gray-300 mb-3 flex flex-wrap items-center gap-2">
                            <span>Searched <span className="font-semibold">{results.count.toLocaleString()}</span> docs; showing <span className="font-semibold">{results.documents.length}</span> documents × <span className="font-semibold">{results.attributes.length}</span> attrs.</span>
                            {results.sources?.length>0 && (<span className="flex items-center gap-2"><span className="text-gray-400">|</span>Sources:{results.sources.map(s=> (<span key={s} className="px-2 py-0.5 rounded-full bg-gray-100 text-gray-800 border dark:bg-gray-800 dark:text-gray-200 dark:border-gray-700">{SOURCE_TREE.find((n)=>n.key===s)?.label||s}</span>))}</span>)}
                            <span className="flex items-center gap-2"><span className="text-gray-400">|</span>Locations:{(results.locations||[]).map(l => (<span key={l} className="px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 text-xs border border-indigo-200 dark:bg-indigo-900/30 dark:text-indigo-300 dark:border-indigo-800">{l}</span>))}
                                <span className="text-gray-400">|</span>
                Legend:<span className="px-2 py-0.5 rounded-full bg-green-100 text-green-800 text-xs border border-green-200 dark:bg-green-900/30 dark:text-green-300 dark:border-green-800">Yes</span><span className="px-2 py-0.5 rounded-full bg-gray-100 text-gray-800 text-xs border dark:bg-gray-800 dark:text-gray-200 dark:border-gray-700">No</span></span>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="min-w-full text-left text-sm">
                                <thead><tr className="border-b bg-gray-50 dark:bg-gray-800 dark:border-gray-700"><th className="py-2 px-3 sticky left-0 bg-gray-50 dark:bg-gray-800 z-10">Document</th>{results.attributes.map(attr=>(<th key={attr} className="py-2 px-3 whitespace-nowrap">{attr}</th>))}<th className="py-2 px-3">Details</th></tr></thead>
                                <tbody>
                                {results.documents.map(doc=> (
                                    <React.Fragment key={doc.id}>
                                        <tr className="border-b last:border-0 border-gray-200 dark:border-gray-800">
                                            <td className="py-2 px-3 font-medium text-gray-900 dark:text-gray-100 sticky left-0 bg-white dark:bg-gray-900 z-10">{doc.id}</td>
                                            {results.attributes.map(attr=>{ const v=doc.matches[attr]; return (<td key={attr} className="py-2 px-3"><span className={`px-2 py-0.5 rounded-full text-xs border ${v?"bg-green-100 text-green-800 border-green-200 dark:bg-green-900/30 dark:text-green-300 dark:border-green-800":"bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200 dark:border-gray-700"}`}>{v?"Yes":"No"}</span></td>); })}
                                            <td className="py-2 px-3"><button className="text-blue-700 dark:text-blue-400 hover:underline" onClick={()=>setExpanded(p=>({...p,[doc.id]:!p[doc.id]}))}>{expanded[doc.id]?"Hide":"View"}</button></td>
                                        </tr>
                                        {expanded[doc.id] && (
                                            <tr><td colSpan={results.attributes.length+2} className="bg-gray-50 dark:bg-gray-800"><div className="p-3 space-y-4">
                                                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                                    <div><div className="text-xs uppercase text-gray-500 dark:text-gray-400">Document Name</div><div className="font-medium text-gray-900 dark:text-gray-100">{doc.docName}</div></div>
                                                    <div><div className="text-xs uppercase text-gray-500 dark:text-gray-400">Vendor/Customer</div><div className="font-medium text-gray-900 dark:text-gray-100">{doc.header.vendor}</div></div>
                                                    <div><div className="text-xs uppercase text-gray-500 dark:text-gray-400">Account #</div><div>{doc.header.accountNumber}</div></div>
                                                    <div><div className="text-xs uppercase text-gray-500 dark:text-gray-400">Amount</div><div>{doc.header.amount}</div></div>
                                                    <div><div className="text-xs uppercase text-gray-500 dark:text-gray-400">Status</div><div>{doc.header.status}</div></div>
                                                    <div><div className="text-xs uppercase text-gray-500 dark:text-gray-400">Date</div><div>{doc.header.date}</div></div>
                                                    <div><div className="text-xs uppercase text-gray-500 dark:text-gray-400">Location</div><div>{doc.header.location}</div></div>
                                                </div>
                                                <div className="text-sm"><div className="text-xs uppercase text-gray-500 dark:text-gray-400 mb-1">Positive Flags</div><div className="flex flex-wrap gap-2">{results.attributes.filter(a=>doc.matches[a]).map(a=>(<span key={a} className="px-2 py-0.5 rounded-full bg-green-100 text-green-800 text-xs border border-green-200 dark:bg-green-900/30 dark:text-green-300 dark:border-green-800">{a}</span>))}{results.attributes.every(a=>!doc.matches[a]) && (<span className="text-xs text-gray-500 dark:text-gray-400">None</span>)}</div></div>
                                                <div><div className="text-sm font-medium">Document Summary</div><p className="mt-1 text-gray-800 dark:text-gray-200 leading-relaxed">{doc.narrativeText}</p></div>
                                            </div></td></tr>
                                        )}
                                    </React.Fragment>
                                ))}
                                </tbody>
                            </table>
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Export footer */}
            <div className="mt-10 flex flex-col items-center gap-2">
                <Button onClick={exportExceptionSummary} disabled={!results || buildExceptionSummaryRows(results).length===0} className="px-6 py-2">View Exception Report Summary</Button>
                {!results && <div className="text-xs text-gray-500 dark:text-gray-400">Run FIND to enable export.</div>}
                {results && buildExceptionSummaryRows(results).length===0 && (<div className="text-xs text-gray-500 dark:text-gray-400">No positive flags to export yet.</div>)}
            </div>
        </div>
    );
}
