import React, { useState, useMemo } from 'react';
import {
    X,
    Activity,
    Shield,
    Heart,
    Eye,
    Bone,
    Zap,
    Moon,
    Compass,
    Orbit,
    Biohazard,
    CheckCircle2,
    AlertTriangle,
    Clock,
    Sparkles,
    Send,
    Play,
    Check,
    RefreshCw,
    ExternalLink,
    ChevronRight,
    Dumbbell,
    Flame,
} from 'lucide-react';
import type { AstronautFullData } from '@/types/astronaut';
import { toast } from 'sonner';

export type MissionHazard = 'Radiation' | 'Isolation' | 'Distance' | 'Gravity' | 'Environment';

interface AstronautSelfAssessmentModalProps {
    hazard?: MissionHazard | null;
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
    hazard,
    onClose,
    astronaut,
    onActionExecuted,
    onSaveAssessment,
}: AstronautSelfAssessmentModalProps) {
    // Active Navigation Tab
    const [activeTab, setActiveTab] = useState<'indicators' | 'evaluate' | 'act'>('evaluate');
    const [questionIndex, setQuestionIndex] = useState(0);

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

    const questions = [
        { title: 'Vision', prompt: 'How clear is your vision when reading nearby text? Consider any new blurring or pressure behind your eyes.', score: visionScore, setScore: setVisionScore, low: 'Very blurry', high: 'Clear' },
        { title: 'Sleep and alertness', prompt: 'How rested and alert do you feel after your most recent sleep?', score: sleepScore, setScore: setSleepScore, low: 'Exhausted', high: 'Rested' },
        { title: 'Muscle and bone', prompt: 'How strong and comfortable do you feel moving? Consider any new weakness, tightness, or pain.', score: muscleBoneScore, setScore: setMuscleBoneScore, low: 'Very weak', high: 'Strong' },
        { title: 'Fatigue and nausea', prompt: 'How do you feel physically? Consider any unusual fatigue, nausea, or sensitivity.', score: radiationFatigueScore, setScore: setRadiationFatigueScore, low: 'Severe symptoms', high: 'No symptoms' },
        { title: 'Cabin comfort', prompt: 'How comfortable does the cabin feel? Consider stuffiness, headaches, and changes in your skin.', score: airQualityScore, setScore: setAirQualityScore, low: 'Very uncomfortable', high: 'Comfortable' },
    ];
    const question = questions[questionIndex];

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-3 sm:p-5">
            <div role="dialog" aria-modal="true" aria-labelledby="orbit-assessment-title" className={`orbit-glass orbit-glass-dialog relative flex max-h-[92dvh] w-full flex-col overflow-hidden text-slate-200 motion-safe:animate-in motion-safe:fade-in motion-safe:zoom-in-95 motion-safe:duration-200 ${hazard ? 'max-w-md' : 'max-w-3xl'}`}>
                <div className="flex shrink-0 items-center justify-between gap-3 border-b border-white/10 px-4 py-4 sm:px-6">
                    <div>
                        <h2 id="orbit-assessment-title" className="text-lg font-semibold tracking-tight text-white">{hazard ?? 'Crew self-assessment'}</h2>
                        <p className="mt-0.5 text-xs text-slate-300">{astronaut.bio.name}</p>
                    </div>
                    <button type="button" aria-label="Close" onClick={onClose} className="orbit-header-control orbit-glass-inset">
                        <X aria-hidden="true" className="size-5" />
                    </button>
                </div>

                {!hazard && (
                    <div aria-label="Assessment sections" className="flex shrink-0 flex-wrap gap-1 border-b border-white/10 px-4 py-2 sm:px-6">
                        {([{ id: 'evaluate', label: 'Self-check' }, { id: 'act', label: 'Countermeasures' }, { id: 'indicators', label: 'Health indicators' }] as const).map(({ id, label }) => (
                            <button
                                key={id}
                                type="button"
                                aria-pressed={activeTab === id}
                                onClick={() => setActiveTab(id)}
                                className={`orbit-header-control ${activeTab === id ? 'orbit-glass-inset' : ''}`}
                            >
                                {label}
                                {id === 'act' && completedActions.size > 0 && <span className="text-xs text-emerald-300">{completedActions.size}</span>}
                            </button>
                        ))}
                    </div>
                )}

                <div className="min-h-0 flex-1 overflow-y-auto p-4 text-sm sm:p-6">
                    {!hazard && activeTab === 'evaluate' && (
                        <div className="space-y-5">
                            {questionIndex < questions.length && (
                                <div className="space-y-4">
                                    <div className="flex items-center justify-between gap-3 text-xs text-slate-300">
                                        <span>Question {questionIndex + 1} of {questions.length}</span>
                                        <progress aria-label="Self-check progress" value={questionIndex + 1} max={questions.length} className="h-1.5 w-24 overflow-hidden rounded-full accent-cyan-200" />
                                    </div>
                                    <div key={questionIndex} className="orbit-glass-inset space-y-4 p-4 sm:p-5 motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-1 motion-safe:duration-200">
                                        <div>
                                            <h3 className="text-lg font-semibold text-white">{question.title}</h3>
                                            <p className="mt-1.5 text-sm leading-relaxed text-slate-300">{question.prompt}</p>
                                        </div>
                                        <div role="group" aria-label={question.title + ' rating'} className="grid grid-cols-5 gap-1.5 rounded-2xl bg-black/20 p-1.5">
                                            {[1, 2, 3, 4, 5].map((score) => (
                                                <button key={score} type="button" aria-pressed={question.score === score} onClick={() => question.setScore(score)} className={`min-h-10 cursor-pointer rounded-xl text-sm font-semibold focus-visible:outline-2 focus-visible:outline-cyan-300 ${question.score === score ? 'bg-cyan-100/90 text-slate-950' : 'text-slate-200 hover:bg-white/10'}`}>
                                                    {score}
                                                </button>
                                            ))}
                                        </div>
                                        <div className="flex justify-between gap-3 text-xs text-slate-300"><span>1 · {question.low}</span><span>5 · {question.high}</span></div>
                                    </div>
                                    <div className="flex items-center justify-between gap-2">
                                        <button type="button" disabled={questionIndex === 0} onClick={() => setQuestionIndex(questionIndex - 1)} className="orbit-header-control orbit-glass-inset disabled:opacity-35">Back</button>
                                        <button type="button" onClick={() => setQuestionIndex(questionIndex + 1)} className="cursor-pointer rounded-full bg-cyan-100/90 px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-cyan-100">
                                            {questionIndex === questions.length - 1 ? 'Review assessment' : 'Continue'}
                                        </button>
                                    </div>
                                </div>
                            )}

                            {questionIndex === questions.length && (
                            <div className="space-y-3">
                            <button type="button" className="orbit-header-control orbit-glass-inset" onClick={() => setQuestionIndex(questions.length - 1)}>Back to questions</button>
                            <div className={`p-4 border rounded-2xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4 ${
                                evaluationResults.status === 'CRITICAL' || evaluationResults.status === 'ELEVATED'
                                    ? 'border-rose-700 bg-rose-950/30'
                                    : evaluationResults.status === 'GUARDED'
                                    ? 'border-amber-700 bg-amber-950/30'
                                    : 'border-emerald-700 bg-emerald-950/30'
                            }`}>
                                <div className="space-y-1">
                                    <div className="flex items-center gap-2">
                                        <span className="text-xs text-slate-400 uppercase tracking-wider">
                                            Health score
                                        </span>
                                        <span className="text-lg font-bold text-white font-mono">
                                            {evaluationResults.score} / 100
                                        </span>
                                        <span className={`rounded-full px-2 py-0.5 text-xs font-semibold border ${
                                            evaluationResults.status === 'CRITICAL' || evaluationResults.status === 'ELEVATED'
                                                ? 'border-rose-700 bg-rose-950 text-rose-300'
                                                : evaluationResults.status === 'GUARDED'
                                                ? 'border-amber-700 bg-amber-950 text-amber-300'
                                                : 'border-emerald-700 bg-emerald-950 text-emerald-300'
                                        }`}>
                                            STATUS: {evaluationResults.status}
                                        </span>
                                    </div>
                                    <p className="text-xs text-slate-300">
                                        {evaluationResults.alertMessage}
                                    </p>
                                    {evaluationResults.flags.length > 0 && (
                                        <div className="pt-2 space-y-1 border-t border-[#1a4b6c]/50 text-xs text-rose-300">
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
                                        className="rounded-full px-4 py-2.5 border border-[#5cdbdf]/60 bg-[#0a1f2e] text-[#5cdbdf] font-bold hover:bg-[#5cdbdf]/20 hover:text-white transition-all flex items-center gap-1.5 cursor-pointer text-xs"
                                    >
                                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                                        <span>Save assessment</span>
                                    </button>

                                    <button
                                        type="button"
                                        onClick={() => setActiveTab('act')}
                                        className="rounded-full px-5 py-2.5 bg-[#5cdbdf] text-[#030b14] font-bold hover:brightness-110 transition-all flex items-center gap-2 cursor-pointer shadow-[0_0_15px_rgba(92,219,223,0.3)] text-xs"
                                    >
                                        <span>View countermeasures</span>
                                        <ChevronRight className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>
                            </div>
                            )}
                        </div>
                    )}

                    {/* ========================================================================= */}
                    {/* TAB 2: ACT ON HEALTH STATUS (Autonomous Countermeasures Suite)             */}
                    {/* ========================================================================= */}
                    {!hazard && activeTab === 'act' && (
                        <div className="space-y-4">
                            <div className="space-y-2">
                                <details name="orbit-countermeasures" className="orbit-glass-inset">
                                    <summary className="cursor-pointer rounded-xl px-4 py-3 text-sm font-medium text-white hover:bg-white/5">Bone resistance exercise</summary>
                                <div className="p-3.5 flex flex-col justify-between space-y-3">
                                    <div>
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-2 text-white font-bold">
                                                <Bone className="w-4 h-4 text-rose-400" />
                                                <span>ARED HIGH-LOAD BONE RESISTANCE</span>
                                            </div>
                                            <span className="rounded-full px-1.5 py-0.5 text-xs border border-sky-800 text-sky-300">
                                                GRAVITY (G)
                                            </span>
                                        </div>
                                        <p className="text-xs text-slate-400 mt-1">
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
                                </details>
                                <details name="orbit-countermeasures" className="orbit-glass-inset">
                                    <summary className="cursor-pointer rounded-xl px-4 py-3 text-sm font-medium text-white hover:bg-white/5">Lower-body decompression</summary>
                                <div className="p-3.5 flex flex-col justify-between space-y-3">
                                    <div>
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-2 text-white font-bold">
                                                <Eye className="w-4 h-4 text-sky-400" />
                                                <span>LBNP DECOMPRESSION SUIT (SANS)</span>
                                            </div>
                                            <span className="rounded-full px-1.5 py-0.5 text-xs border border-sky-800 text-sky-300">
                                                GRAVITY (G)
                                            </span>
                                        </div>
                                        <p className="text-xs text-slate-400 mt-1">
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
                                </details>
                                <details name="orbit-countermeasures" className="orbit-glass-inset">
                                    <summary className="cursor-pointer rounded-xl px-4 py-3 text-sm font-medium text-white hover:bg-white/5">Circadian lighting</summary>
                                <div className="p-3.5 flex flex-col justify-between space-y-3">
                                    <div>
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-2 text-white font-bold">
                                                <Moon className="w-4 h-4 text-purple-400" />
                                                <span>SSLA CIRCADIAN LIGHTING SHIFT</span>
                                            </div>
                                            <span className="rounded-full px-1.5 py-0.5 text-xs border border-purple-800 text-purple-300">
                                                ISOLATION (I)
                                            </span>
                                        </div>
                                        <p className="text-xs text-slate-400 mt-1">
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
                                </details>
                                <details name="orbit-countermeasures" className="orbit-glass-inset">
                                    <summary className="cursor-pointer rounded-xl px-4 py-3 text-sm font-medium text-white hover:bg-white/5">Cabin CO₂ scrubber</summary>
                                <div className="p-3.5 flex flex-col justify-between space-y-3">
                                    <div>
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-2 text-white font-bold">
                                                <Biohazard className="w-4 h-4 text-emerald-400" />
                                                <span>ECLSS LIFE SUPPORT CO2 SCRUBBER BOOST</span>
                                            </div>
                                            <span className="rounded-full px-1.5 py-0.5 text-xs border border-emerald-800 text-emerald-300">
                                                ENVIRONMENT (E)
                                            </span>
                                        </div>
                                        <p className="text-xs text-slate-400 mt-1">
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
                                </details>
                                <details name="orbit-countermeasures" className="orbit-glass-inset">
                                    <summary className="cursor-pointer rounded-xl px-4 py-3 text-sm font-medium text-white hover:bg-white/5">Solar storm shelter</summary>
                                <div className="p-3.5 flex flex-col justify-between space-y-3">
                                    <div>
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-2 text-white font-bold">
                                                <Zap className="w-4 h-4 text-amber-400" />
                                                <span>SOLAR STORM HAVEN WATER WALL SHIELDING</span>
                                            </div>
                                            <span className="rounded-full px-1.5 py-0.5 text-xs border border-amber-800 text-amber-300">
                                                RADIATION (R)
                                            </span>
                                        </div>
                                        <p className="text-xs text-slate-400 mt-1">
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
                                </details>
                                <details name="orbit-countermeasures" className="orbit-glass-inset">
                                    <summary className="cursor-pointer rounded-xl px-4 py-3 text-sm font-medium text-white hover:bg-white/5">Earth-ambient VR session</summary>
                                <div className="p-3.5 flex flex-col justify-between space-y-3">
                                    <div>
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-2 text-white font-bold">
                                                <Sparkles className="w-4 h-4 text-[#5cdbdf]" />
                                                <span>EARTH-AMBIENT SENSORY VR IMMERSION</span>
                                            </div>
                                            <span className="rounded-full px-1.5 py-0.5 text-xs border border-purple-800 text-purple-300">
                                                ISOLATION (I)
                                            </span>
                                        </div>
                                        <p className="text-xs text-slate-400 mt-1">
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
                                </details>

                            </div>
                        </div>
                    )}

                    {/* ========================================================================= */}
                    {/* TAB 3: GATHERED HEALTH INDICATORS (Live Sensor Matrices)                   */}
                    {/* ========================================================================= */}
                    {(hazard || activeTab === 'indicators') && (
                        <div className="space-y-4">
                            <div className={hazard ? "grid gap-3" : "grid grid-cols-1 gap-3 sm:grid-cols-2"}>
                                {(!hazard || hazard === 'Radiation') && (
                                    <div className="p-3.5 orbit-glass-inset space-y-2">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-1.5 text-amber-300 font-bold">
                                                <Zap className="w-4 h-4" />
                                                <span>SPACE RADIATION (R)</span>
                                            </div>
                                            <span className="text-xs px-1.5 py-0.5 border border-emerald-800 text-emerald-400">
                                                NOMINAL
                                            </span>
                                        </div>
                                        <div className="space-y-1 text-xs">
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
                                )}
                                {(!hazard || hazard === 'Gravity') && (
                                    <div className="p-3.5 orbit-glass-inset space-y-2">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-1.5 text-rose-300 font-bold">
                                                <Bone className="w-4 h-4" />
                                                <span>ALTERED GRAVITY (G)</span>
                                            </div>
                                            <span className="text-xs px-1.5 py-0.5 border border-amber-800 text-amber-400">
                                                GUARDED
                                            </span>
                                        </div>
                                        <div className="space-y-1 text-xs">
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
                                )}
                                {(!hazard || hazard === 'Isolation') && (
                                    <div className="p-3.5 orbit-glass-inset space-y-2">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-1.5 text-purple-300 font-bold">
                                                <Moon className="w-4 h-4" />
                                                <span>ISOLATION & SLEEP (I)</span>
                                            </div>
                                            <span className="text-xs px-1.5 py-0.5 border border-emerald-800 text-emerald-400">
                                                NOMINAL
                                            </span>
                                        </div>
                                        <div className="space-y-1 text-xs">
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
                                )}
                                {(!hazard || hazard === 'Environment') && (
                                    <div className="p-3.5 orbit-glass-inset space-y-2">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-1.5 text-emerald-300 font-bold">
                                                <Biohazard className="w-4 h-4" />
                                                <span>CLOSED ENVIRONMENT (E)</span>
                                            </div>
                                            <span className="text-xs px-1.5 py-0.5 border border-emerald-800 text-emerald-400">
                                                NOMINAL
                                            </span>
                                        </div>
                                        <div className="space-y-1 text-xs">
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
                                )}
                                {(!hazard || hazard === 'Distance') && (
                                    <div className="p-3.5 orbit-glass-inset space-y-2">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-1.5 text-amber-300 font-bold">
                                                <Compass className="w-4 h-4" />
                                                <span>DISTANCE FROM EARTH (D)</span>
                                            </div>
                                            <span className="text-xs px-1.5 py-0.5 border border-cyan-800 text-cyan-300">
                                                LEVEL-4 AUTONOMY
                                            </span>
                                        </div>
                                        <div className="space-y-1 text-xs">
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
                                )}
                                {!hazard && (
                                    <div className="p-3.5 orbit-glass-inset space-y-2">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-1.5 text-sky-300 font-bold">
                                                <Heart className="w-4 h-4" />
                                                <span>CARDIOVASCULAR HEALTH</span>
                                            </div>
                                            <span className="text-xs px-1.5 py-0.5 border border-emerald-800 text-emerald-400">
                                                STABLE
                                            </span>
                                        </div>
                                        <div className="space-y-1 text-xs">
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
                                )}

                            </div>
                        </div>
                    )}
                </div>


            </div>
        </div>
    );
}
