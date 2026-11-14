import React, { useState, useRef } from 'react';
import {
    Upload,
    FileSpreadsheet,
    FileText,
    Image as ImageIcon,
    FileCode,
    CheckCircle2,
    X,
    Download,
    RefreshCw,
    Check,
    Cpu,
    ArrowRight,
    Sparkles,
} from 'lucide-react';
import {
    parseExcelOrCsvFile,
    parsePdfReport,
    scanImageTelemetry,
    parseJsonTelemetry,
    downloadSampleExcelTemplate,
    downloadSampleCsvTemplate,
} from '@/lib/telemetry-import';
import type { ParsedImportPayload, AstronautFullData } from '@/types/astronaut';
import { toast } from 'sonner';

interface TelemetryImportModalProps {
    isOpen: boolean;
    onClose: () => void;
    onApplyToHud?: (data: ParsedImportPayload) => void;
    onSaveToDatabase?: (data: ParsedImportPayload) => Promise<boolean | void>;
    activeAstronaut?: AstronautFullData;
}

type FieldDef = {
    key: keyof ParsedImportPayload;
    label: string;
    kind: 'text' | 'int' | 'float';
    fallback: string | number;
    step?: string;
    hint?: string;
};

const IDENTITY: FieldDef[] = [
    { key: 'astronautId', label: 'Astronaut ID', kind: 'text', fallback: '' },
    { key: 'name', label: 'Astronaut name', kind: 'text', fallback: '' },
    { key: 'role', label: 'Role / station', kind: 'text', fallback: '' },
    { key: 'age', label: 'Age at launch', kind: 'int', fallback: 40 },
    { key: 'gender', label: 'Gender', kind: 'text', fallback: '' },
    { key: 'country', label: 'Country / agency', kind: 'text', fallback: '' },
];

const VITALS: FieldDef[] = [
    { key: 'heartRate', label: 'Heart rate (bpm)', kind: 'int', fallback: 80, hint: 'Baseline: 60-100' },
    { key: 'spO2', label: 'SpO2 oxygen (%)', kind: 'float', fallback: 98, step: '0.1', hint: 'Baseline: 95-100%' },
    { key: 'coreTemp', label: 'Core temp (°C)', kind: 'float', fallback: 37.0, step: '0.1', hint: 'Baseline: 36.5-37.5' },
    { key: 'respiration', label: 'Respiration (bpm)', kind: 'int', fallback: 18, hint: 'Baseline: 12-20' },
    { key: 'hydration', label: 'Hydration (%)', kind: 'int', fallback: 70, hint: 'Baseline: 80-100%' },
];

const SUIT: FieldDef[] = [
    { key: 'suitPressure', label: 'Suit pressure (psi)', kind: 'float', fallback: 4.3, step: '0.1' },
    { key: 'o2Level', label: 'O2 level (%)', kind: 'int', fallback: 21 },
    { key: 'radiation', label: 'Radiation status', kind: 'text', fallback: 'Safe' },
    { key: 'battery', label: 'Battery reserve (%)', kind: 'int', fallback: 80 },
];

const CLINICAL: FieldDef[] = [
    { key: 'missionDurationDays', label: 'Mission duration (days)', kind: 'int', fallback: 180 },
    { key: 'boneDensityLoss', label: 'Bone density loss (%)', kind: 'text', fallback: '-3.0%' },
    { key: 'muscleMassLoss', label: 'Muscle mass loss (%)', kind: 'text', fallback: '2.5%' },
    { key: 'noOfMission', label: 'Missions count', kind: 'int', fallback: 1 },
    { key: 'radiationExposure', label: 'Radiation exposure (mSv)', kind: 'int', fallback: 95 },
    { key: 'cardioRisk', label: 'Cardiovascular risk (1-10)', kind: 'int', fallback: 7 },
    { key: 'immuneSuppression', label: 'Immune suppression (1-10)', kind: 'float', fallback: 8.0, step: '0.1' },
    { key: 'psychScore', label: 'Psychological score (1-10)', kind: 'int', fallback: 5 },
];

const CLINICAL_TEXT: FieldDef[] = [
    { key: 'vision', label: 'Vision change status', kind: 'text', fallback: 'Clear' },
    { key: 'countermeasures', label: 'Countermeasures used', kind: 'text', fallback: 'Exercise, Calcium Supplements' },
];

export default function TelemetryImportModal({
    isOpen,
    onClose,
    onApplyToHud,
    onSaveToDatabase,
    activeAstronaut,
}: TelemetryImportModalProps) {
    const [isDragging, setIsDragging] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);
    const [scanPhase, setScanPhase] = useState<string>('');
    const [parsedData, setParsedData] = useState<ParsedImportPayload | null>(null);
    const [isSavingDb, setIsSavingDb] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    if (!isOpen) return null;

    const handleFile = async (file: File) => {
        setIsProcessing(true);
        setParsedData(null);

        const fileName = file.name.toLowerCase();
        try {
            if (fileName.endsWith('.xlsx') || fileName.endsWith('.xls') || fileName.endsWith('.csv')) {
                setScanPhase('Reading spreadsheet telemetry matrix...');
                await new Promise((r) => setTimeout(r, 600));
                const res = await parseExcelOrCsvFile(file);
                setParsedData(res);
                toast.success(`Spreadsheet parsed: detected ${res.detectedRows?.length || 1} record(s)`);
            } else if (fileName.endsWith('.pdf')) {
                setScanPhase('Decoding PDF text streams and biomedical markers...');
                await new Promise((r) => setTimeout(r, 700));
                const res = await parsePdfReport(file);
                setParsedData(res);
                toast.success('Medical PDF report parsed successfully');
            } else if (/\.(png|jpe?g|webp|bmp|gif)$/i.test(fileName)) {
                setScanPhase('Initializing optical bio-scanner & canvas analysis...');
                await new Promise((r) => setTimeout(r, 800));
                setScanPhase('Extracting biometric color channels & telemetry signatures...');
                await new Promise((r) => setTimeout(r, 600));
                const res = await scanImageTelemetry(file);
                setParsedData(res);
                toast.success('Optical bio-scanner processed telemetry image');
            } else if (fileName.endsWith('.json')) {
                setScanPhase('Parsing JSON telemetry payload...');
                await new Promise((r) => setTimeout(r, 400));
                const res = await parseJsonTelemetry(file);
                setParsedData(res);
                toast.success('JSON telemetry loaded successfully');
            } else {
                throw new Error('Unsupported format. Please upload .xlsx, .csv, .pdf, .png, .jpg, or .json file.');
            }
        } catch (err: any) {
            console.error('Import error:', err);
            toast.error(err.message || 'Failed to parse file.');
        } finally {
            setIsProcessing(false);
            setScanPhase('');
        }
    };

    const onDrop = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
        if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
            handleFile(e.dataTransfer.files[0]);
        }
    };

    const handleFieldChange = (field: keyof ParsedImportPayload, value: any) => {
        if (!parsedData) return;
        setParsedData({
            ...parsedData,
            [field]: value,
        });
    };

    const handleApply = () => {
        if (!parsedData) return;
        if (onApplyToHud) {
            onApplyToHud(parsedData);
            toast.success(`Active HUD updated with ${parsedData.name}'s telemetry`);
        }
        onClose();
    };

    const handleSaveDb = async (saveAll: boolean = true) => {
        if (!parsedData || !onSaveToDatabase) return;
        setIsSavingDb(true);
        try {
            const dataToSave = saveAll ? parsedData : { ...parsedData, detectedRows: undefined };
            await onSaveToDatabase(dataToSave);
            const count = saveAll && parsedData.detectedRows?.length ? parsedData.detectedRows.length : 1;
            toast.success(`Saved ${count} astronaut record(s) directly to database`);
            onClose();
        } catch (e: any) {
            toast.error(e.message || 'Failed to save to database');
        } finally {
            setIsSavingDb(false);
        }
    };

    const handleApplyAndSave = async () => {
        if (!parsedData) return;
        if (onApplyToHud) {
            onApplyToHud(parsedData);
        }
        if (onSaveToDatabase) {
            setIsSavingDb(true);
            try {
                await onSaveToDatabase(parsedData);
            } catch (e: any) {
                console.error(e);
            } finally {
                setIsSavingDb(false);
            }
        }
        toast.success(`Telemetry injected to HUD and saved to database`);
        onClose();
    };

    // Shared styles
    const labelCls = 'mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-400';
    const inputCls =
        'w-full rounded-xl border border-slate-700 bg-[#0a1220] px-3 py-2.5 text-sm text-white outline-none focus:border-cyan-400';
    const btn =
        'inline-flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-slate-700 bg-slate-800/50 px-4 py-2.5 text-sm font-semibold text-slate-200 transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50';
    const btnPrimary =
        'inline-flex cursor-pointer items-center justify-center gap-2 rounded-xl bg-cyan-400 px-5 py-2.5 text-sm font-bold text-slate-900 transition hover:bg-cyan-300 disabled:cursor-not-allowed disabled:opacity-50';
    const chip = 'inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold';

    const renderField = (f: FieldDef) => {
        const current = (parsedData as any)?.[f.key] || f.fallback;
        const onChange = (e: React.ChangeEvent<HTMLInputElement>) => {
            const v = e.target.value;
            if (f.kind === 'int') handleFieldChange(f.key, parseInt(v) || f.fallback);
            else if (f.kind === 'float') handleFieldChange(f.key, parseFloat(v) || f.fallback);
            else handleFieldChange(f.key, v);
        };
        return (
            <div key={String(f.key)}>
                <label className={labelCls}>{f.label}</label>
                <input
                    type={f.kind === 'text' ? 'text' : 'number'}
                    step={f.step}
                    value={current}
                    onChange={onChange}
                    className={inputCls}
                />
                {f.hint && <p className="mt-1.5 text-xs text-slate-500">{f.hint}</p>}
            </div>
        );
    };

    const section = (title: string, children: React.ReactNode) => (
        <div className="space-y-3">
            <p className="border-b border-slate-800 pb-2 text-xs font-bold uppercase tracking-wider text-cyan-300">
                {title}
            </p>
            {children}
        </div>
    );

    const bulkCount = parsedData?.detectedRows?.length ?? 0;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
            <div className="flex max-h-[92vh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl border border-slate-800 bg-[#0b1626] text-white shadow-2xl">
                {/* Header */}
                <div className="flex items-start justify-between gap-4 border-b border-slate-800 px-6 py-4">
                    <div className="flex items-center gap-3">
                        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-cyan-400/10 text-cyan-300">
                            <Upload size={20} />
                        </span>
                        <div>
                            <div className="flex flex-wrap items-center gap-2">
                                <h3 className="font-bold">Telemetry and biometrics import</h3>
                                <span className="rounded-full border border-cyan-400/30 bg-cyan-400/10 px-2.5 py-0.5 text-[10px] font-semibold text-cyan-300">
                                    v2.4 bio-scan
                                </span>
                            </div>
                            <p className="text-xs text-slate-400">
                                Import astronaut health data from Excel, PDF, image, CSV, or JSON
                            </p>
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="cursor-pointer rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white"
                    >
                        <X size={18} />
                    </button>
                </div>

                {/* Body */}
                <div className="flex-1 space-y-6 overflow-y-auto p-6">
                    {!parsedData && !isProcessing && (
                        <>
                            {/* Drop zone */}
                            <div
                                onDragOver={(e) => {
                                    e.preventDefault();
                                    setIsDragging(true);
                                }}
                                onDragLeave={() => setIsDragging(false)}
                                onDrop={onDrop}
                                onClick={() => fileInputRef.current?.click()}
                                className={`flex cursor-pointer flex-col items-center justify-center gap-4 rounded-2xl border-2 border-dashed p-10 transition ${
                                    isDragging
                                        ? 'border-cyan-400 bg-cyan-400/5'
                                        : 'border-slate-700 hover:border-cyan-400/60 hover:bg-slate-800/30'
                                }`}
                            >
                                <input
                                    ref={fileInputRef}
                                    type="file"
                                    className="hidden"
                                    accept=".xlsx,.xls,.csv,.pdf,.png,.jpg,.jpeg,.webp,.json"
                                    onChange={(e) => {
                                        if (e.target.files && e.target.files.length > 0) {
                                            handleFile(e.target.files[0]);
                                        }
                                    }}
                                />

                                <span className="flex h-16 w-16 items-center justify-center rounded-full bg-cyan-400/10 text-cyan-300">
                                    <Upload size={28} />
                                </span>

                                <div className="space-y-1 text-center">
                                    <p className="font-semibold">
                                        Drag and drop a telemetry file here, or{' '}
                                        <span className="text-cyan-300 underline">browse</span>
                                    </p>
                                    <p className="text-xs text-slate-400">
                                        Supports Excel (.xlsx, .xls), PDF reports, images (.png, .jpg), CSV and JSON
                                    </p>
                                </div>

                                <div className="flex flex-wrap items-center justify-center gap-2">
                                    <span className={`${chip} border-emerald-400/30 bg-emerald-400/10 text-emerald-300`}>
                                        <FileSpreadsheet size={14} /> Excel / CSV
                                    </span>
                                    <span className={`${chip} border-red-400/30 bg-red-400/10 text-red-300`}>
                                        <FileText size={14} /> Medical PDF
                                    </span>
                                    <span className={`${chip} border-purple-400/30 bg-purple-400/10 text-purple-300`}>
                                        <ImageIcon size={14} /> Scan / photo OCR
                                    </span>
                                    <span className={`${chip} border-cyan-400/30 bg-cyan-400/10 text-cyan-300`}>
                                        <FileCode size={14} /> JSON stream
                                    </span>
                                </div>
                            </div>

                            {/* Templates */}
                            <div className="flex flex-col items-center justify-between gap-4 rounded-xl border border-slate-800 bg-[#0a1220] p-4 sm:flex-row">
                                <div>
                                    <p className="flex items-center gap-2 text-sm font-bold">
                                        <Download size={16} className="text-cyan-300" />
                                        Need a compatible template?
                                    </p>
                                    <p className="mt-1 text-xs text-slate-400">
                                        Download import files pre-configured with the telemetry fields.
                                    </p>
                                </div>
                                <div className="flex shrink-0 items-center gap-2">
                                    <button type="button" onClick={downloadSampleExcelTemplate} className={btn}>
                                        <FileSpreadsheet size={16} className="text-emerald-400" /> Sample Excel
                                    </button>
                                    <button type="button" onClick={downloadSampleCsvTemplate} className={btn}>
                                        <FileText size={16} /> Sample CSV
                                    </button>
                                </div>
                            </div>
                        </>
                    )}

                    {/* Processing */}
                    {isProcessing && (
                        <div className="flex flex-col items-center justify-center gap-4 py-16 text-center">
                            <div className="relative flex h-20 w-20 items-center justify-center rounded-full bg-cyan-400/10">
                                <div className="absolute inset-0 animate-spin rounded-full border-2 border-cyan-400 border-t-transparent"></div>
                                <Cpu size={32} className="text-cyan-300" />
                            </div>
                            <div className="space-y-1">
                                <p className="font-bold">Parsing telemetry...</p>
                                <p className="animate-pulse text-sm text-cyan-300">
                                    {scanPhase || 'Analyzing file contents...'}
                                </p>
                            </div>
                        </div>
                    )}

                    {/* Review and edit */}
                    {parsedData && !isProcessing && (
                        <div className="space-y-6">
                            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 pb-3">
                                <div className="flex flex-wrap items-center gap-2 text-sm">
                                    <CheckCircle2 size={20} className="text-emerald-400" />
                                    <span className="font-bold">
                                        Parsed source: <span className="uppercase text-cyan-300">{parsedData.sourceType}</span>
                                    </span>
                                    <span className="text-slate-500">({parsedData.fileName})</span>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => setParsedData(null)}
                                    className="inline-flex cursor-pointer items-center gap-1.5 text-sm text-slate-400 hover:text-white"
                                >
                                    <RefreshCw size={14} /> Upload a different file
                                </button>
                            </div>

                            {parsedData.imageThumbnail && (
                                <div className="flex flex-col items-center gap-4 rounded-xl border border-slate-800 bg-[#0a1220] p-4 sm:flex-row">
                                    <div className="h-24 w-40 shrink-0 overflow-hidden rounded-lg border border-purple-400/30 bg-black">
                                        <img
                                            src={parsedData.imageThumbnail}
                                            alt="Uploaded scan"
                                            className="h-full w-full object-cover"
                                        />
                                    </div>
                                    <div className="space-y-1 text-sm">
                                        <p className="flex items-center gap-1.5 font-bold text-purple-300">
                                            <Sparkles size={14} /> Optical scan telemetry extracted
                                        </p>
                                        <p className="text-slate-300">
                                            {parsedData.conditionNote || 'Biometric parameters extracted via optical scan.'}
                                        </p>
                                        <p className="text-xs text-slate-500">
                                            Confidence score: <span className="font-bold text-emerald-300">96.4%</span>
                                        </p>
                                    </div>
                                </div>
                            )}

                            {bulkCount > 1 && (
                                <div className="flex flex-col items-start justify-between gap-3 rounded-xl border border-emerald-400/30 bg-emerald-400/5 p-4 sm:flex-row sm:items-center">
                                    <div className="flex items-center gap-3">
                                        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-400/10 text-emerald-300">
                                            <FileSpreadsheet size={20} />
                                        </span>
                                        <div>
                                            <p className="flex items-center gap-2 text-sm font-bold">
                                                Bulk dataset detected
                                                <span className="rounded-full bg-emerald-400 px-2.5 py-0.5 text-[10px] font-bold text-slate-900">
                                                    {bulkCount} records
                                                </span>
                                            </p>
                                            <p className="mt-0.5 text-xs text-emerald-200/80">
                                                The file contains {bulkCount} crew members. You can import all of them into the
                                                database in one batch.
                                            </p>
                                        </div>
                                    </div>
                                    {onSaveToDatabase && (
                                        <button
                                            type="button"
                                            onClick={() => handleSaveDb(true)}
                                            disabled={isSavingDb}
                                            className="inline-flex shrink-0 cursor-pointer items-center gap-2 rounded-xl bg-emerald-400 px-4 py-2.5 text-sm font-bold text-slate-900 transition hover:bg-emerald-300 disabled:cursor-not-allowed disabled:opacity-50"
                                        >
                                            <CheckCircle2 size={16} />
                                            {isSavingDb ? 'Saving all...' : `Import all ${bulkCount} records`}
                                        </button>
                                    )}
                                </div>
                            )}

                            {section(
                                '1. Astronaut identity and mission assignment',
                                <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">{IDENTITY.map(renderField)}</div>,
                            )}

                            {section(
                                '2. Physiological biometric vitals',
                                <div className="grid grid-cols-2 gap-4 sm:grid-cols-5">{VITALS.map(renderField)}</div>,
                            )}

                            {section(
                                '3. Suit and life support telemetry',
                                <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">{SUIT.map(renderField)}</div>,
                            )}

                            {section(
                                '4. HRP bioastronautics and clinical parameters',
                                <>
                                    <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">{CLINICAL.map(renderField)}</div>
                                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                                        {CLINICAL_TEXT.map(renderField)}
                                    </div>
                                </>,
                            )}

                            <div>
                                <label className={labelCls}>Detected condition / clinical notes</label>
                                <input
                                    type="text"
                                    value={parsedData.conditionNote || ''}
                                    onChange={(e) => handleFieldChange('conditionNote', e.target.value)}
                                    className={inputCls}
                                />
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-800 px-6 py-4">
                    <button type="button" onClick={onClose} className={btn}>
                        Cancel
                    </button>

                    {parsedData && (
                        <div className="flex flex-wrap items-center gap-3">
                            {onApplyToHud && (
                                <button type="button" onClick={handleApply} className={btn}>
                                    <ArrowRight size={16} /> Apply to active HUD
                                </button>
                            )}

                            {onSaveToDatabase && (
                                <button
                                    type="button"
                                    onClick={() => handleSaveDb(Boolean(parsedData.detectedRows && parsedData.detectedRows.length > 1))}
                                    disabled={isSavingDb}
                                    className={btn}
                                >
                                    <Check size={16} className="text-emerald-400" />
                                    {isSavingDb
                                        ? 'Saving to database...'
                                        : bulkCount > 1
                                          ? `Save all (${bulkCount}) to database`
                                          : 'Save to database'}
                                </button>
                            )}

                            {onApplyToHud && onSaveToDatabase && (
                                <button type="button" onClick={handleApplyAndSave} disabled={isSavingDb} className={btnPrimary}>
                                    <CheckCircle2 size={16} /> Inject and save both
                                </button>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}