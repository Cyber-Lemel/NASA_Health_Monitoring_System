import React, { useState, useEffect } from 'react';
import {
    X,
    Activity,
    Heart,
    Eye,
    Radio,
    Zap,
    Biohazard,
    AlertTriangle,
    Sparkles,
    CheckCircle2,
    RefreshCw,
    Play,
    Check,
    Info,
} from 'lucide-react';
import type { AstronautFullData } from '@/types/astronaut';
import { toast } from 'sonner';

interface HealthRiskModalProps {
    isOpen: boolean;
    onClose: () => void;
    astronaut?: AstronautFullData | null;
    onExecuteAction?: (actionTitle: string, details: string) => void;
}

export default function AstronautHealthRiskModal({
    isOpen,
    onClose,
    astronaut,
    onExecuteAction,
}: HealthRiskModalProps) {
    const [activeTab, setActiveTab] = useState<'analyzer' | 'knowledge'>('analyzer');

    // Input States
    const [systolic, setSystolic] = useState<number>(148);
    const [diastolic, setDiastolic] = useState<number>(96);
    const [heartRate, setHeartRate] = useState<number>(astronaut?.vitals.heartRate.numericValue ?? 118);
    const [spo2, setSpo2] = useState<number>(astronaut?.vitals.spO2.numericValue ?? 97);
    const [coreTemp, setCoreTemp] = useState<number>(astronaut?.vitals.coreTemp.numericValue ?? 37.1);
    const [radiationRate, setRadiationRate] = useState<number>(0.22);
    const [boneLoss, setBoneLoss] = useState<number>(parseFloat(astronaut?.bio.boneDensityLoss || '-3.2'));
    const [cabinCo2, setCabinCo2] = useState<number>(2.8);
    const [hydration, setHydration] = useState<number>(astronaut?.vitals.hydration.numericValue ?? 72);

    // API Result State
    const [loading, setLoading] = useState<boolean>(false);
    const [analysisResult, setAnalysisResult] = useState<any>(null);
    const [knowledgeData, setKnowledgeData] = useState<any>(null);
    const [completedActions, setCompletedActions] = useState<Set<string>>(new Set());
    const [executingId, setExecutingId] = useState<string | null>(null);

    useEffect(() => {
        if (isOpen) {
            runAnalysis();
            fetchKnowledge();
        }
    }, [isOpen]);

    const runAnalysis = async () => {
        setLoading(true);
        try {
            const customKey = localStorage.getItem('orbit_gemini_api_key') || undefined;
            const customModel = localStorage.getItem('orbit_gemini_model') || 'gemini-3-flash-preview';

            const response = await fetch('/api/astronaut/health-risk/analyze', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Accept: 'application/json',
                    ...(customKey ? { 'X-Gemini-Key': customKey } : {}),
                    'X-Gemini-Model': customModel,
                },
                body: JSON.stringify({
                    systolic_bp: systolic,
                    diastolic_bp: diastolic,
                    heart_rate: heartRate,
                    sp_o2: spo2,
                    core_temp: coreTemp,
                    radiation_rate: radiationRate,
                    bone_loss_pct: boneLoss,
                    cabin_co2: cabinCo2,
                    hydration_pct: hydration,
                    astronaut_name: astronaut?.bio.name || 'CDR. Reid Wiseman',
                    astronaut_id: astronaut?.bio.id || 'AST-01',
                    ai_analysis: true,
                    gemini_api_key: customKey,
                    gemini_model: customModel,
                }),
            });

            const data = await response.json();
            if (response.ok && data.success) {
                setAnalysisResult(data);
            } else {
                toast.error(data.message || 'Health risk evaluation failed.');
            }
        } catch (error) {
            console.error('Risk analysis error:', error);
            toast.error('Failed to communicate with ORBIT Health Risk Engine.');
        } finally {
            setLoading(false);
        }
    };

    const fetchKnowledge = async () => {
        try {
            const res = await fetch('/api/astronaut/health-risk/knowledge');
            const data = await res.json();
            if (res.ok && data.success) {
                setKnowledgeData(data.knowledge_base);
            }
        } catch (err) {
            console.error('Failed to load knowledge base:', err);
        }
    };

    const applyPreset = (presetName: string) => {
        if (presetName === 'high_bp_crisis') {
            setSystolic(162);
            setDiastolic(102);
            setHeartRate(110);
            setSpo2(97);
            setCoreTemp(37.2);
            setRadiationRate(0.2);
            setBoneLoss(-3.5);
            setCabinCo2(3.1);
            setHydration(68);
            toast.warning('Scenario Applied: Stage 2 Hypertension & SANS Risk (162/102 mmHg)');
        } else if (presetName === 'stage1_hypertension') {
            setSystolic(145);
            setDiastolic(94);
            setHeartRate(95);
            setSpo2(98);
            setCoreTemp(37.0);
            setRadiationRate(0.18);
            setBoneLoss(-2.6);
            setCabinCo2(2.7);
            setHydration(74);
            toast.info('Scenario Applied: Stage 1 Hypertension in Microgravity (145/94 mmHg)');
        } else if (presetName === 'hypercapnia') {
            setSystolic(138);
            setDiastolic(88);
            setHeartRate(120);
            setSpo2(95);
            setCoreTemp(37.4);
            setCabinCo2(3.6);
            toast.info('Scenario Applied: Cabin CO2 Toxicity (3.6 mmHg)');
        } else if (presetName === 'radiation_surge') {
            setRadiationRate(0.65);
            setSystolic(126);
            setDiastolic(82);
            toast.warning('Scenario Applied: Solar Particle Event (SPE) Surge (0.65 mSv/h)');
        } else if (presetName === 'nominal') {
            setSystolic(118);
            setDiastolic(76);
            setHeartRate(72);
            setSpo2(99);
            setCoreTemp(36.9);
            setRadiationRate(0.18);
            setBoneLoss(-1.2);
            setCabinCo2(1.8);
            setHydration(84);
            toast.success('Scenario Applied: Nominal Artemis Spaceflight Profile (118/76 mmHg)');
        }
    };

    const handleExecuteCountermeasure = async (action: string) => {
        setExecutingId(action);
        toast.info(`[AUTONOMOUS COUNTERMEASURE] Initiating: ${action}`);

        await new Promise((r) => setTimeout(r, 700));

        setCompletedActions((prev) => new Set([...prev, action]));
        setExecutingId(null);
        toast.success(`[EXECUTED] Protocol verified and logged: ${action}`);

        if (onExecuteAction) {
            onExecuteAction('Autonomous Countermeasure Executed', action);
        }
    };

    if (!isOpen) return null;

    // Shared styles
    const card = 'rounded-3xl border border-[#1b2a3a] bg-[#0a121d]';
    const inner = 'rounded-2xl border border-[#1b2a3a] bg-[#0c1521]';
    const labelCls = 'block text-[11px] font-semibold uppercase tracking-wider text-slate-400';
    const inputCls =
        'mt-2 w-full rounded-xl border border-[#24384d] bg-[#05080f] px-3 py-2.5 text-sm font-semibold text-white outline-none focus:border-cyan-400';
    const presetBtn =
        'inline-flex cursor-pointer items-center gap-2 rounded-full border px-3.5 py-2 text-xs font-semibold transition';

    const riskBadgeColor =
        analysisResult?.overall_risk_level === 'CRITICAL_EMERGENCY'
            ? 'border-red-500/40 bg-red-500/10 text-red-300'
            : analysisResult?.overall_risk_level === 'HIGH_RISK'
              ? 'border-amber-400/40 bg-amber-400/10 text-amber-300'
              : analysisResult?.overall_risk_level === 'MODERATE_RISK'
                ? 'border-sky-400/40 bg-sky-400/10 text-sky-300'
                : 'border-emerald-400/40 bg-emerald-400/10 text-emerald-300';

    const fields = [
        { label: 'Systolic BP', unit: 'mmHg', value: systolic, set: setSystolic, hint: 'Nominal: < 120', step: undefined },
        { label: 'Diastolic BP', unit: 'mmHg', value: diastolic, set: setDiastolic, hint: 'Nominal: < 80', step: undefined },
        { label: 'Heart Rate', unit: 'bpm', value: heartRate, set: setHeartRate, hint: 'Nominal: 60 - 100', step: undefined },
        { label: 'SpO2 Oxygen', unit: '%', value: spo2, set: setSpo2, hint: 'Nominal: 95 - 100%', step: '0.5' },
        { label: 'Cabin pCO2', unit: 'mmHg', value: cabinCo2, set: setCabinCo2, hint: 'Limit: < 3.0 mmHg', step: '0.1' },
    ];

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#05080f]/80 p-3 backdrop-blur-sm sm:p-5">
            <div className="flex max-h-[92vh] w-full max-w-5xl flex-col overflow-hidden rounded-3xl border border-[#1b2a3a] bg-[#05080f] text-white shadow-2xl">
                {/* Header */}
                <div className="flex shrink-0 flex-col justify-between gap-3 border-b border-[#1b2a3a] bg-[#0a121d] px-6 py-4 sm:flex-row sm:items-center">
                    <div className="flex items-center gap-3">
                        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-cyan-400/10 text-cyan-300">
                            <Activity size={20} />
                        </span>
                        <div>
                            <p className="text-[10px] font-bold uppercase tracking-widest text-cyan-400">
                                NASA-STD-3001
                            </p>
                            <h3 className="font-bold">Astronaut Health Risk Analysis</h3>
                            <p className="text-xs text-slate-400">
                                Microgravity pathology and autonomous countermeasures
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        <div className="flex rounded-full border border-[#24384d] bg-[#0c1521] p-1 text-sm">
                            {(['analyzer', 'knowledge'] as const).map((tab) => (
                                <button
                                    key={tab}
                                    type="button"
                                    onClick={() => setActiveTab(tab)}
                                    className={`cursor-pointer rounded-full px-4 py-1.5 font-semibold transition ${
                                        activeTab === tab
                                            ? 'bg-cyan-300 text-[#05080f]'
                                            : 'text-slate-400 hover:text-white'
                                    }`}
                                >
                                    {tab === 'analyzer' ? 'Risk analyzer' : 'Reference'}
                                </button>
                            ))}
                        </div>
                        <button
                            type="button"
                            onClick={onClose}
                            className="cursor-pointer rounded-lg p-2 text-slate-400 hover:bg-[#112030] hover:text-white"
                        >
                            <X size={18} />
                        </button>
                    </div>
                </div>

                {/* Content */}
                <div className="flex-1 space-y-5 overflow-y-auto p-6">
                    {activeTab === 'analyzer' && (
                        <>
                            {/* Presets */}
                            <div className={`${card} p-5`}>
                                <div className="flex flex-wrap items-center justify-between gap-2">
                                    <span className="flex items-center gap-2 text-sm font-bold">
                                        <Sparkles size={16} className="text-cyan-300" />
                                        Quick scenario presets
                                    </span>
                                    <span className="text-xs text-slate-500">
                                        Click a scenario to fill the values and evaluate
                                    </span>
                                </div>
                                <div className="mt-4 flex flex-wrap gap-2">
                                    <button
                                        type="button"
                                        onClick={() => {
                                            applyPreset('high_bp_crisis');
                                            runAnalysis();
                                        }}
                                        className={`${presetBtn} border-red-500/30 bg-red-500/10 text-red-300 hover:bg-red-500/20`}
                                    >
                                        <Heart size={14} /> High blood pressure crisis (162/102)
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            applyPreset('stage1_hypertension');
                                            runAnalysis();
                                        }}
                                        className={`${presetBtn} border-amber-400/30 bg-amber-400/10 text-amber-300 hover:bg-amber-400/20`}
                                    >
                                        <Eye size={14} /> Stage 1 hypertension and SANS (145/94)
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            applyPreset('hypercapnia');
                                            runAnalysis();
                                        }}
                                        className={`${presetBtn} border-purple-400/30 bg-purple-400/10 text-purple-300 hover:bg-purple-400/20`}
                                    >
                                        <Biohazard size={14} /> CO2 hypercapnia (3.6 mmHg)
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            applyPreset('radiation_surge');
                                            runAnalysis();
                                        }}
                                        className={`${presetBtn} border-sky-400/30 bg-sky-400/10 text-sky-300 hover:bg-sky-400/20`}
                                    >
                                        <Radio size={14} /> Radiation storm (0.65 mSv/h)
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            applyPreset('nominal');
                                            runAnalysis();
                                        }}
                                        className={`${presetBtn} border-emerald-400/30 bg-emerald-400/10 text-emerald-300 hover:bg-emerald-400/20`}
                                    >
                                        <CheckCircle2 size={14} /> Nominal flight profile
                                    </button>
                                </div>
                            </div>

                            {/* Inputs */}
                            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
                                {fields.map((f) => (
                                    <div key={f.label} className={`${card} p-4`}>
                                        <label className={labelCls}>
                                            {f.label} <span className="font-normal normal-case text-slate-500">{f.unit}</span>
                                        </label>
                                        <input
                                            type="number"
                                            step={f.step}
                                            value={f.value}
                                            onChange={(e) => f.set(Number(e.target.value))}
                                            className={inputCls}
                                        />
                                        <p className="mt-2 text-xs text-slate-500">{f.hint}</p>
                                    </div>
                                ))}
                            </div>

                            {/* Evaluate */}
                            <div className="flex flex-wrap items-center justify-between gap-3">
                                <p className="text-sm text-slate-400">
                                    Target astronaut:{' '}
                                    <strong className="text-white">{astronaut?.bio.name || 'CDR. Reid Wiseman'}</strong>{' '}
                                    <span className="text-slate-500">({astronaut?.bio.id || 'AST-01'})</span>
                                </p>
                                <button
                                    type="button"
                                    onClick={runAnalysis}
                                    disabled={loading}
                                    className="inline-flex cursor-pointer items-center gap-2 rounded-full bg-cyan-300 px-5 py-2.5 text-sm font-bold text-[#05080f] transition hover:bg-cyan-200 disabled:cursor-not-allowed disabled:opacity-50"
                                >
                                    <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
                                    Evaluate health risks
                                </button>
                            </div>

                            {/* Results */}
                            {analysisResult && (
                                <div className="space-y-5">
                                    {/* Overall */}
                                    <div className={`${card} flex flex-col justify-between gap-4 p-5 md:flex-row md:items-center`}>
                                        <div className="space-y-2">
                                            <div className="flex flex-wrap items-center gap-3">
                                                <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                                                    Health risk level
                                                </span>
                                                <span
                                                    className={`rounded-full border px-3 py-1 text-xs font-bold ${riskBadgeColor}`}
                                                >
                                                    {analysisResult.overall_risk_level}
                                                </span>
                                                <span className="text-sm text-slate-400">
                                                    Health index{' '}
                                                    <strong className="text-lg text-white">
                                                        {analysisResult.health_score} / 100
                                                    </strong>
                                                </span>
                                                {analysisResult.gemini_flight_clearance && (
                                                    <span className="flex items-center gap-1.5 rounded-full border border-cyan-400/50 bg-cyan-950/90 px-3 py-0.5 text-xs font-bold text-cyan-300">
                                                        <Sparkles size={12} className="text-cyan-400 animate-pulse" />
                                                        EVA: {analysisResult.gemini_flight_clearance}
                                                    </span>
                                                )}
                                            </div>
                                            {analysisResult.ai_powered && (
                                                <div className="flex items-center gap-2 text-[11px] font-mono text-cyan-300/90">
                                                    <Sparkles size={12} className="text-cyan-400" />
                                                    <span>CLINICAL REASONING: {analysisResult.ai_engine}</span>
                                                </div>
                                            )}
                                            <p className="text-sm leading-relaxed text-slate-300">
                                                {analysisResult.clinical_summary}
                                            </p>
                                        </div>

                                        {analysisResult.hazard_correlations?.length > 0 && (
                                            <div className="md:max-w-xs md:text-right">
                                                <span className="mb-2 block text-xs font-semibold uppercase tracking-wider text-slate-400">
                                                    Correlated NASA hazards
                                                </span>
                                                {analysisResult.hazard_correlations.map((hz: string, idx: number) => (
                                                    <span
                                                        key={idx}
                                                        className="mb-1 ml-1 inline-block rounded-full border border-cyan-400/30 bg-cyan-400/10 px-2.5 py-0.5 text-xs text-cyan-300"
                                                    >
                                                        {hz}
                                                    </span>
                                                ))}
                                            </div>
                                        )}
                                    </div>

                                    {/* Identified risks */}
                                    <div className="space-y-3">
                                        <h4 className="flex items-center gap-2 border-b border-[#1b2a3a] pb-2 text-sm font-bold">
                                            <AlertTriangle size={16} className="text-amber-400" />
                                            Identified risks and spaceflight pathophysiology (
                                            {analysisResult.identified_risks_count})
                                        </h4>

                                        {analysisResult.identified_risks?.length === 0 ? (
                                            <div className="flex items-center gap-2 rounded-3xl border border-emerald-400/20 bg-emerald-400/5 p-4 text-sm text-emerald-300">
                                                <CheckCircle2 size={16} className="shrink-0" />
                                                All physiological parameters are within nominal NASA-STD-3001 exploration
                                                limits. No acute spaceflight pathology detected.
                                            </div>
                                        ) : (
                                            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                                                {analysisResult.identified_risks.map((risk: any, rIdx: number) => {
                                                    const isCrit = risk.risk_severity === 'CRITICAL';
                                                    return (
                                                        <div
                                                            key={rIdx}
                                                            className={`space-y-3 rounded-3xl border p-4 ${
                                                                isCrit
                                                                    ? 'border-red-500/30 bg-red-500/5'
                                                                    : 'border-amber-400/30 bg-amber-400/5'
                                                            }`}
                                                        >
                                                            <div className="flex items-start justify-between gap-2">
                                                                <span className="text-sm font-bold">{risk.title}</span>
                                                                <span
                                                                    className={`shrink-0 rounded-full border px-2.5 py-0.5 text-[10px] font-bold ${
                                                                        isCrit
                                                                            ? 'border-red-500/40 bg-red-500/10 text-red-300'
                                                                            : 'border-amber-400/40 bg-amber-400/10 text-amber-300'
                                                                    }`}
                                                                >
                                                                    {risk.value} • {risk.risk_severity}
                                                                </span>
                                                            </div>

                                                            <div className={`${inner} p-3`}>
                                                                <p className="text-[11px] font-bold uppercase tracking-wider text-cyan-300">
                                                                    Microgravity pathophysiology
                                                                </p>
                                                                <p className="mt-1 text-xs leading-relaxed text-slate-400">
                                                                    {risk.pathophysiology}
                                                                </p>
                                                            </div>

                                                            <div>
                                                                <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                                                                    Possible spaceflight risks
                                                                </p>
                                                                <ul className="mt-1.5 space-y-1 text-xs text-slate-300">
                                                                    {risk.possible_spaceflight_risks?.map(
                                                                        (c: string, cIdx: number) => (
                                                                            <li key={cIdx} className="flex items-start gap-2">
                                                                                <span className="text-amber-400">•</span>
                                                                                <span>{c}</span>
                                                                            </li>
                                                                        ),
                                                                    )}
                                                                </ul>
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        )}
                                    </div>

                                    {/* Countermeasures */}
                                    {analysisResult.autonomous_countermeasures?.length > 0 && (
                                        <div className={`${card} space-y-3 p-5`}>
                                            <div className="flex items-center justify-between border-b border-[#1b2a3a] pb-3">
                                                <span className="flex items-center gap-2 text-sm font-bold">
                                                    <Zap size={16} className="text-cyan-300" />
                                                    Autonomous NASA-STD-3001 countermeasures
                                                </span>
                                                <span className="rounded-full border border-cyan-400/30 bg-cyan-400/10 px-2.5 py-0.5 text-[10px] font-semibold text-cyan-300">
                                                    Actionable protocols
                                                </span>
                                            </div>

                                            <div className="space-y-2">
                                                {analysisResult.autonomous_countermeasures.map(
                                                    (actionText: string, aIdx: number) => {
                                                        const isDone = completedActions.has(actionText);
                                                        const isExecuting = executingId === actionText;
                                                        return (
                                                            <div
                                                                key={aIdx}
                                                                className={`${inner} flex flex-col items-start justify-between gap-3 p-3 text-sm sm:flex-row sm:items-center`}
                                                            >
                                                                <div className="flex items-start gap-3">
                                                                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-cyan-400/10 text-xs font-bold text-cyan-300">
                                                                        {aIdx + 1}
                                                                    </span>
                                                                    <span className="text-slate-200">{actionText}</span>
                                                                </div>
                                                                <button
                                                                    type="button"
                                                                    disabled={isDone || isExecuting}
                                                                    onClick={() => handleExecuteCountermeasure(actionText)}
                                                                    className={`inline-flex shrink-0 items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-xs font-semibold transition ${
                                                                        isDone
                                                                            ? 'cursor-default border-emerald-400/30 bg-emerald-400/10 text-emerald-300'
                                                                            : 'cursor-pointer border-cyan-400/40 text-cyan-300 hover:bg-cyan-400 hover:text-slate-900'
                                                                    }`}
                                                                >
                                                                    {isDone ? (
                                                                        <>
                                                                            <Check size={14} /> Executed
                                                                        </>
                                                                    ) : (
                                                                        <>
                                                                            <Play size={14} />
                                                                            {isExecuting ? 'Initiating...' : 'Execute now'}
                                                                        </>
                                                                    )}
                                                                </button>
                                                            </div>
                                                        );
                                                    },
                                                )}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}
                        </>
                    )}

                    {activeTab === 'knowledge' && (
                        <div className="space-y-4">
                            <div className={`${card} p-5`}>
                                <h4 className="flex items-center gap-2 text-sm font-bold">
                                    <Info size={16} className="text-cyan-300" />
                                    NASA HRP clinical reference thresholds
                                </h4>
                                <p className="mt-1 text-xs text-slate-400">
                                    Medical guidelines for long-duration deep space exploration under NASA-STD-3001.
                                </p>
                            </div>

                            {knowledgeData ? (
                                <div className="space-y-4">
                                    {Object.entries(knowledgeData).map(([key, item]: [string, any]) => (
                                        <div key={key} className={`${card} space-y-3 p-5`}>
                                            <div className="flex flex-col justify-between gap-1 border-b border-[#1b2a3a] pb-3 sm:flex-row sm:items-center">
                                                <span className="font-bold">{item.parameter}</span>
                                                <span className="text-xs font-semibold text-amber-300">
                                                    Danger limit: {item.spaceflight_danger_threshold}
                                                </span>
                                            </div>

                                            <div>
                                                <p className="text-[11px] font-bold uppercase tracking-wider text-cyan-300">
                                                    Microgravity pathology
                                                </p>
                                                <p className="mt-1 text-sm text-slate-400">
                                                    {item.primary_spaceflight_pathology}
                                                </p>
                                            </div>

                                            <div>
                                                <p className="text-[11px] font-bold uppercase tracking-wider text-red-300">
                                                    Possible spaceflight risks
                                                </p>
                                                <ul className="mt-1.5 space-y-1 text-sm text-slate-300">
                                                    {item.possible_spaceflight_risks?.map((r: string, idx: number) => (
                                                        <li key={idx} className="flex items-start gap-2">
                                                            <span className="text-amber-400">•</span>
                                                            <span>{r}</span>
                                                        </li>
                                                    ))}
                                                </ul>
                                            </div>

                                            <div>
                                                <p className="text-[11px] font-bold uppercase tracking-wider text-emerald-300">
                                                    NASA countermeasures
                                                </p>
                                                <ul className="mt-1.5 space-y-1 text-sm text-slate-300">
                                                    {item.nasa_countermeasures?.map((c: string, idx: number) => (
                                                        <li key={idx} className="flex items-start gap-2">
                                                            <span className="text-emerald-400">•</span>
                                                            <span>{c}</span>
                                                        </li>
                                                    ))}
                                                </ul>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="py-10 text-center text-sm text-slate-400">
                                    Loading clinical knowledge base...
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="flex shrink-0 items-center justify-between border-t border-[#1b2a3a] bg-[#0a121d] px-6 py-3">
                    <span className="text-xs text-slate-500">ORBIT Autonomous Decision Engine • NASA-STD-3001</span>
                    <button
                        type="button"
                        onClick={onClose}
                        className="cursor-pointer rounded-full border border-[#24384d] bg-[#0c1521] px-4 py-2 text-sm font-semibold text-slate-200 transition hover:bg-[#112030]"
                    >
                        Close
                    </button>
                </div>
            </div>
        </div>
    );
}