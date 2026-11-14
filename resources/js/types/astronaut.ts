export interface AstronautBio {
    id: string; // e.g. "AST-01"
    name: string; // e.g. "Commander Alex Vance"
    role: string; // e.g. "Mission Commander"
    mission: string; // e.g. "ODYSSEY II"
    evaStatus: 'ON-GOING' | 'SCHEDULED' | 'STANDBY' | 'COMPLETED' | 'ABORTED';
    age: number;
    gender: string;
    country: string;
    missionDurationDays: number;
    boneDensityLoss: string;
}

export interface VitalMetric {
    title: string;
    value: string;
    numericValue: number;
    unit: string;
    status?: string;
    color: string;
    valueColor?: string;
    type: 'ecg' | 'sine' | 'slow-sine' | 'flat';
    baseline: string;
}

export interface SuitDiagnostics {
    suitPressurePsi: number; // e.g. 4.3 psi
    suitPressurePercent: number; // e.g. 60%
    o2Percent: number; // e.g. 21%
    radiationStatus: string; // e.g. "Safe" or "Elevated"
    radiationPercent: number; // e.g. 85%
    batteryPercent: number; // e.g. 74%
}

export interface MedicalAlert {
    level: 'CRITICAL' | 'WARNING' | 'NOMINAL' | 'INFO';
    title: string;
    description?: string;
    actionsTaken: string[];
    recommendedAction: string;
}

export interface TelemetryLogItem {
    id: string;
    timestamp: string;
    title: string;
    action: string;
    status?: 'RESOLVED' | 'PENDING' | 'IN_PROGRESS';
}

export interface AstronautFullData {
    bio: AstronautBio;
    vitals: {
        heartRate: VitalMetric;
        spO2: VitalMetric;
        coreTemp: VitalMetric;
        respiration: VitalMetric;
        hydration: VitalMetric;
    };
    diagnostics: SuitDiagnostics;
    alerts: MedicalAlert[];
    logs: TelemetryLogItem[];
}

export interface SpaceflightHazardIndicators {
    spaceRadiation: {
        dosimetryRateMsvPerDay: number; // e.g. 0.38 mSv/day
        cumulativeMsv: number;          // e.g. 88 mSv
        reidCancerRiskPercent: number;  // e.g. 1.2% (Ceiling: 3.0%)
        solarStormShelterActive: boolean;
        dosimetryStatus: 'NOMINAL' | 'ELEVATED' | 'CRITICAL';
    };
    isolationConfinement: {
        sleepHours: number;             // e.g. 7.4 hrs
        sleepEfficiencyPercent: number; // e.g. 87%
        pvtReactionLatencyMs: number;   // e.g. 215 ms
        circadianPhaseShiftMins: number;// e.g. +15 mins
        behavioralAlertnessScore: number;// e.g. 8.5 / 10
    };
    distanceFromEarth: {
        oneWayCommDelaySeconds: number; // e.g. 840s (14 mins to Mars)
        distanceMilesMillions: number;  // e.g. 126M miles
        autonomousCareReadiness: number;// e.g. Level 4 (out of 5)
        emergencyEvacPossible: boolean; // false for deep space
    };
    gravityFields: {
        boneDensityLossPercent: number; // e.g. -2.6%
        monthlyLossRatePercent: number; // e.g. -1.1% / mo
        muscleMassLossPercent: number;  // e.g. -2.1%
        opticNerveSheathMm: number;     // e.g. 5.1 mm (SANS threshold > 5.8mm)
        orthostaticHeartRateDeltaBpm: number; // e.g. +18 bpm
        sansRiskLevel: 'CLEAR' | 'GRADE-1' | 'GRADE-2' | 'CRITICAL';
    };
    hostileClosedEnvironment: {
        cabinCo2Pco2Mmhg: number;       // e.g. 1.4 mmHg (< 2.0 nominal)
        cabinAtmospherePressurePsi: number; // e.g. 14.7 psi
        eclssWaterLoopRecoveryPercent: number; // e.g. 98.4%
        immuneSuppressionPercent: number;// e.g. 5.2%
        regolithParticulateMgM3: number;// e.g. 0.02 mg/m3
    };
}

export interface SelfEvaluationCheck {
    visionClarityScore: number;       // 1 - 5 (SANS assessment)
    sleepRestfulnessScore: number;    // 1 - 5 (Isolation & Circadian)
    musculoskeletalStiffnessScore: number; // 1 - 5 (Gravity & BMD)
    fatigueRadiationScore: number;    // 1 - 5 (Radiation systemic)
    respiratoryAirScore: number;      // 1 - 5 (Closed Environment CO2)
    symptomsNotes?: string;
    evaluatedAt: string;
}

export interface CountermeasureAction {
    id: string;
    hazardCode: 'R' | 'I' | 'D' | 'G' | 'E';
    title: string;
    subtitle: string;
    description: string;
    executionProtocol: string;
    estimatedDurationMinutes: number;
    impactSummary: string;
    activeStatus: boolean;
}

export interface ParsedImportPayload {
    sourceType: 'excel' | 'pdf' | 'image' | 'json' | 'csv';
    fileName: string;
    astronautId?: string | number;
    name?: string;
    role?: string;
    mission?: string;
    age?: number;
    gender?: string;
    country?: string;
    evaStatus?: string;
    missionDurationDays?: number;
    noOfMission?: number;
    boneDensityLoss?: string | number;
    muscleMassLoss?: string | number;
    radiationExposure?: number;
    cardioRisk?: number;
    immuneSuppression?: number;
    psychScore?: number;
    vision?: string;
    countermeasures?: string;
    heartRate?: number;
    spO2?: number;
    coreTemp?: number;
    respiration?: number;
    hydration?: number;
    suitPressure?: number;
    o2Level?: number;
    radiation?: string;
    battery?: number;
    conditionNote?: string;
    detectedRows?: any[];
    rawTextPreview?: string;
    imageThumbnail?: string;
    rawRecord?: Record<string, any>;
}
