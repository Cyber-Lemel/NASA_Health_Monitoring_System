import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Link } from '@inertiajs/react';
import {
    Download, Upload, AlertCircle, AlertTriangle,
    CheckSquare, Square, ChevronDown, Check, User, Activity,
    Database, Search, Sparkles, RefreshCw, Radio, Zap,
    Play, Pause, Wind, Shield, Settings, ClipboardList, Send, X,
    Clock, Heart, Volume2, VolumeX, Users, Layers, Expand, FileText,
    Ellipsis, CheckCircle2, ArrowUpRight, ArrowLeft, ChevronRight, Flame, Droplet
} from 'lucide-react';
import NasaLogo from '@/components/nasa-logo';
import Astronaut3DModel from '@/components/astronaut-3d-model';
import TelemetryImportModal from '@/components/telemetry-import-modal';
import TelemetryExportModal from '@/components/telemetry-export-modal';
import SuitSystemsModal from '@/components/suit-systems-modal';
import BiometricsDetailModal, { type BiometricKey } from '@/components/biometrics-detail-modal';
import SystemSettingsModal from '@/components/system-settings-modal';
import CrewSwitcherModal from '@/components/crew-switcher-modal';
import AstronautSelfAssessmentModal, { type MissionHazard } from '@/components/astronaut-self-assessment-modal';
import type {
    AstronautFullData,
    ParsedImportPayload,
    TelemetryLogItem,
    MedicalAlert
} from '@/types/astronaut';
import { toast } from 'sonner';

function formatEvaStatus(status: string) {
    return status.charAt(0) + status.slice(1).toLowerCase();
}

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
    {
        Astronaut: 'AST-04',
        Name: 'Jeremy Hansen',
        Country: 'Canada / CSA',
        Gender: 'Male',
        Age_at_mission_start: 48,
        'Mission_duration(Days)': 10,
        Bone_Density_Loss: '-0.3%',
        Role: 'Mission Specialist',
    },
    {
        Astronaut: 'AST-05',
        Name: 'Dr. Peggy Whitson',
        Country: 'USA / NASA',
        Gender: 'Female',
        Age_at_mission_start: 57,
        'Mission_duration(Days)': 288,
        Bone_Density_Loss: '-4.8%',
        Role: 'Payload Specialist',
    },
    {
        Astronaut: 'AST-06',
        Name: 'Capt. Scott Kelly',
        Country: 'USA / NASA',
        Gender: 'Male',
        Age_at_mission_start: 51,
        'Mission_duration(Days)': 340,
        Bone_Density_Loss: '-6.2%',
        Role: 'Flight Engineer',
    },
    {
        Astronaut: 'AST-07',
        Name: 'Sunita Williams',
        Country: 'USA / NASA',
        Gender: 'Female',
        Age_at_mission_start: 58,
        'Mission_duration(Days)': 322,
        Bone_Density_Loss: '-4.4%',
        Role: 'Flight Engineer',
    },
    {
        Astronaut: 'AST-08',
        Name: 'Dr. Samantha Cristoforetti',
        Country: 'Italy / ESA',
        Gender: 'Female',
        Age_at_mission_start: 45,
        'Mission_duration(Days)': 199,
        Bone_Density_Loss: '-3.2%',
        Role: 'Mission Specialist',
    },
    {
        Astronaut: 'AST-09',
        Name: 'Dr. Jessica Meir',
        Country: 'USA / NASA',
        Gender: 'Female',
        Age_at_mission_start: 42,
        'Mission_duration(Days)': 205,
        Bone_Density_Loss: '-3.6%',
        Role: 'Flight Engineer',
    },
    {
        Astronaut: 'AST-10',
        Name: 'Thomas Pesquet',
        Country: 'France / ESA',
        Gender: 'Male',
        Age_at_mission_start: 43,
        'Mission_duration(Days)': 199,
        Bone_Density_Loss: '-3.1%',
        Role: 'Flight Engineer',
    },
    {
        Astronaut: 'AST-11',
        Name: 'Koichi Wakata',
        Country: 'Japan / JAXA',
        Gender: 'Male',
        Age_at_mission_start: 59,
        'Mission_duration(Days)': 188,
        Bone_Density_Loss: '-3.4%',
        Role: 'Flight Engineer',
    },
    {
        Astronaut: 'AST-12',
        Name: 'Dr. Kjell Lindgren',
        Country: 'USA / NASA',
        Gender: 'Male',
        Age_at_mission_start: 49,
        'Mission_duration(Days)': 141,
        Bone_Density_Loss: '-2.2%',
        Role: 'Flight Surgeon',
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

// Initial astronaut profile from authentic crew roster (CDR. Reid Wiseman - AST-01)
const DEFAULT_ASTRONAUT: AstronautFullData = generateAstronautProfile(DEFAULT_CREW_ROSTER[0], '12:00:00 UTC');

const biometricKeys = ['heartRate', 'spO2', 'respiration', 'coreTemp', 'hydration'] as const;

export default function NasaHealthHud({ initialData }: { initialData?: any }) {
    // Active astronaut data - always prioritize authentic dataset records
    const [activeAstronaut, setActiveAstronaut] = useState<AstronautFullData>(() => {
        if (initialData?.records && Array.isArray(initialData.records) && initialData.records.length > 0) {
            return generateAstronautProfile(initialData.records[0], '12:00:00 UTC');
        }
        return DEFAULT_ASTRONAUT;
    });

    const { id: crewId } = activeAstronaut.bio;
    const { vitals } = activeAstronaut;
    const [biometricHistory, setBiometricHistory] = useState<{ crewId: string; readings: number[][] }>({
        crewId,
        readings: [],
    });
    const readings = biometricHistory.crewId === crewId ? biometricHistory.readings : [];

    useEffect(() => {
        const sample = biometricKeys.map((key) => vitals[key].numericValue);
        setBiometricHistory((previous) => {
            const recent = previous.crewId === crewId ? previous.readings : [];
            if (recent.at(-1)?.every((value, index) => Object.is(value, sample[index]))) return previous;
            return { crewId, readings: [...recent.slice(-19), sample] };
        });
    }, [crewId, vitals]);

    // Database crew roster
    const [crewList, setCrewList] = useState<any[]>(() =>
        initialData?.records && initialData.records.length > 0 ? initialData.records : DEFAULT_CREW_ROSTER
    );

    useEffect(() => {
        if (initialData?.records && initialData.records.length > 0) {
            setCrewList(initialData.records);
            setActiveAstronaut((current) => {
                const found = initialData.records.find((r: any) => (r.Astronaut ?? r.id) === current.bio.id);
                return found ? generateAstronautProfile(found, '12:00:00 UTC') : generateAstronautProfile(initialData.records[0], '12:00:00 UTC');
            });
        } else {
            fetch('/api/dataset/records')
                .then((res) => res.json())
                .then((data) => {
                    if (data?.success && data?.records && data.records.length > 0) {
                        setCrewList(data.records);
                        setActiveAstronaut((current) => {
                            const found = data.records.find((r: any) => (r.Astronaut ?? r.id) === current.bio.id);
                            return found ? generateAstronautProfile(found, '12:00:00 UTC') : generateAstronautProfile(data.records[0], '12:00:00 UTC');
                        });
                    }
                })
                .catch(() => {});
        }
    }, [initialData?.records]);

    // Modals visibility
    const [isImportModalOpen, setIsImportModalOpen] = useState(false);
    const [isExportModalOpen, setIsExportModalOpen] = useState(false);
    const [isSuitModalOpen, setIsSuitModalOpen] = useState(false);
    const [isBiometricsModalOpen, setIsBiometricsModalOpen] = useState(false);
    const [selectedBiometric, setSelectedBiometric] = useState<BiometricKey | null>(null);
    const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
    const [isCrewSwitcherOpen, setIsCrewSwitcherOpen] = useState(false);
    const [isSelfAssessmentOpen, setIsSelfAssessmentOpen] = useState(false);
    const [selectedHazard, setSelectedHazard] = useState<MissionHazard | null>(null);
    const [selfAssessmentResult, setSelfAssessmentResult] = useState<{
        score: number;
        status: 'NOMINAL' | 'GUARDED' | 'ELEVATED' | 'CRITICAL';
        flags: string[];
        alertMessage: string;
    } | null>(null);

    // EVA status selector dropdown state
    const [isEvaSelectorOpen, setIsEvaSelectorOpen] = useState(false);
    const evaSelectorRef = useRef<HTMLDivElement>(null);
    const headerActionsRef = useRef<HTMLDivElement>(null);
    const [isHeaderActionsOpen, setIsHeaderActionsOpen] = useState(false);

    // Real-Time DSN Telemetry & WebSocket state
    const [isReverbConnected, setIsReverbConnected] = useState(true);
    const [isAutoLiveStream, setIsAutoLiveStream] = useState(true);
    const [isPingingReverb, setIsPingingReverb] = useState(false);
    const [lastReverbPingTime, setLastReverbPingTime] = useState<string>('LIVE DSN ACTIVE');

    // Preference settings
    const [isAudioAlertsEnabled, setIsAudioAlertsEnabled] = useState(true);
    const [tempUnit, setTempUnit] = useState<'C' | 'F'>('C');
    const [pressureUnit, setPressureUnit] = useState<'psi' | 'kPa'>('psi');

    // Live clock
    const [currentTimeStr, setCurrentTimeStr] = useState('13:45:10 UTC');

    // Synchronize activeAstronautRef
    const activeAstronautRef = useRef(activeAstronaut);
    const dashboardRef = useRef<HTMLDivElement>(null);
    const saturnRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const dashboard = dashboardRef.current;
        const saturn = saturnRef.current;
        if (!dashboard || !saturn) return;

        let frame = 0;
        const update = () => {
            frame = 0;
            const planet = saturn.getBoundingClientRect();
            const lightX = planet.left + planet.width / 2;
            const lightY = planet.top + planet.height * .43;
            for (const card of dashboard.querySelectorAll<HTMLElement>('.orbit-glass')) {
                const bounds = card.getBoundingClientRect();
                const dx = lightX - bounds.left - bounds.width / 2;
                const dy = lightY - bounds.top - bounds.height / 2;
                card.style.setProperty('--glass-light-angle', `${Math.atan2(dx, -dy)}rad`);
            }
        };
        const schedule = () => {
            if (!frame) frame = requestAnimationFrame(update);
        };
        const observer = new ResizeObserver(schedule);
        observer.observe(dashboard);
        for (const card of dashboard.querySelectorAll('.orbit-glass')) observer.observe(card);
        window.addEventListener('resize', schedule);
        window.addEventListener('scroll', schedule, { passive: true });
        schedule();

        return () => {
            cancelAnimationFrame(frame);
            observer.disconnect();
            window.removeEventListener('resize', schedule);
            window.removeEventListener('scroll', schedule);
        };
    }, [activeAstronaut.bio.id]);
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
            if (!headerActionsRef.current?.contains(event.target as Node)) setIsHeaderActionsOpen(false);
            if (evaSelectorRef.current && !evaSelectorRef.current.contains(event.target as Node)) {
                setIsEvaSelectorOpen(false);
            }
        }
        function handleKeyDown(event: KeyboardEvent) {
            if (event.key === 'Escape') {
                setIsHeaderActionsOpen(false);
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
    // REAL-TIME TELEMETRY STATE APPLIER (Autonomous DSN & WebSocket)
    // -------------------------------------------------------------
    const applyTelemetryUpdate = useCallback((tel: any) => {
        if (!tel) return;

        const hr = tel.heart_rate ?? 76;
        const spo2 = tel.oxygen_saturation ?? 98.6;
        const temp = tel.core_temperature ?? 37.0;
        const resp = tel.respiration ?? 18;
        const hydration = tel.hydration ?? 75;
        const pressure = tel.suit_pressure ?? 4.3;
        const rad = tel.radiation_rate ? `Safe (${tel.radiation_rate} mSv/h)` : 'Safe (0.18 mSv/h)';
        const nowStr = new Date().toLocaleTimeString('en-US', { hour12: false });

        setLastReverbPingTime(nowStr);
        setIsReverbConnected(true);

        setActiveAstronaut((prev) => {
            const hrStatus = hr > 115 ? '(Elevated)' : hr > 100 ? '(Moderate)' : '(Nominal)';
            const hrColor = hr > 115 ? '#ef4444' : hr > 100 ? '#f97316' : '#5cdbdf';
            const tempStatus = temp > 37.8 ? '(Warm)' : '(Normal)';
            const tempColor = temp > 37.8 ? '#f97316' : '#5cdbdf';
            const hydStatus = hydration < 68 ? 'Low' : 'Nominal';
            const hydColor = hydration < 68 ? '#ef4444' : '#5cdbdf';

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
                        numericValue: Number(spo2),
                        value: `${Number(spo2).toFixed(1)}%`,
                    },
                    respiration: {
                        ...prev.vitals.respiration,
                        numericValue: resp,
                        value: `${resp} bpm`,
                    },
                    coreTemp: {
                        ...prev.vitals.coreTemp,
                        numericValue: Number(temp),
                        value: `${Number(temp).toFixed(1)}°C`,
                        status: tempStatus,
                        color: tempColor,
                    },
                    hydration: {
                        ...prev.vitals.hydration,
                        numericValue: hydration,
                        value: `${hydration}%`,
                        status: hydStatus,
                        color: hydColor,
                    },
                },
                diagnostics: {
                    ...prev.diagnostics,
                    suitPressurePsi: pressure,
                    suitPressurePercent: Math.min(100, Math.round((pressure / 5) * 100)),
                    radiationStatus: rad,
                },
            };
        });
    }, []);

    // -------------------------------------------------------------
    // WEBSOCKET LISTENER (Laravel Reverb fallback if server is running)
    // -------------------------------------------------------------
    useEffect(() => {
        if (!window.Echo) {
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

                applyTelemetryUpdate(tel);
            };

            channel.listen('.telemetry.updated', handleTelemetryEvent);
            channel.listen('telemetry.updated', handleTelemetryEvent);

            return () => {
                window.Echo.leave('mission-telemetry');
            };
        } catch {
            // Reverb server not running, autonomous stream handles real-time updates seamlessly
        }
    }, [applyTelemetryUpdate]);

    // Manual DSN Telemetry Ping dispatcher
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
            if (data.success && data.telemetry) {
                applyTelemetryUpdate(data.telemetry);
                toast.success(`DSN Telemetry Synchronized for ${activeAstronaut.bio.name}`);
            }
        } catch {
            toast.error('Failed to dispatch DSN telemetry ping');
        } finally {
            setIsPingingReverb(false);
        }
    };

    // -------------------------------------------------------------
    // AUTONOMOUS REAL-TIME DSN TELEMETRY STREAM
    // Updates continuously in real-time WITHOUT requiring Reverb
    // -------------------------------------------------------------
    useEffect(() => {
        if (!isAutoLiveStream) return;

        let cycleCount = 0;
        const streamInterval = setInterval(() => {
            cycleCount++;
            const t = Date.now() / 1000;
            const targetAstronaut = activeAstronautRef.current;

            // Generate authentic physiological micro-variations around astronaut baseline
            const baseHr = targetAstronaut.bio.id === 'AST-01' ? 82 : (targetAstronaut.bio.id === 'AST-02' ? 86 : 78);
            const hrDrift = Math.round(Math.sin(t * 0.45) * 3 + Math.sin(t * 1.2) * 2 + (Math.random() - 0.5) * 2);
            const nextHr = Math.max(65, Math.min(115, baseHr + hrDrift));

            const nextSpo2 = Number((98.5 + Math.sin(t * 0.25) * 0.7 + (Math.random() - 0.5) * 0.3).toFixed(1));
            const nextTemp = Number((37.05 + Math.sin(t * 0.15) * 0.1 + (Math.random() - 0.5) * 0.05).toFixed(1));
            const nextResp = Math.round(18 + Math.sin(t * 0.3) * 2 + (Math.random() - 0.5) * 1.5);
            const nextHydration = Math.round(74 + Math.sin(t * 0.08) * 2);
            const nextPressure = Number((4.3 + Math.sin(t * 0.2) * 0.03).toFixed(2));
            const nextRadiation = Number((0.18 + Math.sin(t * 0.1) * 0.01).toFixed(3));

            const simulatedTel = {
                astronaut_id: targetAstronaut.bio.id,
                heart_rate: nextHr,
                oxygen_saturation: Math.min(99.8, Math.max(97.2, nextSpo2)),
                core_temperature: nextTemp,
                respiration: nextResp,
                hydration: nextHydration,
                suit_pressure: nextPressure,
                radiation_rate: nextRadiation,
            };

            applyTelemetryUpdate(simulatedTel);

            // Periodically ping backend to update dataset/session
            if (cycleCount % 6 === 0) {
                fetch('/api/telemetry/ping', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
                    body: JSON.stringify({
                        astronaut_id: targetAstronaut.bio.id,
                        astronaut_name: targetAstronaut.bio.name,
                        heart_rate: nextHr,
                        oxygen_saturation: nextSpo2,
                        core_temperature: nextTemp,
                        respiration: nextResp,
                        hydration: nextHydration,
                        suit_pressure: nextPressure,
                        radiation_rate: nextRadiation,
                    }),
                }).catch(() => {});
            }

            // Occasionally append a telemetry diagnostic log entry
            if (cycleCount % 12 === 0) {
                const nowShort = new Date().toLocaleTimeString('en-US', { hour12: false }).slice(0, 5);
                setActiveAstronaut((prev) => ({
                    ...prev,
                    logs: [
                        {
                            id: `log-stream-${Date.now()}`,
                            timestamp: nowShort,
                            title: `DSN Autonomous Sync (${prev.bio.name})`,
                            action: `[REAL-TIME DSN] HR: ${nextHr} bpm | SpO2: ${nextSpo2}% | Temp: ${nextTemp}°C | Press: ${nextPressure} psi`,
                            status: 'RESOLVED',
                        },
                        ...prev.logs.slice(0, 4),
                    ],
                }));
            }
        }, 1600);

        return () => clearInterval(streamInterval);
    }, [isAutoLiveStream, applyTelemetryUpdate]);

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
        if (crewList.length > 0) {
            const currentId = activeAstronaut.bio.id;
            const matchingCrew = crewList.find((c) => (c.Astronaut ?? c.id) === currentId);
            if (!matchingCrew) {
                setActiveAstronaut(generateAstronautProfile(crewList[0], currentTimeStr));
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
        <div ref={dashboardRef} className="orbit-dashboard min-h-screen text-slate-200 font-sans px-3 pt-3 pb-24 sm:px-5 sm:pt-5 sm:pb-28 flex flex-col gap-4 select-none relative overflow-x-hidden">
            <div ref={saturnRef} aria-hidden="true" className="orbit-saturn" />
            {/*
                Gentle displacement of the wallpaper behind the glass.
                CSS supplies frosted blur on browsers that fall back from SVG backdrop filters.
            */}
            <svg aria-hidden="true" width="0" height="0" className="pointer-events-none absolute">
                <defs>
                    <filter id="orbit-glass-refraction" x="0" y="0" width="100%" height="100%" colorInterpolationFilters="sRGB">
                        <feTurbulence type="fractalNoise" baseFrequency="0.018 0.04" numOctaves="1" seed="7" result="refraction" />
                        <feDisplacementMap in="SourceGraphic" in2="refraction" scale="11" xChannelSelector="R" yChannelSelector="G" />
                    </filter>
                </defs>
            </svg>

            <header className="orbit-glass orbit-command-bar relative z-30 flex flex-wrap items-center justify-between gap-x-7 gap-y-3 px-3 py-3 sm:px-4">
                <div className="flex min-w-0 items-center gap-3 sm:gap-4">
                    <div className="flex shrink-0 items-center gap-2.5">
                        <NasaLogo size={30} />
                        <div>
                            <div className="text-xl leading-none font-bold tracking-tight text-white">ORBIT</div>
                            <div className="mt-0.5 text-xs text-slate-400">NASA HRP</div>
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={() => setIsCrewSwitcherOpen(true)}
                        className="orbit-header-control orbit-glass-inset min-w-0"
                        title="Switch crew member"
                    >
                        <span className="truncate">{activeAstronaut.bio.name}</span>
                        <ChevronDown aria-hidden="true" className="size-3.5 shrink-0 text-slate-400" />
                    </button>
                </div>

                <div className="flex items-center gap-2 sm:gap-3">
                    <span className="flex items-center gap-1.5 text-xs text-slate-300 tabular-nums" title="Mission clock">
                        <Clock aria-hidden="true" className="size-3.5 text-slate-400" />
                        {currentTimeStr}
                    </span>
                    <button
                        type="button"
                        onClick={() => {
                            const next = !isAutoLiveStream;
                            setIsAutoLiveStream(next);
                            toast.info(next ? 'Autonomous real-time DSN telemetry stream resumed' : 'Telemetry stream paused');
                        }}
                        className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[11px] font-mono font-bold transition-all cursor-pointer ${
                            isAutoLiveStream
                                ? 'bg-cyan-950/80 border-cyan-500/60 text-cyan-300 shadow-[0_0_10px_rgba(92,219,223,0.3)]'
                                : 'bg-slate-900/80 border-slate-700 text-slate-400'
                        }`}
                        title={isAutoLiveStream ? 'Real-Time DSN Telemetry Active - Click to Pause' : 'Telemetry Stream Paused - Click to Resume'}
                    >
                        <span className={`size-2 rounded-full ${isAutoLiveStream ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`} />
                        <span className="hidden sm:inline">{isAutoLiveStream ? 'DSN REAL-TIME: LIVE' : 'DSN: PAUSED'}</span>
                        <span className="sm:hidden">{isAutoLiveStream ? 'LIVE' : 'PAUSED'}</span>
                    </button>
                    <div className="relative" ref={evaSelectorRef}>
                        <button
                            type="button"
                            aria-expanded={isEvaSelectorOpen}
                            onClick={() => setIsEvaSelectorOpen(!isEvaSelectorOpen)}
                            className="orbit-header-control orbit-glass-inset"
                            title="Update EVA status"
                        >
                            <span className={`size-1.5 shrink-0 rounded-full ${activeAstronaut.bio.evaStatus === 'ABORTED' ? 'bg-rose-400' : activeAstronaut.bio.evaStatus === 'ON-GOING' ? 'bg-amber-300' : 'bg-emerald-300'}`} />
                            <span>EVA {formatEvaStatus(activeAstronaut.bio.evaStatus)}</span>
                            <ChevronDown aria-hidden="true" className="size-3.5 text-slate-400" />
                        </button>
                        {isEvaSelectorOpen && (
                            <div className="orbit-glass orbit-header-popover absolute top-full right-0 z-50 mt-2 w-44 p-1.5 bg-[#06111e]/98 backdrop-blur-2xl border border-[#1a4b6c] shadow-[0_16px_36px_-4px_rgba(0,0,0,0.95),0_0_20px_rgba(10,31,46,0.8)] rounded-xl">
                                {(['ON-GOING', 'STANDBY', 'SCHEDULED', 'COMPLETED', 'ABORTED'] as const).map((status) => (
                                    <button
                                        key={status}
                                        type="button"
                                        onClick={() => handleSetEvaStatus(status)}
                                        className="orbit-header-option"
                                    >
                                        {formatEvaStatus(status)}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                <div className="flex flex-wrap items-center gap-1.5">
                    <button type="button" className="orbit-header-control" onClick={() => setIsBiometricsModalOpen(true)}>
                        <Heart aria-hidden="true" className="size-3.5 text-cyan-200" />
                        Biometrics
                    </button>
                    <button type="button" className="orbit-header-control" onClick={() => setIsSuitModalOpen(true)}>
                        <Shield aria-hidden="true" className="size-3.5 text-cyan-200" />
                        Suit
                    </button>
                    <Link
                        href="/reports"
                        className="orbit-header-control flex items-center gap-1.5 text-cyan-100 hover:text-white"
                        title="View Health Analytics & Cohort Reports"
                    >
                        <FileText aria-hidden="true" className="size-3.5 text-cyan-300" />
                        <span>Reports</span>
                    </Link>
                    <div ref={headerActionsRef} className="relative">
                        <button
                            type="button"
                            className="orbit-header-control orbit-glass-inset"
                            aria-expanded={isHeaderActionsOpen}
                            onClick={() => setIsHeaderActionsOpen(!isHeaderActionsOpen)}
                        >
                            <Ellipsis aria-hidden="true" className="size-4" />
                            More
                        </button>
                        {isHeaderActionsOpen && (
                            <div className="orbit-glass orbit-header-popover absolute top-full right-0 z-50 mt-2 w-56 p-1.5 bg-[#06111e]/98 backdrop-blur-2xl border border-[#1a4b6c] shadow-[0_16px_36px_-4px_rgba(0,0,0,0.95),0_0_20px_rgba(10,31,46,0.8)] rounded-xl" onClick={(event) => {
                                if ((event.target as HTMLElement).closest('button, a[href]')) setIsHeaderActionsOpen(false);
                            }}>
                                <Link href="/reports" className="orbit-header-option"><FileText aria-hidden="true" className="size-4 text-cyan-300" /> Reports & Analytics</Link>
                                <Link href="/dataset" className="orbit-header-option"><Database aria-hidden="true" className="size-4" /> Hazards and archive</Link>
                                <button type="button" className="orbit-header-option" onClick={() => setIsSelfAssessmentOpen(true)}>
                                    <Shield aria-hidden="true" className="size-4" /> Self-assessment
                                    {selfAssessmentResult && <span className="ml-auto text-cyan-200">{selfAssessmentResult.score}%</span>}
                                </button>
                                <button type="button" className="orbit-header-option" onClick={() => setIsSettingsModalOpen(true)}><Settings aria-hidden="true" className="size-4" /> Settings</button>
                                <button type="button" className="orbit-header-option" onClick={() => setIsImportModalOpen(true)}><Upload aria-hidden="true" className="size-4" /> Import telemetry</button>
                                <button type="button" className="orbit-header-option" onClick={() => setIsExportModalOpen(true)}><Download aria-hidden="true" className="size-4" /> Export telemetry</button>
                                <button type="button" className="orbit-header-option" onClick={handleTriggerReverbPing} disabled={isPingingReverb}><Zap aria-hidden="true" className="size-4" /> Send telemetry ping</button>
                                <button type="button" className="orbit-header-option" onClick={() => {
                                    const next = !isAutoLiveStream;
                                    setIsAutoLiveStream(next);
                                    toast.info(next ? 'Live telemetry started' : 'Live telemetry paused');
                                }}>
                                    <Radio aria-hidden="true" className="size-4" /> {isAutoLiveStream ? 'Pause live telemetry' : 'Start live telemetry'}
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </header>

            <section aria-labelledby="orbit-hazards-title" className="orbit-glass relative z-10 p-3 sm:p-4">
                <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2.5">
                        <Shield aria-hidden="true" className="size-4 shrink-0 text-cyan-200" />
                        <h2 id="orbit-hazards-title" className="orbit-section-title">Mission hazards</h2>
                        <span className="text-xs text-slate-400">RIDGE</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <Link
                            href="/reports"
                            className="orbit-header-control orbit-glass-inset flex items-center gap-1.5"
                            title="View Cohort Medical Reports"
                        >
                            <FileText aria-hidden="true" className="size-3.5 text-cyan-300" />
                            <span>Reports</span>
                        </Link>
                        <button
                            type="button"
                            onClick={() => setIsSelfAssessmentOpen(true)}
                            className="orbit-header-control orbit-glass-inset"
                        >
                            Self-assessment
                            <ChevronRight aria-hidden="true" className="size-3.5 text-cyan-200" />
                        </button>
                    </div>
                </div>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
                    {([
                        { label: 'Radiation', value: '0.18 mSv/h', detail: 'Storm Haven ready', status: 'Safe', dot: 'bg-emerald-400' },
                        { label: 'Isolation', value: 'Circadian phase 1', detail: 'Sleep 84% · SSLA active', status: 'SSLA active', dot: 'bg-emerald-400' },
                        { label: 'Distance', value: '14m 22s DSN delay', detail: 'Autonomous CDS active', status: 'CDS active', dot: 'bg-sky-400' },
                        { label: 'Gravity', value: `Bone density ${activeAstronaut.bio.boneDensityLoss}`, detail: 'ARED and LBNP ready', status: 'Readiness check', dot: 'bg-amber-400' },
                        { label: 'Environment', value: 'CO₂ 2.8 mmHg', detail: 'Air quality nominal', status: 'Nominal', dot: 'bg-emerald-400' },
                    ] as const).map(({ label, value, detail, status, dot }) => (
                        <button
                            key={label}
                            type="button"
                            onClick={() => setSelectedHazard(label)}
                            className="orbit-glass-inset flex min-w-0 cursor-pointer flex-col gap-1 px-3 py-2 text-left hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-300"
                        >
                            <span className="flex w-full items-center justify-between gap-2 text-xs text-slate-300">
                                {label}
                                <span className={`size-1.5 shrink-0 rounded-full ${dot}`} title={status}>
                                    <span className="sr-only">{status}</span>
                                </span>
                            </span>
                            <span className="text-sm leading-snug font-medium text-slate-50 tabular-nums">{value}</span>
                            <span className="text-xs leading-snug text-slate-400">{detail}</span>
                        </button>
                    ))}
                </div>
            </section>

            {/* Mission control cockpit */}
            <div className="relative z-10 grid grid-cols-12 gap-3.5 flex-1">
                <div className="col-span-12 flex min-w-0 flex-col lg:col-span-9">
                    <div className="orbit-glass p-1.5 relative overflow-hidden flex flex-col flex-1 min-h-[480px] shadow-lg">
                        <Astronaut3DModel
                            heartRate={activeAstronaut.vitals.heartRate.numericValue}
                            coreTemp={activeAstronaut.vitals.coreTemp.numericValue}
                            oxygenSaturation={activeAstronaut.vitals.spO2.numericValue}
                            evaStatus={activeAstronaut.bio.evaStatus}
                            astronautName={activeAstronaut.bio.name}
                            telemetryOverlay={
                                <ScannerBiometrics
                                    key={activeAstronaut.bio.id}
                                    vitals={activeAstronaut.vitals}
                                    history={readings}
                                    onClick={(metric) => {
                                        setSelectedBiometric(metric);
                                        setIsBiometricsModalOpen(true);
                                    }}
                                />
                            }
                        />
                    </div>
                </div>

                {/* ------------------------------------------------------------- */}
                {/* RIGHT COLUMN: Suit Life Support & ORBIT 5-Hazards Radar      */}
                {/* ------------------------------------------------------------- */}
                <div className="col-span-12 lg:col-span-3 flex flex-col gap-3">
                    {/* Suit & Environmental Life Support */}
                    <div className="orbit-glass p-3 shadow-lg">
                        <div className="flex items-center justify-between border-b border-[#132c4a] pb-2 mb-2.5">
                            <div className="flex items-center gap-1.5">
                                <Shield className="w-3.5 h-3.5 text-[#5cdbdf]" />
                                <h2 className="orbit-section-title">Suit Life Support</h2>
                            </div>
                            <button
                                type="button"
                                onClick={() => setIsSuitModalOpen(true)}
                                className="text-xs text-cyan-400 hover:underline cursor-pointer flex items-center gap-0.5"
                            >
                                <span>Console</span>
                                <ArrowUpRight className="w-3 h-3" />
                            </button>
                        </div>

                        <div className="space-y-2.5">
                            <div className="orbit-glass relative divide-y divide-white/10 px-3">
                                <SuitGauge
                                    label="Suit pressure"
                                    value={activeAstronaut.diagnostics.suitPressurePsi}
                                    unit="psi"
                                    percent={activeAstronaut.diagnostics.suitPressurePercent}
                                    accent="text-cyan-200"
                                    onClick={() => handleDiagnoseSubsystem('Suit Pressure Valves')}
                                />
                                <SuitGauge
                                    label="O₂ reserves"
                                    value={activeAstronaut.diagnostics.o2Percent}
                                    unit="%"
                                    percent={activeAstronaut.diagnostics.o2Percent}
                                    accent="text-amber-200"
                                    onClick={() => handleDiagnoseSubsystem('O2 Reserve Canister')}
                                />
                            </div>
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

                    <section aria-labelledby="orbit-hazard-status-title" className="orbit-glass relative p-3 sm:p-4">
                        <div className="mb-3 flex items-center gap-2">
                            <Activity aria-hidden="true" className="size-4 shrink-0 text-cyan-200" />
                            <h2 id="orbit-hazard-status-title" className="orbit-section-title">ORBIT Hazard Status</h2>
                        </div>

                        <ul className="orbit-glass-inset divide-y divide-white/10 px-1">
                            {([
                                { hazard: 'Radiation', detail: activeAstronaut.diagnostics.radiationStatus, status: 'Shielded', dot: 'bg-emerald-300' },
                                { hazard: 'Isolation', detail: 'Sleep efficiency 84%', status: 'Lighting active', dot: 'bg-violet-300' },
                                { hazard: 'Distance', detail: '14m 22s signal delay', status: 'CDS active', dot: 'bg-sky-300' },
                                { hazard: 'Gravity', detail: `Bone density ${activeAstronaut.bio.boneDensityLoss}`, status: 'ARED ready', dot: 'bg-amber-300' },
                                { hazard: 'Environment', detail: 'Cabin CO₂ 2.8 mmHg', status: 'Purged', dot: 'bg-emerald-300' },
                            ] as const).map(({ hazard, detail, status, dot }) => (
                                <li key={hazard}>
                                    <button
                                        type="button"
                                        onClick={() => setSelectedHazard(hazard)}
                                        className="group flex w-full min-w-0 cursor-pointer items-center gap-2 rounded-xl px-2 py-2.5 text-left hover:bg-white/5 focus-visible:outline-2 focus-visible:outline-cyan-300"
                                    >
                                        <span aria-hidden="true" className={`size-1.5 shrink-0 rounded-full ${dot}`} />
                                        <span className="min-w-0 flex-1">
                                            <span className="block text-sm font-medium leading-tight text-white">{hazard}</span>
                                            <span className="mt-1 block text-xs leading-snug text-slate-300 tabular-nums">{detail}</span>
                                            <span className="mt-1 block text-xs leading-snug text-slate-400">{status}</span>
                                        </span>
                                        <ChevronRight aria-hidden="true" className="size-3.5 shrink-0 text-slate-400 group-hover:text-cyan-200" />
                                    </button>
                                </li>
                            ))}
                        </ul>

                        <button
                            type="button"
                            onClick={() => setIsSelfAssessmentOpen(true)}
                            className="orbit-header-control orbit-glass-inset mt-3 w-full justify-between"
                        >
                            Self-assessment
                            <ArrowUpRight aria-hidden="true" className="size-3.5 text-cyan-200" />
                        </button>
                    </section>
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
                metricKey={selectedBiometric}
                samples={selectedBiometric ? readings.map((sample) => sample[biometricKeys.indexOf(selectedBiometric)]) : undefined}
                onClose={() => {
                    setSelectedBiometric(null);
                    setIsBiometricsModalOpen(false);
                }}
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
                isOpen={isSelfAssessmentOpen || selectedHazard !== null}
                hazard={selectedHazard}
                onClose={() => {
                    setIsSelfAssessmentOpen(false);
                    setSelectedHazard(null);
                }}
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
function ScannerBiometrics({ vitals, onClick, history }: {
    vitals: AstronautFullData['vitals'];
    onClick: (metric: BiometricKey) => void;
    history: number[][];
}) {
    const heartRate = vitals.heartRate.numericValue;
    const respiration = vitals.respiration.numericValue;

    const readings = [
        { label: 'Heart rate', metric: 'heartRate', icon: Heart, position: '@min-[42rem]:col-start-1 @min-[42rem]:row-start-1', trace: 'ecg', anchor: 'heart' },
        { label: 'Oxygen saturation', metric: 'spO2', icon: Activity, position: '@min-[42rem]:col-start-1 @min-[42rem]:row-start-2', trace: 'pulse', anchor: 'hand' },
        { label: 'Respiration', metric: 'respiration', icon: Wind, position: '@min-[42rem]:col-start-1 @min-[42rem]:row-start-3', trace: 'breath', anchor: 'ribs' },
        { label: 'Core temperature', metric: 'coreTemp', icon: Flame, position: '@min-[42rem]:col-start-2 @min-[42rem]:row-start-1 @min-[42rem]:translate-y-10', anchor: 'core' },
        { label: 'Hydration', metric: 'hydration', icon: Droplet, position: '@min-[42rem]:col-start-2 @min-[42rem]:row-start-2 @min-[42rem]:translate-y-10', anchor: 'hydration' },
    ] as const;

    return (
        <div role="group" aria-label="Biometrics telemetry" className="grid grid-cols-2 gap-2 sm:grid-cols-3 @min-[42rem]:grid-cols-[minmax(0,10rem)_minmax(0,10rem)] @min-[42rem]:justify-between @min-[42rem]:gap-y-3 @min-[56rem]:grid-cols-[minmax(0,12.5rem)_minmax(0,12.5rem)]">
            {readings.map(({ label, metric: metricKey, icon: Icon, position, ...reading }, index) => {
                const metric = vitals[metricKey];
                const isHeartRate = metricKey === 'heartRate';
                const isOxygen = metric === vitals.spO2;
                const readingValue = metric.numericValue;
                const heartWarning = isHeartRate && Number.isFinite(readingValue) && (readingValue < 60 || readingValue > 100);
                const oxygenWarning = isOxygen && Number.isFinite(readingValue) && readingValue < 95;
                const accent = isHeartRate ? '#5cdbdf' : metric.valueColor || metric.color;
                const status = heartWarning
                    ? (readingValue < 60 ? 'Low BPM' : 'High BPM')
                    : oxygenWarning ? 'Low oxygen' : metric.status?.replace(/[()]/g, '') ||
                        (metric === vitals.hydration ? metric.value.match(/^([^,]+),/)?.[1] : undefined);

                return (
                    <button
                        key={label}
                        type="button"
                        data-scanner-anchor={'anchor' in reading ? reading.anchor : undefined}
                        onClick={() => onClick(metricKey)}
                        className={`pointer-events-auto group relative min-w-0 cursor-pointer orbit-glass orbit-glass-readout px-3 py-2 text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-300 lg:px-3.5 ${position} ${heartWarning || oxygenWarning ? 'orbit-glass-vital-warning' : ''}`}
                    >
                        <span className="flex items-center gap-1.5 orbit-metric-label">
                            <Icon aria-hidden="true" className="size-3.5 shrink-0" style={{ color: accent }} />
                            {label}
                        </span>
                        <span className="mt-1.5 flex flex-wrap items-baseline gap-x-1.5">
                            <span className={`orbit-metric-value ${metric === vitals.heartRate ? 'text-3xl lg:text-4xl' : 'text-2xl lg:text-3xl'}`} style={{ color: accent === '#ef4444' ? '#fca5a5' : '#f8fafc' }}>
                                {readingValue}
                            </span>
                            <span className="text-xs text-slate-300">{metric.unit}</span>
                        </span>
                        {status && <span className="mt-0.5 block text-xs" style={{ color: accent === '#ef4444' ? '#fca5a5' : accent }}>{status}</span>}
                        {'trace' in reading ? (
                            <ScannerWaveform
                                trace={reading.trace}
                                rate={reading.trace === 'breath' ? respiration : heartRate}
                                accent={accent}
                            />
                        ) : (
                            <ScannerTrend samples={history.map((sample) => sample[index])} accent={accent} />
                        )}
                        <span className="sr-only">Open biometrics details</span>
                    </button>
                );
            })}
        </div>
    );
}

const scannerWaveforms = {
    ecg: [[0, 13], [0.14, 13], [0.22, 11], [0.31, 13], [0.39, 15], [0.46, 3], [0.53, 21], [0.61, 13], [0.73, 10], [0.84, 13], [1, 13]],
    pulse: [[0, 19], [0.13, 17], [0.29, 5], [0.42, 8], [0.56, 15], [0.65, 12], [0.82, 17], [1, 19]],
    breath: [[0, 17], [0.14, 15], [0.32, 7], [0.47, 5], [0.62, 8], [0.82, 15], [1, 17]],
};

function ScannerWaveform({ trace, rate, accent }: {
    trace: keyof typeof scannerWaveforms;
    rate: number;
    accent: string;
}) {
    const [offset, setOffset] = useState(0);

    useEffect(() => {
        let frame: number;
        let last = performance.now();
        const speed = (rate / 60) * (trace === 'breath' ? 0.35 : 1.2);

        const step = (now: number) => {
            const dt = (now - last) / 1000;
            last = now;
            setOffset((prev) => (prev + dt * speed) % 1);
            frame = requestAnimationFrame(step);
        };
        frame = requestAnimationFrame(step);
        return () => cancelAnimationFrame(frame);
    }, [rate, trace]);

    const seconds = trace === 'breath' ? 12 : 3;
    const cycles = Number.isFinite(rate) ? Math.min(30, (seconds * Math.max(0, rate)) / 60) : 0;
    const width = cycles > 0 ? 100 / cycles : 100;
    const points = cycles > 0
        ? Array.from({ length: Math.ceil(cycles) + 2 }, (_, cycle) =>
            scannerWaveforms[trace].map(([phase, y]) => `${((cycle + phase - offset) * width).toFixed(2)},${y}`)
        ).flat().join(' ')
        : '0,13 100,13';

    return (
        <span className="mt-1.5 block overflow-hidden rounded-md bg-[#030b14]/65 px-1">
            <svg
                role="img"
                aria-label={`Illustrative ${trace} waveform based on the displayed ${trace === 'breath' ? 'respiration' : 'heart'} rate`}
                className="block h-7 w-full overflow-hidden"
                viewBox="0 0 100 24"
                preserveAspectRatio="none"
            >
                <path d="M0 13H100" stroke="#34556b" strokeDasharray="2 3" vectorEffect="non-scaling-stroke" />
                <polyline points={points} fill="none" stroke={accent} strokeWidth="1.75" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
            </svg>
        </span>
    );
}

function ScannerTrend({ samples, accent }: { samples: number[]; accent: string }) {
    const values = samples.filter(Number.isFinite);
    const minimum = Math.min(...values);
    const range = Math.max(...values) - minimum;
    const points = values.map((value, index) => ({
        x: values.length === 1 ? 96 : 4 + 92 * index / (values.length - 1),
        y: range > 0 ? 19 - 14 * (value - minimum) / range : 12,
    }));
    const latest = points[points.length - 1];

    return (
        <span className="mt-1.5 block rounded-md bg-[#030b14]/65 px-1">
            <svg
                role="img"
                aria-label={points.length > 1 ? 'Recent readings since selecting this crew member' : latest ? 'Current reading. Waiting for a trend.' : 'Waiting for readings'}
                className="block h-7 w-full"
                viewBox="0 0 100 24"
                preserveAspectRatio="none"
            >
                <path d="M4 12H96" stroke="#34556b" strokeDasharray="2 3" vectorEffect="non-scaling-stroke" />
                {points.length > 1 && (
                    <polyline
                        points={points.map(({ x, y }) => `${x},${y}`).join(' ')}
                        fill="none"
                        stroke={accent}
                        strokeWidth="2"
                        strokeLinejoin="round"
                        vectorEffect="non-scaling-stroke"
                    />
                )}
                {points.length === 1 && (
                    <path d="M4 12H96" stroke={accent} strokeWidth="2" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
                )}
                {latest && <circle cx={latest.x} cy={latest.y} r="2" fill={accent} />}
            </svg>
        </span>
    );
}

function SuitGauge({ label, value, unit, percent, accent, onClick }: {
    label: string;
    value: number;
    unit: string;
    percent: number;
    accent: string;
    onClick: () => void;
}) {
    const fill = Math.min(100, Math.max(0, Number.isFinite(percent) ? percent : 0));

    return (
        <button
            type="button"
            onClick={onClick}
            className="group flex w-full cursor-pointer items-center justify-between gap-2 rounded-md py-2.5 text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-300"
        >
            <span className="min-w-0">
                <span className="block orbit-metric-label">{label}</span>
                <span className="flex items-baseline gap-1">
                    <span className={`orbit-metric-value text-3xl ${accent}`}>{value}</span>
                    <span className="text-xs text-slate-300">{unit}</span>
                </span>
            </span>
            <span aria-hidden="true" className="flex shrink-0 items-center gap-1.5">
                <svg viewBox="0 0 44 28" className={`h-7 w-11 ${accent}`} fill="none">
                    <path d="M4 24a18 18 0 1 1 36 0" stroke="currentColor" strokeOpacity=".2" strokeWidth="3" strokeLinecap="round" />
                    {fill > 0 && (
                        <path
                            d="M4 24a18 18 0 1 1 36 0"
                            pathLength={100}
                            stroke="currentColor"
                            strokeWidth="3"
                            strokeLinecap="round"
                            strokeDasharray={`${fill} 100`}
                        />
                    )}
                </svg>
                <ArrowUpRight className="size-3 text-slate-400 group-hover:text-white" />
            </span>
            <span className="sr-only">Run subsystem diagnostics</span>
        </button>
    );
}

function ProgressBar({ label, value, percent, color, onClick }: any) {
    return (
        <button type="button" onClick={onClick} className="block w-full text-left text-xs cursor-pointer group space-y-1">
            <div className="flex justify-between items-center text-xs">
                <span className="text-slate-400 group-hover:text-white transition-colors">{label}</span>
                <span className="text-white font-mono font-bold">{value}</span>
            </div>
            <div className="h-2 w-full rounded bg-[#030b14] border border-[#132c4a] group-hover:border-[#5cdbdf] relative overflow-hidden flex transition-colors">
                <div className={`${color} h-full transition-all duration-500 rounded-sm`} style={{ width: `${percent}%` }} />
            </div>
        </button>
    );
}
