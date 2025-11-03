"use client";

import React, { useMemo, useState, useEffect } from "react";

/**
 * BEACON | Exception Summary Dashboard (v0.4)
 * - Dark mode support + header toggle
 * - Aligned with GUIDE | FIND look/feel
 */

/********************* TYPES *********************/
interface ExceptionRow {
  caseFile: string;
  personId: string;
  exceptionType: string;
  exceptionsCount: number;
  status: string;
  confidence: boolean;
  dateFind: string;
  dateLastReview: string;
  dateProcessed: string;
  details: string;
}

interface ImportMeta {
  sources?: string[];
  locations?: string[];
  runId?: number;
}

/********************* THEME *********************/
// function useTheme() {
//   const [theme, setTheme] = useState(
//     typeof window !== 'undefined'
//       ? localStorage.getItem('beacon_theme') || (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
//       : 'light'
//   );
//   useEffect(() => {
//     if (typeof document !== 'undefined') {
//       document.documentElement.classList.toggle('dark', theme === 'dark');
//       localStorage.setItem('beacon_theme', theme);
//     }
//   }, [theme]);
//   return { theme, setTheme } as const;
// }
//
// // function ThemeToggle(){
// //   const { theme, setTheme } = useTheme();
// //   return (
// //     <button
// //       onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
// //       className="rounded-xl px-3 py-1 text-sm bg-gray-200 text-gray-800 dark:bg-gray-700 dark:text-gray-100 border border-transparent dark:border-gray-600"
// //       title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
// //     >
// //       {theme === 'dark' ? 'Light mode' : 'Dark mode'}
// //     </button>
// //   );
// // }

/********************* UI PRIMITIVES *********************/
const Card = ({ children, className = "" }: { children: React.ReactNode; className?: string }) => (
  <div className={`rounded-2xl shadow-sm border ${className} bg-white border-gray-200 dark:bg-gray-900 dark:border-gray-800`}>{children}</div>
);

const CardHeader = ({ children }: { children: React.ReactNode }) => (
  <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-800">{children}</div>
);

const CardTitle = ({ children }: { children: React.ReactNode }) => (
  <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">{children}</h2>
);

const CardContent = ({ children, className = "" }: { children: React.ReactNode; className?: string }) => (
  <div className={`px-4 py-4 ${className} text-gray-800 dark:text-gray-200`}>{children}</div>
);

const Button = ({ children, disabled = false, onClick, className = "" }: { children: React.ReactNode; disabled?: boolean; onClick?: () => void; className?: string }) => (
  <button
    onClick={onClick}
    disabled={disabled}
    className={`rounded-2xl px-4 py-2 font-medium shadow-sm border border-transparent disabled:opacity-50 disabled:cursor-not-allowed ${
      disabled
        ? "bg-gray-300 text-gray-700 dark:bg-gray-700 dark:text-gray-300"
        : "bg-blue-700 hover:bg-blue-800 text-white dark:bg-blue-600 dark:hover:bg-blue-700"
    } ${className}`}
  >
    {children}
  </button>
);

const Input = ({ value, onChange, placeholder, className = "", disabled = false }: { value: string; onChange: (e: React.ChangeEvent<HTMLInputElement>) => void; placeholder?: string; className?: string; disabled?: boolean }) => (
  <input
    value={value}
    onChange={onChange}
    placeholder={placeholder}
    disabled={disabled}
    className={`w-full rounded-xl px-3 py-2 outline-none border focus:ring-2 focus:ring-blue-500 ${
      disabled ? 'bg-gray-100 dark:bg-gray-800' : 'bg-white dark:bg-gray-800'
    } text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 border-gray-300 dark:border-gray-700 ${className}`}
  />
);

/********************* SAMPLE DATA *********************/
const TYPES = ["Payment Discrepancy","Contract Violation","Billing Error","Data Quality"] as const;
const STATUSES = ["New","In Review","Approved for Update","Complete"] as const;

function makeId(i:number){ return `CASE-${1000+i}`; }
function makePerson(i:number){ return `${Math.floor(1e9 + (i*7919)%9_000_000_000)}`; }
function makeDate(y:number,m:number,d:number){ return `${y}-${String(m).padStart(2,'0')}-${String(d).padStart(2,'0')}`; }

function buildExtraRows(){
  const rows: ExceptionRow[] = [];
  for(let i=4;i<10;i++){
    const caseFile = makeId(i);
    const personId = makePerson(i);
    const exceptionType = TYPES[i % TYPES.length];
    const exceptionsCount = (i % 5) + 1;
    const status = STATUSES[i % STATUSES.length];
    const confidence = (i % 2) === 0; // Random true/false based on index
    const dateFind = makeDate(2025,10, Math.max(1, 10 - (i-3)) );
    const dateLastReview = (i % 2 === 0) ? makeDate(2025,10,10) : "";
    const dateProcessed = (status === "Complete") ? makeDate(2025,10,11) : "";
    const details = (
      exceptionType === "Payment Discrepancy" ? "Multiple payment flags detected in recent transactions; verify and route for reconciliation." :
      exceptionType === "Contract Violation" ? "Contract-related issue identified; confirm terms and update if verified." :
      exceptionType === "Billing Error" ? "Billing discrepancy found in invoice records; confirm amounts and provider." :
      "Record quality or mapping issue detected; needs normalization/mapping review."
    );
    rows.push({ caseFile, personId, exceptionType, exceptionsCount, status, confidence, dateFind, dateLastReview, dateProcessed, details });
  }
  return rows;
}

const BASE_ROWS: ExceptionRow[] = [
  {
    caseFile: "CASE-1000",
    personId: "ACC-123456",
    exceptionType: "Payment Discrepancy",
    exceptionsCount: 4,
    status: "New",
    confidence: true,
    dateFind: "2025-10-09",
    dateLastReview: "",
    dateProcessed: "",
    details: "Payment flags identified across invoices and billing records; requires initial triage.",
  },
  {
    caseFile: "CASE-1001",
    personId: "ACC-234567",
    exceptionType: "Payment Discrepancy",
    exceptionsCount: 4,
    status: "In Review",
    confidence: false,
    dateFind: "2025-10-09",
    dateLastReview: "2025-10-10",
    dateProcessed: "",
    details: "Finance review in progress; awaiting confirmation from contract documentation.",
  },
  {
    caseFile: "CASE-1002",
    personId: "ACC-345678",
    exceptionType: "Contract Violation",
    exceptionsCount: 1,
    status: "Approved for Update",
    confidence: true,
    dateFind: "2025-10-08",
    dateLastReview: "2025-10-10",
    dateProcessed: "",
    details: "Contract breach verified; update to account status approved.",
  },
  {
    caseFile: "CASE-1003",
    personId: "ACC-456789",
    exceptionType: "Billing Error",
    exceptionsCount: 2,
    status: "Complete",
    confidence: false,
    dateFind: "2025-10-01",
    dateLastReview: "2025-10-01",
    dateProcessed: "2025-10-10",
    details: "Billing correction and invoice reconciliation complete; no further action.",
  },
];

const SAMPLE_ROWS = [...BASE_ROWS, ...buildExtraRows()];

/********************* HELPERS *********************/
const fmtDate = (iso: string) => (iso ? new Date(iso).toLocaleDateString() : "");
const fmtBool = (v: boolean) => v ? "True" : "False";

/********************* MAIN COMPONENT *********************/
export default function ExceptionSummaryDashboard() {
  const [query, setQuery] = useState("");
  const [rows, setRows] = useState<ExceptionRow[]>(SAMPLE_ROWS);
  const [importMeta, setImportMeta] = useState<ImportMeta | null>(null);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [statusFilter, setStatusFilter] = useState("All");

  // Hydrate from localStorage (fallback to sessionStorage) if coming from FIND export
  useEffect(() => {
    try {
      const raw = localStorage.getItem("beacon_exception_rows") || sessionStorage.getItem("beacon_exception_rows");
      if (raw) {
        const src = JSON.parse(raw) as Array<{
          case_id: string;
          name?: string;
          dob?: string;
          county?: string;
          caregiver?: string;
          opened?: string;
          positive_attributes?: string;
          evidence?: string;
        }>;
        const mapped: ExceptionRow[] = src.map((r, i) => {
          // Generate varied mock dates for each row
          const now = new Date();
          const daysAgoFind = Math.floor(i * 1.5) + 1; // 1-15 days ago
          const dateFind = new Date(now.getTime() - daysAgoFind * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

          // Some rows have review dates, some don't (50% chance)
          const hasReview = i % 2 === 0;
          const daysAgoReview = Math.floor(i * 0.8); // 0-8 days ago
          const dateLastReview = hasReview ? new Date(now.getTime() - daysAgoReview * 24 * 60 * 60 * 1000).toISOString().slice(0, 10) : "";

          // Only completed items have processed dates (20% chance)
          const isComplete = i % 5 === 0;
          const dateProcessed = isComplete ? new Date(now.getTime() - Math.floor(i * 0.3) * 24 * 60 * 60 * 1000).toISOString().slice(0, 10) : "";

          return {
            caseFile: r.case_id,
            personId: `ACC-${String(100000 + i * 137).slice(0, 6)}`,
            exceptionType: "Payment Discrepancy",
            exceptionsCount: (r.positive_attributes || "").split(";").filter(Boolean).length || 1,
            status: isComplete ? "Complete" : (hasReview ? "In Review" : "New"),
            confidence: Math.random() > 0.5, // Random true/false
            dateFind,
            dateLastReview,
            dateProcessed,
            details: r.evidence || "Flagged attributes found in billing documents.",
          };
        });
        if (mapped.length) setRows(mapped);
      }
      const meta = localStorage.getItem("beacon_exception_meta") || sessionStorage.getItem("beacon_exception_meta");
      if (meta) {
        const m = JSON.parse(meta);
        setImportMeta({ ...m });
      }
    } catch {}
  }, []);

  const filtered = useMemo(() => {
    return rows.filter((r) => {
      const matchesText =
        !query ||
        [r.caseFile, r.personId, r.exceptionType, r.status]
          .join(" ")
          .toLowerCase()
          .includes(query.toLowerCase());
      const matchesStatus = statusFilter === "All" || r.status === statusFilter;
      return matchesText && matchesStatus;
    });
  }, [rows, query, statusFilter]);

  const exportCSV = () => {
    const headers = [
      "Document ID",
      "Account #",
      "Exception Type",
      "Number of Exceptions",
      "Status",
      "Exception vs Source",
      "Date of FIND Assessment",
      "Date of Last Review",
      "Date Processed",
    ];
    const lines = [headers.join(",")];
    filtered.forEach((r) => {
      const vals = [
        r.caseFile,
        r.personId,
        r.exceptionType,
        r.exceptionsCount,
        r.status,
        fmtBool(r.confidence),
        fmtDate(r.dateFind),
        fmtDate(r.dateLastReview),
        fmtDate(r.dateProcessed),
      ].map((v) => {
        const s = String(v ?? "");
        return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
      });
      lines.push(vals.join(","));
    });
    const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `Exception_Summary_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  // Bulk action stubs
  const routeToAccountManager = () => {
    const count = filtered.length;
    alert(`Routed ${count} exception${count !== 1 ? 's' : ''} to Account Manager queue.`);
  };
  const queueForReview = () => {
    const count = filtered.length;
    alert(`Queued ${count} exception${count !== 1 ? 's' : ''} for Finance review.`);
  };
  const processDataSync = () => {
    const count = filtered.length;
    alert(`Initiated data sync for ${count} record${count !== 1 ? 's' : ''}.`);
  };

  return (
    <div className="p-6 bg-gray-50 dark:bg-gray-950 min-h-screen">
      {/* Header */}
      <div className="flex items-center justify-between mb-6 p-4 bg-gradient-to-r from-gray-800 to-slate-900 rounded-2xl shadow-md">
        <div className="flex items-center gap-4">
          <img src="/beacon.png" alt="Virtus BEACON" className="w-12 h-12" />
          <div className="text-white">
            <h1 className="text-2xl font-bold">BEACON | Exception Summary</h1>
            <p className="text-blue-500">Program-facing overview of FIND exceptions</p>
          </div>
        </div>
        {importMeta && (
          <div className="text-xs text-blue-200 text-right">
            Imported from FIND • {new Date().toLocaleString()} {importMeta.sources?.length ? `• Sources: ${importMeta.sources.join(', ')}` : ''}
          </div>
        )}
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div>
            <div className="text-sm text-gray-700 dark:text-gray-300 mb-1">Search</div>
            <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search by Document, Account, Type, Status" />
          </div>
          <div>
            <div className="text-sm text-gray-700 dark:text-gray-300 mb-1">Status</div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 px-3 py-2"
            >
              {['All','New','In Review','Approved for Update','Complete'].map((s) => (
                <option key={s} value={s} className="bg-white dark:bg-gray-800">{s}</option>
              ))}
            </select>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Results</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm text-gray-900 dark:text-gray-200">
              <thead>
                <tr className="border-b bg-gray-50 dark:bg-gray-800 dark:border-gray-700">
                  <th className="py-2 px-3 whitespace-nowrap">Document ID</th>
                  <th className="py-2 px-3 whitespace-nowrap">Account #</th>
                  <th className="py-2 px-3 whitespace-nowrap">Exception Type</th>
                  <th className="py-2 px-3 whitespace-nowrap">Number of Exceptions</th>
                  <th className="py-2 px-3 whitespace-nowrap">Status</th>
                  <th className="py-2 px-3 whitespace-nowrap">Exception vs Source</th>
                  <th className="py-2 px-3 whitespace-nowrap">Date of FIND Assessment</th>
                  <th className="py-2 px-3 whitespace-nowrap">Date of Last Review</th>
                  <th className="py-2 px-3 whitespace-nowrap">Date Processed</th>
                  <th className="py-2 px-3 whitespace-nowrap">Details</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((r) => (
                  <React.Fragment key={r.caseFile}>
                    <tr className="border-b last:border-0 border-gray-200 dark:border-gray-800">
                      <td className="py-2 px-3 font-medium text-gray-900 dark:text-gray-100">{r.caseFile}</td>
                      <td className="py-2 px-3">{r.personId}</td>
                      <td className="py-2 px-3">{r.exceptionType}</td>
                      <td className="py-2 px-3">{r.exceptionsCount}</td>
                      <td className="py-2 px-3">{r.status}</td>
                      <td className="py-2 px-3">{fmtBool(r.confidence)}</td>
                      <td className="py-2 px-3">{fmtDate(r.dateFind)}</td>
                      <td className="py-2 px-3">{fmtDate(r.dateLastReview)}</td>
                      <td className="py-2 px-3">{fmtDate(r.dateProcessed)}</td>
                      <td className="py-2 px-3">
                        <button
                          className="text-blue-700 dark:text-blue-400 hover:underline"
                          onClick={() => setExpanded((p) => ({ ...p, [r.caseFile]: !p[r.caseFile] }))}
                        >
                          {expanded[r.caseFile] ? "Hide" : "View"}
                        </button>
                      </td>
                    </tr>
                    {expanded[r.caseFile] && (
                      <tr>
                        <td colSpan={10} className="bg-gray-50 dark:bg-gray-800">
                          <div className="p-4 grid grid-cols-1 md:grid-cols-3 gap-3">
                            <div>
                              <div className="text-xs uppercase text-gray-500 dark:text-gray-400">Summary</div>
                              <div className="text-gray-800 dark:text-gray-200">{r.details}</div>
                            </div>
                            <div>
                              <div className="text-xs uppercase text-gray-500 dark:text-gray-400">Suggested Action</div>
                              <div className="text-gray-800 dark:text-gray-200">Route to Finance for confirmation and update if verified.</div>
                            </div>
                            <div>
                              <div className="text-xs uppercase text-gray-500 dark:text-gray-400">Lineage / Source</div>
                              <div className="text-gray-800 dark:text-gray-200">Derived from FIND scan across Invoices, Contracts, and Billing Records.</div>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Footer actions */}
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <Button onClick={exportCSV}>Export to .CSV</Button>
        <Button onClick={routeToAccountManager}>Route to Account Manager</Button>
        <Button onClick={queueForReview}>Queue for Review</Button>
        <Button onClick={processDataSync}>Process Data Sync</Button>
        <Button onClick={() => window.location.href = '/'} className="bg-gray-600 hover:bg-gray-700 dark:bg-gray-700 dark:hover:bg-gray-800">Back to FIND</Button>
      </div>
    </div>
  );
}
