import React, { useState, useMemo } from 'react';
import {
    X,
    Activity,
    Shield,
    Heart,
    Eye,
    Bone,
    Radio,
    Zap,
    Moon,
    Compass,
    Orbit,
    Biohazard,
    CheckCircle2,
    AlertTriangle,
    Clock,
    Sliders,
    Sparkles,
    Send,
    Play,
    Check,
    RefreshCw,
    ExternalLink,
    ChevronRight,
    Dumbbell,
    Flame,
    Info,
} from 'lucide-react';
import type { AstronautFullData } from '@/types/astronaut';
import { toast } from 'sonner';

interface AstronautSelfAssessmentModalProps {
    isOpen: boolean;
    onClose: () => void;
    astronaut: AstronautFullData;
    onActionExecuted?: (actionTitle: string, details: string) => void;
    onSaveAssessment?: (result: {
        score: number;
        status: 'NOMINAL' | 'GUARDED' | 'ELEVATED' | 'CRITICAL';
        flags: string[];
        alertMessage: string;
    }) => void;
}

export default function AstronautSelfAssessmentModal({
    isOpen,
    onClose,
    astronaut,
    onActionExecuted,
    onSaveAssessment,
}: AstronautSelfAssessmentModalProps) {
    // Active Navigation Tab
    const [activeTab, setActiveTab] = useState<'indicators' | 'evaluate' | 'act'>('evaluate');

    // Self-Assessment Symptom Evaluation State (Astronaut Spotting Changes)
    const [visionScore, setVisionScore] = useState<number>(4); // 1 = Severe blurring, 5 = Crystal clear
    const [sleepScore, setSleepScore] = useState<number>(4);  // 1 = Chronic insomnia/fatigue, 5 = Fully refreshed
    const [muscleBoneScore, setMuscleBoneScore] = useState<number>(3); // 1 = Severe weakness/loss, 5 = Strong
    const [radiationFatigueScore, setRadiationFatigueScore] = useState<number>(4); // 1 = Heavy fatigue/nausea, 5 = Nominal
    const [airQualityScore, setAirQualityScore] = useState<number>(4); // 1 = Headaches/stuffiness (CO2), 5 = Fresh air

    // Action Execution States
    const [executingActionId, setExecutingActionId] = useState<string | null>(null);
    const [completedActions, setCompletedActions] = useState<Set<string>>(new Set());

    // Evaluated AHHI Score
    const evaluationResults = useMemo(() => {
        const total = (visionScore + sleepScore + muscleBoneScore + radiationFatigueScore + airQualityScore) * 4; // Max 100
        let status: 'NOMINAL' | 'GUARDED' | 'ELEVATED' | 'CRITICAL' = 'NOMINAL';
        let alertMessage = 'All 5 spaceflight hazard indicators remain within nominal autonomous exploration tolerances.';
        const flags: string[] = [];

        if (visionScore <= 2) {
            flags.push('Spaceflight-Associated Neuro-ocular Syndrome (SANS): Elevated intracranial fluid shift detected. Visual near-point blurring reported.');
        }
        if (sleepScore <= 2) {
            flags.push('Isolation & Confinement: Chronic sleep deficit and circadian phase desynchronization. Psychomotor vigilance risk elevated.');
        }
        if (muscleBoneScore <= 2) {
            flags.push('Altered Gravity: Musculoskeletal unloading and accelerated bone mineral demineralization risk.');
        }
        if (radiationFatigueScore <= 2) {
            flags.push('Space Radiation: Systemic biological radiation stress or solar proton exposure warning.');
        }
        if (airQualityScore <= 2) {
            flags.push('Hostile Closed Environment: Elevated carbon dioxide (pCO2) exposure indicated by headache/lethargy symptoms.');
        }

        if (total < 50 || flags.length >= 3) {
            status = 'CRITICAL';
            alertMessage = 'Multiple spaceflight hazard deviations detected. Immediate autonomous intervention required.';
        } else if (total < 70 || flags.length >= 2) {
            status = 'ELEVATED';
            alertMessage = 'Elevated physiological hazard strain detected. Execute targeted countermeasures below.';
        } else if (total < 85 || flags.length >= 1) {
            status = 'GUARDED';
            alertMessage = 'Minor spaceflight environmental strain detected. Spotting early changes allows proactive mitigation.';
        }

        return {
            score: total,
            status,
            alertMessage,
            flags,
        };
    }, [visionScore, sleepScore, muscleBoneScore, radiationFatigueScore, airQualityScore]);

    if (!isOpen) return null;

    // Handle Executing Autonomous Countermeasure
    const handleExecuteCountermeasure = async (
        actionId: string,
        actionTitle: string,
        protocol: string,
        impact: string
    ) => {
        setExecutingActionId(actionId);
        toast.info(`[AUTONOMOUS INITIATION] Executing ${actionTitle}...`);

        await new Promise((resolve) => setTimeout(resolve, 800));

        setCompletedActions((prev) => new Set([...prev, actionId]));
        setExecutingActionId(null);

        toast.success(`[ACTION VERIFIED] ${actionTitle} active: ${impact}`);

        if (onActionExecuted) {
            onActionExecuted(actionTitle, `Protocol: ${protocol} • Impact: ${impact}`);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
            <div className="relative w-full max-w-4xl bg-[#06121e] border border-[#1a4b6c] text-[#5cdbdf] font-mono shadow-[0_0_60px_rgba(10,31,46,0.95)] flex flex-col max-h-[92vh] overflow-hidden">
                {/* Tech Corners */}
                <span className="absolute top-0 left-0 w-3.5 h-3.5 border-t-2 border-l-2 border-[#5cdbdf]" />
                <span className="absolute top-0 right-0 w-3.5 h-3.5 border-t-2 border-r-2 border-[#5cdbdf]" />
                <span className="absolute bottom-0 left-0 w-3.5 h-3.5 border-b-2 border-l-2 border-[#5cdbdf]" />
                <span className="absolute bottom-0 right-0 w-3.5 h-3.5 border-b-2 border-r-2 border-[#5cdbdf]" />

                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between px-5 py-3.5 border-b border-[#1a4b6c] bg-[#0a1f2e]/70 gap-2 shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="p-2 border border-[#5cdbdf]/40 bg-[#5cdbdf]/10 text-[#5cdbdf] shrink-0">
                            <Shield className="w-5 h-5" />
                        </div>
                        <div>
                            <div className="flex flex-wrap items-center gap-2">
                                <h3 className="text-sm sm:text-base font-bold tracking-widest text-white uppercase">
                                    ASTRONAUT HEALTH EVALUATION & AUTONOMOUS ACTION
                                </h3>
                                <span className="text-[10px] px-2 py-0.5 border border-cyan-500/50 bg-cyan-950 text-cyan-300 font-bold">
                                    NASA HRP // 5 HAZARDS
                                </span>
                            </div>
                            <p className="text-[11px] text-slate-400 mt-0.5">
                                Subject: <strong className="text-white">{astronaut.bio.name}</strong> ({astronaut.bio.id}) • Autonomous Medical Protocol
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2 self-end sm:self-auto">
                        <div className="hidden md:flex items-center gap-1.5 px-2.5 py-1 border border-[#1a4b6c] bg-[#030b14] text-[10px] text-slate-400">
                            <Radio className="w-3 h-3 text-emerald-400 animate-pulse" />
                            <span>COMM DELAY: ~14m (MARS AUTONOMY)</span>
                        </div>
                        <button
                            onClick={onClose}
                            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>
                </div>

                {/* Sub-Navigation Tabs: 1. Gather (Indicators) | 2. Evaluate (Self-Check) | 3. Act (Countermeasures) */}
                <div className="flex border-b border-[#1a4b6c] bg-[#030b14] px-5 text-xs font-bold shrink-0">
                    <button
                        onClick={() => setActiveTab('evaluate')}
                        className={`py-3 px-4 flex items-center gap-2 border-b-2 transition-all cursor-pointer ${
                            activeTab === 'evaluate'
                                ? 'border-[#5cdbdf] text-[#5cdbdf] bg-[#0a1f2e]/60'
                                : 'border-transparent text-slate-400 hover:text-white'
                        }`}
                    >
                        <Sliders className="w-4 h-4 text-cyan-400" />
                        <span>1. EVALUATE & SPOT CHANGES</span>
                        <span className="px-1.5 py-0.2 rounded-full text-[9px] bg-cyan-950 border border-cyan-800 text-cyan-300">
                            SELF-CHECK
                        </span>
                    </button>

                    <button
                        onClick={() => setActiveTab('act')}
                        className={`py-3 px-4 flex items-center gap-2 border-b-2 transition-all cursor-pointer ${
                            activeTab === 'act'
                                ? 'border-emerald-400 text-emerald-400 bg-[#0a1f2e]/60'
                                : 'border-transparent text-slate-400 hover:text-white'
                        }`}
                    >
                        <Play className="w-4 h-4 text-emerald-400" />
                        <span>2. ACT ON HEALTH (COUNTERMEASURES)</span>
                        <span className="px-1.5 py-0.2 rounded-full text-[9px] bg-emerald-950 border border-emerald-800 text-emerald-300">
                            {completedActions.size} ACTIVE
                        </span>
                    </button>

                    <button
                        onClick={() => setActiveTab('indicators')}
                        className={`py-3 px-4 flex items-center gap-2 border-b-2 transition-all cursor-pointer ${
                            activeTab === 'indicators'
                                ? 'border-[#5cdbdf] text-[#5cdbdf] bg-[#0a1f2e]/60'
                                : 'border-transparent text-slate-400 hover:text-white'
                        }`}
                    >
                        <Activity className="w-4 h-4 text-sky-400" />
                        <span>3. GATHERED HEALTH INDICATORS</span>
                    </button>
                </div>

                {/* Modal Body Container */}
                <div className="p-5 sm:p-6 overflow-y-auto space-y-5 text-xs flex-1">
                    {/* ========================================================================= */}
                    {/* TAB 1: EVALUATE & SPOT CHANGES (Self-Administered 5-Hazard Test)           */}
                    {/* ========================================================================= */}
                    {activeTab === 'evaluate' && (
                        <div className="space-y-5">
                            {/* Instruction Header Banner */}
                            <div className="p-3.5 border border-[#1a4b6c] bg-[#0a1f2e]/80 flex items-start gap-3">
                                <Info className="w-5 h-5 text-[#5cdbdf] shrink-0 mt-0.5" />
                                <div>
                                    <h4 className="text-white font-bold text-xs uppercase tracking-wider">
                                        ASTRONAUT SELF-ASSESSMENT DIRECTIVE
                                    </h4>
                                    <p className="text-slate-300 text-[11px] mt-1 leading-relaxed">
                                        On long-duration missions without real-time Houston telemedicine, you carry the primary responsibility for spotting physiological and behavioral deviations in yourself. Evaluate the 5 environmental stress areas below to compute your Autonomous Human Health Index (AHHI) and trigger needed interventions.
                                    </p>
                                </div>
                            </div>

                            {/* 5-Hazard Self-Spotting Form */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {/* 1. Vision & SANS (Gravity Fields) */}
                                <div className="p-4 border border-[#1a4b6c] bg-[#030b14] space-y-3">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2 text-white font-bold">
                                            <Eye className="w-4 h-4 text-sky-400" />
                                            <span>1. VISION & SANS CHECK (ALTERED GRAVITY)</span>
                                        </div>
                                        <span className={`text-[10px] font-bold px-2 py-0.5 border ${
                                            visionScore <= 2 ? 'border-rose-700 bg-rose-950/60 text-rose-300' : 'border-sky-800 bg-sky-950/50 text-sky-300'
                                        }`}>
                                            SCORE: {visionScore}/5
                                        </span>
                                    </div>
                                    <p className="text-slate-400 text-[11px]">
                                        Spotting cephalad fluid shift & intracranial pressure: Do you notice near-point blurring when reading checklists or posterior eye pressure?
                                    </p>
                                    <div className="flex items-center justify-between gap-1 text-[10px]">
                                        {[1, 2, 3, 4, 5].map((score) => (
                                            <button
                                                key={score}
                                                type="button"
                                                onClick={() => setVisionScore(score)}
                                                className={`flex-1 py-1.5 border text-center transition-all cursor-pointer font-bold ${
                                                    visionScore === score
                                                        ? 'border-[#5cdbdf] bg-[#5cdbdf] text-[#030b14]'
                                                        : 'border-[#1a4b6c] bg-[#0a1f2e] text-slate-300 hover:text-white'
                                                }`}
                                            >
                                                {score === 1 ? '1 (Blur)' : score === 5 ? '5 (Clear)' : score}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* 2. Behavioral & Sleep (Isolation & Confinement) */}
                                <div className="p-4 border border-[#1a4b6c] bg-[#030b14] space-y-3">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2 text-white font-bold">
                                            <Moon className="w-4 h-4 text-purple-400" />
                                            <span>2. SLEEP & MOOD (ISOLATION & CONFINEMENT)</span>
                                        </div>
                                        <span className={`text-[10px] font-bold px-2 py-0.5 border ${
                                            sleepScore <= 2 ? 'border-rose-700 bg-rose-950/60 text-rose-300' : 'border-purple-800 bg-purple-950/50 text-purple-300'
                                        }`}>
                                            SCORE: {sleepScore}/5
                                        </span>
                                    </div>
                                    <p className="text-slate-400 text-[11px]">
                                        Spotting circadian desynchronization & cognitive fatigue: Did you achieve restorative sleep? Any cognitive sluggishness or team friction?
                                    </p>
                                    <div className="flex items-center justify-between gap-1 text-[10px]">
                                        {[1, 2, 3, 4, 5].map((score) => (
                                            <button
                                                key={score}
                                                type="button"
                                                onClick={() => setSleepScore(score)}
                                                className={`flex-1 py-1.5 border text-center transition-all cursor-pointer font-bold ${
                                                    sleepScore === score
                                                        ? 'border-purple-400 bg-purple-500 text-[#030b14]'
                                                        : 'border-[#1a4b6c] bg-[#0a1f2e] text-slate-300 hover:text-white'
                                                }`}
                                            >
                                                {score === 1 ? '1 (Exhausted)' : score === 5 ? '5 (Rested)' : score}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* 3. Bone & Musculoskeletal (Altered Gravity) */}
                                <div className="p-4 border border-[#1a4b6c] bg-[#030b14] space-y-3">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2 text-white font-bold">
                                            <Bone className="w-4 h-4 text-rose-400" />
                                            <span>3. MUSCLE & BONE (ALTERED GRAVITY)</span>
                                        </div>
                                        <span className={`text-[10px] font-bold px-2 py-0.5 border ${
                                            muscleBoneScore <= 2 ? 'border-rose-700 bg-rose-950/60 text-rose-300' : 'border-rose-800 bg-rose-950/50 text-rose-300'
                                        }`}>
                                            SCORE: {muscleBoneScore}/5
                                        </span>
                                    </div>
                                    <p className="text-slate-400 text-[11px]">
                                        Spotting deconditioning: Are you experiencing spinal elongation pain, calf muscle weakness, or orthostatic dizziness when floating upright?
                                    </p>
                                    <div className="flex items-center justify-between gap-1 text-[10px]">
                                        {[1, 2, 3, 4, 5].map((score) => (
                                            <button
                                                key={score}
                                                type="button"
                                                onClick={() => setMuscleBoneScore(score)}
                                                className={`flex-1 py-1.5 border text-center transition-all cursor-pointer font-bold ${
                                                    muscleBoneScore === score
                                                        ? 'border-rose-400 bg-rose-500 text-[#030b14]'
                                                        : 'border-[#1a4b6c] bg-[#0a1f2e] text-slate-300 hover:text-white'
                                                }`}
                                            >
                                                {score === 1 ? '1 (Aching)' : score === 5 ? '5 (Nominal)' : score}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* 4. Radiation & Systemic Sensitivity (Space Radiation) */}
                                <div className="p-4 border border-[#1a4b6c] bg-[#030b14] space-y-3">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2 text-white font-bold">
                                            <Zap className="w-4 h-4 text-amber-400" />
                                            <span>4. RADIATION SENSITIVITY (SPACE RADIATION)</span>
                                        </div>
                                        <span className={`text-[10px] font-bold px-2 py-0.5 border ${
                                            radiationFatigueScore <= 2 ? 'border-rose-700 bg-rose-950/60 text-rose-300' : 'border-amber-800 bg-amber-950/50 text-amber-300'
                                        }`}>
                                            SCORE: {radiationFatigueScore}/5
                                        </span>
                                    </div>
                                    <p className="text-slate-400 text-[11px]">
                                        Spotting radiation bio-effects: Any unexplained nausea, light flashes in eyes (Cherenkov radiation), skin prickling, or dosimeter alerts?
                                    </p>
                                    <div className="flex items-center justify-between gap-1 text-[10px]">
                                        {[1, 2, 3, 4, 5].map((score) => (
                                            <button
                                                key={score}
                                                type="button"
                                                onClick={() => setRadiationFatigueScore(score)}
                                                className={`flex-1 py-1.5 border text-center transition-all cursor-pointer font-bold ${
                                                    radiationFatigueScore === score
                                                        ? 'border-amber-400 bg-amber-500 text-[#030b14]'
                                                        : 'border-[#1a4b6c] bg-[#0a1f2e] text-slate-300 hover:text-white'
                                                }`}
                                            >
                                                {score === 1 ? '1 (Alert)' : score === 5 ? '5 (Nominal)' : score}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* 5. Habitat Environment & CO2 (Hostile Closed Environment) */}
                                <div className="p-4 border border-[#1a4b6c] bg-[#030b14] space-y-3 md:col-span-2">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2 text-white font-bold">
                                            <Biohazard className="w-4 h-4 text-emerald-400" />
                                            <span>5. HABITAT AIR & IMMUNE (HOSTILE CLOSED ENVIRONMENT)</span>
                                        </div>
                                        <span className={`text-[10px] font-bold px-2 py-0.5 border ${
                                            airQualityScore <= 2 ? 'border-rose-700 bg-rose-950/60 text-rose-300' : 'border-emerald-800 bg-emerald-950/50 text-emerald-300'
                                        }`}>
                                            SCORE: {airQualityScore}/5
                                        </span>
                                    </div>
                                    <p className="text-slate-400 text-[11px]">
                                        Spotting CO2 toxicity & immune breakdown: Experiencing morning frontal headaches, air stuffiness, skin rash flare-ups, or cold sores?
                                    </p>
                                    <div className="flex items-center justify-between gap-1 text-[10px]">
                                        {[1, 2, 3, 4, 5].map((score) => (
                                            <button
                                                key={score}
                                                type="button"
                                                onClick={() => setAirQualityScore(score)}
                                                className={`flex-1 py-1.5 border text-center transition-all cursor-pointer font-bold ${
                                                    airQualityScore === score
                                                        ? 'border-emerald-400 bg-emerald-500 text-[#030b14]'
                                                        : 'border-[#1a4b6c] bg-[#0a1f2e] text-slate-300 hover:text-white'
                                                }`}
                                            >
                                                {score === 1 ? '1 (CO2 Headache)' : score === 5 ? '5 (Fresh Air)' : score}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            {/* Evaluation Output Card */}
                            <div className={`p-4 border rounded-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4 ${
                                evaluationResults.status === 'CRITICAL' || evaluationResults.status === 'ELEVATED'
                                    ? 'border-rose-700 bg-rose-950/30'
                                    : evaluationResults.status === 'GUARDED'
                                    ? 'border-amber-700 bg-amber-950/30'
                                    : 'border-emerald-700 bg-emerald-950/30'
                            }`}>
                                <div className="space-y-1">
                                    <div className="flex items-center gap-2">
                                        <span className="text-[10px] text-slate-400 uppercase tracking-wider">
                                            AUTONOMOUS HUMAN HEALTH INDEX (AHHI):
                                        </span>
                                        <span className="text-lg font-bold text-white font-mono">
                                            {evaluationResults.score} / 100
                                        </span>
                                        <span className={`px-2 py-0.5 text-[10px] font-bold border ${
                                            evaluationResults.status === 'CRITICAL' || evaluationResults.status === 'ELEVATED'
                                                ? 'border-rose-700 bg-rose-950 text-rose-300'
                                                : evaluationResults.status === 'GUARDED'
                                                ? 'border-amber-700 bg-amber-950 text-amber-300'
                                                : 'border-emerald-700 bg-emerald-950 text-emerald-300'
                                        }`}>
                                            STATUS: {evaluationResults.status}
                                        </span>
                                    </div>
                                    <p className="text-[11px] text-slate-300">
                                        {evaluationResults.alertMessage}
                                    </p>
                                    {evaluationResults.flags.length > 0 && (
                                        <div className="pt-2 space-y-1 border-t border-[#1a4b6c]/50 text-[10px] text-rose-300">
                                            {evaluationResults.flags.map((flag, idx) => (
                                                <div key={idx} className="flex items-center gap-1.5">
                                                    <AlertTriangle className="w-3 h-3 text-rose-400 shrink-0" />
                                                    <span>{flag}</span>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>

                                <div className="flex flex-wrap items-center gap-2 shrink-0">
                                    <button
                                        type="button"
                                        onClick={() => {
                                            if (onSaveAssessment) {
                                                onSaveAssessment(evaluationResults);
                                            }
                                            toast.success(`[EVALUATION RECORDED] AHHI Score ${evaluationResults.score}/100 recorded into telemetry.`);
                                        }}
                                        className="px-4 py-2.5 border border-[#5cdbdf]/60 bg-[#0a1f2e] text-[#5cdbdf] font-bold hover:bg-[#5cdbdf]/20 hover:text-white transition-all flex items-center gap-1.5 cursor-pointer text-xs"
                                    >
                                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                                        <span>RECORD EVALUATION</span>
                                    </button>

                                    <button
                                        type="button"
                                        onClick={() => setActiveTab('act')}
                                        className="px-5 py-2.5 bg-[#5cdbdf] text-[#030b14] font-bold hover:brightness-110 transition-all flex items-center gap-2 cursor-pointer shadow-[0_0_15px_rgba(92,219,223,0.3)] text-xs"
                                    >
                                        <span>ACT ON EVALUATION</span>
                                        <ChevronRight className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* ========================================================================= */}
                    {/* TAB 2: ACT ON HEALTH STATUS (Autonomous Countermeasures Suite)             */}
                    {/* ========================================================================= */}
                    {activeTab === 'act' && (
                        <div className="space-y-4">
                            <div className="p-3 border border-[#1a4b6c] bg-[#0a1f2e]/70 flex items-center justify-between">
                                <div>
                                    <h4 className="text-white font-bold text-xs uppercase tracking-wider">
                                        AUTONOMOUS INTERVENTION COUNTERMEASURES
                                    </h4>
                                    <p className="text-[11px] text-slate-400">
                                        Execute self-administered physical, environmental, and pharmacological protocols.
                                    </p>
                                </div>
                                <span className="text-[10px] px-2 py-0.5 border border-emerald-800 bg-emerald-950 text-emerald-300">
                                    NASA-STD-3001 COMPLIANT
                                </span>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                                {/* Action 1: ARED Bone/Muscle Loading */}
                                <div className="p-3.5 border border-[#1a4b6c] bg-[#030b14] flex flex-col justify-between space-y-3">
                                    <div>
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-2 text-white font-bold">
                                                <Bone className="w-4 h-4 text-rose-400" />
                                                <span>ARED HIGH-LOAD BONE RESISTANCE</span>
                                            </div>
                                            <span className="text-[9px] px-1.5 py-0.5 border border-sky-800 text-sky-300">
                                                GRAVITY (G)
                                            </span>
                                        </div>
                                        <p className="text-[11px] text-slate-400 mt-1">
                                            Execute 2.5-hour scheduled squat and deadlift sets on the Advanced Resistive Exercise Device to halt osteoclastic bone resorption.
                                        </p>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() =>
                                            handleExecuteCountermeasure(
                                                'ared_load',
                                                'ARED 2.5h Bone Resistance Workout',
                                                'NASA-HRP-BMD-01',
                                                'Estimated -0.05% monthly bone loss mitigation, lumbar spine load applied.'
                                            )
                                        }
                                        disabled={executingActionId === 'ared_load' || completedActions.has('ared_load')}
                                        className={`w-full py-2 px-3 border text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
                                            completedActions.has('ared_load')
                                                ? 'border-emerald-600 bg-emerald-950/60 text-emerald-300'
                                                : 'border-[#5cdbdf] bg-[#5cdbdf]/15 text-[#5cdbdf] hover:bg-[#5cdbdf] hover:text-[#030b14]'
                                        }`}
                                    >
                                        {completedActions.has('ared_load') ? (
                                            <>
                                                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                                                <span>PROTOCOL LOGGED & ACTIVE</span>
                                            </>
                                        ) : (
                                            <>
                                                <Play className="w-4 h-4" />
                                                <span>INITIATE ARED PROTOCOL</span>
                                            </>
                                        )}
                                    </button>
                                </div>

                                {/* Action 2: LBNP Decompression for SANS */}
                                <div className="p-3.5 border border-[#1a4b6c] bg-[#030b14] flex flex-col justify-between space-y-3">
                                    <div>
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-2 text-white font-bold">
                                                <Eye className="w-4 h-4 text-sky-400" />
                                                <span>LBNP DECOMPRESSION SUIT (SANS)</span>
                                            </div>
                                            <span className="text-[9px] px-1.5 py-0.5 border border-sky-800 text-sky-300">
                                                GRAVITY (G)
                                            </span>
                                        </div>
                                        <p className="text-[11px] text-slate-400 mt-1">
                                            Engage 30-min Lower Body Negative Pressure (-35 mmHg) to pull pooled headward fluids back into legs and reduce optic sheath pressure.
                                        </p>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() =>
                                            handleExecuteCountermeasure(
                                                'lbnp_sans',
                                                'LBNP 30-Min Fluid Shift Session',
                                                'NASA-HRP-SANS-02',
                                                'Intracranial venous pressure reduced by ~4 mmHg; optic nerve sheath decompressed.'
                                            )
                                        }
                                        disabled={executingActionId === 'lbnp_sans' || completedActions.has('lbnp_sans')}
                                        className={`w-full py-2 px-3 border text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
                                            completedActions.has('lbnp_sans')
                                                ? 'border-emerald-600 bg-emerald-950/60 text-emerald-300'
                                                : 'border-[#5cdbdf] bg-[#5cdbdf]/15 text-[#5cdbdf] hover:bg-[#5cdbdf] hover:text-[#030b14]'
                                        }`}
                                    >
                                        {completedActions.has('lbnp_sans') ? (
                                            <>
                                                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                                                <span>LBNP SESSION COMPLETE</span>
                                            </>
                                        ) : (
                                            <>
                                                <Play className="w-4 h-4" />
                                                <span>ACTIVATE LBNP SUCTION</span>
                                            </>
                                        )}
                                    </button>
                                </div>

                                {/* Action 3: Circadian Lighting Spectrum Shift */}
                                <div className="p-3.5 border border-[#1a4b6c] bg-[#030b14] flex flex-col justify-between space-y-3">
                                    <div>
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-2 text-white font-bold">
                                                <Moon className="w-4 h-4 text-purple-400" />
                                                <span>SSLA CIRCADIAN LIGHTING SHIFT</span>
                                            </div>
                                            <span className="text-[9px] px-1.5 py-0.5 border border-purple-800 text-purple-300">
                                                ISOLATION (I)
                                            </span>
                                        </div>
                                        <p className="text-[11px] text-slate-400 mt-1">
                                            Cycle habitat solid-state dynamic LEDs between 480nm blue-enriched alert wakefulness and 650nm melatonin-inducing amber night spectrum.
                                        </p>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() =>
                                            handleExecuteCountermeasure(
                                                'ssla_light',
                                                'SSLA Circadian Spectrum Adjustment',
                                                'NASA-HRP-BEH-01',
                                                'Cabin spectrum shifted to 650nm amber; melatonin suppression halted.'
                                            )
                                        }
                                        disabled={executingActionId === 'ssla_light' || completedActions.has('ssla_light')}
                                        className={`w-full py-2 px-3 border text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
                                            completedActions.has('ssla_light')
                                                ? 'border-emerald-600 bg-emerald-950/60 text-emerald-300'
                                                : 'border-purple-500 bg-purple-950/40 text-purple-300 hover:bg-purple-600 hover:text-white'
                                        }`}
                                    >
                                        {completedActions.has('ssla_light') ? (
                                            <>
                                                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                                                <span>CIRCADIAN LIGHTING ACTIVE</span>
                                            </>
                                        ) : (
                                            <>
                                                <Play className="w-4 h-4" />
                                                <span>ADJUST CABIN LIGHTING</span>
                                            </>
                                        )}
                                    </button>
                                </div>

                                {/* Action 4: ECLSS Carbon Dioxide Scrubber Boost */}
                                <div className="p-3.5 border border-[#1a4b6c] bg-[#030b14] flex flex-col justify-between space-y-3">
                                    <div>
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-2 text-white font-bold">
                                                <Biohazard className="w-4 h-4 text-emerald-400" />
                                                <span>ECLSS LIFE SUPPORT CO2 SCRUBBER BOOST</span>
                                            </div>
                                            <span className="text-[9px] px-1.5 py-0.5 border border-emerald-800 text-emerald-300">
                                                ENVIRONMENT (E)
                                            </span>
                                        </div>
                                        <p className="text-[11px] text-slate-400 mt-1">
                                            Command Rapid Cycling Amine (RCA) regenerative scrubbers to purge atmospheric carbon dioxide to below 1.2 mmHg.
                                        </p>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() =>
                                            handleExecuteCountermeasure(
                                                'eclss_boost',
                                                'ECLSS RCA Amine Scrubber Purge',
                                                'NASA-HRP-ECLSS-03',
                                                'Cabin pCO2 dropping toward 1.1 mmHg; hypercapnia headache risk mitigated.'
                                            )
                                        }
                                        disabled={executingActionId === 'eclss_boost' || completedActions.has('eclss_boost')}
                                        className={`w-full py-2 px-3 border text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
                                            completedActions.has('eclss_boost')
                                                ? 'border-emerald-600 bg-emerald-950/60 text-emerald-300'
                                                : 'border-emerald-500 bg-emerald-950/40 text-emerald-300 hover:bg-emerald-600 hover:text-white'
                                        }`}
                                    >
                                        {completedActions.has('eclss_boost') ? (
                                            <>
                                                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                                                <span>CO2 SCRUBBING AT MAX CAPACITY</span>
                                            </>
                                        ) : (
                                            <>
                                                <Play className="w-4 h-4" />
                                                <span>BOOST CO2 PURGE</span>
                                            </>
                                        )}
                                    </button>
                                </div>

                                {/* Action 5: Solar Storm Shelter Haven Lockdown */}
                                <div className="p-3.5 border border-[#1a4b6c] bg-[#030b14] flex flex-col justify-between space-y-3">
                                    <div>
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-2 text-white font-bold">
                                                <Zap className="w-4 h-4 text-amber-400" />
                                                <span>SOLAR STORM HAVEN WATER WALL SHIELDING</span>
                                            </div>
                                            <span className="text-[9px] px-1.5 py-0.5 border border-amber-800 text-amber-300">
                                                RADIATION (R)
                                            </span>
                                        </div>
                                        <p className="text-[11px] text-slate-400 mt-1">
                                            Configure innermost water bladder haven and activate real-time CPDS silicon dosimeter alerts during SPE proton storm events.
                                        </p>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() =>
                                            handleExecuteCountermeasure(
                                                'storm_haven',
                                                'Solar Storm Haven Protocol',
                                                'NASA-HRP-RAD-04',
                                                'Water wall density reconfigured; absorbed dose rate reduced by 68%.'
                                            )
                                        }
                                        disabled={executingActionId === 'storm_haven' || completedActions.has('storm_haven')}
                                        className={`w-full py-2 px-3 border text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
                                            completedActions.has('storm_haven')
                                                ? 'border-emerald-600 bg-emerald-950/60 text-emerald-300'
                                                : 'border-amber-500 bg-amber-950/40 text-amber-300 hover:bg-amber-600 hover:text-white'
                                        }`}
                                    >
                                        {completedActions.has('storm_haven') ? (
                                            <>
                                                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                                                <span>STORM HAVEN DEPLOYED</span>
                                            </>
                                        ) : (
                                            <>
                                                <Play className="w-4 h-4" />
                                                <span>DEPLOY STORM HAVEN</span>
                                            </>
                                        )}
                                    </button>
                                </div>

                                {/* Action 6: Earth-Ambient Sensory VR Reset */}
                                <div className="p-3.5 border border-[#1a4b6c] bg-[#030b14] flex flex-col justify-between space-y-3">
                                    <div>
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-2 text-white font-bold">
                                                <Sparkles className="w-4 h-4 text-[#5cdbdf]" />
                                                <span>EARTH-AMBIENT SENSORY VR IMMERSION</span>
                                            </div>
                                            <span className="text-[9px] px-1.5 py-0.5 border border-purple-800 text-purple-300">
                                                ISOLATION (I)
                                            </span>
                                        </div>
                                        <p className="text-[11px] text-slate-400 mt-1">
                                            Launch 15-minute natural terrestrial sensory stimulation immersion (forest acoustic/visual rendering) to reduce psychological monotony.
                                        </p>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() =>
                                            handleExecuteCountermeasure(
                                                'vr_reset',
                                                'Earth-Ambient VR Sensory Session',
                                                'NASA-HRP-BEH-03',
                                                'Psychomotor vigilance improved; salivary cortisol stress markers stabilized.'
                                            )
                                        }
                                        disabled={executingActionId === 'vr_reset' || completedActions.has('vr_reset')}
                                        className={`w-full py-2 px-3 border text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
                                            completedActions.has('vr_reset')
                                                ? 'border-emerald-600 bg-emerald-950/60 text-emerald-300'
                                                : 'border-[#5cdbdf] bg-[#5cdbdf]/15 text-[#5cdbdf] hover:bg-[#5cdbdf] hover:text-[#030b14]'
                                        }`}
                                    >
                                        {completedActions.has('vr_reset') ? (
                                            <>
                                                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                                                <span>VR DECOMPRESSION COMPLETE</span>
                                            </>
                                        ) : (
                                            <>
                                                <Play className="w-4 h-4" />
                                                <span>START 15-MIN VR SESSION</span>
                                            </>
                                        )}
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* ========================================================================= */}
                    {/* TAB 3: GATHERED HEALTH INDICATORS (Live Sensor Matrices)                   */}
                    {/* ========================================================================= */}
                    {activeTab === 'indicators' && (
                        <div className="space-y-4">
                            <div className="p-3 border border-[#1a4b6c] bg-[#0a1f2e]/70 flex items-center justify-between">
                                <div>
                                    <h4 className="text-white font-bold text-xs uppercase tracking-wider">
                                        REAL-TIME 5-HAZARD BIOMEDICAL SENSOR STREAMS
                                    </h4>
                                    <p className="text-[11px] text-slate-400">
                                        Direct telemetry feeds synchronized via Deep Space Network (DSN Goldstone).
                                    </p>
                                </div>
                                <span className="text-[10px] px-2 py-0.5 border border-cyan-800 bg-cyan-950 text-cyan-300">
                                    LIVE DSN TELEMETRY
                                </span>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
                                {/* Radiation Dosimetry */}
                                <div className="p-3.5 border border-[#1a4b6c] bg-[#030b14] space-y-2">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-1.5 text-amber-300 font-bold">
                                            <Zap className="w-4 h-4" />
                                            <span>SPACE RADIATION (R)</span>
                                        </div>
                                        <span className="text-[10px] px-1.5 py-0.5 border border-emerald-800 text-emerald-400">
                                            NOMINAL
                                        </span>
                                    </div>
                                    <div className="space-y-1 text-[11px]">
                                        <div className="flex justify-between">
                                            <span className="text-slate-400">Daily Absorption:</span>
                                            <span className="text-white font-mono font-bold">0.38 mSv / day</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-slate-400">Mission Cumulative:</span>
                                            <span className="text-amber-300 font-mono font-bold">{astronaut.diagnostics.radiationStatus === 'Elevated' ? '174 mSv' : '88 mSv'}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-slate-400">REID Cancer Risk:</span>
                                            <span className="text-cyan-300 font-mono">1.18% (Cap: 3.0%)</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-slate-400">Solar Storm Haven:</span>
                                            <span className="text-emerald-400 font-mono">Standby (0 CME Alerts)</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Gravity Fields: Bone & Musculoskeletal */}
                                <div className="p-3.5 border border-[#1a4b6c] bg-[#030b14] space-y-2">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-1.5 text-rose-300 font-bold">
                                            <Bone className="w-4 h-4" />
                                            <span>ALTERED GRAVITY (G)</span>
                                        </div>
                                        <span className="text-[10px] px-1.5 py-0.5 border border-amber-800 text-amber-400">
                                            GUARDED
                                        </span>
                                    </div>
                                    <div className="space-y-1 text-[11px]">
                                        <div className="flex justify-between">
                                            <span className="text-slate-400">Cumulative BMD Loss:</span>
                                            <span className="text-rose-400 font-mono font-bold">{astronaut.bio.boneDensityLoss || '-2.6%'}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-slate-400">Demineralization Rate:</span>
                                            <span className="text-white font-mono font-bold">-1.1% / Month</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-slate-400">SANS Optic Sheath:</span>
                                            <span className="text-cyan-300 font-mono">5.1 mm (Clear)</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-slate-400">ARED Resistance Today:</span>
                                            <span className="text-emerald-400 font-mono">Completed (450 lbs)</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Isolation & Sleep */}
                                <div className="p-3.5 border border-[#1a4b6c] bg-[#030b14] space-y-2">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-1.5 text-purple-300 font-bold">
                                            <Moon className="w-4 h-4" />
                                            <span>ISOLATION & SLEEP (I)</span>
                                        </div>
                                        <span className="text-[10px] px-1.5 py-0.5 border border-emerald-800 text-emerald-400">
                                            NOMINAL
                                        </span>
                                    </div>
                                    <div className="space-y-1 text-[11px]">
                                        <div className="flex justify-between">
                                            <span className="text-slate-400">Actigraphy Sleep:</span>
                                            <span className="text-white font-mono font-bold">7.4 Hours / Night</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-slate-400">Sleep Efficiency:</span>
                                            <span className="text-emerald-400 font-mono font-bold">88.2%</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-slate-400">PVT Vigilance Latency:</span>
                                            <span className="text-cyan-300 font-mono">214 ms (Fast)</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-slate-400">Circadian Lighting:</span>
                                            <span className="text-purple-300 font-mono">480nm Day Cycle</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Hostile Closed Environment */}
                                <div className="p-3.5 border border-[#1a4b6c] bg-[#030b14] space-y-2">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-1.5 text-emerald-300 font-bold">
                                            <Biohazard className="w-4 h-4" />
                                            <span>CLOSED ENVIRONMENT (E)</span>
                                        </div>
                                        <span className="text-[10px] px-1.5 py-0.5 border border-emerald-800 text-emerald-400">
                                            NOMINAL
                                        </span>
                                    </div>
                                    <div className="space-y-1 text-[11px]">
                                        <div className="flex justify-between">
                                            <span className="text-slate-400">Cabin CO2 (pCO2):</span>
                                            <span className="text-emerald-400 font-mono font-bold">1.4 mmHg (&lt; 2.0 Max)</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-slate-400">Cabin Pressure:</span>
                                            <span className="text-white font-mono font-bold">14.7 psi (101.3 kPa)</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-slate-400">ECLSS Loop Recovery:</span>
                                            <span className="text-cyan-300 font-mono">98.4% Water Loop</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-slate-400">Regolith Dust Barrier:</span>
                                            <span className="text-slate-300 font-mono">0.02 mg/m³ (Nominal)</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Distance & Autonomy */}
                                <div className="p-3.5 border border-[#1a4b6c] bg-[#030b14] space-y-2">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-1.5 text-amber-300 font-bold">
                                            <Compass className="w-4 h-4" />
                                            <span>DISTANCE FROM EARTH (D)</span>
                                        </div>
                                        <span className="text-[10px] px-1.5 py-0.5 border border-cyan-800 text-cyan-300">
                                            LEVEL-4 AUTONOMY
                                        </span>
                                    </div>
                                    <div className="space-y-1 text-[11px]">
                                        <div className="flex justify-between">
                                            <span className="text-slate-400">Light Comm Latency:</span>
                                            <span className="text-amber-300 font-mono font-bold">14m 12s One-Way</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-slate-400">Earth Distance:</span>
                                            <span className="text-white font-mono font-bold">128.4 Million Miles</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-slate-400">Emergency Evac:</span>
                                            <span className="text-rose-400 font-mono">Impossible (Deep Space)</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-slate-400">ORBIT Decision AI:</span>
                                            <span className="text-emerald-400 font-mono">Active (JSC Autonomous)</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Cardiovascular Vitals Overview */}
                                <div className="p-3.5 border border-[#1a4b6c] bg-[#030b14] space-y-2">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-1.5 text-sky-300 font-bold">
                                            <Heart className="w-4 h-4" />
                                            <span>CARDIOVASCULAR HEALTH</span>
                                        </div>
                                        <span className="text-[10px] px-1.5 py-0.5 border border-emerald-800 text-emerald-400">
                                            STABLE
                                        </span>
                                    </div>
                                    <div className="space-y-1 text-[11px]">
                                        <div className="flex justify-between">
                                            <span className="text-slate-400">Heart Rate (ECG):</span>
                                            <span className="text-white font-mono font-bold">{astronaut.vitals.heartRate.value}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-slate-400">Oxygen Saturation:</span>
                                            <span className="text-emerald-400 font-mono font-bold">{astronaut.vitals.spO2.value}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-slate-400">Core Temperature:</span>
                                            <span className="text-white font-mono font-bold">{astronaut.vitals.coreTemp.value}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-slate-400">Orthostatic Stability:</span>
                                            <span className="text-cyan-300 font-mono">Delta +18 bpm (Normal)</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer Buttons */}
                <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-6 py-4 border-t border-[#1a4b6c] bg-[#0a1f2e]/70 shrink-0 text-xs">
                    <div className="flex items-center gap-2 text-slate-400 text-[11px]">
                        <Shield className="w-3.5 h-3.5 text-[#5cdbdf]" />
                        <span>NASA HRP STANDARD: <strong className="text-white">NASA-STD-3001 VOL 1 & 2</strong></span>
                    </div>

                    <div className="flex items-center gap-2">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 border border-[#1a4b6c] bg-[#030b14] text-slate-300 hover:text-white hover:border-[#5cdbdf] transition-all cursor-pointer font-bold"
                        >
                            CLOSE CONSOLE
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
