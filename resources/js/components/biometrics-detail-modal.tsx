import React, { useState } from 'react';
import { 
    X, Activity, Heart, Thermometer, Droplets, 
    RefreshCw, CheckCircle2, AlertTriangle, Sparkles 
} from 'lucide-react';
import type { AstronautFullData } from '@/types/astronaut';
import { toast } from 'sonner';

const ecgBeat = [
    [0, 0], [.13, 0], [.19, .08], [.24, .13], [.30, 0],
    [.37, 0], [.41, -.12], [.45, 1], [.49, -.32], [.55, 0],
    [.63, 0], [.71, .22], [.78, .16], [.85, 0], [1, 0],
];

function HeartRateGraph({ bpm }: { bpm: number }) {
    const seconds = 6;
    const beats = Number.isFinite(bpm) ? Math.min(30, Math.max(0, bpm) * seconds / 60) : 0;
    const points = beats > 0
        ? Array.from({ length: Math.ceil(beats) }, (_, beat) =>
            ecgBeat.map(([phase, amplitude]) => `${(beat + phase) * 600 / beats},${66 - amplitude * 40}`)
        ).flat().join(' ')
        : '0,66 600,66';

    return (
        <figure className="orbit-glass-inset mt-4 p-3 sm:p-4">
            <figcaption className="mb-2 flex flex-wrap items-baseline justify-between gap-x-2 gap-y-1">
                <span className="text-sm font-medium text-white">ECG-style waveform</span>
                <span className="text-xs text-slate-300">6-second view</span>
            </figcaption>
            <div className="overflow-hidden rounded-xl border border-white/10 bg-slate-950/45">
                <svg role="img" aria-label={`Illustrative ECG-style waveform paced at ${bpm} beats per minute`} className="block h-32 w-full sm:h-40" viewBox="0 0 600 108" preserveAspectRatio="none">
                    {Array.from({ length: 31 }, (_, index) => (
                        <path key={index} d={`M${index * 20} 0V108`} stroke="currentColor" className="text-cyan-200" strokeOpacity={index % 5 === 0 ? .20 : .07} vectorEffect="non-scaling-stroke" />
                    ))}
                    {[12, 30, 48, 66, 84, 102].map((y) => (
                        <path key={y} d={`M0 ${y}H600`} stroke="currentColor" className="text-cyan-200" strokeOpacity={y === 66 ? .22 : .08} vectorEffect="non-scaling-stroke" />
                    ))}
                    <polyline points={points} fill="none" stroke="#8cecec" strokeWidth="2" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
                </svg>
            </div>
            <div aria-hidden="true" className="mt-1 flex justify-between text-[11px] text-slate-300 tabular-nums">
                {Array.from({ length: seconds + 1 }, (_, second) => <span key={second}>{second}s</span>)}
            </div>
            <p className="mt-3 text-xs text-slate-400">Illustrative trace generated from the displayed BPM.</p>
        </figure>
    );
}

export type BiometricKey = keyof AstronautFullData['vitals'];

const biometricDetails = {
    heartRate: { label: 'Heart rate', range: [60, 100], description: 'Beats per minute show how fast the heart is beating. Compare readings taken at similar activity levels.' },
    spO2: { label: 'Oxygen saturation', range: [95, 100], description: 'SpO₂ estimates the percentage of hemoglobin carrying oxygen. It is separate from the oxygen reserve shown in Suit Life Support.' },
    respiration: { label: 'Respiration', range: [12, 20], description: 'Breaths per minute measure breathing frequency. Compare readings taken at a similar workload.' },
    coreTemp: { label: 'Core temperature', range: [36.5, 37.5], description: 'Core temperature estimates internal body temperature. The trend shows how it changes between dashboard readings.' },
    hydration: { label: 'Hydration', range: [80, 100], description: 'The dashboard tracks hydration as a percentage of its reference level. The trend shows how that reading changes over time.' },
} as const satisfies Record<BiometricKey, { label: string; range: readonly [number, number]; description: string }>;

function ReadingHistory({ samples, range, unit }: {
    samples: number[];
    range: readonly [number, number];
    unit: string;
}) {
    const [lower, upper] = range;
    const low = Math.min(lower, ...samples);
    const high = Math.max(upper, ...samples);
    const padding = (high - low) * .15;
    const y = (value: number) => 110 - (value - low + padding) / (high - low + 2 * padding) * 100;
    const points = samples.map((value, index) => ({
        x: samples.length === 1 ? 280 : 10 + 540 * index / (samples.length - 1),
        y: y(value),
    }));
    const latest = points.at(-1);
    const format = (value: number) => Number(value.toFixed(2)).toString();

    return (
        <figure className="orbit-glass-inset mt-4 p-3 sm:p-4">
            <figcaption className="mb-2 flex flex-wrap justify-between gap-2 text-sm">
                <span className="font-medium text-white">Recent readings</span>
                <span className="text-xs text-slate-300">{samples.length} {samples.length === 1 ? 'reading' : 'readings'}</span>
            </figcaption>
            <div className="flex gap-2 rounded-xl border border-white/10 bg-slate-950/45 p-2">
                <div aria-hidden="true" className="flex shrink-0 flex-col justify-between py-2 text-[11px] text-slate-300 tabular-nums">
                    <span>{format(high + padding)} {unit}</span>
                    <span>{format(low - padding)} {unit}</span>
                </div>
                <svg role="img" aria-label={`Reading history with dashboard reference band from ${lower} to ${upper} ${unit}`} className="block h-36 w-full min-w-0" viewBox="0 0 560 120" preserveAspectRatio="none">
                    <rect x="0" y={y(upper)} width="560" height={y(lower) - y(upper)} fill="#67e8f9" opacity=".12" />
                    {[lower, upper].map((limit) => (
                        <path key={limit} d={`M0 ${y(limit)}H560`} stroke="#67e8f9" strokeOpacity=".45" strokeDasharray="3 4" vectorEffect="non-scaling-stroke" />
                    ))}
                    {points.length > 1 && <polyline points={points.map(({ x, y }) => `${x},${y}`).join(' ')} fill="none" stroke="#a5f3fc" strokeWidth="2" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />}
                    {latest && <circle cx={latest.x} cy={latest.y} r="3" fill="#cffafe" />}
                </svg>
            </div>
            <p className="mt-2 text-xs text-slate-300">Shaded band: dashboard reference range. {samples.length > 1 ? 'Readings are shown in order.' : 'A trend appears as new readings arrive.'}</p>
            {samples.length > 1 && (
                <dl className="mt-3 grid grid-cols-3 gap-2 border-t border-white/10 pt-3 text-xs">
                    {[
                        ['Lowest', Math.min(...samples)],
                        ['Average', samples.reduce((sum, value) => sum + value, 0) / samples.length],
                        ['Highest', Math.max(...samples)],
                    ].map(([label, value]) => (
                        <div key={label}>
                            <dt className="text-slate-300">{label}</dt>
                            <dd className="mt-1 font-semibold text-white tabular-nums">{format(Number(value))} {unit}</dd>
                        </div>
                    ))}
                </dl>
            )}
        </figure>
    );
}

interface BiometricsDetailModalProps {
    metricKey?: BiometricKey | null;
    demoValue?: number;
    samples?: number[];
    isOpen: boolean;
    onClose: () => void;
    astronaut: AstronautFullData;
    onRecalibrate: () => void;
}

export default function BiometricsDetailModal({
    isOpen,
    onClose,
    astronaut,
    onRecalibrate,
    metricKey,
    demoValue,
    samples = [],
}: BiometricsDetailModalProps) {
    const [isRecalibrating, setIsRecalibrating] = useState(false);

    if (!isOpen) return null;

    if (metricKey) {
        const metric = astronaut.vitals[metricKey];
        const value = demoValue ?? metric.numericValue;
        const isHeart = metricKey === 'heartRate';
        const isOxygen = metricKey === 'spO2';
        const warning = isHeart ? value < 60 || value > 100 : isOxygen && value < 95;
        const status = warning ? (isOxygen ? 'Low oxygen' : value < 60 ? 'Low BPM' : 'High BPM') : metric.status?.replace(/[()]/g, '');
        const info = biometricDetails[metricKey];
        const history = demoValue !== undefined ? [demoValue] : [...samples.filter(Number.isFinite)];
        if (demoValue === undefined && Number.isFinite(value) && history.at(-1) !== value) history.push(value);
        return (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4">
                <section role="dialog" aria-modal="true" aria-labelledby="biometric-reading-title" className="orbit-glass orbit-glass-dialog relative max-h-[90dvh] w-full max-w-xl overflow-y-auto p-5 motion-safe:animate-in motion-safe:fade-in motion-safe:zoom-in-95 motion-safe:duration-200">
                    <div className="flex items-start justify-between gap-3">
                        <div>
                            <h2 id="biometric-reading-title" className="text-lg font-semibold text-white">{info.label}</h2>
                            <p className="text-sm text-slate-300">{astronaut.bio.name}</p>
                        </div>
                        <button type="button" aria-label="Close" onClick={onClose} className="orbit-header-control orbit-glass-inset">
                            <X aria-hidden="true" className="size-4" />
                        </button>
                    </div>
                    <div className={`orbit-glass relative mt-4 rounded-2xl p-4 ${warning ? 'orbit-glass-vital-warning' : ''}`}>
                        <div className="flex items-baseline gap-2 text-white">
                            <span className="orbit-metric-value text-4xl">{value}</span>
                            <span className="text-sm text-slate-300">{metric.unit}</span>
                        </div>
                        {(status || demoValue !== undefined) && <p className="mt-2 text-sm text-slate-200">{[status, demoValue !== undefined ? 'Demo' : null].filter(Boolean).join(' · ')}</p>}
                        <p className="mt-2 text-xs text-slate-300">Dashboard baseline {metric.baseline}</p>
                    </div>
                    {isHeart ? <HeartRateGraph bpm={value} /> : <ReadingHistory samples={history} range={info.range} unit={metric.unit} />}
                    <div className="mt-4">
                        <h3 className="text-sm font-medium text-white">What this measures</h3>
                        <p className="mt-1 text-sm leading-relaxed text-slate-300">{info.description}</p>
                    </div>
                </section>
            </div>
        );
    }

    const handleCalibrate = async () => {
        setIsRecalibrating(true);
        toast.info('Recalibrating physiological skin sensors & optical biosensors...');
        await new Promise((r) => setTimeout(r, 800));
        onRecalibrate();
        toast.success('Biosensor baseline recalibration complete');
        setIsRecalibrating(false);
    };

    const isHighHr = astronaut.vitals.heartRate.numericValue > 110;
    const isWarm = astronaut.vitals.coreTemp.numericValue > 37.8;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/45 motion-safe:animate-in motion-safe:fade-in motion-safe:duration-200">
            <div className="orbit-glass orbit-glass-dialog relative w-full max-w-3xl text-slate-200 flex flex-col max-h-[90vh] overflow-hidden motion-safe:animate-in motion-safe:fade-in motion-safe:zoom-in-95 motion-safe:slide-in-from-bottom-2 motion-safe:duration-200 motion-safe:ease-out">
                {/* Header */}
                <div className="flex items-center justify-between gap-3 border-b border-white/10 px-4 py-4 sm:px-6">
                    <div className="flex items-center gap-3">
                        <div className="orbit-glass-inset shrink-0 p-2 text-cyan-200">
                            <Activity className="w-5 h-5" />
                        </div>
                        <div>
                            <div className="flex flex-wrap items-center gap-2">
                                <h3 className="text-lg font-semibold tracking-tight text-white">
                                    Biometrics overview
                                </h3>
                                <span className="orbit-glass-inset px-2 py-0.5 text-xs text-cyan-200">
                                    LEAD-II ECG
                                </span>
                            </div>
                            <p className="text-xs text-slate-300">
                                Real-Time Hemodynamic Monitoring for {astronaut.bio.name} ({astronaut.bio.id})
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="orbit-glass-inset shrink-0 p-1.5 text-slate-300 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Body */}
                <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-4 text-sm sm:p-6">
                    {/* Primary ECG Waveform Display */}
                    <div className="orbit-glass-inset p-3 sm:p-4 space-y-2">
                        <div className="flex items-center justify-between">
                            <div className="flex flex-wrap items-center gap-2">
                                <Heart className={`w-4 h-4 ${isHighHr ? 'text-red-500 animate-pulse' : 'text-[#5cdbdf]'}`} />
                                <span className="text-white font-bold">ELECTROCARDIOGRAM (ECG LEAD-II)</span>
                                <span className={`text-[10px] px-2 py-0.5 border ${
                                    isHighHr ? 'border-red-500/50 bg-red-950/50 text-red-400' : 'border-emerald-500/50 bg-emerald-950/50 text-emerald-400'
                                }`}>
                                    {astronaut.vitals.heartRate.value} {isHighHr ? 'SINUS TACHYCARDIA' : 'NORMAL SINUS RHYTHM'}
                                </span>
                            </div>
                            <span className="text-[10px] text-slate-300 font-mono">25 mm/s • 10 mm/mV</span>
                        </div>

                        {/* Interactive Waveform Canvas SVG */}
                        <div className="relative h-28 w-full overflow-hidden rounded-xl border border-white/10 bg-slate-950/45">
                            {/* ECG Grid */}
                            <div 
                                className="absolute inset-0"
                                style={{
                                    backgroundImage: 'linear-gradient(to right, #1a4b6c26 1px, transparent 1px), linear-gradient(to bottom, #1a4b6c26 1px, transparent 1px)',
                                    backgroundSize: '16px 16px',
                                }}
                            />
                            <svg className="absolute inset-0 h-full w-full" preserveAspectRatio="none" viewBox="0 0 400 100">
                                <path
                                    d="M0,50 L20,50 L25,48 L30,50 L35,50 L40,15 L45,85 L50,45 L55,50 L65,50 L75,35 L85,50 L120,50 L125,48 L130,50 L135,50 L140,15 L145,85 L150,45 L155,50 L165,50 L175,35 L185,50 L220,50 L225,48 L230,50 L235,50 L240,15 L245,85 L250,45 L255,50 L265,50 L275,35 L285,50 L320,50 L325,48 L330,50 L335,50 L340,15 L345,85 L350,45 L355,50 L365,50 L375,35 L385,50 L400,50"
                                    fill="none"
                                    stroke={isHighHr ? '#ef4444' : '#5cdbdf'}
                                    strokeWidth="2"
                                    vectorEffect="non-scaling-stroke"
                                    className="drop-shadow-[0_0_8px_rgba(92,219,223,0.7)]"
                                />
                            </svg>
                        </div>
                    </div>

                    {/* Vitals Parameter Breakdown */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {/* Core Temperature */}
                        <div className="orbit-glass-inset p-3 space-y-2">
                            <div className="flex items-center justify-between text-slate-300">
                                <span className="flex items-center gap-1.5 font-bold">
                                    <Thermometer className="w-4 h-4 text-orange-400" /> CORE TEMPERATURE
                                </span>
                                <span className="text-orange-400 font-bold">{astronaut.vitals.coreTemp.value}</span>
                            </div>
                            <p className="text-slate-300 text-xs">
                                {isWarm 
                                    ? 'Thermal exertion detected. Liquid Cooling Garment active.' 
                                    : 'Thermal regulation nominal.'}
                            </p>
                            <div className="text-[10px] text-slate-300">Normal Range: 36.5°C - 37.5°C</div>
                        </div>

                        {/* Pulse Oximetry */}
                        <div className="orbit-glass-inset p-3 space-y-2">
                            <div className="flex items-center justify-between text-slate-300">
                                <span className="flex items-center gap-1.5 font-bold">
                                    <Activity className="w-4 h-4 text-[#5cdbdf]" /> OXYGEN SATURATION
                                </span>
                                <span className="text-[#5cdbdf] font-bold">{astronaut.vitals.spO2.value}</span>
                            </div>
                            <p className="text-slate-300 text-xs">
                                Peripheral capillary oxygen saturation monitored via wrist optical sensors.
                            </p>
                            <div className="text-[10px] text-slate-300">Normal Range: 95% - 100%</div>
                        </div>

                        {/* Hydration */}
                        <div className="orbit-glass-inset p-3 space-y-2">
                            <div className="flex items-center justify-between text-slate-300">
                                <span className="flex items-center gap-1.5 font-bold">
                                    <Droplets className="w-4 h-4 text-cyan-400" /> HYDRATION LEVEL
                                </span>
                                <span className="text-red-400 font-bold">{astronaut.vitals.hydration.value}</span>
                            </div>
                            <p className="text-slate-300 text-xs">
                                In-suit electrolyte replenishment dispenser queue active.
                            </p>
                            <div className="text-[10px] text-slate-300">Baseline Target: 80% - 100%</div>
                        </div>
                    </div>

                    {/* Sensor Recalibration Bar */}
                    <div className="orbit-glass-inset p-3 flex flex-col sm:flex-row items-center justify-between gap-3">
                        <div className="space-y-0.5">
                            <div className="text-white font-bold text-xs flex flex-wrap items-center gap-2">
                                <Sparkles className="w-4 h-4 text-[#5cdbdf]" />
                                SENSOR NOISE FILTER & ARTIFACT RECALIBRATION
                            </div>
                            <div className="text-slate-300 text-xs">
                                Filters EVA motion artifacts and synchronizes galvanic skin sensor baseline.
                            </div>
                        </div>
                        <button
                            type="button"
                            onClick={handleCalibrate}
                            disabled={isRecalibrating}
                            className="orbit-glass-inset py-1.5 px-4 text-[#5cdbdf] hover:bg-[#5cdbdf]/15 transition-colors cursor-pointer font-bold shrink-0 disabled:opacity-50"
                        >
                            {isRecalibrating ? 'RECALIBRATING...' : 'RECALIBRATE BIOSENSORS'}
                        </button>
                    </div>
                </div>

                {/* Footer */}
                <div className="flex items-center justify-end border-t border-white/10 px-4 py-4 sm:px-6">
                    <button
                        type="button"
                        onClick={onClose}
                        className="rounded-full bg-cyan-200/90 text-slate-950 font-semibold px-5 py-2 text-sm hover:brightness-110 transition-all cursor-pointer"
                    >
                        CLOSE BIOMETRICS MATRIX
                    </button>
                </div>
            </div>
        </div>
    );
}
