import { useState } from 'react';
import {
    BrainCircuit,
    Braces,
    ClipboardList,
    Clock,
    Database,
    FileSpreadsheet,
    FileText,
    Search,
    ShieldCheck,
    Table2,
    type LucideIcon,
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { jsPDF } from 'jspdf';

type DatasetRow = Record<string, unknown>;
type Cell = string | number;

type Row = {
    idx: number;
    id: string;
    name: string;
    hazard: string;
    risk: string;
    flight: number | null;
    bmd: number | null;
    dose: number | null;
    agency: string;
    gender: string;
    raw: DatasetRow;
};

type Report = {
    id: string;
    title: string;
    icon: LucideIcon;
    summary: string;
    stats: { label: string; value: string }[];
    headers: string[];
    rows: Cell[][];
};

/* EDIT HERE: column names are matched ignoring case, spaces and symbols. */
const ALIASES = {
    id: ['astronaut', 'astronautid', 'id'],
    name: ['name', 'astronautname', 'callsign', 'crewmember'],
    hazard: ['primaryhazard', 'hazard', 'hazardcode', 'ridge'],
    risk: ['risklevel', 'risk', 'severity'],
    flight: ['flightduration', 'flightdays', 'duration', 'missionduration'],
    bmd: ['bmdloss', 'bmdlossg', 'bmd'],
    dose: ['dosimetry', 'dosimetryr', 'dose', 'radiationdose'],
    agency: ['agency', 'affiliation', 'affiliationagency', 'nation'],
    gender: ['gender', 'sex'],
};

const HAZARDS = [
    { code: 'R', id: 'HAZ-01', title: 'Space Radiation', first: 'space', level: 'CRITICAL', desc: 'Invisible ionizing particle flux beyond Earth’s protective magnetosphere' },
    { code: 'I', id: 'HAZ-02', title: 'Isolation and Confinement', first: 'isolation', level: 'HIGH', desc: 'Psychological and circadian strain of living in cramped habitats with small crews' },
    { code: 'D', id: 'HAZ-03', title: 'Distance from Earth', first: 'distance', level: 'CRITICAL', desc: 'Extreme distance, communication time delay, and the requirement for clinical autonomy' },
    { code: 'G', id: 'HAZ-04', title: 'Gravity Fields (Altered Gravity)', first: 'gravity', level: 'CRITICAL', desc: 'Transitions between 0g weightlessness, Moon 1/6g, Mars 3/8g, and Earth 1g' },
    { code: 'E', id: 'HAZ-05', title: 'Hostile and Closed Environments', first: 'hostile', level: 'HIGH', desc: 'Hermetic life support ecology, recycled air/water, altered microbiome, and toxic regolith' },
];

const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '');
const round1 = (n: number) => Math.round(n * 10) / 10;
const avg = (a: number[]) => (a.length ? a.reduce((x, y) => x + y, 0) / a.length : 0);

const pick = (row: DatasetRow, aliases: string[]): unknown => {
    for (const k of Object.keys(row)) if (aliases.includes(norm(k))) return row[k];
    return undefined;
};
const text = (row: DatasetRow, aliases: string[]) => {
    const v = pick(row, aliases);
    return v == null ? '' : String(v);
};
const num = (row: DatasetRow, aliases: string[]): number | null => {
    const v = pick(row, aliases);
    if (v == null || v === '') return null;
    const n = Number(v);
    return Number.isNaN(n) ? null : n;
};

const hazardOf = (value: string) => {
    const n = norm(value);
    if (!n) return undefined;
    return HAZARDS.find((h) => n === norm(h.code) || n.includes(norm(h.id)) || n.includes(h.first));
};

const toRow = (raw: DatasetRow, idx: number): Row => ({
    idx,
    id: text(raw, ALIASES.id) || `Row ${idx + 1}`,
    name: text(raw, ALIASES.name),
    hazard: text(raw, ALIASES.hazard),
    risk: text(raw, ALIASES.risk).toUpperCase(),
    flight: num(raw, ALIASES.flight),
    bmd: num(raw, ALIASES.bmd),
    dose: num(raw, ALIASES.dose),
    agency: text(raw, ALIASES.agency),
    gender: text(raw, ALIASES.gender),
    raw,
});

const isHighRisk = (r: Row) => r.risk.includes('HIGH') || r.risk.includes('CRITICAL');

function buildReports(rows: Row[]): Report[] {
    const total = rows.length;
    const crew = new Set(rows.map((r) => r.id)).size;
    const high = rows.filter(isHighRisk);
    const flights = rows.map((r) => r.flight).filter((v): v is number => v !== null);
    const bmds = rows.map((r) => r.bmd).filter((v): v is number => v !== null);
    const doses = rows.map((r) => r.dose).filter((v): v is number => v !== null);

    const metrics = [
        { label: 'Flight duration (days)', v: flights },
        { label: 'BMD loss (%)', v: bmds },
        { label: 'Dosimetry (mSv)', v: doses },
    ].filter((m) => m.v.length > 0);

    return [
        {
            id: 'summary',
            title: 'Crew Health Summary',
            icon: ClipboardList,
            summary: total === 0
                ? 'No dataset records match the current filters.'
                : `${total} records covering ${crew} crew members were reviewed. ${high.length} records carry a HIGH or CRITICAL risk level and ${total - high.length} are lower risk.`,
            stats: [
                { label: 'Crew members', value: String(crew) },
                { label: 'Lower risk', value: `${total - high.length}/${total}` },
                { label: 'High / critical', value: String(high.length) },
            ],
            headers: ['Hazard', 'Records', 'High / critical'],
            rows: HAZARDS.map((h) => {
                const m = rows.filter((r) => hazardOf(r.hazard)?.id === h.id);
                return [`${h.code} · ${h.title}`, m.length, m.filter(isHighRisk).length];
            }),
        },
        {
            id: 'trend',
            title: 'Trend Analysis',
            icon: FileText,
            summary: metrics.length === 0
                ? 'No numeric metrics were found. Check the column names in ALIASES.'
                : 'Averages: ' + metrics.map((m) => `${m.label.toLowerCase()} ${round1(avg(m.v))}`).join(', ') + '.',
            stats: [
                { label: 'Records', value: String(total) },
                { label: 'Metrics tracked', value: String(metrics.length) },
                { label: 'Max flight (days)', value: flights.length ? String(Math.max(...flights)) : '—' },
            ],
            headers: ['Metric', 'Average', 'Min', 'Max'],
            rows: metrics.map((m) => [m.label, round1(avg(m.v)), Math.min(...m.v), Math.max(...m.v)]),
        },
        {
            id: 'risk',
            title: 'High-Risk Review',
            icon: BrainCircuit,
            summary: high.length === 0
                ? 'No HIGH or CRITICAL records in the current selection.'
                : `${high.length} records are rated HIGH or CRITICAL. These are rule-based flags from the dataset, not diagnoses.`,
            stats: [
                { label: 'Flagged records', value: String(high.length) },
                { label: 'Crew affected', value: String(new Set(high.map((r) => r.id)).size) },
                { label: 'Records checked', value: String(total) },
            ],
            headers: ['Astronaut', 'Name', 'Hazard', 'Risk'],
            rows: high.map((r) => [r.id, r.name, hazardOf(r.hazard)?.title ?? r.hazard, r.risk]),
        },
    ];
}

/* ---------- exports ---------- */
const saveBlob = (blob: Blob, filename: string) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
};

const generated = () =>
    new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

const csvCell = (v: unknown) => {
    const s = v == null ? '' : String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

const exportDataCsv = (raws: DatasetRow[]) => {
    if (raws.length === 0) return;
    const cols = Object.keys(raws[0]);
    const lines = [cols.join(','), ...raws.map((r) => cols.map((c) => csvCell(r[c])).join(','))];
    saveBlob(new Blob([lines.join('\n')], { type: 'text/csv' }), 'dataset-export.csv');
};

const exportDataJson = (raws: DatasetRow[]) =>
    saveBlob(new Blob([JSON.stringify(raws, null, 2)], { type: 'application/json' }), 'dataset-export.json');

const exportDataExcel = (raws: DatasetRow[]) => {
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(raws), 'Dataset');
    XLSX.writeFile(wb, 'dataset-export.xlsx');
};

const exportExcel = (r: Report, raws: DatasetRow[]) => {
    const wb = XLSX.utils.book_new();
    const summary = XLSX.utils.aoa_to_sheet([
        ['Report', r.title],
        ['Generated', generated()],
        [],
        ['Summary', r.summary],
        [],
        ['Metric', 'Value'],
        ...r.stats.map((s) => [s.label, s.value]),
    ]);
    summary['!cols'] = [{ wch: 20 }, { wch: 80 }];
    XLSX.utils.book_append_sheet(wb, summary, 'Summary');
    const details = XLSX.utils.aoa_to_sheet([r.headers, ...r.rows]);
    details['!cols'] = r.headers.map(() => ({ wch: 24 }));
    XLSX.utils.book_append_sheet(wb, details, 'Details');
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(raws), 'Dataset');
    XLSX.writeFile(wb, `${r.id}-report.xlsx`);
};

const exportPdf = (r: Report) => {
    const doc = new jsPDF();
    let y = 20;
    doc.setFontSize(18);
    doc.text(r.title, 14, y);
    y += 8;
    doc.setFontSize(10);
    doc.text(`Generated ${generated()}`, 14, y);
    y += 12;
    doc.setFontSize(12);
    const lines = doc.splitTextToSize(r.summary, 180);
    doc.text(lines, 14, y);
    y += lines.length * 6 + 6;
    r.stats.forEach((s) => {
        doc.text(`${s.label}: ${s.value}`, 14, y);
        y += 7;
    });
    y += 5;
    doc.setFontSize(10);
    doc.text(r.headers.join('  |  '), 14, y);
    y += 6;
    const MAX_ROWS = 40;
    r.rows.slice(0, MAX_ROWS).forEach((row) => {
        if (y > 275) {
            doc.addPage();
            y = 20;
        }
        doc.text(doc.splitTextToSize(row.join('  |  '), 180), 14, y);
        y += 6;
    });
    if (r.rows.length > MAX_ROWS) {
        doc.text(`... and ${r.rows.length - MAX_ROWS} more rows (see the Excel export)`, 14, y + 2);
        y += 8;
    }
    if (y > 270) {
        doc.addPage();
        y = 20;
    }
    doc.setFontSize(9);
    doc.text(
        doc.splitTextToSize('AI results are informational alerts for mission-support review. They are not medical diagnoses.', 180),
        14,
        y + 8,
    );
    doc.save(`${r.id}-report.pdf`);
};

const exportJson = (r: Report) => {
    const data = {
        id: r.id,
        title: r.title,
        generated: new Date().toISOString(),
        summary: r.summary,
        stats: Object.fromEntries(r.stats.map((s) => [s.label, s.value])),
        details: r.rows.map((row) => Object.fromEntries(r.headers.map((h, i) => [h, row[i]]))),
    };
    saveBlob(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }), `${r.id}-report.json`);
};

/* ---------- page ---------- */
type SortKey = 'id' | 'name' | 'hazard' | 'risk' | 'flight' | 'bmd' | 'dose' | 'agency';

const riskClass = (risk: string) =>
    risk.includes('CRITICAL')
        ? 'border-red-500/50 bg-red-500/10 text-red-400'
        : risk.includes('HIGH')
          ? 'border-amber-400/50 bg-amber-400/10 text-amber-300'
          : risk.includes('MOD')
            ? 'border-yellow-300/40 bg-yellow-300/10 text-yellow-200'
            : 'border-emerald-400/40 bg-emerald-400/10 text-emerald-300';

export default function Reports({ records = [] }: { records?: DatasetRow[] }) {
    const [selectedId, setSelectedId] = useState('summary');
    const [search, setSearch] = useState('');
    const [hazardFilter, setHazardFilter] = useState('all');
    const [gender, setGender] = useState('all');
    const [agency, setAgency] = useState('all');
    const [sortKey, setSortKey] = useState<SortKey>('id');
    const [sortAsc, setSortAsc] = useState(true);
    const [checked, setChecked] = useState<Set<number>>(new Set());
    const [limit, setLimit] = useState(25);

    const all = records.map(toRow);
    const genders = [...new Set(all.map((r) => r.gender).filter(Boolean))];
    const agencies = [...new Set(all.map((r) => r.agency).filter(Boolean))];

    const filtered = all
        .filter((r) => {
            if (hazardFilter !== 'all' && hazardOf(r.hazard)?.id !== hazardFilter) return false;
            if (gender !== 'all' && r.gender !== gender) return false;
            if (agency !== 'all' && r.agency !== agency) return false;
            const q = search.trim().toLowerCase();
            if (q && !`${r.id} ${r.name} ${r.hazard} ${r.agency}`.toLowerCase().includes(q)) return false;
            return true;
        })
        .sort((a, b) => {
            const x = a[sortKey];
            const y = b[sortKey];
            if (x === null) return 1;
            if (y === null) return -1;
            const c = typeof x === 'number' && typeof y === 'number' ? x - y : String(x).localeCompare(String(y));
            return sortAsc ? c : -c;
        });

    const reports = buildReports(filtered);
    const selected = reports.find((r) => r.id === selectedId) ?? reports[0];

    // Export the ticked rows, or everything shown if none are ticked
    const exportRows = (checked.size > 0 ? filtered.filter((r) => checked.has(r.idx)) : filtered).map((r) => r.raw);
    const allChecked = filtered.length > 0 && filtered.every((r) => checked.has(r.idx));

    const flights = filtered.map((r) => r.flight).filter((v): v is number => v !== null);
    const bmds = filtered.map((r) => r.bmd).filter((v): v is number => v !== null);
    const doses = filtered.map((r) => r.dose).filter((v): v is number => v !== null);

    const toggleSort = (k: SortKey) => {
        if (k === sortKey) setSortAsc(!sortAsc);
        else {
            setSortKey(k);
            setSortAsc(true);
        }
    };
    const toggleRow = (idx: number) => {
        const next = new Set(checked);
        if (next.has(idx)) next.delete(idx);
        else next.add(idx);
        setChecked(next);
    };
    const resetFilters = () => {
        setSearch('');
        setHazardFilter('all');
        setGender('all');
        setAgency('all');
    };

    const card = 'rounded-2xl border border-slate-800 bg-[#0b1626]';
    const exportBtn =
        'flex items-center justify-center gap-2 rounded-xl border border-slate-700 bg-slate-800/50 py-2.5 text-sm font-semibold hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-40';
    const select =
        'rounded-xl border border-slate-700 bg-[#0a1220] px-3 py-2.5 text-sm text-slate-200 outline-none focus:border-cyan-400';
    const noData = filtered.length === 0;

    const stat = (label: string, value: string, sub: string, color = 'text-white') => (
        <div className={`${card} p-5`}>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">{label}</p>
            <p className={`mt-2 text-2xl font-bold ${color}`}>{value}</p>
            <p className="mt-1 text-xs text-slate-500">{sub}</p>
        </div>
    );

    const th = (label: string, k?: SortKey) => (
        <th
            className={`px-3 py-3 font-semibold ${k ? 'cursor-pointer select-none hover:text-cyan-300' : ''}`}
            onClick={k ? () => toggleSort(k) : undefined}
        >
            {label}
            {k && sortKey === k ? (sortAsc ? ' ↑' : ' ↓') : ''}
        </th>
    );

    return (
        <div className="min-h-screen bg-[#060d18] p-8 text-white">
            <div className="flex items-end justify-between">
                <div>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-cyan-400">
                        Health Summaries &amp; Exports
                    </p>
                    <h1 className="mt-1 text-3xl font-bold">Reports</h1>
                </div>
                <p className="flex items-center gap-2 text-xs text-slate-500">
                    <Clock size={14} /> Generated {generated()} · {records.length} dataset records
                </p>
            </div>

            {/* 5 hazards */}
            <div className={`${card} mt-6 p-6`}>
                <h2 className="font-bold">The 5 Hazards of Human Spaceflight</h2>
                <p className="text-sm text-slate-400">Click a hazard to filter the dataset, reports and exports.</p>
                <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-5">
                    {HAZARDS.map((h) => {
                        const active = hazardFilter === h.id;
                        return (
                            <button
                                key={h.id}
                                type="button"
                                onClick={() => setHazardFilter(active ? 'all' : h.id)}
                                className={`rounded-xl border bg-[#0a1220] p-4 text-left transition ${
                                    active ? 'border-cyan-400/70' : 'border-slate-800 hover:border-slate-600'
                                }`}
                            >
                                <div className="flex items-center justify-between">
                                    <span className="flex h-7 w-7 items-center justify-center rounded bg-cyan-400/10 text-sm font-bold text-cyan-300">
                                        {h.code}
                                    </span>
                                    <span className="text-[10px] text-slate-500">{h.id}</span>
                                    <span className={`rounded border px-2 py-0.5 text-[10px] font-bold ${riskClass(h.level)}`}>
                                        {h.level}
                                    </span>
                                </div>
                                <h3 className="mt-3 text-sm font-bold">{h.title}</h3>
                                <p className="mt-1 text-xs leading-relaxed text-slate-500">{h.desc}</p>
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* Stats */}
            <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-6">
                {stat('Cohort size', String(new Set(filtered.map((r) => r.id)).size), 'Astronaut records')}
                {stat('Mean flight', flights.length ? String(round1(avg(flights))) : '—', 'Days')}
                {stat('Mean BMD loss', bmds.length ? `${round1(avg(bmds))}%` : '—', 'Demineralization', 'text-red-400')}
                {stat('Mean dosimetry', doses.length ? String(round1(avg(doses))) : '—', 'mSv absorbed', 'text-amber-300')}
                {stat('Agencies', String(new Set(filtered.map((r) => r.agency).filter(Boolean)).size), 'Partners')}
                {stat('Selected data', String(checked.size), 'Rows ready for export', 'text-cyan-300')}
            </div>

            {/* Filters + dataset table */}
            <div className={`${card} mt-6 p-6`}>
                <div className="flex flex-wrap items-center gap-3">
                    <div className="relative min-w-[240px] flex-1">
                        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                        <input
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder="Search astronaut, hazard, callsign, agency..."
                            className="w-full rounded-xl border border-slate-700 bg-[#0a1220] py-2.5 pl-9 pr-3 text-sm outline-none placeholder:text-slate-600 focus:border-cyan-400"
                        />
                    </div>
                    <select value={hazardFilter} onChange={(e) => setHazardFilter(e.target.value)} className={select}>
                        <option value="all">All 5 hazards</option>
                        {HAZARDS.map((h) => (
                            <option key={h.id} value={h.id}>{h.title}</option>
                        ))}
                    </select>
                    <select value={gender} onChange={(e) => setGender(e.target.value)} className={select}>
                        <option value="all">Gender: all</option>
                        {genders.map((g) => (
                            <option key={g} value={g}>{g}</option>
                        ))}
                    </select>
                    <select value={agency} onChange={(e) => setAgency(e.target.value)} className={select}>
                        <option value="all">Agency: all</option>
                        {agencies.map((a) => (
                            <option key={a} value={a}>{a}</option>
                        ))}
                    </select>
                    <span className="rounded-xl border border-slate-700 px-3 py-2.5 text-sm text-slate-300">
                        Showing: {filtered.length} / {records.length}
                    </span>
                </div>

                {/* Table export */}
                <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                    <p className="flex items-center gap-2 text-xs text-slate-500">
                        <Table2 size={14} />
                        Exporting {checked.size > 0 ? `${exportRows.length} selected rows` : `all ${exportRows.length} shown rows`}
                    </p>
                    <div className="flex gap-2">
                        <button type="button" disabled={noData} onClick={() => exportDataCsv(exportRows)} className={`${exportBtn} px-4`}>
                            <FileText size={16} /> CSV
                        </button>
                        <button type="button" disabled={noData} onClick={() => exportDataJson(exportRows)} className={`${exportBtn} px-4`}>
                            <Braces size={16} /> JSON
                        </button>
                        <button type="button" disabled={noData} onClick={() => exportDataExcel(exportRows)} className={`${exportBtn} px-4`}>
                            <FileSpreadsheet size={16} /> Excel
                        </button>
                    </div>
                </div>

                <div className="mt-4 overflow-x-auto rounded-xl border border-slate-800">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-[#0a1220] text-xs uppercase tracking-wider text-cyan-300">
                            <tr>
                                <th className="px-3 py-3">
                                    <input
                                        type="checkbox"
                                        checked={allChecked}
                                        onChange={() => setChecked(allChecked ? new Set() : new Set(filtered.map((r) => r.idx)))}
                                        className="accent-cyan-400"
                                    />
                                </th>
                                {th('Astronaut ID', 'id')}
                                {th('Crew member', 'name')}
                                {th('Primary hazard', 'hazard')}
                                {th('Risk level', 'risk')}
                                {th('Flight (d)', 'flight')}
                                {th('BMD loss', 'bmd')}
                                {th('Dosimetry', 'dose')}
                                {th('Agency', 'agency')}
                            </tr>
                        </thead>
                        <tbody>
                            {filtered.slice(0, limit).map((r) => (
                                <tr key={r.idx} className="border-t border-slate-800/70 text-slate-300 hover:bg-slate-800/30">
                                    <td className="px-3 py-2.5">
                                        <input
                                            type="checkbox"
                                            checked={checked.has(r.idx)}
                                            onChange={() => toggleRow(r.idx)}
                                            className="accent-cyan-400"
                                        />
                                    </td>
                                    <td className="px-3 py-2.5 font-semibold text-cyan-300">{r.id}</td>
                                    <td className="px-3 py-2.5">{r.name}</td>
                                    <td className="px-3 py-2.5">
                                        {hazardOf(r.hazard) ? `${hazardOf(r.hazard)!.code} · ${hazardOf(r.hazard)!.title}` : r.hazard}
                                    </td>
                                    <td className="px-3 py-2.5">
                                        {r.risk && (
                                            <span className={`rounded border px-2 py-0.5 text-[10px] font-bold ${riskClass(r.risk)}`}>
                                                {r.risk}
                                            </span>
                                        )}
                                    </td>
                                    <td className="px-3 py-2.5">{r.flight ?? '—'}</td>
                                    <td className="px-3 py-2.5">{r.bmd ?? '—'}</td>
                                    <td className="px-3 py-2.5">{r.dose ?? '—'}</td>
                                    <td className="px-3 py-2.5">{r.agency}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>

                    {noData && (
                        <div className="flex flex-col items-center gap-3 p-10 text-center text-sm text-slate-400">
                            <Database size={22} className="text-cyan-300" />
                            <p className="font-semibold text-white">No matching records found</p>
                            <p>
                                {records.length === 0
                                    ? 'No dataset records yet. Import a dataset on the /dataset page, then reload.'
                                    : 'No records match the selected filters.'}
                            </p>
                            {records.length > 0 && (
                                <button type="button" onClick={resetFilters} className={`${exportBtn} px-4`}>
                                    Reset all filters
                                </button>
                            )}
                        </div>
                    )}
                </div>

                {filtered.length > limit && (
                    <button type="button" onClick={() => setLimit(limit + 25)} className={`${exportBtn} mx-auto mt-4 px-6`}>
                        Show more ({filtered.length - limit} left)
                    </button>
                )}
            </div>

            {/* Report cards */}
            <div className="mt-6 grid gap-6 md:grid-cols-3">
                {reports.map((r) => {
                    const Icon = r.icon;
                    const active = r.id === selectedId;
                    return (
                        <div
                            key={r.id}
                            onClick={() => setSelectedId(r.id)}
                            className={`${card} cursor-pointer p-6 transition ${
                                active ? 'border-cyan-400/60' : 'hover:border-slate-600'
                            }`}
                        >
                            <div className="flex items-start justify-between">
                                <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-cyan-400/10 text-cyan-300">
                                    <Icon size={20} />
                                </span>
                                <span className="rounded-full border border-cyan-400/40 bg-cyan-400/10 px-3 py-0.5 text-xs font-bold text-cyan-300">
                                    {noData ? 'No data' : 'Ready'}
                                </span>
                            </div>
                            <h3 className="mt-5 font-bold">{r.title}</h3>
                            <p className="text-xs text-slate-500">Generated {generated()}</p>

                            <div className="mt-5 grid grid-cols-3 gap-2">
                                <button type="button" disabled={noData} onClick={(e) => { e.stopPropagation(); exportExcel(r, filtered.map((x) => x.raw)); }} className={exportBtn}>
                                    <FileSpreadsheet size={16} /> Excel
                                </button>
                                <button type="button" disabled={noData} onClick={(e) => { e.stopPropagation(); exportPdf(r); }} className={exportBtn}>
                                    <FileText size={16} /> PDF
                                </button>
                                <button type="button" disabled={noData} onClick={(e) => { e.stopPropagation(); exportJson(r); }} className={exportBtn}>
                                    <Braces size={16} /> JSON
                                </button>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Report preview */}
            <div className={`${card} mt-6 p-6`}>
                <div className="flex items-start justify-between">
                    <div>
                        <h2 className="font-bold">Report preview</h2>
                        <p className="text-sm text-slate-400">
                            {selected.title} · {generated()}
                        </p>
                    </div>
                    <span className="inline-flex items-center gap-2 rounded-full border border-cyan-400/40 bg-cyan-400/10 px-3 py-1 text-xs font-bold text-cyan-300">
                        <Database size={14} /> Dataset-based
                    </span>
                </div>

                <div className="mt-5 grid gap-6 lg:grid-cols-[2fr_1fr]">
                    <div className="rounded-2xl border border-slate-800 bg-[#0a1220] p-6">
                        <h3 className="text-sm font-bold">Executive health summary</h3>
                        <p className="mt-3 text-sm leading-relaxed text-slate-400">{selected.summary}</p>

                        <div className="mt-6 grid grid-cols-3 gap-3">
                            {selected.stats.map((s) => (
                                <div key={s.label} className="rounded-xl bg-slate-800/50 p-4">
                                    <p className="text-xs text-slate-500">{s.label}</p>
                                    <p className="mt-1 text-lg font-bold">{s.value}</p>
                                </div>
                            ))}
                        </div>

                        {selected.rows.length > 0 && (
                            <div className="mt-6 overflow-x-auto">
                                <table className="w-full text-left text-sm">
                                    <thead>
                                        <tr className="border-b border-slate-800 text-xs uppercase text-slate-500">
                                            {selected.headers.map((h) => (
                                                <th key={h} className="px-2 py-2 font-semibold">{h}</th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {selected.rows.slice(0, 10).map((row, i) => (
                                            <tr key={i} className="border-b border-slate-800/60 text-slate-300">
                                                {row.map((cell, j) => (
                                                    <td key={j} className="px-2 py-2">{cell}</td>
                                                ))}
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                                {selected.rows.length > 10 && (
                                    <p className="mt-2 text-xs text-slate-500">
                                        +{selected.rows.length - 10} more rows in the export
                                    </p>
                                )}
                            </div>
                        )}
                    </div>

                    <div className="rounded-2xl border border-slate-800 bg-[#0a1220] p-6">
                        <ShieldCheck size={20} className="text-cyan-300" />
                        <h3 className="mt-4 font-bold">Clinical disclaimer</h3>
                        <p className="mt-2 text-sm leading-relaxed text-slate-400">
                            AI results are informational alerts for mission-support review. They are not
                            medical diagnoses and should not replace assessment by qualified medical personnel.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}