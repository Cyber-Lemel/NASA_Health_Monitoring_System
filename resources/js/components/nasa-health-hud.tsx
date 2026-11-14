import React, { useState, useEffect, useRef } from 'react';
import { Link } from '@inertiajs/react';
import {
    Download, Upload, AlertCircle, AlertTriangle,
    CheckSquare, Square, ChevronDown, Check, User, Activity,
    Database, Search, Sparkles, RefreshCw, Radio, Zap,
    Play, Pause, Wind, Shield, Settings, ClipboardList, Send, X,
    Clock, Heart, Volume2, VolumeX, Users, Layers, Expand,
    CheckCircle2, ArrowUpRight, ArrowLeft, ChevronRight
} from 'lucide-react';
import NasaLogo from '@/components/nasa-logo';
import Astronaut3DModel from '@/components/astronaut-3d-model';
import TelemetryImportModal from '@/components/telemetry-import-modal';
import TelemetryExportModal from '@/components/telemetry-export-modal';
import SuitSystemsModal from '@/components/suit-systems-modal';
import BiometricsDetailModal from '@/components/biometrics-detail-modal';
import SystemSettingsModal from '@/components/system-settings-modal';
import CrewSwitcherModal from '@/components/crew-switcher-modal';
import AstronautSelfAssessmentModal from '@/components/astronaut-self-assessment-modal';
import type {
    AstronautFullData,
    ParsedImportPayload,
    TelemetryLogItem,
    MedicalAlert
} from '@/types/astronaut';
import { toast } from 'sonner';

// Default initial astronaut: CDR. Elena Rovani
const DEFAULT_ASTRONAUT: AstronautFullData = {
    bio: {
        id: 'AST-00',
        name: 'CDR. Elena Rovani',
        role: 'Mission Commander',
        mission: 'ODYSSEY II',
        evaStatus: 'ON-GOING',
        age: 38,
        gender: 'Female',
        country: 'USA / NASA',
        missionDurationDays: 195,
        boneDensityLoss: '-3.6%',
    },
    vitals: {
        heartRate: {
            title: 'HEART RATE (ECG)',
            value: '135 bpm',
            numericValue: 135,
            unit: 'bpm',
            status: '(Elevated)',
            color: '#ef4444',
            type: 'ecg',
            baseline: '60 - 100 bpm',
        },
        spO2: {
            title: 'SpO2 OXYGEN',
            value: '96%',
            numericValue: 96,
            unit: '%',
            color: '#5cdbdf',
            type: 'sine',
            baseline: '95 - 100%',
        },
        coreTemp: {
            title: 'CORE TEMPERATURE',
            value: '38.2°C',
            numericValue: 38.2,
            unit: '°C',
            status: '(Warm)',
            color: '#f97316',
            type: 'ecg',
            baseline: '36.5 - 37.5°C',
        },
        respiration: {
            title: 'RESPIRATION',
            value: '24 bpm',
            numericValue: 24,
            unit: 'bpm',
            color: '#5cdbdf',
            type: 'slow-sine',
            baseline: '12 - 20 bpm',
        },
        hydration: {
            title: 'HYDRATION LEVEL',
            value: 'Low, 64%',
            numericValue: 64,
            unit: '%',
            color: '#5cdbdf',
            valueColor: '#ef4444',
            type: 'flat',
            baseline: '80 - 100%',
        },
    },
    diagnostics: {
        suitPressurePsi: 4.3,
        suitPressurePercent: 60,
        o2Percent: 21,
        radiationStatus: 'Safe (0.18 mSv/h)',
        radiationPercent: 85,
        batteryPercent: 74,
    },
    alerts: [],
    logs: [],
};

// Fallback crew roster if database is unseeded
const DEFAULT_CREW_ROSTER = [
    {
        Astronaut: 'AST-01',
        Name: 'CDR. Reid Wiseman',
        Country: 'USA / NASA',
        Gender: 'Male',
        Age_at_mission_start: 48,
        'Mission_duration(Days)': 165,
        Bone_Density_Loss: '-2.6%',
        Role: 'Mission Commander',
    },
    {
        Astronaut: 'AST-02',
        Name: 'Victor Glover',
        Country: 'USA / NASA',
        Gender: 'Male',
        Age_at_mission_start: 48,
        'Mission_duration(Days)': 168,
        Bone_Density_Loss: '-2.4%',
        Role: 'Pilot / Flight Surgeon Ops',
    },
    {
        Astronaut: 'AST-03',
        Name: 'Christina Koch',
        Country: 'USA / NASA',
        Gender: 'Female',
        Age_at_mission_start: 41,
        'Mission_duration(Days)': 328,
        Bone_Density_Loss: '-5.1%',
        Role: 'Mission Specialist',
    },
];

// Helper to generate dynamic astronaut profile from dataset record
function generateAstronautProfile(record: any, timeStr: string): AstronautFullData {
    const rawId = record.Astronaut ?? record.id ?? 'AST-XX';
    const id = String(rawId);
    const name = record.Name || record.name || 'Unknown Specialist';
    const role = record.Role || record.role || 'Astronaut Specialist';
    const country = record.Country || record.country || 'NASA / International';
    
    // Exact Age matching across all casing & conventions
    const rawAge = record.Age_at_mission_start ?? record.age ?? record.Age ?? record.launch_age;
    const age = (rawAge !== undefined && rawAge !== null && !isNaN(Number(rawAge))) ? Number(rawAge) : 40;

    const gender = record.Gender || record.gender || 'Not Specified';

    // Exact Flight Duration matching across all casing & conventions
    const rawDuration = record['Mission_duration(Days)'] ?? record.missionDurationDays ?? record.duration ?? record.Mission_duration ?? record.Flight_Duration;
    const missionDays = (rawDuration !== undefined && rawDuration !== null && !isNaN(Number(rawDuration))) ? Number(rawDuration) : 180;
    const boneLoss = record.Bone_Density_Loss !== undefined ? String(record.Bone_Density_Loss) : '-3.0%';

    // Seed-based vitals with fallback if direct values are not present
    const seed = (id.charCodeAt(Math.max(0, id.length - 1)) || 42) + missionDays;
    const hr = record.HeartRate || record.heartRate || (70 + (seed % 65));
    const spo2 = record.SpO2 || record.spO2 || (95 + (seed % 5));
    const coreTemp = record.CoreTemp || record.coreTemp || +(36.7 + ((seed % 15) / 10)).toFixed(1);
    const respiration = record.Respiration || record.respiration || (14 + (seed % 12));
    const hydrationPct = record.Hydration || record.hydration || (60 + (seed % 35));
    const suitPressurePsi = record.SuitPressure || record.suitPressure || +(4.1 + ((seed % 4) / 10)).toFixed(1);
    const suitPressurePercent = Math.min(100, Math.round((suitPressurePsi / 5) * 100));
    const o2Percent = record.O2Level || record.o2Percent || (20 + (seed % 3));
    const batteryPercent = record.Battery || record.battery || (65 + (seed % 30));

    const isHrElevated = hr > 115;
    const hrStatus = isHrElevated ? '(Elevated)' : hr > 100 ? '(Moderate)' : '(Nominal)';
    const hrColor = isHrElevated ? '#ef4444' : hr > 100 ? '#f97316' : '#5cdbdf';
    const spo2Color = spo2 < 96 ? '#f97316' : '#5cdbdf';
    const tempStatus = coreTemp > 37.8 ? '(Warm)' : '(Normal)';
    const tempColor = coreTemp > 37.8 ? '#f97316' : '#5cdbdf';
    const hydrationStatus = hydrationPct < 70 ? 'Low, ' : 'Optimal, ';
    const hydrationValColor = hydrationPct < 70 ? '#ef4444' : '#5cdbdf';

    const evaStatus: 'ON-GOING' | 'SCHEDULED' | 'STANDBY' | 'COMPLETED' =
        missionDays > 190 ? 'ON-GOING' : missionDays > 160 ? 'STANDBY' : 'SCHEDULED';

    const radiationStatus = isHrElevated && evaStatus === 'ON-GOING' ? 'Safe (0.24 mSv/h)' : 'Safe (0.18 mSv/h)';

    const alerts: MedicalAlert[] = [];
    const logs: TelemetryLogItem[] = [];

    return {
        bio: {
            id,
            name,
            role,
            mission: 'ODYSSEY II',
            evaStatus,
            age,
            gender,
            country,
            missionDurationDays: missionDays,
            boneDensityLoss: boneLoss,
        },
        vitals: {
            heartRate: {
                title: 'HEART RATE (ECG)',
                value: `${hr} bpm`,
                numericValue: hr,
                unit: 'bpm',
                status: hrStatus,
                color: hrColor,
                type: 'ecg',
                baseline: '60 - 100 bpm',
            },
            spO2: {
                title: 'SpO2 OXYGEN',
                value: `${spo2}%`,
                numericValue: spo2,
                unit: '%',
                color: spo2Color,
                type: 'sine',
                baseline: '95 - 100%',
            },
            coreTemp: {
                title: 'CORE TEMPERATURE',
                value: `${coreTemp}°C`,
                numericValue: coreTemp,
                unit: '°C',
                status: tempStatus,
                color: tempColor,
                type: 'ecg',
                baseline: '36.5 - 37.5°C',
            },
            respiration: {
                title: 'RESPIRATION',
                value: `${respiration} bpm`,
                numericValue: respiration,
                unit: 'bpm',
                color: '#5cdbdf',
                type: 'slow-sine',
                baseline: '12 - 20 bpm',
            },
            hydration: {
                title: 'HYDRATION LEVEL',
                value: `${hydrationStatus}${hydrationPct}%`,
                numericValue: hydrationPct,
                unit: '%',
                color: '#5cdbdf',
                valueColor: hydrationValColor,
                type: 'flat',
                baseline: '80 - 100%',
            },
        },
        diagnostics: {
            suitPressurePsi,
            suitPressurePercent,
            o2Percent: Math.round(o2Percent),
            radiationStatus,
            radiationPercent: 85,
            batteryPercent,
        },
        alerts,
        logs,
    };
}

export default function NasaHealthHud({ initialData }: { initialData?: any }) {
    // Active astronaut data
    const [activeAstronaut, setActiveAstronaut] = useState<AstronautFullData>(DEFAULT_ASTRONAUT);

    // Database crew roster
    const [crewList, setCrewList] = useState<any[]>(() => initialData?.records || []);

    // Modals visibility
    const [isImportModalOpen, setIsImportModalOpen] = useState(false);
    const [isExportModalOpen, setIsExportModalOpen] = useState(false);
    const [isSuitModalOpen, setIsSuitModalOpen] = useState(false);
    const [isBiometricsModalOpen, setIsBiometricsModalOpen] = useState(false);
    const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
    const [isCrewSwitcherOpen, setIsCrewSwitcherOpen] = useState(false);
    const [isSelfAssessmentOpen, setIsSelfAssessmentOpen] = useState(false);
    const [selfAssessmentResult, setSelfAssessmentResult] = useState<{
        score: number;
        status: 'NOMINAL' | 'GUARDED' | 'ELEVATED' | 'CRITICAL';
        flags: string[];
        alertMessage: string;
    } | null>(null);

    // EVA status selector dropdown state
    const [isEvaSelectorOpen, setIsEvaSelectorOpen] = useState(false);
    const evaSelectorRef = useRef<HTMLDivElement>(null);

    // Real-Time Reverb WebSocket state
    const [isReverbConnected, setIsReverbConnected] = useState(true);
    const [isAutoLiveStream, setIsAutoLiveStream] = useState(false);
    const [isPingingReverb, setIsPingingReverb] = useState(false);
    const [lastReverbPingTime, setLastReverbPingTime] = useState<string>('');

    // Preference settings
    const [isAudioAlertsEnabled, setIsAudioAlertsEnabled] = useState(true);
    const [tempUnit, setTempUnit] = useState<'C' | 'F'>('C');
    const [pressureUnit, setPressureUnit] = useState<'psi' | 'kPa'>('psi');

    // Live clock
    const [currentTimeStr, setCurrentTimeStr] = useState('13:45:10 UTC');

    // Synchronize activeAstronautRef
    const activeAstronautRef = useRef(activeAstronaut);
    useEffect(() => {
        activeAstronautRef.current = activeAstronaut;
    }, [activeAstronaut]);

    // Synchronize crewList if initialData changes
    useEffect(() => {
        if (initialData?.records && Array.isArray(initialData.records) && initialData.records.length > 0) {
            setCrewList(initialData.records);
        }
    }, [initialData?.records]);

    // Close EVA dropdown on outside click or Escape key
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (evaSelectorRef.current && !evaSelectorRef.current.contains(event.target as Node)) {
                setIsEvaSelectorOpen(false);
            }
        }
        function handleKeyDown(event: KeyboardEvent) {
            if (event.key === 'Escape') {
                setIsEvaSelectorOpen(false);
                setIsCrewSwitcherOpen(false);
            }
        }
        document.addEventListener('mousedown', handleClickOutside);
        window.addEventListener('keydown', handleKeyDown);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
            window.removeEventListener('keydown', handleKeyDown);
        };
    }, []);

    // -------------------------------------------------------------
    // REAL-TIME WEBSOCKET LISTENER (Laravel Reverb on port 8080)
    // -------------------------------------------------------------
    useEffect(() => {
        if (!window.Echo) {
            console.warn('Laravel Echo is not initialized on window.');
            return;
        }

        try {
            const channel = window.Echo.channel('mission-telemetry');

            const handleTelemetryEvent = (data: any) => {
                const tel = data.telemetry || data;
                if (!tel) return;

                const targetId = activeAstronautRef.current.bio.id;
                if (tel.astronaut_id && String(tel.astronaut_id) !== String(targetId)) {
                    return;
                }

                const hr = tel.heart_rate || 120;
                const spo2 = tel.oxygen_saturation || 98.0;
                const temp = tel.core_temperature || 37.0;
                const pressure = tel.suit_pressure || 4.3;
                const rad = tel.radiation_rate ? `Safe (${tel.radiation_rate} mSv/h)` : 'Safe (0.18 mSv/h)';
                const nowStr = new Date().toLocaleTimeString('en-US', { hour12: false });

                setLastReverbPingTime(nowStr);
                setIsReverbConnected(true);

                setActiveAstronaut((prev) => {
                    const hrStatus = hr > 115 ? '(Elevated)' : hr > 100 ? '(Moderate)' : '(Nominal)';
                    const hrColor = hr > 115 ? '#ef4444' : hr > 100 ? '#f97316' : '#5cdbdf';
                    const tempStatus = temp > 37.8 ? '(Warm)' : '(Normal)';
                    const tempColor = temp > 37.8 ? '#f97316' : '#5cdbdf';

                    return {
                        ...prev,
                        vitals: {
                            ...prev.vitals,
                            heartRate: {
                                ...prev.vitals.heartRate,
                                numericValue: hr,
                                value: `${hr} bpm`,
                                status: hrStatus,
                                color: hrColor,
                            },
                            spO2: {
                                ...prev.vitals.spO2,
                                numericValue: spo2,
                                value: `${spo2}%`,
                            },
                            coreTemp: {
                                ...prev.vitals.coreTemp,
                                numericValue: temp,
                                value: `${temp.toFixed(1)}°C`,
                                status: tempStatus,
                                color: tempColor,
                            },
                        },
                        diagnostics: {
                            ...prev.diagnostics,
                            suitPressurePsi: pressure,
                            suitPressurePercent: Math.min(100, Math.round((pressure / 5) * 100)),
                            radiationStatus: rad,
                        },
                        logs: [
                            {
                                id: `log-ws-${Date.now()}`,
                                timestamp: nowStr.slice(0, 5),
                                title: `Live Reverb Telemetry (${prev.bio.name})`,
                                action: `[WS PING] HR: ${hr} bpm, SpO2: ${spo2}%, Core Temp: ${temp}°C`,
                                status: 'RESOLVED',
                            },
                            ...prev.logs.slice(0, 4),
                        ],
                    };
                });
            };

            channel.listen('.telemetry.updated', handleTelemetryEvent);
            channel.listen('telemetry.updated', handleTelemetryEvent);

            return () => {
                window.Echo.leave('mission-telemetry');
            };
        } catch (err) {
            console.error('Error connecting to Reverb channel:', err);
        }
    }, []);

    // Manual Reverb ping dispatcher
    const handleTriggerReverbPing = async () => {
        setIsPingingReverb(true);
        try {
            const res = await fetch('/api/telemetry/ping', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Accept: 'application/json',
                },
                body: JSON.stringify({
                    astronaut_id: activeAstronaut.bio.id,
                    astronaut_name: activeAstronaut.bio.name,
                    role: activeAstronaut.bio.role,
                }),
            });
            const data = await res.json();
            if (data.success) {
                toast.success(`Telemetry ping sent for ${activeAstronaut.bio.name}`);
            }
        } catch {
            toast.error('Failed to dispatch Reverb ping');
        } finally {
            setIsPingingReverb(false);
        }
    };

    // Auto-stream interval effect
    useEffect(() => {
        if (!isAutoLiveStream) return;

        const streamInterval = setInterval(() => {
            fetch('/api/telemetry/ping', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Accept: 'application/json',
                },
                body: JSON.stringify({
                    astronaut_id: activeAstronaut.bio.id,
                    astronaut_name: activeAstronaut.bio.name,
                }),
            }).catch(() => {});
        }, 3000);

        return () => clearInterval(streamInterval);
    }, [isAutoLiveStream, activeAstronaut.bio.id, activeAstronaut.bio.name]);

    // Live clock interval
    useEffect(() => {
        const interval = setInterval(() => {
            const now = new Date();
            setCurrentTimeStr(
                now.toLocaleTimeString('en-US', {
                    timeZone: 'UTC',
                    hour12: false,
                    hour: '2-digit',
                    minute: '2-digit',
                    second: '2-digit',
                }) + ' UTC'
            );
        }, 1000);
        return () => clearInterval(interval);
    }, []);

    // Add manual incident log helper
    const handleAddManualLog = (title: string, action: string) => {
        const nowStr = new Date().toLocaleTimeString('en-US', { hour12: false }).slice(0, 5);
        setActiveAstronaut((prev) => ({
            ...prev,
            logs: [
                {
                    id: `log-man-${Date.now()}`,
                    timestamp: nowStr,
                    title,
                    action,
                    status: 'RESOLVED',
                },
                ...prev.logs,
            ],
        }));
    };

    // Effective crew roster
    const effectiveCrewList = crewList && crewList.length > 0 ? crewList : DEFAULT_CREW_ROSTER;

    // Select astronaut from crew roster
    const handleSelectAstronaut = (record: any) => {
        const profile = generateAstronautProfile(record, currentTimeStr);
        setActiveAstronaut(profile);
        toast.info(`Active Crew Member: ${profile.bio.name} (${profile.bio.id})`);
    };

    // Auto-select initial astronaut if dataset loaded
    useEffect(() => {
        if (crewList.length > 0 && activeAstronaut.bio.id === 'AST-00') {
            const elenaDb = crewList.find(
                (c) =>
                    String(c.Astronaut).toUpperCase() === 'AST-00' ||
                    String(c.Name).toLowerCase().includes('reid wiseman') ||
                    String(c.Name).toLowerCase().includes('elena rovani')
            );
            if (elenaDb) {
                setActiveAstronaut(generateAstronautProfile(elenaDb, currentTimeStr));
            }
        }
    }, [crewList]);

    // Toggle EVA status
    const handleSetEvaStatus = (status: 'ON-GOING' | 'SCHEDULED' | 'STANDBY' | 'COMPLETED' | 'ABORTED') => {
        setActiveAstronaut((prev) => ({
            ...prev,
            bio: {
                ...prev.bio,
                evaStatus: status,
            },
        }));
        setIsEvaSelectorOpen(false);
        handleAddManualLog(`EVA State Changed to ${status}`, `[FLIGHT SURGEON] Updated operational EVA state to ${status}`);
        toast.info(`EVA Status: ${status}`);
    };

    // Diagnostics progress bar click test
    const handleDiagnoseSubsystem = (subsystemName: string) => {
        handleAddManualLog(`${subsystemName} Diagnostic Check`, `[SYSTEM] Subsystem test executed: 100% NOMINAL`);
        toast.info(`Self-test on ${subsystemName}: NOMINAL`);
    };

    return (
        <div className="min-h-screen bg-[#030914] text-slate-200 font-sans p-3 sm:p-4 pb-24 sm:pb-28 flex flex-col gap-3 select-none relative overflow-x-hidden">
            {/* Subtle Cosmic Background Lighting */}
            <div className="fixed inset-0 pointer-events-none z-0">
                <div className="absolute top-0 right-1/4 w-[500px] h-[500px] bg-[#0b3d91]/15 rounded-full blur-[140px]" />
                <div className="absolute bottom-10 left-10 w-[400px] h-[400px] bg-[#0284c7]/10 rounded-full blur-[150px]" />
                <div
                    className="absolute inset-0 opacity-[0.03]"
                    style={{
                        backgroundImage:
                            'linear-gradient(to right, #ffffff 1px, transparent 1px), linear-gradient(to bottom, #ffffff 1px, transparent 1px)',
                        backgroundSize: '36px 36px',
                    }}
                />
            </div>

            {/* MASTER MISSION CONTROL COMMAND BAR (All navigation, status & actions consolidated into 1 clean bar) */}
            <header className="relative z-30 rounded-xl border border-[#132c4a] bg-[#06121e]/95 px-3.5 py-2.5 backdrop-blur-md flex flex-wrap items-center justify-between gap-3 shadow-xl">
                {/* Left: Brand + Active Crew Chip */}
                <div className="flex items-center gap-3">
                    <div className="p-1 rounded-lg border border-[#1a4b6c] bg-[#0a1f2e] shadow-md shadow-[#5cdbdf]/10 shrink-0">
                        <NasaLogo size={26} />
                    </div>

                    <div>
                        <div className="flex items-center gap-1.5 font-mono">
                            <span className="font-bold text-white text-xs sm:text-sm tracking-wider">ORBIT</span>
                            <span className="text-[10px] text-cyan-400 font-bold hidden sm:inline">// NASA HRP</span>
                        </div>
                    </div>

                    <div className="h-5 w-px bg-[#132c4a] hidden sm:block mx-1" />

                    {/* Active Crew Quick Selector Chip */}
                    <button
                        type="button"
                        onClick={() => setIsCrewSwitcherOpen(true)}
                        className="flex items-center gap-2 rounded-lg border border-[#1a4b6c] bg-[#0a1f2e] hover:border-[#5cdbdf] px-2.5 py-1 text-xs text-white transition-all cursor-pointer group shadow-sm"
                        title="Click to Switch Crew Member"
                    >
                        <div className="w-5 h-5 rounded bg-[#132c4a] flex items-center justify-center text-[10px] text-[#5cdbdf] font-mono font-bold group-hover:bg-[#5cdbdf] group-hover:text-black transition-colors">
                            {activeAstronaut.bio.name.charAt(0)}
                        </div>
                        <span className="font-bold text-xs truncate max-w-[120px] sm:max-w-[170px]">{activeAstronaut.bio.name}</span>
                        <span className="text-[10px] text-[#5cdbdf] font-mono">({activeAstronaut.bio.id})</span>
                        <span className="hidden sm:inline-flex items-center gap-1.5 border-l border-[#1a4b6c] pl-2 text-[10px] font-mono">
                            <span className="text-amber-400 font-semibold">{activeAstronaut.bio.age}y</span>
                            <span className="text-slate-500">•</span>
                            <span className="text-sky-300 font-semibold">{activeAstronaut.bio.missionDurationDays}d</span>
                        </span>
                        <ChevronDown className="w-3 h-3 text-slate-400 group-hover:text-white" />
                    </button>

                    {/* EVA Status Selector */}
                    <div className="relative" ref={evaSelectorRef}>
                        <button
                            type="button"
                            onClick={() => setIsEvaSelectorOpen(!isEvaSelectorOpen)}
                            className="flex items-center gap-1.5 rounded-lg border border-[#1a4b6c] bg-[#0a1f2e] hover:border-[#5cdbdf] px-2.5 py-1 text-xs transition-all cursor-pointer"
                            title="Update EVA Operational State"
                        >
                            <span className={`w-2 h-2 rounded-full ${
                                activeAstronaut.bio.evaStatus === 'ON-GOING'
                                    ? 'bg-amber-400 animate-pulse'
                                    : activeAstronaut.bio.evaStatus === 'ABORTED'
                                    ? 'bg-rose-500'
                                    : 'bg-emerald-400'
                            }`} />
                            <span className="text-[11px] text-slate-200 font-mono font-bold">{activeAstronaut.bio.evaStatus}</span>
                            <ChevronDown className="w-3 h-3 text-slate-400" />
                        </button>

                        {/* EVA Dropdown */}
                        {isEvaSelectorOpen && (
                            <div className="absolute top-full left-0 mt-1 w-40 rounded-lg bg-[#06121e] border border-[#1a4b6c] shadow-2xl z-50 p-1 flex flex-col font-mono text-xs divide-y divide-[#132c4a]">
                                {(['ON-GOING', 'STANDBY', 'SCHEDULED', 'COMPLETED', 'ABORTED'] as const).map((st) => (
                                    <button
                                        key={st}
                                        type="button"
                                        onClick={() => handleSetEvaStatus(st)}
                                        className="text-left px-2.5 py-1.5 hover:bg-[#0a1f2e] text-slate-300 hover:text-white transition-colors cursor-pointer text-[11px]"
                                    >
                                        {st}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                {/* Center: Clean Spaceflight Telemetry Status Strip */}
                <div className="hidden lg:flex items-center gap-3 text-[11px] font-mono bg-[#030b14]/90 border border-[#132c4a] rounded-lg px-3 py-1">
                    <div className="flex items-center gap-1.5 text-white">
                        <Clock className="w-3.5 h-3.5 text-[#5cdbdf]" />
                        <span>{currentTimeStr}</span>
                    </div>
                    <span className="text-slate-600">•</span>
                    <div className="flex items-center gap-1.5 text-emerald-400">
                        <Radio className="w-3.5 h-3.5 animate-pulse" />
                        <span>DSN: LOCKED (40ms)</span>
                    </div>
                    <span className="text-slate-600">•</span>
                    <div className="flex items-center gap-1.5 text-emerald-400">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                        <span>WS: REVERB (8080)</span>
                    </div>
                </div>

                {/* Right: Consolidated Console Modals & System Tools */}
                <div className="flex items-center gap-2 text-xs font-mono">
                    {/* Console Views Group */}
                    <div className="flex items-center rounded-lg border border-[#1a4b6c] bg-[#0a1f2e] p-0.5">
                        <button
                            type="button"
                            onClick={() => setIsBiometricsModalOpen(true)}
                            className="px-2 py-1 rounded text-slate-300 hover:text-white hover:bg-[#132c4a] transition-colors text-[11px] flex items-center gap-1"
                            title="Detailed Biometrics Analysis"
                        >
                            <Heart className="w-3 h-3 text-[#5cdbdf]" />
                            <span className="hidden xl:inline">Biometrics</span>
                        </button>

                        <button
                            type="button"
                            onClick={() => setIsSuitModalOpen(true)}
                            className="px-2 py-1 rounded text-slate-300 hover:text-white hover:bg-[#132c4a] transition-colors text-[11px] flex items-center gap-1"
                            title="Suit & Environmental Console"
                        >
                            <Shield className="w-3 h-3 text-[#5cdbdf]" />
                            <span className="hidden xl:inline">Suit</span>
                        </button>

                        <Link
                            href="/dataset"
                            className="px-2 py-1 rounded text-[#5cdbdf] hover:text-white hover:bg-[#132c4a] transition-colors text-[11px] flex items-center gap-1 font-bold"
                            title="Open NASA Human Research Program (HRP) 5 Hazards & Telemetry Archive"
                        >
                            <Database className="w-3 h-3 text-[#5cdbdf]" />
                            <span className="hidden xl:inline">5 Hazards ({effectiveCrewList.length})</span>
                        </Link>

                        <button
                            type="button"
                            onClick={() => setIsSelfAssessmentOpen(true)}
                            className="px-2.5 py-1 rounded text-cyan-300 hover:text-white bg-cyan-950/70 border border-cyan-700 hover:border-cyan-400 transition-colors text-[11px] flex items-center gap-1 font-bold shadow-[0_0_8px_rgba(6,182,212,0.15)] cursor-pointer"
                            title="Open NASA 5 Hazards Autonomous Self-Assessment & Action Suite"
                        >
                            <Shield className="w-3 h-3 text-[#5cdbdf]" />
                            <span className="hidden xl:inline">Self-Assessment</span>
                            {selfAssessmentResult && (
                                <span className="ml-0.5 px-1 py-0.2 text-[9px] rounded bg-cyan-900 text-cyan-200">
                                    {selfAssessmentResult.score}%
                                </span>
                            )}
                        </button>

                        <button
                            type="button"
                            onClick={() => setIsSettingsModalOpen(true)}
                            className="p-1 rounded text-slate-300 hover:text-white hover:bg-[#132c4a] transition-colors"
                            title="System Settings"
                        >
                            <Settings className="w-3 h-3 text-[#5cdbdf]" />
                        </button>
                    </div>

                    {/* System Action Tools */}
                    <div className="flex items-center gap-1">
                        <Link
                            href="/dataset"
                            className="p-1.5 rounded-lg border border-[#1a4b6c] bg-[#0a1f2e] text-[#5cdbdf] hover:border-[#5cdbdf] hover:text-white transition-all shadow-sm flex items-center gap-1"
                            title="Open NASA 5 Hazards & Telemetry Archive"
                        >
                            <Database className="w-3.5 h-3.5" />
                        </Link>

                        <button
                            type="button"
                            onClick={() => setIsImportModalOpen(true)}
                            className="p-1.5 rounded-lg border border-[#1a4b6c] bg-[#0a1f2e] text-slate-300 hover:border-[#5cdbdf] hover:text-white transition-all cursor-pointer shadow-sm"
                            title="Import Telemetry Records"
                        >
                            <Upload className="w-3.5 h-3.5 text-cyan-400" />
                        </button>

                        <button
                            type="button"
                            onClick={() => setIsExportModalOpen(true)}
                            className="p-1.5 rounded-lg border border-[#1a4b6c] bg-[#0a1f2e] text-slate-300 hover:border-[#5cdbdf] hover:text-white transition-all cursor-pointer shadow-sm"
                            title="Export Telemetry Data"
                        >
                            <Download className="w-3.5 h-3.5 text-emerald-400" />
                        </button>

                        <button
                            type="button"
                            onClick={handleTriggerReverbPing}
                            disabled={isPingingReverb}
                            className="p-1.5 rounded-lg border border-[#1a4b6c] bg-[#0a1f2e] text-slate-300 hover:border-[#5cdbdf] hover:text-white transition-all cursor-pointer shadow-sm disabled:opacity-50"
                            title="Dispatch Instant Telemetry Ping"
                        >
                            <Zap className="w-3.5 h-3.5 text-[#5cdbdf]" />
                        </button>

                        <button
                            type="button"
                            onClick={() => {
                                const next = !isAutoLiveStream;
                                setIsAutoLiveStream(next);
                                toast.info(next ? 'Live Reverb stream: ACTIVE (3s cadence)' : 'Live stream: PAUSED');
                            }}
                            className={`p-1.5 rounded-lg border transition-all cursor-pointer shadow-sm ${
                                isAutoLiveStream
                                    ? 'border-emerald-400 bg-emerald-950 text-emerald-300 shadow-[0_0_8px_rgba(52,211,153,0.3)]'
                                    : 'border-[#1a4b6c] bg-[#0a1f2e] text-slate-400 hover:text-white hover:border-[#5cdbdf]'
                            }`}
                            title={isAutoLiveStream ? 'Continuous Auto-Stream is ON' : 'Turn Continuous Auto-Stream ON'}
                        >
                            <Radio className={`w-3.5 h-3.5 ${isAutoLiveStream ? 'animate-pulse text-emerald-400' : ''}`} />
                        </button>
                    </div>
                </div>
            </header>

            {/* NASA HUMAN RESEARCH PROGRAM (HRP) 5 HAZARDS AUTONOMOUS MONITOR STRIP (R.I.D.G.E.) */}
            <div className="relative z-10 rounded-xl border border-[#132c4a] bg-[#06121e]/90 p-2.5 shadow-lg font-mono">
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-2.5">
                    <div className="flex items-center gap-2 shrink-0">
                        <div className="flex items-center gap-1.5 px-2 py-1 rounded bg-[#0a1f2e] border border-[#1a4b6c] text-[#5cdbdf] text-[11px] font-bold">
                            <Shield className="w-3.5 h-3.5 text-[#5cdbdf]" />
                            <span>NASA 5 HAZARDS (R.I.D.G.E.)</span>
                        </div>
                        <span className="text-[10px] text-slate-400 hidden xl:inline">
                            Autonomous Astronaut Health & Countermeasures
                        </span>
                    </div>

                    {/* 5 Hazard Live Indicator Quick Cards */}
                    <div className="grid grid-cols-2 sm:grid-cols-5 gap-1.5 flex-1 max-w-4xl">
                        {/* R - Radiation */}
                        <button
                            type="button"
                            onClick={() => setIsSelfAssessmentOpen(true)}
                            className="p-1.5 rounded border border-[#1a4b6c] bg-[#081726] hover:border-amber-400/70 transition-all text-left group cursor-pointer"
                            title="Space Radiation: Dosimetry, GCR & SPE acute risk"
                        >
                            <div className="flex items-center justify-between text-[10px]">
                                <span className="font-bold text-amber-400 group-hover:text-amber-300">[R] RADIATION</span>
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                            </div>
                            <div className="text-[10px] text-slate-300 truncate font-semibold">0.18 mSv/h • Safe</div>
                            <div className="text-[9px] text-slate-400 truncate">Storm Haven: Ready</div>
                        </button>

                        {/* I - Isolation */}
                        <button
                            type="button"
                            onClick={() => setIsSelfAssessmentOpen(true)}
                            className="p-1.5 rounded border border-[#1a4b6c] bg-[#081726] hover:border-purple-400/70 transition-all text-left group cursor-pointer"
                            title="Isolation & Confinement: Circadian Rhythms & Cognitive Alertness"
                        >
                            <div className="flex items-center justify-between text-[10px]">
                                <span className="font-bold text-purple-400 group-hover:text-purple-300">[I] ISOLATION</span>
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                            </div>
                            <div className="text-[10px] text-slate-300 truncate font-semibold">Circadian: Phase 1</div>
                            <div className="text-[9px] text-slate-400 truncate">Sleep: 84% • SSLA Active</div>
                        </button>

                        {/* D - Distance */}
                        <button
                            type="button"
                            onClick={() => setIsSelfAssessmentOpen(true)}
                            className="p-1.5 rounded border border-[#1a4b6c] bg-[#081726] hover:border-sky-400/70 transition-all text-left group cursor-pointer"
                            title="Distance from Earth: Autonomous Triage & 14-min DSN Latency"
                        >
                            <div className="flex items-center justify-between text-[10px]">
                                <span className="font-bold text-sky-400 group-hover:text-sky-300">[D] DISTANCE</span>
                                <span className="w-1.5 h-1.5 rounded-full bg-sky-400" />
                            </div>
                            <div className="text-[10px] text-slate-300 truncate font-semibold">DSN Delay: 14m 22s</div>
                            <div className="text-[9px] text-slate-400 truncate">Autonomous CDS: Active</div>
                        </button>

                        {/* G - Gravity */}
                        <button
                            type="button"
                            onClick={() => setIsSelfAssessmentOpen(true)}
                            className="p-1.5 rounded border border-[#1a4b6c] bg-[#081726] hover:border-rose-400/70 transition-all text-left group cursor-pointer"
                            title="Gravity Fields: Bone Loss, Muscle Atrophy & SANS Fluid Shift"
                        >
                            <div className="flex items-center justify-between text-[10px]">
                                <span className="font-bold text-rose-400 group-hover:text-rose-300">[G] GRAVITY</span>
                                <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                            </div>
                            <div className="text-[10px] text-slate-300 truncate font-semibold">Bone: {activeAstronaut.bio.boneDensityLoss}</div>
                            <div className="text-[9px] text-slate-400 truncate">ARED & LBNP: Ready</div>
                        </button>

                        {/* E - Environment */}
                        <button
                            type="button"
                            onClick={() => setIsSelfAssessmentOpen(true)}
                            className="p-1.5 rounded border border-[#1a4b6c] bg-[#081726] hover:border-emerald-400/70 transition-all text-left group cursor-pointer"
                            title="Hostile Environment: ECLSS CO2, Microbes & Life Support"
                        >
                            <div className="flex items-center justify-between text-[10px]">
                                <span className="font-bold text-emerald-400 group-hover:text-emerald-300">[E] ENVIRONMENT</span>
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                            </div>
                            <div className="text-[10px] text-slate-300 truncate font-semibold">ECLSS pCO2: 2.8 mmHg</div>
                            <div className="text-[9px] text-slate-400 truncate">Air Quality: Nominal</div>
                        </button>
                    </div>

                    {/* Self-Assessment Quick Trigger */}
                    <button
                        type="button"
                        onClick={() => setIsSelfAssessmentOpen(true)}
                        className="px-3 py-2 rounded-lg bg-gradient-to-r from-[#0284c7] to-[#0ea5e9] hover:from-[#0369a1] hover:to-[#0284c7] text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-all shadow-[0_0_12px_rgba(14,165,233,0.3)] shrink-0 cursor-pointer"
                    >
                        <Activity className="w-3.5 h-3.5" />
                        <span>EVALUATE & ACT</span>
                        <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                </div>
            </div>

            {/* MAIN 3-COLUMN MISSION CONTROL COCKPIT */}
            <div className="relative z-10 grid grid-cols-12 gap-3.5 flex-1">
                {/* ------------------------------------------------------------- */}
                {/* LEFT COLUMN: Biometrics Telemetry & Real-Time Rhythms         */}
                {/* ------------------------------------------------------------- */}
                <div className="col-span-12 lg:col-span-3 flex flex-col gap-3">
                    <div className="rounded-xl border border-[#132c4a] bg-[#06121e]/95 p-3.5 flex flex-col h-full shadow-lg">
                        {/* Section Header */}
                        <div className="flex items-center justify-between border-b border-[#132c4a] pb-2.5 mb-3 font-mono">
                            <div className="flex items-center gap-2">
                                <Activity className="w-4 h-4 text-[#5cdbdf]" />
                                <h2 className="text-xs font-bold tracking-wider text-white">BIOMETRICS TELEMETRY</h2>
                            </div>
                            <button
                                type="button"
                                onClick={() => setIsBiometricsModalOpen(true)}
                                className="text-[10px] text-cyan-400 hover:text-cyan-300 cursor-pointer flex items-center gap-1"
                            >
                                <span>Deep View</span>
                                <ArrowUpRight className="w-3 h-3" />
                            </button>
                        </div>

                        {/* Vitals Stack */}
                        <div className="flex flex-col gap-2.5 flex-1 justify-between font-mono">
                            {/* Primary Featured: Heart Rate ECG */}
                            <VitalCard
                                title={activeAstronaut.vitals.heartRate.title}
                                value={activeAstronaut.vitals.heartRate.value}
                                status={activeAstronaut.vitals.heartRate.status}
                                color={activeAstronaut.vitals.heartRate.color}
                                type="ecg"
                                isPrimary
                                baseline="Baseline: 60 - 100 bpm"
                                onClick={() => setIsBiometricsModalOpen(true)}
                            />

                            {/* Secondary Metrics */}
                            <VitalCard
                                title={activeAstronaut.vitals.spO2.title}
                                value={activeAstronaut.vitals.spO2.value}
                                color={activeAstronaut.vitals.spO2.color}
                                type="sine"
                                baseline="Baseline: 95 - 100%"
                                onClick={() => setIsBiometricsModalOpen(true)}
                            />

                            <VitalCard
                                title={activeAstronaut.vitals.coreTemp.title}
                                value={activeAstronaut.vitals.coreTemp.value}
                                status={activeAstronaut.vitals.coreTemp.status}
                                color={activeAstronaut.vitals.coreTemp.color}
                                type="ecg"
                                baseline="Baseline: 36.5 - 37.5°C"
                                onClick={() => setIsBiometricsModalOpen(true)}
                            />

                            <VitalCard
                                title={activeAstronaut.vitals.respiration.title}
                                value={activeAstronaut.vitals.respiration.value}
                                color={activeAstronaut.vitals.respiration.color}
                                type="slow-sine"
                                baseline="Baseline: 12 - 20 bpm"
                                onClick={() => setIsBiometricsModalOpen(true)}
                            />

                            <VitalCard
                                title={activeAstronaut.vitals.hydration.title}
                                value={activeAstronaut.vitals.hydration.value}
                                status=""
                                color={activeAstronaut.vitals.hydration.color}
                                valueColor={activeAstronaut.vitals.hydration.valueColor}
                                type="flat"
                                baseline="Baseline: 80 - 100%"
                                onClick={() => setIsBiometricsModalOpen(true)}
                            />
                        </div>
                    </div>
                </div>

                {/* ------------------------------------------------------------- */}
                {/* CENTER COLUMN: 3D Holographic Biomechanical Scanner (The Hero)*/}
                {/* ------------------------------------------------------------- */}
                <div className="col-span-12 lg:col-span-6 flex flex-col">
                    <div className="rounded-xl border border-[#132c4a] bg-[#06121e]/95 p-1 relative overflow-hidden flex flex-col flex-1 min-h-[480px] shadow-lg">
                        <Astronaut3DModel
                            heartRate={activeAstronaut.vitals.heartRate.numericValue}
                            coreTemp={activeAstronaut.vitals.coreTemp.numericValue}
                            evaStatus={activeAstronaut.bio.evaStatus}
                            astronautName={activeAstronaut.bio.name}
                        />
                    </div>
                </div>

                {/* ------------------------------------------------------------- */}
                {/* RIGHT COLUMN: Suit Life Support & ORBIT 5-Hazards Radar      */}
                {/* ------------------------------------------------------------- */}
                <div className="col-span-12 lg:col-span-3 flex flex-col gap-3 font-mono">
                    {/* Suit & Environmental Life Support */}
                    <div className="rounded-xl border border-[#132c4a] bg-[#06121e]/95 p-3 shadow-lg">
                        <div className="flex items-center justify-between border-b border-[#132c4a] pb-2 mb-2.5">
                            <div className="flex items-center gap-1.5">
                                <Shield className="w-3.5 h-3.5 text-[#5cdbdf]" />
                                <h2 className="text-xs font-bold tracking-wider text-white">SUIT LIFE SUPPORT</h2>
                            </div>
                            <button
                                type="button"
                                onClick={() => setIsSuitModalOpen(true)}
                                className="text-[10px] text-cyan-400 hover:underline cursor-pointer flex items-center gap-0.5"
                            >
                                <span>Console</span>
                                <ArrowUpRight className="w-3 h-3" />
                            </button>
                        </div>

                        <div className="space-y-2.5">
                            <ProgressBar
                                label="SUIT PRESSURE"
                                value={`${activeAstronaut.diagnostics.suitPressurePsi} psi`}
                                percent={activeAstronaut.diagnostics.suitPressurePercent}
                                color="bg-[#5cdbdf]"
                                onClick={() => handleDiagnoseSubsystem('Suit Pressure Valves')}
                            />
                            <ProgressBar
                                label="O2 RESERVES"
                                value={`${activeAstronaut.diagnostics.o2Percent}%`}
                                percent={activeAstronaut.diagnostics.o2Percent}
                                color="bg-amber-400"
                                onClick={() => handleDiagnoseSubsystem('O2 Reserve Canister')}
                            />
                            <ProgressBar
                                label="DOSIMETRY"
                                value={activeAstronaut.diagnostics.radiationStatus}
                                percent={activeAstronaut.diagnostics.radiationPercent}
                                color="bg-emerald-400"
                                onClick={() => handleDiagnoseSubsystem('Radiation Shielding Array')}
                            />
                            <ProgressBar
                                label="BATTERY PACK"
                                value={`${activeAstronaut.diagnostics.batteryPercent}%`}
                                percent={activeAstronaut.diagnostics.batteryPercent}
                                color="bg-sky-400"
                                onClick={() => handleDiagnoseSubsystem('Primary Battery Cell Pack')}
                            />
                        </div>
                    </div>

                    {/* ORBIT 5-HAZARDS BIOMEDICAL RADAR */}
                    <div className="rounded-xl border border-[#132c4a] bg-[#06121e]/95 p-3 shadow-lg flex-1 flex flex-col justify-between">
                        <div>
                            <div className="flex items-center justify-between border-b border-[#132c4a] pb-2 mb-2.5">
                                <div className="flex items-center gap-1.5">
                                    <Activity className="w-3.5 h-3.5 text-[#5cdbdf]" />
                                    <h2 className="text-xs font-bold tracking-wider text-white">ORBIT 5-HAZARD STATUS</h2>
                                </div>
                                <span className="text-[10px] px-1.5 py-0.2 rounded bg-cyan-950/80 text-cyan-300 border border-cyan-800">
                                    R.I.D.G.E.
                                </span>
                            </div>

                            <div className="space-y-2 text-[11px]">
                                <div className="p-2 rounded bg-[#0a1f2e]/70 border border-[#1a4b6c]/60 flex items-center justify-between">
                                    <div>
                                        <div className="font-bold text-amber-400 text-[10px]">[R] SPACE RADIATION</div>
                                        <div className="text-slate-300 text-[11px]">0.18 mSv/h • Safe Threshold</div>
                                    </div>
                                    <span className="text-[9px] px-1.5 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-800">
                                        SHIELDED
                                    </span>
                                </div>

                                <div className="p-2 rounded bg-[#0a1f2e]/70 border border-[#1a4b6c]/60 flex items-center justify-between">
                                    <div>
                                        <div className="font-bold text-purple-400 text-[10px]">[I] ISOLATION & CONFINEMENT</div>
                                        <div className="text-slate-300 text-[11px]">Sleep: 84% • Circadian Sync</div>
                                    </div>
                                    <span className="text-[9px] px-1.5 py-0.5 rounded bg-purple-950 text-purple-300 border border-purple-800">
                                        SSLA ON
                                    </span>
                                </div>

                                <div className="p-2 rounded bg-[#0a1f2e]/70 border border-[#1a4b6c]/60 flex items-center justify-between">
                                    <div>
                                        <div className="font-bold text-sky-400 text-[10px]">[D] DISTANCE FROM EARTH</div>
                                        <div className="text-slate-300 text-[11px]">DSN Delay: 14m 22s Latency</div>
                                    </div>
                                    <span className="text-[9px] px-1.5 py-0.5 rounded bg-sky-950 text-sky-300 border border-sky-800">
                                        CDS ACTIVE
                                    </span>
                                </div>

                                <div className="p-2 rounded bg-[#0a1f2e]/70 border border-[#1a4b6c]/60 flex items-center justify-between">
                                    <div>
                                        <div className="font-bold text-rose-400 text-[10px]">[G] GRAVITY FIELDS</div>
                                        <div className="text-slate-300 text-[11px]">Bone: {activeAstronaut.bio.boneDensityLoss} • SANS Check</div>
                                    </div>
                                    <span className="text-[9px] px-1.5 py-0.5 rounded bg-amber-950 text-amber-300 border border-amber-800">
                                        ARED READY
                                    </span>
                                </div>

                                <div className="p-2 rounded bg-[#0a1f2e]/70 border border-[#1a4b6c]/60 flex items-center justify-between">
                                    <div>
                                        <div className="font-bold text-emerald-400 text-[10px]">[E] HOSTILE ENVIRONMENT</div>
                                        <div className="text-slate-300 text-[11px]">ECLSS pCO2: 2.8 mmHg • Nominal</div>
                                    </div>
                                    <span className="text-[9px] px-1.5 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-800">
                                        PURGED
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* Action Buttons */}
                        <div className="pt-3 border-t border-[#132c4a] mt-3 space-y-2">
                            <button
                                type="button"
                                onClick={() => setIsSelfAssessmentOpen(true)}
                                className="w-full flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg bg-gradient-to-r from-cyan-600 to-sky-600 hover:from-cyan-500 hover:to-sky-500 text-white font-bold text-xs transition-all shadow-[0_0_12px_rgba(6,182,212,0.3)] cursor-pointer"
                            >
                                <Zap className="w-3.5 h-3.5" />
                                <span>EVALUATE & ACT ON HEALTH</span>
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Crew Roster Switcher Modal */}
            <CrewSwitcherModal
                isOpen={isCrewSwitcherOpen}
                onClose={() => setIsCrewSwitcherOpen(false)}
                crewList={effectiveCrewList}
                activeAstronautId={activeAstronaut.bio.id}
                onSelectAstronaut={handleSelectAstronaut}
            />

            {/* Telemetry Import Modal */}
            <TelemetryImportModal
                isOpen={isImportModalOpen}
                onClose={() => setIsImportModalOpen(false)}
                onApplyToHud={(data) => {
                    const profile = generateAstronautProfile({
                        Astronaut: data.astronautId || 'AST-' + Math.floor(10 + Math.random() * 90),
                        Name: data.name || 'Mission Specialist',
                        Country: data.country || 'NASA / International',
                        Gender: data.gender || 'Not Specified',
                        Age_at_mission_start: data.age,
                        'Mission_duration(Days)': data.missionDurationDays,
                        No_of_Mission: data.noOfMission,
                        Bone_Density_Loss: data.boneDensityLoss,
                        Muscle_Mass_Loss: data.muscleMassLoss,
                        Radiation_Exposure: data.radiationExposure,
                        Cardiovascular_Risk_Score: data.cardioRisk,
                        Immune_Response_Suppression: data.immuneSuppression,
                        Psychological_Impact_Score: data.psychScore,
                        Vision_Change: data.vision,
                        Countermeasures_Used: data.countermeasures,
                        HeartRate: data.heartRate,
                        SpO2: data.spO2,
                        CoreTemp: data.coreTemp,
                        Respiration: data.respiration,
                        Hydration: data.hydration,
                        SuitPressure: data.suitPressure,
                        O2Level: data.o2Level,
                        Battery: data.battery,
                        Radiation: data.radiation,
                    }, currentTimeStr);

                    setActiveAstronaut((prev) => ({
                        ...profile,
                        bio: {
                            ...profile.bio,
                            name: data.name || prev.bio.name,
                            id: String(data.astronautId || prev.bio.id),
                            age: data.age ?? profile.bio.age,
                            country: data.country || profile.bio.country,
                            missionDurationDays: data.missionDurationDays ?? profile.bio.missionDurationDays,
                            boneDensityLoss: data.boneDensityLoss !== undefined ? String(data.boneDensityLoss) : profile.bio.boneDensityLoss,
                        },
                        vitals: {
                            ...profile.vitals,
                            heartRate: {
                                ...profile.vitals.heartRate,
                                numericValue: data.heartRate ?? profile.vitals.heartRate.numericValue,
                                value: `${data.heartRate ?? profile.vitals.heartRate.numericValue} bpm`,
                            },
                            spO2: {
                                ...profile.vitals.spO2,
                                numericValue: data.spO2 ?? profile.vitals.spO2.numericValue,
                                value: `${data.spO2 ?? profile.vitals.spO2.numericValue}%`,
                            },
                            coreTemp: {
                                ...profile.vitals.coreTemp,
                                numericValue: data.coreTemp ?? profile.vitals.coreTemp.numericValue,
                                value: `${data.coreTemp ?? profile.vitals.coreTemp.numericValue}°C`,
                            },
                            respiration: {
                                ...profile.vitals.respiration,
                                numericValue: data.respiration ?? profile.vitals.respiration.numericValue,
                                value: `${data.respiration ?? profile.vitals.respiration.numericValue} bpm`,
                            },
                            hydration: {
                                ...profile.vitals.hydration,
                                numericValue: data.hydration ?? profile.vitals.hydration.numericValue,
                                value: `${data.hydration ?? profile.vitals.hydration.numericValue}%`,
                            },
                        },
                    }));
                }}
                onSaveToDatabase={async (data) => {
                    const recordPayload = {
                        Astronaut: data.astronautId,
                        Name: data.name,
                        Age_at_mission_start: data.age,
                        Gender: data.gender,
                        Country: data.country,
                        'Mission_duration(Days)': data.missionDurationDays,
                        No_of_Mission: data.noOfMission,
                        Bone_Density_Loss: data.boneDensityLoss,
                        Muscle_Mass_Loss: data.muscleMassLoss,
                        Radiation_Exposure: data.radiationExposure,
                        Cardiovascular_Risk_Score: data.cardioRisk,
                        Immune_Response_Suppression: data.immuneSuppression,
                        Psychological_Impact_Score: data.psychScore,
                        Vision_Change: data.vision,
                        Countermeasures_Used: data.countermeasures,
                        ...(data.rawRecord || {}),
                    };

                    const payload = (data.detectedRows && data.detectedRows.length > 0)
                        ? { detectedRows: data.detectedRows }
                        : { record: recordPayload };

                    const response = await fetch('/api/dataset/import', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            Accept: 'application/json',
                        },
                        body: JSON.stringify(payload),
                    });

                    const resJson = await response.json();
                    if (!response.ok || !resJson.success) {
                        throw new Error(resJson.message || 'Import failed');
                    }

                    if (resJson.success && resJson.records) {
                        setCrewList(resJson.records);
                        // If single record was saved or image scan, auto-switch active astronaut to it
                        const savedRecord = resJson.records.find(
                            (r: any) =>
                                (data.astronautId && String(r.Astronaut) === String(data.astronautId)) ||
                                (data.name && String(r.Name).toLowerCase() === String(data.name).toLowerCase())
                        ) || resJson.records[resJson.records.length - 1];

                        if (savedRecord && (!data.detectedRows || data.detectedRows.length <= 1)) {
                            setActiveAstronaut(generateAstronautProfile(savedRecord, currentTimeStr));
                        }
                    }
                }}
                activeAstronaut={activeAstronaut}
            />

            {/* Telemetry Export Modal */}
            <TelemetryExportModal
                isOpen={isExportModalOpen}
                onClose={() => setIsExportModalOpen(false)}
                astronaut={activeAstronaut}
                allCrewDataset={crewList}
            />

            {/* Suit Systems Control Modal */}
            <SuitSystemsModal
                isOpen={isSuitModalOpen}
                onClose={() => setIsSuitModalOpen(false)}
                suitPressure={activeAstronaut.diagnostics.suitPressurePsi}
                o2Percent={activeAstronaut.diagnostics.o2Percent}
                batteryPercent={activeAstronaut.diagnostics.batteryPercent}
                radiationStatus={activeAstronaut.diagnostics.radiationStatus}
                onUpdateSuit={(updates) => {
                    setActiveAstronaut((prev) => ({
                        ...prev,
                        diagnostics: {
                            ...prev.diagnostics,
                            ...updates,
                        },
                    }));
                }}
                onAddLog={handleAddManualLog}
            />

            {/* Biometrics Detail Modal */}
            <BiometricsDetailModal
                isOpen={isBiometricsModalOpen}
                onClose={() => setIsBiometricsModalOpen(false)}
                astronaut={activeAstronaut}
                onRecalibrate={() => {
                    handleAddManualLog('Biosensors Recalibrated', '[DIAGNOSTIC] Galvanic skin sensors recalibrated');
                }}
            />

            {/* System Settings Modal */}
            <SystemSettingsModal
                isOpen={isSettingsModalOpen}
                onClose={() => setIsSettingsModalOpen(false)}
                isAudioAlertsEnabled={isAudioAlertsEnabled}
                onToggleAudioAlerts={setIsAudioAlertsEnabled}
                tempUnit={tempUnit}
                onChangeTempUnit={setTempUnit}
                pressureUnit={pressureUnit}
                onChangePressureUnit={setPressureUnit}
            />

            {/* NASA 5 Hazards Autonomous Self-Assessment & Action Modal */}
            <AstronautSelfAssessmentModal
                isOpen={isSelfAssessmentOpen}
                onClose={() => setIsSelfAssessmentOpen(false)}
                astronaut={activeAstronaut}
                onActionExecuted={(actionTitle, details) => {
                    handleAddManualLog(actionTitle, `[AUTONOMOUS COUNTERMEASURE] ${details}`);
                }}
                onSaveAssessment={(result) => {
                    setSelfAssessmentResult(result);
                    handleAddManualLog(
                        `Autonomous Health Index: ${result.score}/100 (${result.status})`,
                        `[SELF-ASSESSMENT] ${result.flags.join('; ') || 'All 5 spaceflight hazards within nominal tolerance.'}`
                    );
                    if (result.flags.length > 0) {
                        setActiveAstronaut((prev) => ({
                            ...prev,
                            alerts: [
                                {
                                    level: result.status === 'CRITICAL' ? 'CRITICAL' : 'WARNING',
                                    title: `ASTRONAUT SELF-SPOTTED HAZARD DEVIATION (AHHI: ${result.score}/100)`,
                                    actionsTaken: result.flags.map((f) => `[SELF-REPORT] ${f}`),
                                    recommendedAction: 'Execute corresponding countermeasure in the 5 Hazards Action Suite.',
                                },
                                ...prev.alerts.filter((a) => !a.title.includes('SELF-SPOTTED')),
                            ],
                        }));
                    }
                }}
            />
        </div>
    );
}

// Sub-components for repeatable UI elements
function VitalCard({ title, value, status, color, valueColor, type, isPrimary, baseline, onClick }: any) {
    const textColor = valueColor || color;
    return (
        <div
            onClick={onClick}
            className={`rounded-lg p-2.5 border transition-all cursor-pointer group shadow-sm flex flex-col justify-between ${
                isPrimary
                    ? 'border-[#1a4b6c] bg-[#0a1f2e] hover:border-[#5cdbdf]'
                    : 'border-[#132c4a] bg-[#081325] hover:border-[#1a4b6c]'
            }`}
        >
            <div className="flex justify-between items-center text-xs">
                <span className="text-slate-300 font-bold group-hover:text-white transition-colors tracking-wide text-[11px]">{title}</span>
                <span style={{ color: textColor }} className="font-bold text-xs tracking-wider">
                    {value} {status && <span className="text-[10px] font-normal">{status}</span>}
                </span>
            </div>

            <div className={`relative w-full rounded overflow-hidden my-1.5 transition-colors border ${
                isPrimary ? 'h-10 bg-[#040d18] border-[#132c4a]' : 'h-8 bg-[#040d18] border-[#132c4a]'
            }`}>
                <div
                    className="absolute inset-0 opacity-20"
                    style={{
                        backgroundImage: 'linear-gradient(to right, #5cdbdf 1px, transparent 1px), linear-gradient(to bottom, #5cdbdf 1px, transparent 1px)',
                        backgroundSize: '12px 12px',
                    }}
                />
                <GraphPath type={type} color={color} />
            </div>

            {baseline && (
                <div className="text-[9px] text-slate-500 font-mono tracking-wider flex justify-between">
                    <span>{baseline}</span>
                    <span className="text-[#5cdbdf] opacity-0 group-hover:opacity-100 transition-opacity">DETAIL ↗</span>
                </div>
            )}
        </div>
    );
}

function GraphPath({ type, color }: { type: string; color: string }) {
    let d = '';
    if (type === 'ecg') {
        d = 'M0,20 L12,20 L16,6 L22,34 L26,20 L40,20 L44,12 L48,28 L52,20 L68,20 L72,6 L78,34 L82,20 L100,20';
    } else if (type === 'sine') {
        d = 'M0,20 Q12.5,6 25,20 T50,20 T75,20 T100,20';
    } else if (type === 'slow-sine') {
        d = 'M0,20 Q25,4 50,20 T100,20';
    } else {
        d = 'M0,20 L100,20'; // flatline
    }

    return (
        <svg className="absolute inset-0 h-full w-full" preserveAspectRatio="none" viewBox="0 0 100 40">
            <path
                d={d}
                fill="none"
                stroke={color}
                strokeWidth="1.5"
                vectorEffect="non-scaling-stroke"
                className="drop-shadow-sm"
            />
        </svg>
    );
}

function ProgressBar({ label, value, percent, color, onClick }: any) {
    return (
        <div onClick={onClick} className="text-xs cursor-pointer group space-y-1">
            <div className="flex justify-between items-center text-[10px]">
                <span className="text-slate-400 group-hover:text-white transition-colors">{label}</span>
                <span className="text-white font-mono font-bold">{value}</span>
            </div>
            <div className="h-2 w-full rounded bg-[#030b14] border border-[#132c4a] group-hover:border-[#5cdbdf] relative overflow-hidden flex transition-colors">
                <div className={`${color} h-full transition-all duration-500 rounded-sm`} style={{ width: `${percent}%` }} />
            </div>
        </div>
    );
}
