import { useState } from 'react';
import {
    BrainCircuit,
    Braces,
    ClipboardList,
    Clock,
    Database,
    FileSpreadsheet,
    FileText,
    ShieldCheck,
    Sparkles,
    LoaderCircle,
    type LucideIcon,
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { jsPDF } from 'jspdf';

type DatasetRow = Record<string, unknown>;
type Cell = string | number;

type Report = {
    id: string;
    title: string;
    icon: LucideIcon;
    summary: string;
    stats: { label: string; value: string }[];
    headers: string[];
    rows: Cell[][];
};

/*
 * EDIT HERE: if your dataset columns have different names, add them to `aliases`.
 * Names are matched ignoring case, spaces and symbols ("Heart Rate" -> "heartrate").
 * `min` and `max` are the expected ranges used to flag anomalies.
 */
const METRICS = [
    { key: 'radiation', label: 'Radiation Exposure', unit: 'mSv', aliases: ['radiationexposure', 'radiation', 'rad', 'radiationrate'], min: 0, max: 100 },
    { key: 'cardioRisk', label: 'Cardiovascular Risk', unit: 'Score (1-10)', aliases: ['cardiovascularriskscore', 'cardiorisk', 'cardiovascularrisk', 'cardiovascular'], min: 1, max: 5 },
    { key: 'immuneSupp', label: 'Immune Suppression', unit: 'Index (1-10)', aliases: ['immuneresponsesuppression', 'immunesuppression', 'immune', 'immunesupp'], min: 1, max: 6 },
    { key: 'psychScore', label: 'Psychological Impact', unit: 'Score (1-10)', aliases: ['psychologicalimpactscore', 'psychologicalimpact', 'psychscore', 'psychology'], min: 1, max: 4 },
    { key: 'boneDensity', label: 'Bone Density Loss', unit: '%', aliases: ['bonedensityloss', 'boneloss', 'bonedensity', 'bmd'], min: -3.5, max: 0 },
    { key: 'muscleLoss', label: 'Muscle Mass Loss', unit: '%', aliases: ['musclemassloss', 'muscleloss', 'musclemass'], min: 0, max: 3.5 },
    { key: 'missionDays', label: 'Mission Duration', unit: 'days', aliases: ['missiondurationdays', 'missionduration', 'duration', 'flightduration'], min: 1, max: 200 },
    { key: 'heartRate', label: 'Heart rate', unit: 'bpm', aliases: ['heartrate', 'hr', 'heartratebpm'], min: 50, max: 110 },
    { key: 'oxygen', label: 'Blood oxygen', unit: '%', aliases: ['bloodoxygen', 'oxygensaturation', 'spo2', 'oxygen'], min: 94, max: 100 },
    { key: 'temp', label: 'Body temperature', unit: '°C', aliases: ['bodytemperature', 'bodytemp', 'coretemperature', 'temperature', 'temp'], min: 36, max: 37.8 },
    { key: 'sleep', label: 'Sleep duration', unit: 'h', aliases: ['sleepduration', 'sleephours', 'sleep'], min: 5, max: 10 },
    { key: 'exercise', label: 'Exercise duration', unit: 'min', aliases: ['exerciseduration', 'exerciseminutes', 'exercise'], min: 0, max: 180 },
];
const ID_ALIASES = ['astronaut', 'astronautid', 'id'];
const NAME_ALIASES = ['name', 'astronautname'];

const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '');
const round1 = (n: number) => Math.round(n * 10) / 10;

const getNum = (row: DatasetRow, aliases: string[]): number | null => {
    for (const k of Object.keys(row)) {
        if (aliases.includes(norm(k))) {
            const raw = row[k];
            if (raw === null || raw === undefined || raw === '') return null;
            if (typeof raw === 'string') {
                const cleaned = raw.replace(/[%]/g, '').trim();
                const n = Number(cleaned);
                return Number.isNaN(n) ? null : n;
            }
            const n = Number(raw);
            return Number.isNaN(n) ? null : n;
        }
    }
    return null;
};

const getText = (row: DatasetRow, aliases: string[]): string => {
    for (const k of Object.keys(row)) {
        if (aliases.includes(norm(k)) && row[k] != null) return String(row[k]);
    }
    return '';
};

// Build the three reports from the dataset
function buildReports(records: DatasetRow[]): Report[] {
    const total = records.length;

    // Only use metrics that actually exist in the dataset
    const active = METRICS.map((m) => ({
        ...m,
        values: records
            .map((r) => getNum(r, m.aliases))
            .filter((v): v is number => v !== null),
    })).filter((m) => m.values.length > 0);

    // Out-of-range readings
    const flags: { astronaut: string; name: string; metric: string; value: number; expected: string }[] = [];
    const flaggedRows = new Set<number>();
    records.forEach((r, i) => {
        active.forEach((m) => {
            const v = getNum(r, m.aliases);
            if (v !== null && (v < m.min || v > m.max)) {
                flags.push({
                    astronaut: getText(r, ID_ALIASES) || `Row ${i + 1}`,
                    name: getText(r, NAME_ALIASES),
                    metric: `${m.label} (${m.unit})`,
                    value: v,
                    expected: `${m.min}–${m.max}`,
                });
                flaggedRows.add(i);
            }
        });
    });

    // Per-astronaut table
    const perAstronaut = new Map<string, { name: string; records: number; flagged: number }>();
    records.forEach((r, i) => {
        const id = getText(r, ID_ALIASES) || `Row ${i + 1}`;
        const entry = perAstronaut.get(id) ?? { name: getText(r, NAME_ALIASES), records: 0, flagged: 0 };
        entry.records += 1;
        if (flaggedRows.has(i)) entry.flagged += 1;
        perAstronaut.set(id, entry);
    });

    const crew = perAstronaut.size;
    const lowRisk = total - flaggedRows.size;

    const dailySummary =
        total === 0
            ? 'No dataset records are available yet.'
            : `${total} dataset records covering ${crew} crew members were reviewed. ${lowRisk} records are within expected ranges and ${flaggedRows.size} have at least one out-of-range reading (${flags.length} readings in total).`;

    const weeklySummary =
        active.length === 0
            ? 'No numeric health metrics were found in the dataset. Check the column names in METRICS.'
            : `Averages across ${total} records: ` +
              active
                  .map((m) => `${m.label.toLowerCase()} ${round1(m.values.reduce((a, b) => a + b, 0) / m.values.length)} ${m.unit}`)
                  .join(', ') +
              '.';

    const anomalySummary =
        flags.length === 0
            ? 'No readings fell outside the expected ranges.'
            : `${flags.length} readings across ${flaggedRows.size} records fell outside the expected ranges. Review them below; these are rule-based flags, not diagnoses.`;

    return [
        {
            id: 'daily',
            title: 'Crew Health Summary',
            icon: ClipboardList,
            summary: dailySummary,
            stats: [
                { label: 'Crew members', value: String(crew) },
                { label: 'Low risk', value: `${lowRisk}/${total}` },
                { label: 'Open alerts', value: String(flags.length) },
            ],
            headers: ['Astronaut', 'Name', 'Records', 'Flagged'],
            rows: [...perAstronaut.entries()].map(([id, e]) => [id, e.name, e.records, e.flagged]),
        },
        {
            id: 'weekly',
            title: 'Trend Analysis',
            icon: FileText,
            summary: weeklySummary,
            stats: [
                { label: 'Records', value: String(total) },
                { label: 'Metrics tracked', value: String(active.length) },
                { label: 'Out-of-range', value: String(flags.length) },
            ],
            headers: ['Metric', 'Average', 'Min', 'Max', 'Expected'],
            rows: active.map((m) => [
                `${m.label} (${m.unit})`,
                round1(m.values.reduce((a, b) => a + b, 0) / m.values.length),
                Math.min(...m.values),
                Math.max(...m.values),
                `${m.min}–${m.max}`,
            ]),
        },
        {
            id: 'anomaly',
            title: 'Anomaly Review',
            icon: BrainCircuit,
            summary: anomalySummary,
            stats: [
                { label: 'Anomalies', value: String(flags.length) },
                { label: 'Records affected', value: String(flaggedRows.size) },
                { label: 'Metrics checked', value: String(active.length) },
            ],
            headers: ['Astronaut', 'Name', 'Metric', 'Value', 'Expected'],
            rows: flags.map((f) => [f.astronaut, f.name, f.metric, f.value, f.expected]),
        },
    ];
}

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

const exportExcel = (r: Report, records: DatasetRow[]) => {
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
    details['!cols'] = r.headers.map(() => ({ wch: 22 }));
    XLSX.utils.book_append_sheet(wb, details, 'Details');

    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(records), 'Dataset');

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
        doc.splitTextToSize(
            'AI results are informational alerts for mission-support review. They are not medical diagnoses.',
            180,
        ),
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

export default function Reports({ records = [] }: { records?: DatasetRow[] }) {
    const [selectedId, setSelectedId] = useState('daily');
    const [aiSummary, setAiSummary] = useState<string | null>(null);
    const [isGeneratingAi, setIsGeneratingAi] = useState(false);

    const reports = buildReports(records);
    const selected = reports.find((r) => r.id === selectedId) ?? reports[0];

    const card = 'rounded-2xl border border-slate-800 bg-[#0b1626]';
    const exportBtn =
        'flex items-center justify-center gap-2 rounded-xl border border-slate-700 bg-slate-800/50 py-2.5 text-sm font-semibold hover:bg-slate-800';
    const PREVIEW_ROWS = 10;

    const handleGenerateGeminiReport = async () => {
        setIsGeneratingAi(true);
        try {
            const customKey = localStorage.getItem('orbit_gemini_api_key') || undefined;
            const customModel = localStorage.getItem('orbit_gemini_model') || 'gemini-3-flash-preview';

            const prompt = `Act as Chief Medical Officer and Flight Surgeon for NASA exploration operations.
Provide an authoritative medical intelligence executive summary for the active astronaut cohort report:
Report Title: ${selected.title}
Cohort Statistics: ${selected.stats.map((s) => `${s.label}: ${s.value}`).join(' | ')}
Summary: ${selected.summary}
Provide clinical spaceflight findings, RIDGE hazard impact evaluation, and flight surgeon recommendations in 2 concise paragraphs.`;

            const res = await fetch('/api/ai/chat', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Accept: 'application/json',
                    ...(customKey ? { 'X-Gemini-Key': customKey } : {}),
                    'X-Gemini-Model': customModel,
                },
                body: JSON.stringify({
                    message: prompt,
                    gemini_api_key: customKey,
                    gemini_model: customModel,
                }),
            });

            const data = await res.json();
            if (data.success && data.reply) {
                setAiSummary(data.reply);
            }
        } catch {
            // fallback
        } finally {
            setIsGeneratingAi(false);
        }
    };

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

            {records.length === 0 && (
                <div className={`${card} mt-6 flex items-center gap-3 p-6 text-sm text-slate-400`}>
                    <Database size={18} className="text-cyan-300" />
                    No dataset records found. Import a dataset first, then reload this page.
                </div>
            )}

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
                                    {records.length === 0 ? 'No data' : 'Ready'}
                                </span>
                            </div>
                            <h3 className="mt-5 font-bold">{r.title}</h3>
                            <p className="text-xs text-slate-500">Generated {generated()}</p>

                            <div className="mt-5 grid grid-cols-3 gap-2">
                                <button
                                    type="button"
                                    disabled={records.length === 0}
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        exportExcel(r, records);
                                    }}
                                    className={`${exportBtn} disabled:cursor-not-allowed disabled:opacity-40`}
                                >
                                    <FileSpreadsheet size={16} /> Excel
                                </button>
                                <button
                                    type="button"
                                    disabled={records.length === 0}
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        exportPdf(r);
                                    }}
                                    className={`${exportBtn} disabled:cursor-not-allowed disabled:opacity-40`}
                                >
                                    <FileText size={16} /> PDF
                                </button>
                                <button
                                    type="button"
                                    disabled={records.length === 0}
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        exportJson(r);
                                    }}
                                    className={`${exportBtn} disabled:cursor-not-allowed disabled:opacity-40`}
                                >
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
                        <div className="flex items-center justify-between gap-3">
                            <h3 className="text-sm font-bold">Executive health summary</h3>
                            <button
                                type="button"
                                onClick={handleGenerateGeminiReport}
                                disabled={isGeneratingAi}
                                className="flex items-center gap-1.5 px-3 py-1 bg-cyan-950/80 hover:bg-cyan-900 border border-cyan-500/50 rounded-lg text-xs font-bold text-cyan-300 transition-all cursor-pointer disabled:opacity-50"
                            >
                                {isGeneratingAi ? (
                                    <>
                                        <LoaderCircle size={14} className="animate-spin" />
                                        <span>Analyzing with Gemini AI...</span>
                                    </>
                                ) : (
                                    <>
                                        <Sparkles size={14} className="text-cyan-400" />
                                        <span>Analyze with Gemini AI</span>
                                    </>
                                )}
                            </button>
                        </div>
                        <p className="mt-3 text-sm leading-relaxed text-slate-400">{selected.summary}</p>

                        {aiSummary && (
                            <div className="mt-4 p-4 rounded-xl border border-cyan-500/30 bg-cyan-950/40 text-xs sm:text-sm leading-relaxed text-cyan-100 space-y-2">
                                <div className="flex items-center gap-2 text-cyan-400 font-bold text-xs uppercase tracking-wider">
                                    <Sparkles size={14} />
                                    <span>Google Gemini AI Clinical Assessment</span>
                                </div>
                                <div className="whitespace-pre-line text-slate-200 text-xs sm:text-[13px]">
                                    {aiSummary}
                                </div>
                            </div>
                        )}

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
                                                <th key={h} className="px-2 py-2 font-semibold">
                                                    {h}
                                                </th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {selected.rows.slice(0, PREVIEW_ROWS).map((row, i) => (
                                            <tr key={i} className="border-b border-slate-800/60 text-slate-300">
                                                {row.map((cell, j) => (
                                                    <td key={j} className="px-2 py-2">
                                                        {cell}
                                                    </td>
                                                ))}
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                                {selected.rows.length > PREVIEW_ROWS && (
                                    <p className="mt-2 text-xs text-slate-500">
                                        +{selected.rows.length - PREVIEW_ROWS} more rows in the export
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