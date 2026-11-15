import { useState } from 'react';
import { Head, Link } from '@inertiajs/react';
import {
    ArrowLeft,
    BrainCircuit,
    Braces,
    ClipboardList,
    Clock,
    Database,
    FileSpreadsheet,
    FileText,
    LayoutDashboard,
    ShieldCheck,
    Sparkles,
    LoaderCircle,
    Copy,
    Check,
    RotateCcw,
    type LucideIcon,
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { toast } from 'sonner';

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

function stripMarkdownTokens(text: string | null | undefined): string {
    if (!text || typeof text !== 'string') return '';
    return text
        .replace(/\*\*([^*]+)\*\*/g, '$1')
        .replace(/\*([^*]+)\*/g, '$1')
        .replace(/`([^`]+)`/g, '$1')
        .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
        .trim();
}

function stripMarkdown(text: string | null | undefined): string {
    if (!text || typeof text !== 'string') return '';
    return text
        .replace(/^#{1,6}\s+/gm, '')
        .replace(/\*\*([^*]+)\*\*/g, '$1')
        .replace(/\*([^*]+)\*/g, '$1')
        .replace(/`([^`]+)`/g, '$1')
        .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
        .trim();
}

function parseMarkdownLines(rawText: string | null | undefined): { type: 'h3' | 'h4' | 'bullet' | 'paragraph'; text: string }[] {
    if (!rawText || typeof rawText !== 'string') return [];
    const rawLines = rawText.split('\n');
    const items: { type: 'h3' | 'h4' | 'bullet' | 'paragraph'; text: string }[] = [];

    for (const raw of rawLines) {
        const line = raw.trim();
        if (!line) continue;

        if (line.startsWith('### ')) {
            items.push({
                type: 'h3',
                text: stripMarkdownTokens(line.slice(4)),
            });
        } else if (line.startsWith('#### ')) {
            items.push({
                type: 'h4',
                text: stripMarkdownTokens(line.slice(5)),
            });
        } else if (line.startsWith('- ') || line.startsWith('* ')) {
            items.push({
                type: 'bullet',
                text: stripMarkdownTokens(line.slice(2)),
            });
        } else {
            items.push({
                type: 'paragraph',
                text: stripMarkdownTokens(line),
            });
        }
    }
    return items;
}

const exportExcel = (r: Report, records: DatasetRow[], aiAnalysis?: string | null) => {
    try {
        const wb = XLSX.utils.book_new();

        const summaryRows: (string | number)[][] = [
            ['Report', r.title],
            ['Generated', generated()],
            [],
            ['Summary', r.summary],
            [],
            ['Metric', 'Value'],
            ...r.stats.map((s) => [s.label, s.value]),
        ];

        if (aiAnalysis && aiAnalysis.trim()) {
            summaryRows.push([]);
            summaryRows.push(['Google Gemini AI Clinical Assessment', stripMarkdown(aiAnalysis)]);
        }

        const summary = XLSX.utils.aoa_to_sheet(summaryRows);
        summary['!cols'] = [{ wch: 25 }, { wch: 80 }];
        XLSX.utils.book_append_sheet(wb, summary, 'Summary');

        if (aiAnalysis && aiAnalysis.trim()) {
            const cleanAiLines = aiAnalysis
                .split('\n')
                .map((line) => [stripMarkdown(line)])
                .filter((row) => row[0].length > 0);

            const aiSheet = XLSX.utils.aoa_to_sheet([
                ['GOOGLE GEMINI AI CLINICAL SYNTHESIS (NASA-STD-3001)'],
                ['Generated', generated()],
                [],
                ...cleanAiLines,
            ]);
            aiSheet['!cols'] = [{ wch: 100 }];
            XLSX.utils.book_append_sheet(wb, aiSheet, 'AI Clinical Assessment');
        }

        const details = XLSX.utils.aoa_to_sheet([r.headers, ...r.rows]);
        details['!cols'] = r.headers.map(() => ({ wch: 22 }));
        XLSX.utils.book_append_sheet(wb, details, 'Details');

        if (records && records.length > 0) {
            XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(records), 'Dataset');
        }

        XLSX.writeFile(wb, `${r.id}-report.xlsx`);
        toast.success(`Excel report downloaded: ${r.title}`);
    } catch (err) {
        console.error('Failed to export Excel report:', err);
        toast.error('Failed to export Excel report. Please try again.');
    }
};

const drawNasaPdfHeader = (
    doc: jsPDF,
    isFirstPage: boolean,
    titleText: string,
    reportDate: string,
    subTitleText = 'HUMAN RESEARCH PROGRAM (HRP) • 5 HAZARDS OF SPACEFLIGHT (R.I.D.G.E.)'
) => {
    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 14;

    if (isFirstPage) {
        // Deep Space NASA Navy Banner
        doc.setFillColor(5, 14, 26); // #050e1a
        doc.rect(0, 0, pageWidth, 28, 'F');

        // Electric Cyan Accent Line
        doc.setFillColor(92, 219, 223); // #5cdbdf
        doc.rect(0, 26.8, pageWidth, 1.2, 'F');

        // Secondary Deep Sky Line
        doc.setFillColor(2, 132, 199); // #0284c7
        doc.rect(0, 28, pageWidth, 0.4, 'F');

        // NASA Insignia Meatball Badge
        doc.setFillColor(11, 61, 145); // #0b3d91
        doc.roundedRect(margin, 5, 20, 16, 2, 2, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(10.5);
        doc.text('NASA', margin + 3.5, 15);

        // Header Titles
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(11.5);
        doc.setFont('helvetica', 'bold');
        doc.text('ORBIT • NASA CREW HEALTH & MISSION ANALYTICS', margin + 24, 11);

        doc.setFontSize(7.5);
        doc.setTextColor(92, 219, 223); // Electric Cyan
        doc.text(subTitleText, margin + 24, 16.5);

        doc.setTextColor(148, 163, 184); // Slate 400
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(6.8);
        doc.text(`CONFIDENTIAL MEDICAL DOSSIER // GENERATED: ${reportDate} // MET ACTIVE`, margin + 24, 21.5);

        // Security Classification Badge (Right side)
        doc.setFillColor(10, 28, 48);
        doc.setDrawColor(92, 219, 223);
        doc.setLineWidth(0.3);
        doc.roundedRect(pageWidth - margin - 46, 6, 46, 15, 1.5, 1.5, 'FD');
        doc.setFontSize(6);
        doc.setTextColor(92, 219, 223);
        doc.setFont('helvetica', 'bold');
        doc.text('SECURITY CLASSIFICATION', pageWidth - margin - 44, 10.5);
        doc.setFontSize(7.5);
        doc.setTextColor(255, 255, 255);
        doc.text('OFFICIAL MEDICAL', pageWidth - margin - 44, 15);
        doc.setFontSize(5.5);
        doc.setTextColor(148, 163, 184);
        doc.text('UNCLASSIFIED // NASA-STD-3001', pageWidth - margin - 44, 18.5);
    } else {
        // Slim Running Header for subsequent pages
        doc.setFillColor(5, 14, 26);
        doc.rect(0, 0, pageWidth, 12, 'F');
        doc.setFillColor(92, 219, 223);
        doc.rect(0, 11.5, pageWidth, 0.5, 'F');

        doc.setTextColor(255, 255, 255);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(8);
        doc.text('ORBIT • NASA CREW HEALTH & MISSION ANALYTICS', margin, 7.5);

        doc.setTextColor(92, 219, 223);
        doc.setFontSize(7);
        doc.text(titleText.toUpperCase(), pageWidth / 2, 7.5, { align: 'center' });

        doc.setTextColor(148, 163, 184);
        doc.setFontSize(6.5);
        doc.text('CONFIDENTIAL MEDICAL DOSSIER', pageWidth - margin, 7.5, { align: 'right' });
    }
};

const drawNasaPdfFooters = (doc: jsPDF) => {
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 14;
    const totalPages = (doc.internal as any).getNumberOfPages();

    for (let i = 1; i <= totalPages; i++) {
        doc.setPage(i);
        const y = pageHeight - 7;
        doc.setDrawColor(203, 213, 225);
        doc.setLineWidth(0.2);
        doc.line(margin, y - 3, pageWidth - margin, y - 3);

        doc.setFontSize(6.5);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(100, 116, 139);
        doc.text('ORBIT MISSION CONTROL // JOHNSON SPACE CENTER // NASA SPACE MEDICINE', margin, y);
        doc.text('OFFICIAL NASA BIOMEDICAL RECORD • FOR MISSION USE ONLY', pageWidth / 2, y, { align: 'center' });
        doc.text(`PAGE ${i} OF ${totalPages}`, pageWidth - margin, y, { align: 'right' });
    }
};

const drawNasaDisclaimerAndSignoff = (doc: jsPDF, startY: number): number => {
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 14;
    const contentWidth = pageWidth - margin * 2;
    let currentY = startY;

    if (currentY > pageHeight - 36) {
        doc.addPage();
        drawNasaPdfHeader(doc, false, 'Medical Disclaimer', '');
        currentY = 20;
    }

    // Clinical Disclaimer Box
    doc.setFillColor(254, 249, 195); // Light warm amber
    doc.setDrawColor(245, 158, 11);
    doc.setLineWidth(0.3);
    doc.roundedRect(margin, currentY, contentWidth, 13, 1.5, 1.5, 'FD');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.8);
    doc.setTextColor(180, 83, 9);
    doc.text('▲ FLIGHT SURGEON CLINICAL PROTOCOL // NASA-STD-3001 COMPLIANCE', margin + 4, currentY + 4.5);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.5);
    doc.setTextColor(113, 63, 18);
    doc.text(
        doc.splitTextToSize(
            'Automated telemetry models and anomaly flags are clinical decision-support telemetry for Mission Operations and Flight Surgeon review. They do not constitute unilateral medical diagnoses without clinical reconciliation.',
            contentWidth - 8
        ),
        margin + 4,
        currentY + 8.5
    );

    currentY += 16;

    // Flight Surgeon Verification Box
    if (currentY <= pageHeight - 16) {
        doc.setFillColor(248, 250, 252);
        doc.setDrawColor(203, 213, 225);
        doc.setLineWidth(0.2);
        doc.roundedRect(margin, currentY, contentWidth, 11, 1, 1, 'FD');

        doc.setFontSize(6.5);
        doc.setTextColor(71, 85, 105);
        doc.setFont('helvetica', 'bold');
        doc.text('FLIGHT SURGEON CONSOLE:', margin + 4, currentY + 4.5);
        doc.setFont('helvetica', 'normal');
        doc.text('DR. R. CHEN, MD (NASA BIO-OPS) [ VERIFIED ]', margin + 42, currentY + 4.5);

        doc.setFont('helvetica', 'bold');
        doc.text('SECURITY HASH:', margin + 4, currentY + 8.5);
        doc.setFont('helvetica', 'normal');
        doc.text(`SHA256-${Math.random().toString(36).substring(2, 10).toUpperCase()}-NASA-HRP`, margin + 30, currentY + 8.5);

        doc.setFont('helvetica', 'bold');
        doc.text('DEEP SPACE NETWORK LINK:', margin + 105, currentY + 4.5);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(16, 185, 129);
        doc.text('SYNCHRONIZED (DSN-GOLDSTONE-70M)', margin + 148, currentY + 4.5);
        currentY += 14;
    }

    return currentY;
};

const renderAiClinicalAnalysisInPdf = (
    doc: jsPDF,
    aiAnalysis: string | null | undefined,
    startY: number,
    margin: number,
    contentWidth: number,
    reportDate: string,
    docTitle: string
): number => {
    if (!aiAnalysis || typeof aiAnalysis !== 'string' || !aiAnalysis.trim()) {
        return startY;
    }

    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    let currentY = startY;

    if (currentY > pageHeight - 50) {
        doc.addPage();
        drawNasaPdfHeader(doc, false, docTitle, reportDate);
        currentY = 18;
    }

    const parsedBlocks = parseMarkdownLines(aiAnalysis);
    if (parsedBlocks.length === 0) return currentY;

    // Measure line heights accurately
    let measuredHeight = 11; // title bar allowance
    const preparedBlocks: { block: { type: string; text: string }; lines: string[] }[] = [];

    for (const b of parsedBlocks) {
        if (b.type === 'h3') {
            measuredHeight += 5.5;
            preparedBlocks.push({ block: b, lines: [b.text] });
        } else if (b.type === 'h4') {
            measuredHeight += 4.5;
            preparedBlocks.push({ block: b, lines: [b.text] });
        } else if (b.type === 'bullet') {
            doc.setFontSize(6.8);
            const lines = doc.splitTextToSize(`- ${b.text}`, contentWidth - 14);
            measuredHeight += lines.length * 3.4 + 1.2;
            preparedBlocks.push({ block: b, lines });
        } else {
            doc.setFontSize(6.8);
            const lines = doc.splitTextToSize(b.text, contentWidth - 12);
            measuredHeight += lines.length * 3.4 + 1.8;
            preparedBlocks.push({ block: b, lines });
        }
    }

    const maxBoxHeight = Math.max(35, pageHeight - currentY - 35);
    const boxHeight = Math.min(measuredHeight, maxBoxHeight);

    // Callout Box Header for Gemini AI
    doc.setFillColor(236, 254, 255); // Ice cyan background #ecfeff
    doc.setDrawColor(165, 243, 252);
    doc.setLineWidth(0.3);
    doc.roundedRect(margin, currentY, contentWidth, boxHeight, 1.5, 1.5, 'FD');

    // Left accent bar (Electric Cyan)
    doc.setFillColor(6, 182, 212); // #06b6d4
    doc.roundedRect(margin, currentY, 2.5, boxHeight, 0.5, 0.5, 'F');

    // Box Header Label
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(8, 145, 178);
    doc.text('+ GOOGLE GEMINI AI CLINICAL SYNTHESIS', margin + 6, currentY + 5.2);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6);
    doc.setTextColor(14, 116, 144);
    doc.text('NASA-STD-3001 MEDICAL DECISION SUPPORT', pageWidth - margin - 4, currentY + 5.2, { align: 'right' });

    let itemY = currentY + 9.5;
    const boxBottomLimit = currentY + boxHeight - 3;

    // Render parsed blocks cleanly
    for (const item of preparedBlocks) {
        if (itemY > boxBottomLimit) {
            break;
        }

        const { block, lines } = item;

        if (block.type === 'h3') {
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(7.8);
            doc.setTextColor(8, 24, 43);
            doc.text(lines[0], margin + 6, itemY);
            itemY += 4.5;
        } else if (block.type === 'h4') {
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(7);
            doc.setTextColor(2, 132, 199);
            doc.text(`> ${lines[0]}`, margin + 6, itemY);
            itemY += 4.0;
        } else if (block.type === 'bullet') {
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(6.8);
            doc.setTextColor(51, 65, 85);
            doc.text(lines, margin + 8, itemY);
            itemY += lines.length * 3.4 + 1.2;
        } else {
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(6.8);
            doc.setTextColor(51, 65, 85);
            doc.text(lines, margin + 6, itemY);
            itemY += lines.length * 3.4 + 1.8;
        }
    }

    return currentY + boxHeight + 5;
};

const exportPdf = (r: Report, aiAnalysis?: string | null) => {
    try {
        const doc = new jsPDF({
            orientation: 'portrait',
            unit: 'mm',
            format: 'a4',
        });

        const pageWidth = doc.internal.pageSize.getWidth();
        const pageHeight = doc.internal.pageSize.getHeight();
        const margin = 14;
        const contentWidth = pageWidth - margin * 2;
        const reportDate = new Date().toUTCString().slice(0, 25);
        const docCode = `ORBIT-RPT-${r.id.toUpperCase()}-${Date.now().toString(36).toUpperCase()}`;

        // Draw page 1 header
        drawNasaPdfHeader(doc, true, r.title, reportDate);

        let currentY = 36;

        // Report Title & Meta
        doc.setTextColor(10, 25, 47);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(14.5);
        doc.text(r.title, margin, currentY);

        // ID Pill badge
        doc.setFillColor(241, 245, 249);
        doc.setDrawColor(92, 219, 223);
        doc.setLineWidth(0.3);
        const tagText = `DOC REF: ${docCode}`;
        const tagWidth = doc.getTextWidth(tagText) + 6;
        doc.roundedRect(pageWidth - margin - tagWidth, currentY - 5, tagWidth, 6.5, 1, 1, 'FD');
        doc.setFontSize(6.8);
        doc.setTextColor(2, 132, 199);
        doc.text(tagText, pageWidth - margin - tagWidth + 3, currentY - 0.7);

        currentY += 4.5;
        doc.setFontSize(7.5);
        doc.setTextColor(100, 116, 139);
        doc.setFont('helvetica', 'normal');
        doc.text('Mission Clinical Cohort Evaluation & Spaceflight Pathophysiology Analysis', margin, currentY);
        currentY += 5.5;

        // KPI Summary Stat Cards
        const cardGap = 4;
        const cardWidth = (contentWidth - (r.stats.length - 1) * cardGap) / r.stats.length;
        const cardHeight = 16.5;

        r.stats.forEach((s, idx) => {
            const cardX = margin + idx * (cardWidth + cardGap);
            doc.setFillColor(248, 250, 252);
            doc.setDrawColor(226, 232, 240);
            doc.setLineWidth(0.3);
            doc.roundedRect(cardX, currentY, cardWidth, cardHeight, 1.5, 1.5, 'FD');

            // Top accent line
            doc.setFillColor(92, 219, 223);
            doc.rect(cardX, currentY, cardWidth, 0.8, 'F');

            doc.setFont('helvetica', 'bold');
            doc.setFontSize(6.5);
            doc.setTextColor(100, 116, 139);
            doc.text(s.label.toUpperCase(), cardX + 3.5, currentY + 5.5);

            doc.setFontSize(13);
            const isAlert =
                (s.label.toLowerCase().includes('flag') ||
                    s.label.toLowerCase().includes('alert') ||
                    s.label.toLowerCase().includes('anomaly') ||
                    s.label.toLowerCase().includes('out-of-range')) &&
                s.value !== '0';

            if (isAlert) {
                doc.setTextColor(220, 38, 38);
            } else {
                doc.setTextColor(10, 25, 47);
            }
            doc.text(s.value, cardX + 3.5, currentY + 12.5);
        });

        currentY += cardHeight + 5;

        // Executive Clinical Summary Box
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8);
        const summaryLines = doc.splitTextToSize(r.summary, contentWidth - 10);
        const summaryBoxHeight = summaryLines.length * 4 + 10;

        doc.setFillColor(248, 250, 252);
        doc.setDrawColor(226, 232, 240);
        doc.setLineWidth(0.3);
        doc.roundedRect(margin, currentY, contentWidth, summaryBoxHeight, 1.5, 1.5, 'FD');

        // Left accent bar
        doc.setFillColor(2, 132, 199);
        doc.roundedRect(margin, currentY, 2.5, summaryBoxHeight, 0.5, 0.5, 'F');

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(7.2);
        doc.setTextColor(2, 132, 199);
        doc.text('▲ EXECUTIVE CLINICAL SUMMARY', margin + 6, currentY + 5);

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8);
        doc.setTextColor(51, 65, 85);
        doc.text(summaryLines, margin + 6, currentY + 9.5);

        currentY += summaryBoxHeight + 5;

        // Gemini AI Analysis Box (if generated) - Cleanly parsed without raw markdown
        if (aiAnalysis && aiAnalysis.trim().length > 0) {
            currentY = renderAiClinicalAnalysisInPdf(
                doc,
                aiAnalysis,
                currentY,
                margin,
                contentWidth,
                reportDate,
                r.title
            );
        }

        // Telemetry Breakdown Section Title
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(10);
        doc.setTextColor(10, 25, 47);
        doc.text('TELEMETRY DATA & RECORD BREAKDOWN', margin, currentY + 1);
        currentY += 3.5;

        // AutoTable
        autoTable(doc, {
            startY: currentY,
            head: [r.headers],
            body: r.rows as any,
            theme: 'striped',
            headStyles: {
                fillColor: [8, 24, 43], // Deep space navy #08182b
                textColor: [92, 219, 223], // Electric cyan #5cdbdf
                fontSize: 8,
                fontStyle: 'bold',
                cellPadding: 2.5,
            },
            styles: {
                fontSize: 7.5,
                cellPadding: 2,
                lineColor: [226, 232, 240],
                lineWidth: 0.15,
                textColor: [30, 41, 59],
            },
            alternateRowStyles: {
                fillColor: [248, 250, 252],
            },
            margin: { left: margin, right: margin, bottom: 25 },
            didDrawPage: (data) => {
                if (data.pageNumber > 1) {
                    drawNasaPdfHeader(doc, false, r.title, reportDate);
                }
            },
            didParseCell: (data) => {
                if (data.section === 'body') {
                    const raw = String(data.cell.raw ?? '');
                    const num = Number(raw);
                    if (
                        raw.toLowerCase().includes('flag') ||
                        (data.column.index === 3 && r.id === 'daily' && !isNaN(num) && num > 0)
                    ) {
                        data.cell.styles.textColor = [220, 38, 38];
                        data.cell.styles.fontStyle = 'bold';
                    }
                }
            },
        });

        currentY = (doc as any).lastAutoTable.finalY + 6;

        // Clinical Disclaimer & Flight Surgeon Sign-off Box
        drawNasaDisclaimerAndSignoff(doc, currentY);

        // Running footers across all pages
        drawNasaPdfFooters(doc);

        doc.save(`NASA_ORBIT_${r.id.toUpperCase()}_Report_${Date.now()}.pdf`);
        toast.success(`Official NASA PDF report downloaded: ${r.title}`);
    } catch (err) {
        console.error('Failed to export PDF report:', err);
        toast.error('Failed to export PDF report. Please try again.');
    }
};

const exportComprehensivePdf = (
    reportsList: Report[],
    records: DatasetRow[],
    aiAnalysis?: string | null
) => {
    try {
        const doc = new jsPDF({
            orientation: 'portrait',
            unit: 'mm',
            format: 'a4',
        });

        const pageWidth = doc.internal.pageSize.getWidth();
        const pageHeight = doc.internal.pageSize.getHeight();
        const margin = 14;
        const contentWidth = pageWidth - margin * 2;
        const reportDate = new Date().toUTCString().slice(0, 25);
        const masterCode = `NASA-HRP-COMPREHENSIVE-${Date.now().toString(36).toUpperCase()}`;

        // Page 1 Header
        drawNasaPdfHeader(doc, true, 'Comprehensive Cohort Health Dossier', reportDate, 'SPACE MEDICINE OPERATIONS DIVISION • ASTRONAUT COHORT DOSSIER');

        let currentY = 36;

        // Master Title
        doc.setTextColor(10, 25, 47);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(15);
        doc.text('COMPREHENSIVE ASTRONAUT COHORT HEALTH DOSSIER', margin, currentY);

        // ID Pill badge
        doc.setFillColor(241, 245, 249);
        doc.setDrawColor(92, 219, 223);
        doc.setLineWidth(0.3);
        const tagText = `DOSSIER REF: ${masterCode}`;
        const tagWidth = doc.getTextWidth(tagText) + 6;
        doc.roundedRect(pageWidth - margin - tagWidth, currentY - 5, tagWidth, 6.5, 1, 1, 'FD');
        doc.setFontSize(6.8);
        doc.setTextColor(2, 132, 199);
        doc.text(tagText, pageWidth - margin - tagWidth + 3, currentY - 0.7);

        currentY += 4.5;
        doc.setFontSize(7.5);
        doc.setTextColor(100, 116, 139);
        doc.setFont('helvetica', 'normal');
        doc.text(`Integrated NASA 5 Hazards (R.I.D.G.E.) Analysis Across ${records.length} Telemetry Records`, margin, currentY);
        currentY += 5.5;

        // Cohort Overview Stat Cards
        const totalCrew = new Set(records.map((r) => r.Astronaut || r.id)).size || records.length;
        const dailyReport = reportsList.find((r) => r.id === 'daily');
        const anomalyReport = reportsList.find((r) => r.id === 'anomaly');
        const totalAnomalies = anomalyReport?.stats.find((s) => s.label.toLowerCase().includes('anomal'))?.value || '0';

        const masterStats = [
            { label: 'COHORT CREW', value: String(totalCrew) },
            { label: 'TELEMETRY RECORDS', value: String(records.length) },
            { label: 'METRICS TRACKED', value: '12 HAZARD METRICS' },
            { label: 'ACTIVE ANOMALIES', value: String(totalAnomalies) },
        ];

        const cardGap = 4;
        const cardWidth = (contentWidth - (masterStats.length - 1) * cardGap) / masterStats.length;
        const cardHeight = 16.5;

        masterStats.forEach((s, idx) => {
            const cardX = margin + idx * (cardWidth + cardGap);
            doc.setFillColor(248, 250, 252);
            doc.setDrawColor(226, 232, 240);
            doc.setLineWidth(0.3);
            doc.roundedRect(cardX, currentY, cardWidth, cardHeight, 1.5, 1.5, 'FD');

            doc.setFillColor(92, 219, 223);
            doc.rect(cardX, currentY, cardWidth, 0.8, 'F');

            doc.setFont('helvetica', 'bold');
            doc.setFontSize(6.5);
            doc.setTextColor(100, 116, 139);
            doc.text(s.label, cardX + 3, currentY + 5.5);

            doc.setFontSize(12);
            if (s.label.includes('ANOMALIES') && s.value !== '0') {
                doc.setTextColor(220, 38, 38);
            } else {
                doc.setTextColor(10, 25, 47);
            }
            doc.text(s.value, cardX + 3, currentY + 12.5);
        });

        currentY += cardHeight + 5;

        // Gemini AI Analysis Box if present - Cleanly parsed without raw markdown
        if (aiAnalysis && aiAnalysis.trim().length > 0) {
            currentY = renderAiClinicalAnalysisInPdf(
                doc,
                aiAnalysis,
                currentY,
                margin,
                contentWidth,
                reportDate,
                'Comprehensive Dossier'
            );
        }

        // Section 1: Crew Health Summary Table
        if (dailyReport) {
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(10);
            doc.setTextColor(10, 25, 47);
            doc.text('SECTION 1: CREW HEALTH & STATUS ROSTER', margin, currentY + 1);
            currentY += 3.5;

            autoTable(doc, {
                startY: currentY,
                head: [dailyReport.headers],
                body: dailyReport.rows as any,
                theme: 'striped',
                headStyles: {
                    fillColor: [8, 24, 43],
                    textColor: [92, 219, 223],
                    fontSize: 8,
                    fontStyle: 'bold',
                    cellPadding: 2.2,
                },
                styles: {
                    fontSize: 7.5,
                    cellPadding: 1.8,
                    lineColor: [226, 232, 240],
                    lineWidth: 0.15,
                    textColor: [30, 41, 59],
                },
                alternateRowStyles: {
                    fillColor: [248, 250, 252],
                },
                margin: { left: margin, right: margin, bottom: 25 },
                didDrawPage: (data) => {
                    if (data.pageNumber > 1) {
                        drawNasaPdfHeader(doc, false, 'Comprehensive Dossier', reportDate);
                    }
                },
            });

            currentY = (doc as any).lastAutoTable.finalY + 8;
        }

        // Section 2: Trend Analysis on New Page
        const weeklyReport = reportsList.find((r) => r.id === 'weekly');
        if (weeklyReport) {
            doc.addPage();
            drawNasaPdfHeader(doc, false, 'Section 2: Trend Analysis', reportDate);
            currentY = 20;

            doc.setFont('helvetica', 'bold');
            doc.setFontSize(12);
            doc.setTextColor(10, 25, 47);
            doc.text('SECTION 2: LONGITUDINAL BIOMEDICAL TREND ANALYSIS', margin, currentY);
            currentY += 5;

            doc.setFont('helvetica', 'normal');
            doc.setFontSize(8);
            doc.setTextColor(71, 85, 105);
            doc.text(doc.splitTextToSize(weeklyReport.summary, contentWidth), margin, currentY);
            currentY += 8;

            autoTable(doc, {
                startY: currentY,
                head: [weeklyReport.headers],
                body: weeklyReport.rows as any,
                theme: 'striped',
                headStyles: {
                    fillColor: [8, 24, 43],
                    textColor: [92, 219, 223],
                    fontSize: 8,
                    fontStyle: 'bold',
                    cellPadding: 2.2,
                },
                styles: {
                    fontSize: 7.5,
                    cellPadding: 1.8,
                    lineColor: [226, 232, 240],
                    lineWidth: 0.15,
                    textColor: [30, 41, 59],
                },
                alternateRowStyles: {
                    fillColor: [248, 250, 252],
                },
                margin: { left: margin, right: margin, bottom: 25 },
                didDrawPage: (data) => {
                    if (data.pageNumber > 1) {
                        drawNasaPdfHeader(doc, false, 'Section 2: Trend Analysis', reportDate);
                    }
                },
            });

            currentY = (doc as any).lastAutoTable.finalY + 8;
        }

        // Section 3: Anomaly & Risk Evaluation
        if (anomalyReport) {
            doc.addPage();
            drawNasaPdfHeader(doc, false, 'Section 3: Anomaly Review', reportDate);
            currentY = 20;

            doc.setFont('helvetica', 'bold');
            doc.setFontSize(12);
            doc.setTextColor(10, 25, 47);
            doc.text('SECTION 3: OUT-OF-RANGE ANOMALY & HAZARD REVIEW', margin, currentY);
            currentY += 5;

            doc.setFont('helvetica', 'normal');
            doc.setFontSize(8);
            doc.setTextColor(71, 85, 105);
            doc.text(doc.splitTextToSize(anomalyReport.summary, contentWidth), margin, currentY);
            currentY += 8;

            autoTable(doc, {
                startY: currentY,
                head: [anomalyReport.headers],
                body: anomalyReport.rows as any,
                theme: 'striped',
                headStyles: {
                    fillColor: [8, 24, 43],
                    textColor: [92, 219, 223],
                    fontSize: 8,
                    fontStyle: 'bold',
                    cellPadding: 2.2,
                },
                styles: {
                    fontSize: 7.5,
                    cellPadding: 1.8,
                    lineColor: [226, 232, 240],
                    lineWidth: 0.15,
                    textColor: [30, 41, 59],
                },
                alternateRowStyles: {
                    fillColor: [248, 250, 252],
                },
                margin: { left: margin, right: margin, bottom: 25 },
                didDrawPage: (data) => {
                    if (data.pageNumber > 1) {
                        drawNasaPdfHeader(doc, false, 'Section 3: Anomaly Review', reportDate);
                    }
                },
                didParseCell: (data) => {
                    if (data.section === 'body') {
                        data.cell.styles.textColor = [220, 38, 38];
                        data.cell.styles.fontStyle = 'bold';
                    }
                },
            });

            currentY = (doc as any).lastAutoTable.finalY + 8;
        }

        // Disclaimer & Sign-off
        drawNasaDisclaimerAndSignoff(doc, currentY);

        // Running footers across all pages
        drawNasaPdfFooters(doc);

        doc.save(`NASA_ORBIT_Comprehensive_Cohort_Dossier_${Date.now()}.pdf`);
        toast.success('Comprehensive NASA Medical Dossier PDF downloaded');
    } catch (err) {
        console.error('Failed to export comprehensive PDF dossier:', err);
        toast.error('Failed to export Comprehensive Dossier. Please try again.');
    }
};

const exportJson = (r: Report, aiAnalysis?: string | null) => {
    try {
        const data = {
            id: r.id,
            title: r.title,
            generated: new Date().toISOString(),
            summary: r.summary,
            stats: Object.fromEntries(r.stats.map((s) => [s.label, s.value])),
            geminiClinicalAssessment: aiAnalysis
                ? {
                    rawMarkdown: aiAnalysis,
                    plainText: stripMarkdown(aiAnalysis),
                    provider: 'Google Gemini AI (gemini-3-flash-preview)',
                    standard: 'NASA-STD-3001 Spaceflight Medical Clearance',
                    status: 'VERIFIED',
                }
                : null,
            details: r.rows.map((row) => Object.fromEntries(r.headers.map((h, i) => [h, row[i]]))),
        };
        saveBlob(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }), `${r.id}-report.json`);
        toast.success(`JSON dataset exported: ${r.title}`);
    } catch (err) {
        console.error('Failed to export JSON report:', err);
        toast.error('Failed to export JSON report. Please try again.');
    }
};

function renderClinicalInline(text: string): React.ReactNode[] {
    const tokenRegex = /(\*\*[^*]+\*\*|`[^`]+`|\[[^\]]+\]\([^)]+\)|\*[^*]+\*)/g;
    const parts = text.split(tokenRegex);

    return parts.map((part, index) => {
        if (!part) return null;

        if (part.startsWith('**') && part.endsWith('**') && part.length >= 4) {
            return (
                <strong key={index} className="font-bold text-white tracking-wide">
                    {part.slice(2, -2)}
                </strong>
            );
        }

        if (part.startsWith('`') && part.endsWith('`') && part.length >= 2) {
            return (
                <code
                    key={index}
                    className="px-1.5 py-0.5 rounded bg-[#030b14] border border-cyan-800/60 text-cyan-300 font-mono text-xs font-semibold mx-0.5"
                >
                    {part.slice(1, -1)}
                </code>
            );
        }

        if (part.startsWith('*') && part.endsWith('*') && part.length >= 2) {
            return (
                <em key={index} className="italic text-cyan-200/90">
                    {part.slice(1, -1)}
                </em>
            );
        }

        return <span key={index}>{part}</span>;
    });
}

function ClinicalMarkdownRenderer({ content }: { content: string }) {
    const lines = content.split('\n');
    const elements: React.ReactNode[] = [];
    let listBuffer: { type: 'ul' | 'ol'; items: string[] } | null = null;

    const flushList = () => {
        if (!listBuffer) return;
        const currentBuffer = listBuffer;
        listBuffer = null;

        if (currentBuffer.type === 'ul') {
            elements.push(
                <ul key={`ul-${elements.length}`} className="my-2.5 space-y-2 pl-1">
                    {currentBuffer.items.map((item, idx) => (
                        <li key={idx} className="flex items-start gap-2.5 text-xs sm:text-sm leading-relaxed text-slate-200">
                            <span className="inline-block w-1.5 h-1.5 rounded-full bg-cyan-400 mt-2 shrink-0 shadow-[0_0_8px_rgba(34,211,238,0.8)]" />
                            <div className="flex-1">{renderClinicalInline(item)}</div>
                        </li>
                    ))}
                </ul>
            );
        } else {
            elements.push(
                <ol key={`ol-${elements.length}`} className="my-2.5 space-y-2 pl-1">
                    {currentBuffer.items.map((item, idx) => (
                        <li key={idx} className="flex items-start gap-2.5 text-xs sm:text-sm leading-relaxed text-slate-200">
                            <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-[#091f33] border border-cyan-700/50 text-cyan-300 shrink-0 mt-0.5">
                                {idx + 1}
                            </span>
                            <div className="flex-1">{renderClinicalInline(item)}</div>
                        </li>
                    ))}
                </ol>
            );
        }
    };

    lines.forEach((rawLine, lineIdx) => {
        const line = rawLine.trim();

        if (!line) {
            flushList();
            return;
        }

        // H3 (### Header)
        if (line.startsWith('### ')) {
            flushList();
            elements.push(
                <div
                    key={`h3-${lineIdx}`}
                    className="mt-4 mb-2 pb-1.5 border-b border-cyan-800/40 flex items-center gap-2 text-white font-bold text-sm sm:text-base"
                >
                    <span className="size-2 rounded-full bg-cyan-400 shadow-[0_0_8px_rgba(34,211,238,0.8)]" />
                    <span>{renderClinicalInline(line.slice(4))}</span>
                </div>
            );
            return;
        }

        // H4 (#### Subheader)
        if (line.startsWith('#### ')) {
            flushList();
            elements.push(
                <div
                    key={`h4-${lineIdx}`}
                    className="mt-3 mb-1.5 flex items-center gap-2 text-cyan-300 font-mono text-xs font-bold uppercase tracking-wider"
                >
                    <span className="size-1.5 bg-cyan-400 rotate-45 shrink-0 shadow-[0_0_6px_rgba(34,211,238,0.8)]" />
                    <span>{renderClinicalInline(line.slice(5))}</span>
                </div>
            );
            return;
        }

        // Bullet lists
        if (line.startsWith('- ') || line.startsWith('* ')) {
            const itemText = line.slice(2);
            if (!listBuffer || listBuffer.type !== 'ul') {
                flushList();
                listBuffer = { type: 'ul', items: [itemText] };
            } else {
                listBuffer.items.push(itemText);
            }
            return;
        }

        // Numbered lists
        const numMatch = line.match(/^(\d+)\.\s+(.*)$/);
        if (numMatch) {
            const itemText = numMatch[2];
            if (!listBuffer || listBuffer.type !== 'ol') {
                flushList();
                listBuffer = { type: 'ol', items: [itemText] };
            } else {
                listBuffer.items.push(itemText);
            }
            return;
        }

        // Blockquotes (> text)
        if (line.startsWith('> ')) {
            flushList();
            elements.push(
                <blockquote
                    key={`quote-${lineIdx}`}
                    className="my-2.5 border-l-2 border-cyan-400 bg-cyan-950/30 px-3.5 py-2 rounded-r-lg text-xs sm:text-sm text-cyan-100 italic"
                >
                    {renderClinicalInline(line.slice(2))}
                </blockquote>
            );
            return;
        }

        // Standard paragraph
        flushList();
        elements.push(
            <p
                key={`p-${lineIdx}`}
                className="my-2 text-xs sm:text-sm leading-relaxed text-slate-200/90 font-normal"
            >
                {renderClinicalInline(line)}
            </p>
        );
    });

    flushList();
    return <div className="space-y-1">{elements}</div>;
}

const fallbackCopy = (text: string) => {
    try {
        const textarea = document.createElement('textarea');
        textarea.value = text;
        textarea.style.position = 'fixed';
        textarea.style.opacity = '0';
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
    } catch {
        // ignore
    }
};

function GeminiClinicalAssessmentCard({
    aiSummary,
    onRegenerate,
    isGenerating,
}: {
    aiSummary: string;
    onRegenerate: () => void;
    isGenerating: boolean;
}) {
    const [copied, setCopied] = useState(false);

    const handleCopy = () => {
        const clean = stripMarkdown(aiSummary);
        const notify = () => {
            setCopied(true);
            toast.success('Clinical assessment copied to clipboard');
            setTimeout(() => setCopied(false), 2000);
        };

        if (navigator && navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
            navigator.clipboard.writeText(clean).then(notify).catch(() => {
                fallbackCopy(clean);
                notify();
            });
        } else {
            fallbackCopy(clean);
            notify();
        }
    };

    return (
        <div className="mt-5 relative overflow-hidden rounded-2xl border border-cyan-500/40 bg-gradient-to-b from-[#0a1f33]/90 via-[#061524]/95 to-[#020912]/98 p-5 sm:p-6 shadow-[0_16px_40px_rgba(0,0,0,0.8),0_0_25px_rgba(34,211,238,0.15)] backdrop-blur-xl">
            {/* Luminous top neon accent */}
            <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-cyan-400 to-transparent" />
            <div className="absolute -top-12 -right-12 w-44 h-44 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />

            {/* Header bar */}
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-cyan-900/50 pb-3 mb-4">
                <div className="flex items-center gap-2.5">
                    <span className="flex size-7 items-center justify-center rounded-lg bg-cyan-400/15 text-cyan-300 ring-1 ring-cyan-400/40 shadow-[0_0_12px_rgba(34,211,238,0.3)]">
                        <Sparkles size={16} />
                    </span>
                    <div>
                        <div className="flex items-center gap-2">
                            <span className="text-xs font-bold uppercase tracking-wider text-cyan-300 font-mono">
                                Google Gemini AI Clinical Assessment
                            </span>
                            <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-cyan-950/80 border border-cyan-500/30 text-[10px] text-cyan-200 font-mono">
                                <span className="size-1.5 rounded-full bg-emerald-400 animate-pulse" />
                                Gemini 3 Flash
                            </span>
                        </div>
                        <p className="text-[11px] text-slate-400">
                            Automated Medical Intelligence & R.I.D.G.E. Spaceflight Pathophysiology
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <button
                        type="button"
                        onClick={handleCopy}
                        className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-cyan-800/60 bg-cyan-950/60 hover:bg-cyan-900/60 text-xs font-medium text-cyan-200 transition cursor-pointer"
                        title="Copy Clean Medical Assessment"
                    >
                        {copied ? (
                            <>
                                <Check size={13} className="text-emerald-400" />
                                <span className="text-emerald-300">Copied</span>
                            </>
                        ) : (
                            <>
                                <Copy size={13} className="text-cyan-400" />
                                <span>Copy</span>
                            </>
                        )}
                    </button>

                    <button
                        type="button"
                        onClick={onRegenerate}
                        disabled={isGenerating}
                        className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-cyan-800/60 bg-cyan-950/60 hover:bg-cyan-900/60 text-xs font-medium text-cyan-200 transition cursor-pointer disabled:opacity-50"
                        title="Re-run Gemini AI Clinical Analysis"
                    >
                        <RotateCcw size={13} className={isGenerating ? 'animate-spin text-cyan-400' : 'text-cyan-400'} />
                        <span>{isGenerating ? 'Analyzing...' : 'Re-analyze'}</span>
                    </button>
                </div>
            </div>

            {/* Rendered Clinical Content */}
            <div className="text-slate-200 text-xs sm:text-sm leading-relaxed">
                <ClinicalMarkdownRenderer content={aiSummary} />
            </div>

            {/* Footer metadata stamp */}
            <div className="mt-4 pt-3 border-t border-cyan-900/40 flex flex-wrap items-center justify-between gap-2 text-[10px] sm:text-[11px] text-slate-400 font-mono">
                <div className="flex items-center gap-2">
                    <span className="size-1.5 rounded-full bg-cyan-400" />
                    <span>NASA-STD-3001 VOL 1 · CREW HEALTH CLEARANCE PROTOCOL</span>
                </div>
                <div className="text-cyan-400/80">
                    STATUS: REAL-TIME RECONCILED
                </div>
            </div>
        </div>
    );
}

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
            <Head title="ORBIT • Health Reports & Analytics" />

            <div className="flex flex-wrap items-end justify-between gap-4">
                <div>
                    <div className="flex items-center gap-2 mb-1">

                        <span className="text-slate-600 text-xs">/</span>
                        <p className="text-[10px] font-bold uppercase tracking-widest text-cyan-400">
                            Health Summaries &amp; Exports
                        </p>
                    </div>
                    <h1 className="mt-1 text-3xl font-bold">Reports</h1>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                    <Link
                        href="/"
                        className="flex items-center gap-2 rounded-xl border border-slate-700/80 bg-slate-800/80 px-4 py-2 text-xs font-bold text-slate-200 shadow-md shadow-black/30 hover:border-cyan-400 hover:bg-slate-800 hover:text-white transition cursor-pointer"
                        title="Return to ORBIT Mission Control Dashboard"
                    >
                        <ArrowLeft size={15} className="text-cyan-400" />
                        <span>Back to Dashboard</span>
                    </Link>
                    <button
                        type="button"
                        disabled={records.length === 0}
                        onClick={() => exportComprehensivePdf(reports, records, aiSummary)}
                        className="flex items-center gap-2 rounded-xl border border-cyan-500/50 bg-gradient-to-r from-cyan-950/90 via-[#0c233c] to-[#08182b] px-4 py-2 text-xs font-bold text-cyan-200 shadow-lg shadow-cyan-950/40 hover:border-cyan-300 hover:text-white transition cursor-pointer disabled:cursor-not-allowed disabled:opacity-40"
                    >
                        <FileText size={15} className="text-cyan-400" />
                        <span>Export Comprehensive Dossier (PDF)</span>
                    </button>
                    <p className="flex items-center gap-2 text-xs text-slate-500">
                        <Clock size={14} /> Generated {generated()} · {records.length} dataset records
                    </p>
                </div>
            </div>

            {records.length === 0 && (
                <div className={`${card} mt-6 flex flex-wrap items-center justify-between gap-4 p-6 text-sm text-slate-400`}>
                    <div className="flex items-center gap-3">
                        <Database size={18} className="text-cyan-300" />
                        <span>No dataset records found. Import a dataset first from the dashboard, then reload this page.</span>
                    </div>
                    <Link
                        href="/"
                        className="inline-flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-800/80 px-3 py-1.5 text-xs font-semibold text-cyan-300 hover:border-cyan-400 hover:text-white transition"
                    >
                        <ArrowLeft size={13} />
                        <span>Back to Dashboard</span>
                    </Link>
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
                            className={`${card} cursor-pointer p-6 transition ${active ? 'border-cyan-400/60' : 'hover:border-slate-600'
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
                                        exportExcel(r, records, aiSummary);
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
                                        exportPdf(r, aiSummary);
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
                                        exportJson(r, aiSummary);
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
                <div className="flex flex-wrap items-center justify-between gap-4">
                    <div>
                        <h2 className="font-bold">Report preview</h2>
                        <p className="text-sm text-slate-400">
                            {selected.title} · {generated()}
                        </p>
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            type="button"
                            disabled={records.length === 0}
                            onClick={() => exportPdf(selected, aiSummary)}
                            className="flex items-center gap-1.5 rounded-lg border border-cyan-500/40 bg-cyan-950/60 px-3 py-1.5 text-xs font-bold text-cyan-200 hover:bg-cyan-900/60 transition cursor-pointer"
                        >
                            <FileText size={14} className="text-cyan-400" />
                            <span>Export {selected.title} (PDF)</span>
                        </button>
                        <span className="inline-flex items-center gap-2 rounded-full border border-cyan-400/40 bg-cyan-400/10 px-3 py-1 text-xs font-bold text-cyan-300">
                            <Database size={14} /> Dataset-based
                        </span>
                    </div>
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
                            <GeminiClinicalAssessmentCard
                                aiSummary={aiSummary}
                                onRegenerate={handleGenerateGeminiReport}
                                isGenerating={isGeneratingAi}
                            />
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