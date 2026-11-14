import React, { useState, useEffect } from 'react';
import {
    X,
    Activity,
    Shield,
    Heart,
    Eye,
    Bone,
    Radio,
    Zap,
    Biohazard,
    AlertTriangle,
    Sliders,
    Sparkles,
    CheckCircle2,
    RefreshCw,
    Play,
    Check,
    ChevronRight,
    Flame,
    Info,
    FileText,
    ArrowUpRight,
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
    const [heartRate, setHeartRate] = useState<number>(
        astronaut?.vitals.heartRate.numericValue ?? 118
    );
    const [spo2, setSpo2] = useState<number>(
        astronaut?.vitals.spO2.numericValue ?? 97
    );
    const [coreTemp, setCoreTemp] = useState<number>(
        astronaut?.vitals.coreTemp.numericValue ?? 37.1
    );
    const [radiationRate, setRadiationRate] = useState<number>(0.22);
    const [boneLoss, setBoneLoss] = useState<number>(
        parseFloat(astronaut?.bio.boneDensityLoss || '-3.2')
    );
    const [cabinCo2, setCabinCo2] = useState<number>(2.8);
    const [hydration, setHydration] = useState<number>(
        astronaut?.vitals.hydration.numericValue ?? 72
    );

    // API Result State
    const [loading, setLoading] = useState<boolean>(false);
    const [analysisResult, setAnalysisResult] = useState<any>(null);
    const [knowledgeData, setKnowledgeData] = useState<any>(null);
    const [completedActions, setCompletedActions] = useState<Set<string>>(new Set());
    const [executingId, setExecutingId] = useState<string | null>(null);

    // Fetch initial analysis when modal opens
    useEffect(() => {
        if (isOpen) {
            runAnalysis();
            fetchKnowledge();
        }
    }, [isOpen]);

    const runAnalysis = async () => {
        setLoading(true);
        try {
            const response = await fetch('/api/astronaut/health-risk/analyze', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Accept: 'application/json',
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

    // Quick Scenario Presets
    const applyPreset = (presetName: string) => {
        if (presetName === 'high_bp_crisis') {
            setSystolic(162);
            setDiastolic(102);
            setHeartRate(110);
            setSpo2(97);
            setCoreTemp(37.2);
            setRadiationRate(0.20);
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

    const riskBadgeColor =
        analysisResult?.overall_risk_level === 'CRITICAL_EMERGENCY'
            ? 'border-rose-600 bg-rose-950 text-rose-300 shadow-[0_0_12px_rgba(225,29,72,0.4)]'
            : analysisResult?.overall_risk_level === 'HIGH_RISK'
            ? 'border-amber-500 bg-amber-950 text-amber-300 shadow-[0_0_12px_rgba(245,158,11,0.3)]'
            : analysisResult?.overall_risk_level === 'MODERATE_RISK'
            ? 'border-sky-500 bg-sky-950 text-sky-300'
            : 'border-emerald-500 bg-emerald-950 text-emerald-300';

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
            <div className="relative w-full max-w-5xl bg-[#06121e] border border-[#1a4b6c] text-[#5cdbdf] font-mono shadow-[0_0_60px_rgba(10,31,46,0.95)] flex flex-col max-h-[92vh] overflow-hidden">
                {/* Tech Corners */}
                <span className="absolute top-0 left-0 w-3.5 h-3.5 border-t-2 border-l-2 border-[#5cdbdf]" />
                <span className="absolute top-0 right-0 w-3.5 h-3.5 border-t-2 border-r-2 border-[#5cdbdf]" />
                <span className="absolute bottom-0 left-0 w-3.5 h-3.5 border-b-2 border-l-2 border-[#5cdbdf]" />
                <span className="absolute bottom-0 right-0 w-3.5 h-3.5 border-b-2 border-r-2 border-[#5cdbdf]" />

                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between px-5 py-3.5 border-b border-[#1a4b6c] bg-[#0a1f2e]/80 gap-3 shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="p-2 border border-[#5cdbdf]/40 bg-[#5cdbdf]/10 text-[#5cdbdf] shrink-0">
                            <Activity className="w-5 h-5 text-cyan-400" />
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <h3 className="text-sm sm:text-base font-bold text-white tracking-wider flex items-center gap-1.5">
                                    <span>ORBIT // ASTRONAUT HEALTH RISK & PATHOPHYSIOLOGY API</span>
                                </h3>
                                <span className="text-[10px] px-1.5 py-0.2 border border-cyan-800 bg-cyan-950 text-cyan-300 hidden md:inline">
                                    NASA-STD-3001
                                </span>
                            </div>
                            <p className="text-[11px] text-slate-400">
                                Deep-Space Clinical Risk Analysis • Microgravity Pathology & Autonomous Countermeasures
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        {/* Tab Switcher */}
                        <div className="flex border border-[#1a4b6c] bg-[#030b14] p-0.5 text-xs">
                            <button
                                type="button"
                                onClick={() => setActiveTab('analyzer')}
                                className={`px-3 py-1 font-bold transition-all cursor-pointer ${
                                    activeTab === 'analyzer'
                                        ? 'bg-[#5cdbdf] text-[#030b14]'
                                        : 'text-slate-400 hover:text-white'
                                }`}
                            >
                                Risk Analyzer
                            </button>
                            <button
                                type="button"
                                onClick={() => setActiveTab('knowledge')}
                                className={`px-3 py-1 font-bold transition-all cursor-pointer ${
                                    activeTab === 'knowledge'
                                        ? 'bg-[#5cdbdf] text-[#030b14]'
                                        : 'text-slate-400 hover:text-white'
                                }`}
                            >
                                Reference Knowledge
                            </button>
                        </div>

                        <button
                            type="button"
                            onClick={onClose}
                            className="p-1.5 border border-[#1a4b6c] bg-[#0a1f2e] text-slate-400 hover:text-white hover:border-[#5cdbdf] transition-colors cursor-pointer"
                        >
                            <X className="w-4 h-4" />
                        </button>
                    </div>
                </div>

                {/* Content Area */}
                <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
                    {activeTab === 'analyzer' && (
                        <>
                            {/* Scenario Presets Strip */}
                            <div className="p-3 border border-[#1a4b6c] bg-[#030b14] space-y-2">
                                <div className="flex items-center justify-between text-xs">
                                    <span className="font-bold text-white flex items-center gap-1.5">
                                        <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
                                        <span>QUICK SCENARIO PRESETS (SIMULATE SPACEFLIGHT ANOMALIES):</span>
                                    </span>
                                    <span className="text-[10px] text-slate-400">
                                        Click a scenario to populate parameters & evaluate risks
                                    </span>
                                </div>
                                <div className="flex flex-wrap gap-2 text-xs">
                                    <button
                                        type="button"
                                        onClick={() => {
                                            applyPreset('high_bp_crisis');
                                            runAnalysis();
                                        }}
                                        className="px-2.5 py-1.5 border border-rose-600/70 bg-rose-950/40 text-rose-300 hover:bg-rose-900/60 font-bold transition-all cursor-pointer flex items-center gap-1 shadow-sm"
                                    >
                                        <Heart className="w-3.5 h-3.5 text-rose-400" />
                                        <span>High Blood Pressure Crisis (162/102 mmHg)</span>
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            applyPreset('stage1_hypertension');
                                            runAnalysis();
                                        }}
                                        className="px-2.5 py-1.5 border border-amber-600/70 bg-amber-950/40 text-amber-300 hover:bg-amber-900/60 font-bold transition-all cursor-pointer flex items-center gap-1"
                                    >
                                        <Eye className="w-3.5 h-3.5 text-amber-400" />
                                        <span>Stage 1 Hypertension & SANS (145/94 mmHg)</span>
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            applyPreset('hypercapnia');
                                            runAnalysis();
                                        }}
                                        className="px-2.5 py-1.5 border border-purple-600/70 bg-purple-950/40 text-purple-300 hover:bg-purple-900/60 font-bold transition-all cursor-pointer flex items-center gap-1"
                                    >
                                        <Biohazard className="w-3.5 h-3.5 text-purple-400" />
                                        <span>CO2 Hypercapnia (3.6 mmHg)</span>
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            applyPreset('radiation_surge');
                                            runAnalysis();
                                        }}
                                        className="px-2.5 py-1.5 border border-sky-600/70 bg-sky-950/40 text-sky-300 hover:bg-sky-900/60 font-bold transition-all cursor-pointer flex items-center gap-1"
                                    >
                                        <Radio className="w-3.5 h-3.5 text-sky-400" />
                                        <span>Radiation Storm (0.65 mSv/h)</span>
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            applyPreset('nominal');
                                            runAnalysis();
                                        }}
                                        className="px-2.5 py-1.5 border border-emerald-600/70 bg-emerald-950/40 text-emerald-300 hover:bg-emerald-900/60 font-bold transition-all cursor-pointer flex items-center gap-1"
                                    >
                                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                                        <span>Nominal Flight Profile</span>
                                    </button>
                                </div>
                            </div>

                            {/* Parameter Controls Grid */}
                            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5 text-xs">
                                {/* Systolic BP */}
                                <div className="p-2.5 border border-[#1a4b6c] bg-[#0a1f2e]/60 space-y-1">
                                    <label className="text-[10px] text-slate-400 font-bold block">
                                        SYSTOLIC BP (mmHg)
                                    </label>
                                    <input
                                        type="number"
                                        value={systolic}
                                        onChange={(e) => setSystolic(Number(e.target.value))}
                                        className="w-full bg-[#030b14] border border-[#1a4b6c] px-2 py-1 text-white font-bold text-sm focus:border-cyan-400 outline-none"
                                    />
                                    <span className="text-[9px] text-slate-400">Nominal: &lt; 120</span>
                                </div>

                                {/* Diastolic BP */}
                                <div className="p-2.5 border border-[#1a4b6c] bg-[#0a1f2e]/60 space-y-1">
                                    <label className="text-[10px] text-slate-400 font-bold block">
                                        DIASTOLIC BP (mmHg)
                                    </label>
                                    <input
                                        type="number"
                                        value={diastolic}
                                        onChange={(e) => setDiastolic(Number(e.target.value))}
                                        className="w-full bg-[#030b14] border border-[#1a4b6c] px-2 py-1 text-white font-bold text-sm focus:border-cyan-400 outline-none"
                                    />
                                    <span className="text-[9px] text-slate-400">Nominal: &lt; 80</span>
                                </div>

                                {/* Heart Rate */}
                                <div className="p-2.5 border border-[#1a4b6c] bg-[#0a1f2e]/60 space-y-1">
                                    <label className="text-[10px] text-slate-400 font-bold block">
                                        HEART RATE (bpm)
                                    </label>
                                    <input
                                        type="number"
                                        value={heartRate}
                                        onChange={(e) => setHeartRate(Number(e.target.value))}
                                        className="w-full bg-[#030b14] border border-[#1a4b6c] px-2 py-1 text-white font-bold text-sm focus:border-cyan-400 outline-none"
                                    />
                                    <span className="text-[9px] text-slate-400">Nominal: 60 - 100</span>
                                </div>

                                {/* SpO2 */}
                                <div className="p-2.5 border border-[#1a4b6c] bg-[#0a1f2e]/60 space-y-1">
                                    <label className="text-[10px] text-slate-400 font-bold block">
                                        SpO2 OXYGEN (%)
                                    </label>
                                    <input
                                        type="number"
                                        step="0.5"
                                        value={spo2}
                                        onChange={(e) => setSpo2(Number(e.target.value))}
                                        className="w-full bg-[#030b14] border border-[#1a4b6c] px-2 py-1 text-white font-bold text-sm focus:border-cyan-400 outline-none"
                                    />
                                    <span className="text-[9px] text-slate-400">Nominal: 95 - 100%</span>
                                </div>

                                {/* Cabin CO2 */}
                                <div className="p-2.5 border border-[#1a4b6c] bg-[#0a1f2e]/60 space-y-1">
                                    <label className="text-[10px] text-slate-400 font-bold block">
                                        CABIN pCO2 (mmHg)
                                    </label>
                                    <input
                                        type="number"
                                        step="0.1"
                                        value={cabinCo2}
                                        onChange={(e) => setCabinCo2(Number(e.target.value))}
                                        className="w-full bg-[#030b14] border border-[#1a4b6c] px-2 py-1 text-white font-bold text-sm focus:border-cyan-400 outline-none"
                                    />
                                    <span className="text-[9px] text-slate-400">Limit: &lt; 3.0 mmHg</span>
                                </div>
                            </div>

                            {/* Run Analysis CTA */}
                            <div className="flex items-center justify-between">
                                <span className="text-[11px] text-slate-400">
                                    Target Astronaut:{' '}
                                    <strong className="text-white">
                                        {astronaut?.bio.name || 'CDR. Reid Wiseman'}
                                    </strong>{' '}
                                    ({astronaut?.bio.id || 'AST-01'})
                                </span>
                                <button
                                    type="button"
                                    onClick={runAnalysis}
                                    disabled={loading}
                                    className="px-5 py-2 rounded bg-gradient-to-r from-cyan-600 to-sky-600 hover:from-cyan-500 hover:to-sky-500 text-white font-bold text-xs flex items-center gap-2 cursor-pointer shadow-[0_0_15px_rgba(6,182,212,0.3)] disabled:opacity-50"
                                >
                                    <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
                                    <span>EVALUATE ASTRONAUT HEALTH RISKS</span>
                                </button>
                            </div>

                            {/* Results Display */}
                            {analysisResult && (
                                <div className="space-y-4 pt-2">
                                    {/* Overall Assessment Banner */}
                                    <div className="p-4 border border-[#1a4b6c] bg-[#030b14] flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                                        <div className="space-y-1">
                                            <div className="flex items-center gap-2.5">
                                                <span className="text-xs text-slate-400 font-bold">
                                                    HEALTH RISK LEVEL:
                                                </span>
                                                <span
                                                    className={`px-3 py-1 font-bold text-xs border tracking-wider ${riskBadgeColor}`}
                                                >
                                                    {analysisResult.overall_risk_level}
                                                </span>
                                                <span className="text-xs text-slate-400">
                                                    Health Index:{' '}
                                                    <strong className="text-white text-base">
                                                        {analysisResult.health_score} / 100
                                                    </strong>
                                                </span>
                                            </div>
                                            <p className="text-xs text-slate-300">
                                                {analysisResult.clinical_summary}
                                            </p>
                                        </div>

                                        {analysisResult.hazard_correlations?.length > 0 && (
                                            <div className="text-[10px] space-y-1 text-right">
                                                <span className="text-slate-400 block font-bold">
                                                    CORRELATED NASA HAZARDS:
                                                </span>
                                                {analysisResult.hazard_correlations.map(
                                                    (hz: string, idx: number) => (
                                                        <span
                                                            key={idx}
                                                            className="inline-block px-1.5 py-0.5 bg-[#0a1f2e] border border-[#1a4b6c] text-[#5cdbdf] ml-1 mb-1"
                                                        >
                                                            {hz}
                                                        </span>
                                                    )
                                                )}
                                            </div>
                                        )}
                                    </div>

                                    {/* Identified Spaceflight Health Risks Cards */}
                                    <div className="space-y-3">
                                        <h4 className="text-xs font-bold text-white tracking-wider flex items-center gap-2 border-b border-[#1a4b6c] pb-1.5">
                                            <AlertTriangle className="w-4 h-4 text-amber-400" />
                                            <span>
                                                IDENTIFIED RISKS & SPACEFLIGHT PATHOPHYSIOLOGY (
                                                {analysisResult.identified_risks_count})
                                            </span>
                                        </h4>

                                        {analysisResult.identified_risks?.length === 0 ? (
                                            <div className="p-4 border border-emerald-800 bg-emerald-950/20 text-emerald-300 text-xs flex items-center gap-2">
                                                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                                                <span>
                                                    All physiological parameters are within nominal NASA-STD-3001
                                                    exploration limits. No acute spaceflight pathology detected.
                                                </span>
                                            </div>
                                        ) : (
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                                                {analysisResult.identified_risks.map(
                                                    (risk: any, rIdx: number) => {
                                                        const isCrit = risk.risk_severity === 'CRITICAL';
                                                        return (
                                                            <div
                                                                key={rIdx}
                                                                className={`p-3.5 border rounded-sm space-y-2.5 ${
                                                                    isCrit
                                                                        ? 'border-rose-700 bg-rose-950/20'
                                                                        : 'border-amber-700/80 bg-amber-950/20'
                                                                }`}
                                                            >
                                                                <div className="flex items-center justify-between">
                                                                    <div className="flex items-center gap-2">
                                                                        <span className="font-bold text-white text-xs">
                                                                            {risk.title}
                                                                        </span>
                                                                    </div>
                                                                    <span
                                                                        className={`text-[9px] font-bold px-1.5 py-0.5 border ${
                                                                            isCrit
                                                                                ? 'border-rose-600 bg-rose-950 text-rose-300'
                                                                                : 'border-amber-600 bg-amber-950 text-amber-300'
                                                                        }`}
                                                                    >
                                                                        {risk.value} • {risk.risk_severity}
                                                                    </span>
                                                                </div>

                                                                {/* Pathophysiology */}
                                                                <div className="p-2 border border-[#1a4b6c]/60 bg-[#030b14] text-[11px] text-slate-300 space-y-1">
                                                                    <span className="text-[10px] font-bold text-cyan-400 block">
                                                                        MICROGRAVITY PATHOPHYSIOLOGY:
                                                                    </span>
                                                                    <p className="text-slate-400 text-[10px] leading-relaxed">
                                                                        {risk.pathophysiology}
                                                                    </p>
                                                                </div>

                                                                {/* Specific Consequences */}
                                                                <div className="space-y-1 text-[10px]">
                                                                    <span className="font-bold text-slate-300 block">
                                                                        POSSIBLE SPACEFLIGHT RISKS:
                                                                    </span>
                                                                    <ul className="space-y-1 pl-1 text-slate-300">
                                                                        {risk.possible_spaceflight_risks?.map(
                                                                            (c: string, cIdx: number) => (
                                                                                <li
                                                                                    key={cIdx}
                                                                                    className="flex items-start gap-1.5 text-slate-300"
                                                                                >
                                                                                    <span className="text-amber-400 shrink-0">
                                                                                        •
                                                                                    </span>
                                                                                    <span>{c}</span>
                                                                                </li>
                                                                            )
                                                                        )}
                                                                    </ul>
                                                                </div>
                                                            </div>
                                                        );
                                                    }
                                                )}
                                            </div>
                                        )}
                                    </div>

                                    {/* Recommended Autonomous Countermeasures */}
                                    {analysisResult.autonomous_countermeasures?.length > 0 && (
                                        <div className="p-3.5 border border-[#1a4b6c] bg-[#030b14] space-y-3">
                                            <div className="flex items-center justify-between border-b border-[#1a4b6c] pb-2">
                                                <span className="font-bold text-white text-xs flex items-center gap-1.5">
                                                    <Zap className="w-4 h-4 text-cyan-400" />
                                                    <span>AUTONOMOUS NASA-STD-3001 COUNTERMEASURES</span>
                                                </span>
                                                <span className="text-[10px] px-2 py-0.5 border border-cyan-800 bg-cyan-950 text-cyan-300">
                                                    ACTIONABLE PROTOCOLS
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
                                                                className="p-2.5 border border-[#1a4b6c] bg-[#0a1f2e] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs"
                                                            >
                                                                <div className="flex items-start gap-2">
                                                                    <span className="text-cyan-400 font-bold shrink-0">
                                                                        [{aIdx + 1}]
                                                                    </span>
                                                                    <span className="text-slate-200">
                                                                        {actionText}
                                                                    </span>
                                                                </div>
                                                                <button
                                                                    type="button"
                                                                    disabled={isDone || isExecuting}
                                                                    onClick={() =>
                                                                        handleExecuteCountermeasure(actionText)
                                                                    }
                                                                    className={`px-3 py-1.5 font-bold transition-all flex items-center gap-1.5 shrink-0 text-[11px] cursor-pointer ${
                                                                        isDone
                                                                            ? 'border border-emerald-600 bg-emerald-950 text-emerald-300 cursor-default'
                                                                            : 'border border-cyan-500 bg-[#030b14] text-cyan-300 hover:bg-[#5cdbdf] hover:text-black'
                                                                    }`}
                                                                >
                                                                    {isDone ? (
                                                                        <>
                                                                            <Check className="w-3 h-3 text-emerald-400" />
                                                                            <span>EXECUTED</span>
                                                                        </>
                                                                    ) : (
                                                                        <>
                                                                            <Play className="w-3 h-3" />
                                                                            <span>
                                                                                {isExecuting
                                                                                    ? 'INITIATING...'
                                                                                    : 'EXECUTE NOW'}
                                                                            </span>
                                                                        </>
                                                                    )}
                                                                </button>
                                                            </div>
                                                        );
                                                    }
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
                            <div className="p-3 border border-[#1a4b6c] bg-[#030b14]">
                                <h4 className="text-xs font-bold text-white tracking-wider flex items-center gap-2">
                                    <Info className="w-4 h-4 text-cyan-400" />
                                    <span>NASA HUMAN RESEARCH PROGRAM (HRP) CLINICAL REFERENCE THRESHOLDS</span>
                                </h4>
                                <p className="text-[11px] text-slate-400 mt-1">
                                    Medical guidelines for long-duration deep space exploration under NASA-STD-3001.
                                </p>
                            </div>

                            {knowledgeData ? (
                                <div className="space-y-3">
                                    {Object.entries(knowledgeData).map(
                                        ([key, item]: [string, any]) => (
                                            <div
                                                key={key}
                                                className="p-3.5 border border-[#1a4b6c] bg-[#0a1f2e]/70 space-y-2.5 text-xs"
                                            >
                                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 border-b border-[#1a4b6c] pb-2">
                                                    <span className="font-bold text-white text-sm">
                                                        {item.parameter}
                                                    </span>
                                                    <span className="text-[11px] text-amber-300 font-semibold">
                                                        Danger Limit: {item.spaceflight_danger_threshold}
                                                    </span>
                                                </div>

                                                <div className="text-[11px] text-slate-300 space-y-1">
                                                    <strong className="text-cyan-400 text-[10px] block">
                                                        MICROGRAVITY PATHOLOGY:
                                                    </strong>
                                                    <p className="text-slate-400">{item.primary_spaceflight_pathology}</p>
                                                </div>

                                                <div className="space-y-1 text-[11px]">
                                                    <strong className="text-rose-300 text-[10px] block">
                                                        POSSIBLE SPACEFLIGHT RISKS:
                                                    </strong>
                                                    <ul className="space-y-1 text-slate-300 pl-2">
                                                        {item.possible_spaceflight_risks?.map(
                                                            (r: string, idx: number) => (
                                                                <li key={idx} className="flex items-start gap-1.5">
                                                                    <span className="text-amber-400">•</span>
                                                                    <span>{r}</span>
                                                                </li>
                                                            )
                                                        )}
                                                    </ul>
                                                </div>

                                                <div className="space-y-1 text-[11px] pt-1">
                                                    <strong className="text-emerald-300 text-[10px] block">
                                                        NASA COUNTERMEASURES:
                                                    </strong>
                                                    <ul className="space-y-1 text-slate-300 pl-2">
                                                        {item.nasa_countermeasures?.map(
                                                            (c: string, idx: number) => (
                                                                <li key={idx} className="flex items-start gap-1.5">
                                                                    <span className="text-emerald-400">•</span>
                                                                    <span>{c}</span>
                                                                </li>
                                                            )
                                                        )}
                                                    </ul>
                                                </div>
                                            </div>
                                        )
                                    )}
                                </div>
                            ) : (
                                <div className="text-center py-10 text-slate-400 text-xs">
                                    Loading ORBIT clinical knowledge base...
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="px-5 py-3 border-t border-[#1a4b6c] bg-[#0a1f2e]/80 flex items-center justify-between text-xs shrink-0">
                    <span className="text-slate-400 text-[11px]">
                        ORBIT Autonomous Decision Engine • Standard NASA-STD-3001
                    </span>
                    <button
                        type="button"
                        onClick={onClose}
                        className="px-4 py-1.5 border border-[#1a4b6c] bg-[#030b14] text-slate-300 hover:text-white hover:border-[#5cdbdf] transition-colors cursor-pointer"
                    >
                        CLOSE ANALYZER
                    </button>
                </div>
            </div>
        </div>
    );
}

