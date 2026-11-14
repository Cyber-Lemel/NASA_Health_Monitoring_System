import { jsPDF } from 'jspdf';
import React, { useState, useMemo, useEffect } from 'react';
import { Head, Link } from '@inertiajs/react';
import {
    Database,
    ArrowLeft,
    Search,
    Filter,
    Download,
    ArrowUpDown,
    User,
    UserPlus,
    Edit3,
    Trash2,
    Activity,
    Shield,
    Sparkles,
    Calendar,
    Globe,
    Bone,
    FileSpreadsheet,
    FileCode,
    ChevronRight,
    RefreshCw,
    X,
    TrendingDown,
    Clock,
    CheckCircle2,
    AlertTriangle,
    Eye,
    Radio,
    Upload,
    Check,
    CheckSquare,
    Square,
    Zap,
    Moon,
    Compass,
    Orbit,
    Biohazard,
    ExternalLink,
    Info,
    ShieldAlert,
    Layers,
    FileText,
} from 'lucide-react';
import NasaLogo from '@/components/nasa-logo';
import TelemetryImportModal from '@/components/telemetry-import-modal';
import AstronautHealthRiskModal from '@/components/astronaut-health-risk-modal';
import type { ParsedImportPayload } from '@/types/astronaut';
import { toast } from 'sonner';

export interface NasaHazardItem {
    id: number;
    hazard_code: string; // 'R' | 'I' | 'D' | 'G' | 'E'
    hazard_id: string;   // 'HAZ-01' to 'HAZ-05'
    title: string;
    tagline?: string;
    icon?: string;
    category?: string;
    description: string;
    deep_space_context?: string;
    key_risks?: string[];
    biomedical_metrics?: Array<{
        metric: string;
        nominal: string;
        critical: string;
        unit: string;
    }>;
    countermeasures?: Array<{
        name: string;
        status: string;
        desc: string;
    }>;
    hrp_elements?: string[];
    nasa_url: string;
    severity_level: string;
}

export interface DatasetRecordItem {
    id?: number;
    Astronaut?: string | number;
    Name?: string;
    Age_at_mission_start?: number;
    Gender?: string;
    Country?: string;
    'Mission_duration(Days)'?: number;
    No_of_Mission?: number;
    Bone_Density_Loss?: string | number;
    Muscle_Mass_Loss?: string | number;
    Radiation_Exposure?: number;
    Cardiovascular_Risk_Score?: number;
    Immune_Response_Suppression?: number;
    Psychological_Impact_Score?: number;
    Vision_Change?: string;
    Countermeasures_Used?: string;
    Hazard_Focus?: string;
    Risk_Level?: string;
    NASA_HRP_Protocol?: string;
}

interface DatasetProps {
    records: DatasetRecordItem[];
    hazards?: NasaHazardItem[];
}

// Fallback official NASA Human Research Program 5 Hazards Data (https://www.nasa.gov/hrp/hazards/)
const DEFAULT_NASA_HAZARDS: NasaHazardItem[] = [
    {
        id: 1,
        hazard_code: 'R',
        hazard_id: 'HAZ-01',
        title: 'Space Radiation',
        tagline: 'Invisible ionizing particle flux beyond Earth’s protective magnetosphere',
        icon: 'Zap',
        category: 'Deep Space Environment',
        description: "Above Earth's atmosphere and protective magnetic field, astronauts are exposed to galactic cosmic rays (GCR) from outside the solar system and solar particle events (SPE) from solar coronal mass ejections. Deep space radiation consists of high-energy protons and heavy atomic nuclei (HZE ions) that easily penetrate spacecraft aluminum hull shielding and human biological tissue.",
        deep_space_context: "On a 3-year round trip to Mars or deep space lunar missions (Artemis/Gateway), astronauts will encounter cumulative radiation doses up to 100 times higher than typical background radiation on Earth, drastically elevating lifetime cancer mortality and CNS impairment.",
        key_risks: [
            'Increased lifetime risk of exposure-induced death (REID) from lethal carcinomas and leukemia',
            'Damage to the Central Nervous System (CNS) causing cognitive deceleration, memory deficits, and motor decrements',
            'Acute Radiation Sickness (ARS) during high-energy Solar Particle Events (nausea, fatigue, lymphocyte depletion)',
            'Degenerative tissue changes including premature cataractogenesis, cardiovascular endothelial damage, and accelerated arterial stiffening',
        ],
        biomedical_metrics: [
            { metric: 'ISS Ambient Dosimetry', nominal: '0.3 - 0.5 mSv/day', critical: '> 1.0 mSv/day', unit: 'mSv/day' },
            { metric: 'Deep Space / Mars Transit', nominal: '1.0 - 1.8 mSv/day', critical: '> 5.0 mSv/day', unit: 'mSv/day' },
            { metric: 'Solar Particle Event (SPE)', nominal: '< 50 mSv/event', critical: '> 250 mSv/event', unit: 'mSv' },
            { metric: 'Career REID Ceiling', nominal: '< 3.0% mean risk', critical: '≥ 3.0% threshold', unit: '% REID' },
        ],
        countermeasures: [
            { name: 'Hydrogen-Rich Polyethylene & Water Wall Shielding', status: 'Deployed on Orion & Gateway', desc: 'Spacecraft architecture incorporates water storage bladders and low-Z polymer linings to absorb secondary neutron recoil.' },
            { name: 'Solar Storm Haven Configuration', status: 'Operational Protocol', desc: 'During intense coronal mass ejections, crew retreats to innermost fortified equipment lockers surrounded by food and water supplies.' },
            { name: 'Active Crew Dosimetry & Fast Neutron Spectrometers', status: 'Active Monitoring', desc: 'Continuous wearable silicon semiconductor sensors (CPDS/BIRD) providing real-time absorbed dose rate alarms to flight surgeons.' },
            { name: 'Biomedical Radioprotectants & Antioxidant Formulations', status: 'Clinical Research', desc: 'Targeted pharmaceutical scavenging of reactive oxygen species (ROS) and DNA repair up-regulators.' },
        ],
        hrp_elements: ['Space Radiation Element (SR)', 'Human Health Countermeasures (HHC)'],
        nasa_url: 'https://www.nasa.gov/hrp/hazards/',
        severity_level: 'CRITICAL',
    },
    {
        id: 2,
        hazard_code: 'I',
        hazard_id: 'HAZ-02',
        title: 'Isolation and Confinement',
        tagline: 'Psychological and circadian strain of living in cramped habitats with small crews',
        icon: 'Moon',
        category: 'Behavioral Health & Performance',
        description: "Expedition crews are confined to tight habitable modules for months or years, completely isolated from family, friends, natural terrestrial sensory variety, and Earth's normal day-night cycle. The psychological friction of prolonged confinement is one of the highest human risks for deep space transit.",
        deep_space_context: "During an extended Mars mission lasting ~1,000 days, astronauts cannot step outside, have no real-time voice calls with loved ones due to distance latency, and must maintain flawless cooperative team dynamics under high-consequence operational pressure.",
        key_risks: [
            'Severe circadian rhythm desynchronization, chronic sleep debt, and insomnia',
            'Psychological fatigue, depressive/affective episodes, and motivational decline',
            'Interpersonal tension, crew-ground communication friction, and team cohesion breakdown',
            'Impaired psychomotor vigilance, increased operational error rate, and attentional tunneling',
        ],
        biomedical_metrics: [
            { metric: 'Actigraphy Sleep Duration', nominal: '≥ 7.5 hrs/night', critical: '< 6.0 hrs/night', unit: 'hours' },
            { metric: 'Sleep Efficiency Index', nominal: '≥ 85%', critical: '< 75%', unit: '%' },
            { metric: 'PVT (Psychomotor Vigilance) Lapses', nominal: '0 - 1 lapse', critical: '≥ 4 lapses', unit: 'count' },
            { metric: 'Circadian Phase Angle Shift', nominal: '± 30 mins', critical: '> 90 mins', unit: 'minutes' },
        ],
        countermeasures: [
            { name: 'Solid-State Dynamic Spectrum Lighting (SSLA)', status: 'Deployed on ISS', desc: 'Circadian-adjusted blue-enriched LED illumination during morning shifts for alertness, shifting to red-spectrum dimming at night for melatonin synthesis.' },
            { name: 'Mandatory 8-Hour Protected Sleep Schedule', status: 'Mission Rule', desc: 'Strict flight rule adherence prohibiting work intrusions into circadian rest periods with sound-attenuated private quarters.' },
            { name: 'Earth-Ambient VR & Olfactory Nature Stimulation', status: 'Under Testing', desc: 'Immersive sensory stimulation simulations restoring visual, acoustic, and olfactory exposure to natural terrestrial environments.' },
            { name: 'Autonomous Behavioral Health & Mood Tracking', status: 'Active Protocol', desc: 'Standardized computerized cognitive battery and voice stress acoustic analysis for early intervention.' },
        ],
        hrp_elements: ['Behavioral Health & Performance (BHP)', 'Human Factors & Behavioral Performance (HFBP)'],
        nasa_url: 'https://www.nasa.gov/hrp/hazards/',
        severity_level: 'HIGH',
    },
    {
        id: 3,
        hazard_code: 'D',
        hazard_id: 'HAZ-03',
        title: 'Distance from Earth',
        tagline: 'Extreme distance, communication time delay, and the requirement for clinical autonomy',
        icon: 'Compass',
        category: 'Autonomous Exploration Operations',
        description: "As astronauts venture toward the Moon (240,000 miles) and Mars (up to 140-250 million miles), immediate abort to Earth and emergency evacuation become physically impossible. Radio communications experience speed-of-light delays up to 22 minutes each direction, requiring crews to solve complex medical emergencies autonomously.",
        deep_space_context: "If an astronaut develops acute surgical abdomen (e.g. appendicitis), cardiac arrhythmia, or trauma during Mars transit, Mission Control flight surgeons in Houston cannot provide real-time guidance. The crew and onboard AI must independently diagnose and treat.",
        key_risks: [
            'Communication latency up to 44 minutes round-trip preventing real-time Earth medical consultation',
            'Inability to evacuate ill or injured crew members or receive emergency medical supply flights',
            'Accelerated degradation and shelf-life expiration of pharmaceuticals exposed to cosmic radiation',
            'Misdiagnosis or procedural errors during high-stress autonomous clinical procedures',
        ],
        biomedical_metrics: [
            { metric: 'One-Way Light Speed Comm Delay', nominal: '< 1.3 sec (Moon)', critical: '4 - 22 mins (Mars)', unit: 'mins' },
            { metric: 'Round-Trip Telemedicine Latency', nominal: '< 3.0 sec', critical: '8 - 44 mins', unit: 'mins' },
            { metric: 'Clinical Autonomy Readiness Index', nominal: '≥ Level 4', critical: '< Level 3', unit: 'Level (1-5)' },
            { metric: 'Medical Formulary Potency Retention', nominal: '≥ 90%', critical: '< 75%', unit: '% potency' },
        ],
        countermeasures: [
            { name: 'Autonomous Medical Decision Support (ORBIT AI)', status: 'Active Architecture', desc: 'Clinical algorithmic guidance providing immediate differential diagnosis, surgical protocols, and pharmacology recommendations.' },
            { name: 'Exploration Medical Capability (ExMC) System', status: 'In Development', desc: 'Compact modular ultrasound, blood electrolyte analyzers, automated intravenous fluid generators, and sterilization kits.' },
            { name: 'Just-in-Time VR Procedural Clinical Training', status: 'Deployed for Deep Space', desc: 'Interactive virtual reality clinical refreshers allowing astronauts to review emergency procedures immediately before intervention.' },
            { name: 'Radiation-Shielded Pharmaceutical Containment', status: 'Under Qualification', desc: 'Hermetically sealed, temperature-regulated, heavy-shielded formulary pods prolonging drug chemical stability.' },
        ],
        hrp_elements: ['Exploration Medical Capability (ExMC)'],
        nasa_url: 'https://www.nasa.gov/hrp/hazards/',
        severity_level: 'CRITICAL',
    },
    {
        id: 4,
        hazard_code: 'G',
        hazard_id: 'HAZ-04',
        title: 'Gravity Fields (Altered Gravity)',
        tagline: 'Transitions between 0g weightlessness, Moon 1/6g, Mars 3/8g, and Earth 1g',
        icon: 'Orbit',
        category: 'Physiological Countermeasures',
        description: "Astronauts experience dramatic gravitational shifts: high-g launch acceleration, continuous microgravity (0g) during transit, partial gravity on the Moon (1/6g) or Mars (3/8g), and abrupt hypergravity during atmospheric entry. Prolonged unloading causes systemic musculoskeletal deconditioning, fluid redistribution, and cardiovascular atrophy.",
        deep_space_context: "Without constant gravity pulling bodily fluids toward the feet, ~2 liters of interstitial fluid shifts cephalad (headward), expanding the optic nerve sheath and causing SANS (Spaceflight-Associated Neuro-ocular Syndrome). Bones shed calcium into urine, increasing kidney stone risk and fragility fractures.",
        key_risks: [
            'Progressive bone mineral density (BMD) loss of 1.0% to 1.5% per month in weight-bearing skeleton',
            'Disuse muscular atrophy with fast-to-slow muscle fiber transition and loss of postural torque',
            'Spaceflight-Associated Neuro-ocular Syndrome (SANS): optic disc edema, globe flattening, hyperopic vision shift',
            'Orthostatic intolerance and neurovascular syncope upon landing in planetary gravity',
            'Vestibular and sensorimotor ataxia, space motion sickness, and spatial disorientation',
        ],
        biomedical_metrics: [
            { metric: 'Monthly BMD Loss (Weight-Bearing)', nominal: '< -0.8% / mo', critical: '≥ -1.5% / mo', unit: '%/month' },
            { metric: 'Optic Nerve Sheath Diameter (ONSD)', nominal: '4.5 - 5.5 mm', critical: '> 5.8 mm (SANS)', unit: 'mm' },
            { metric: 'Calf Muscle Cross-Sectional Area', nominal: '< -3% loss', critical: '> -8% loss', unit: '% loss' },
            { metric: 'Post-Landing Orthostatic Heart Rate Delta', nominal: '< 25 bpm spike', critical: '≥ 35 bpm (syncope risk)', unit: 'bpm' },
        ],
        countermeasures: [
            { name: 'Advanced Resistive Exercise Device (ARED)', status: 'Operational ISS Gold Standard', desc: 'High-load vacuum cylinder resistance training delivering up to 600 lbs of load daily to mimic heavy 1g squats and deadlifts.' },
            { name: 'T2 Treadmill & Cycle Ergometer with Vibration Isolation (CEVIS)', status: 'Daily Operational Requirement', desc: 'Aerobic cardiovascular conditioning maintaining VO2 max, stroke volume, and arterial baroreflex sensitivity.' },
            { name: 'Lower Body Negative Pressure (LBNP) Suits', status: 'Clinical Validation', desc: 'Suction chambers pulling pooled headward fluids back into the lower pelvis and legs to reverse SANS intracranial hypertension.' },
            { name: 'Bisphosphonate Therapy & Fluid Loading Protocol', status: 'Standard Clinical Protocol', desc: 'Intravenous zoledronic acid preventing osteoclastic resorption combined with isotonic electrolyte rehydration before descent.' },
        ],
        hrp_elements: ['Human Health Countermeasures (HHC)'],
        nasa_url: 'https://www.nasa.gov/hrp/hazards/',
        severity_level: 'CRITICAL',
    },
    {
        id: 5,
        hazard_code: 'E',
        hazard_id: 'HAZ-05',
        title: 'Hostile and Closed Environments',
        tagline: 'Hermetic life support ecology, recycled air/water, altered microbiome, and toxic regolith',
        icon: 'Biohazard',
        category: 'Habitability & Life Support Ecology',
        description: "The spacecraft or extraterrestrial surface habitat is an artificial closed ecosystem. Astronauts continuously breathe recycled atmosphere and drink reclaimed condensation and urine. Mechanical systems, toxic trace contaminants, carbon dioxide accumulation, microbial mutations, and extraterrestrial regolith dust present constant threats.",
        deep_space_context: "In a sealed module, common benign bacteria mutate to become more virulent or antibiotic-resistant while crew immune defenses weaken. Lunar and Martian regolith (fine, jagged, chemically reactive mineral dust) clings to EVA suits, abrades airlocks, and threatens pulmonary health.",
        key_risks: [
            'Carbon dioxide (pCO2) elevation causing hypercapnia, cognitive lethargy, headaches, and visual disturbances',
            'Immune system dysregulation, T-cell suppression, and asymptomatic reactivation of latent viruses (EBV, VZV, CMV)',
            'Microbiome shifts and acceleration of opportunistic microbial biofilm colonization on life support pipes',
            'Pulmonary and ocular inflammation from fine abrasive extraterrestrial dust (lunar/Martian regolith)',
            'Toxic trace volatile organic chemical buildup from habitat outgassing and life support malfunctions',
        ],
        biomedical_metrics: [
            { metric: 'Cabin Carbon Dioxide Partial Pressure', nominal: '< 2.0 mmHg', critical: '≥ 3.0 mmHg (Toxicity)', unit: 'mmHg' },
            { metric: 'Atmospheric Cabin Pressure', nominal: '14.7 psi (101.3 kPa)', critical: '< 10.2 psi (Hypoxia)', unit: 'psi' },
            { metric: 'ECLSS Water Recycling Recovery Rate', nominal: '≥ 98.0%', critical: '< 90.0%', unit: '% recovery' },
            { metric: 'Airborne Particulate Dust Concentration', nominal: '< 0.05 mg/m³', critical: '> 0.3 mg/m³', unit: 'mg/m³' },
            { metric: 'Latent Viral Reactivation Shedding', nominal: 'Negative / Undetectable', critical: 'Positive High Titer', unit: 'copies/mL' },
        ],
        countermeasures: [
            { name: 'ECLSS Regenerative Sabatier & Carbon Dioxide Scrubbing', status: 'Operational Station Subsystem', desc: 'Thermal catalytic Sabatier reactors and Rapid Cycling Amine (RCA) adsorbents recovering breathable oxygen from CO2.' },
            { name: 'Trace Contaminant Control Subsystem (TCCS) & HEPA Filtration', status: 'Continuous Scrubbing', desc: 'High-temperature catalytic oxidizers and activated carbon beds eliminating volatile organic compounds and airborne spores.' },
            { name: 'Electrostatic & Magnetic Regolith Mitigation Airlocks', status: 'Artemis Surface Hardware', desc: 'Active dust repelling shields and vacuum airlocks preventing toxic extraterrestrial dust intrusion into living quarters.' },
            { name: 'Microbial DNA Rapid Sequencing & Potable Water Disinfection', status: 'Operational Biomolecular Sequencer', desc: 'Nanopore in-flight sequencing identifying bacterial mutations and silver-ion biocides preventing water pipeline biofilms.' },
        ],
        hrp_elements: ['Environmental Control and Life Support Systems (ECLSS)', 'Immunology Element'],
        nasa_url: 'https://www.nasa.gov/hrp/hazards/',
        severity_level: 'HIGH',
    },
];

export default function Dataset({ records = [], hazards = [] }: DatasetProps) {
    // Local editable records state
    const [localRecords, setLocalRecords] = useState<DatasetRecordItem[]>(records);

    // Active NASA hazards dataset
    const activeHazards = useMemo(() => {
        return hazards && hazards.length > 0 ? hazards : DEFAULT_NASA_HAZARDS;
    }, [hazards]);

    // Sync local records if Inertia server prop updates
    useEffect(() => {
        if (records && Array.isArray(records)) {
            setLocalRecords(records);
        }
    }, [records]);

    // Search and filter states
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedGender, setSelectedGender] = useState<string>('all');
    const [selectedCountry, setSelectedCountry] = useState<string>('all');
    const [selectedHazardFilter, setSelectedHazardFilter] = useState<string>('all');
    const [sortField, setSortField] = useState<string>('id');
    const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

    // Selection state for bulk operations
    const [selectedIds, setSelectedIds] = useState<(string | number)[]>([]);

    // Modals
    const [selectedAstronaut, setSelectedAstronaut] = useState<DatasetRecordItem | null>(null);
    const [selectedHazardModal, setSelectedHazardModal] = useState<NasaHazardItem | null>(null);
    const [isImportModalOpen, setIsImportModalOpen] = useState(false);
    const [isManualAddOpen, setIsManualAddOpen] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [editingRecord, setEditingRecord] = useState<DatasetRecordItem | null>(null);
    const [deletingRecord, setDeletingRecord] = useState<DatasetRecordItem | null>(null);
    const [isBulkDeleteConfirmOpen, setIsBulkDeleteConfirmOpen] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isHealthRiskOpen, setIsHealthRiskOpen] = useState(false);
    const [healthRiskAstronaut, setHealthRiskAstronaut] = useState<any>(null);

    // Form state for Manual Add
    const [manualForm, setManualForm] = useState({
        Astronaut: '',
        Name: '',
        Age_at_mission_start: 45,
        Gender: 'Male',
        Country: 'USA / NASA',
        'Mission_duration(Days)': 180,
        No_of_Mission: 2,
        Bone_Density_Loss: '-3.2%',
        Muscle_Mass_Loss: '2.5%',
        Radiation_Exposure: 95,
        Cardiovascular_Risk_Score: 4,
        Immune_Response_Suppression: 6.5,
        Psychological_Impact_Score: 3,
        Vision_Change: 'Clear',
        Countermeasures_Used: 'ARED Resistive Exercise, Bisphosphonates',
        Hazard_Focus: 'Gravity Fields (G)',
        Risk_Level: 'Nominal',
        NASA_HRP_Protocol: 'NASA-STD-3001',
    });

    // Form state for Edit Record
    const [editForm, setEditForm] = useState({
        Astronaut: '' as string | number,
        Name: '',
        Age_at_mission_start: 40,
        Gender: 'Male',
        Country: 'USA / NASA',
        'Mission_duration(Days)': 180,
        No_of_Mission: 1,
        Bone_Density_Loss: '-3.0%',
        Muscle_Mass_Loss: '2.5%',
        Radiation_Exposure: 95,
        Cardiovascular_Risk_Score: 6,
        Immune_Response_Suppression: 7.5,
        Psychological_Impact_Score: 4,
        Vision_Change: 'Clear',
        Countermeasures_Used: 'ARED Resistive Exercise, Bisphosphonates',
        Hazard_Focus: 'Gravity Fields (G)',
        Risk_Level: 'Nominal',
        NASA_HRP_Protocol: 'NASA-STD-3001',
    });

    // Live UTC Clock
    const [utcTimeStr, setUtcTimeStr] = useState<string>('00:00:00 UTC');
    useEffect(() => {
        const updateClock = () => {
            const now = new Date();
            setUtcTimeStr(
                now.toLocaleTimeString('en-US', {
                    timeZone: 'UTC',
                    hour12: false,
                    hour: '2-digit',
                    minute: '2-digit',
                    second: '2-digit',
                }) + ' UTC'
            );
        };
        updateClock();
        const timer = setInterval(updateClock, 1000);
        return () => clearInterval(timer);
    }, []);

    // Close modals on Escape
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                setSelectedAstronaut(null);
                setSelectedHazardModal(null);
                setIsManualAddOpen(false);
                setIsEditModalOpen(false);
                setDeletingRecord(null);
                setIsBulkDeleteConfirmOpen(false);
                setIsImportModalOpen(false);
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, []);

    // Distinct countries for filter dropdown
    const countries = useMemo(() => {
        const set = new Set<string>();
        localRecords.forEach((r) => {
            if (r.Country) set.add(r.Country);
        });
        return Array.from(set).sort();
    }, [localRecords]);

    // Analytics metrics calculated from localRecords
    const metrics = useMemo(() => {
        if (!localRecords.length) {
            return {
                totalCount: 0,
                avgDuration: 0,
                maxDuration: 0,
                avgAge: 0,
                avgBoneLoss: -3.2,
                avgRadiation: 105,
                distinctCountries: 0,
            };
        }

        let totalDuration = 0;
        let maxDuration = 0;
        let totalAge = 0;
        let totalBoneLoss = 0;
        let validBoneLossCount = 0;
        let totalRad = 0;
        let validRadCount = 0;

        localRecords.forEach((r) => {
            const dur = Number(r['Mission_duration(Days)'] ?? (r as any).duration ?? (r as any).missionDurationDays ?? (r as any).Mission_duration) || 0;
            totalDuration += dur;
            if (dur > maxDuration) maxDuration = dur;

            const age = Number(r.Age_at_mission_start ?? (r as any).age ?? (r as any).Age) || 0;
            totalAge += age;

            if (r.Bone_Density_Loss !== undefined && r.Bone_Density_Loss !== null) {
                const numeric = parseFloat(String(r.Bone_Density_Loss).replace('%', ''));
                if (!isNaN(numeric)) {
                    totalBoneLoss += numeric;
                    validBoneLossCount++;
                }
            }

            if (r.Radiation_Exposure) {
                totalRad += Number(r.Radiation_Exposure);
                validRadCount++;
            }
        });

        return {
            totalCount: localRecords.length,
            avgDuration: Math.round(totalDuration / localRecords.length),
            maxDuration,
            avgAge: +(totalAge / localRecords.length).toFixed(1),
            avgBoneLoss: validBoneLossCount > 0 ? +(totalBoneLoss / validBoneLossCount).toFixed(2) : -3.2,
            avgRadiation: validRadCount > 0 ? Math.round(totalRad / validRadCount) : 108,
            distinctCountries: countries.length || 1,
        };
    }, [localRecords, countries]);

    // Filter and sort records
    const filteredRecords = useMemo(() => {
        return localRecords
            .filter((item) => {
                const q = searchQuery.toLowerCase().trim();
                const idStr = String(item.Astronaut ?? item.id ?? '').toLowerCase();
                const nameStr = String(item.Name ?? '').toLowerCase();
                const countryStr = String(item.Country ?? '').toLowerCase();
                const hazardStr = String(item.Hazard_Focus ?? '').toLowerCase();

                const matchesSearch = !q || nameStr.includes(q) || idStr.includes(q) || countryStr.includes(q) || hazardStr.includes(q);

                const matchesGender =
                    selectedGender === 'all' ||
                    (item.Gender && item.Gender.toLowerCase() === selectedGender.toLowerCase());

                const matchesCountry =
                    selectedCountry === 'all' ||
                    (item.Country && item.Country.toLowerCase() === selectedCountry.toLowerCase());

                const matchesHazard =
                    selectedHazardFilter === 'all' ||
                    (item.Hazard_Focus && item.Hazard_Focus.toLowerCase().includes(selectedHazardFilter.toLowerCase()));

                return matchesSearch && matchesGender && matchesCountry && matchesHazard;
            })
            .sort((a, b) => {
                let valA: any = '';
                let valB: any = '';

                switch (sortField) {
                    case 'id':
                        valA = Number(a.Astronaut ?? a.id ?? 0);
                        valB = Number(b.Astronaut ?? b.id ?? 0);
                        break;
                    case 'name':
                        valA = (a.Name || '').toLowerCase();
                        valB = (b.Name || '').toLowerCase();
                        break;
                    case 'age':
                        valA = Number(a.Age_at_mission_start ?? (a as any).age ?? 0);
                        valB = Number(b.Age_at_mission_start ?? (b as any).age ?? 0);
                        break;
                    case 'duration':
                        valA = Number(a['Mission_duration(Days)'] ?? (a as any).duration ?? 0);
                        valB = Number(b['Mission_duration(Days)'] ?? (b as any).duration ?? 0);
                        break;
                    case 'boneLoss':
                        valA = parseFloat(String(a.Bone_Density_Loss || '0').replace('%', ''));
                        valB = parseFloat(String(b.Bone_Density_Loss || '0').replace('%', ''));
                        break;
                    case 'radiation':
                        valA = Number(a.Radiation_Exposure ?? 0);
                        valB = Number(b.Radiation_Exposure ?? 0);
                        break;
                    default:
                        valA = Number(a.Astronaut ?? a.id ?? 0);
                        valB = Number(b.Astronaut ?? b.id ?? 0);
                }

                if (valA < valB) return sortOrder === 'asc' ? -1 : 1;
                if (valA > valB) return sortOrder === 'asc' ? 1 : -1;
                return 0;
            });
    }, [localRecords, searchQuery, selectedGender, selectedCountry, selectedHazardFilter, sortField, sortOrder]);

    const handleSort = (field: string) => {
        if (sortField === field) {
            setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
        } else {
            setSortField(field);
            setSortOrder('asc');
        }
    };

    const resetFilters = () => {
        setSearchQuery('');
        setSelectedGender('all');
        setSelectedCountry('all');
        setSelectedHazardFilter('all');
        setSortField('id');
        setSortOrder('asc');
        toast.info('Telemetry dataset filters reset to default');
    };

    // Row selection toggles
    const isAllSelected =
        filteredRecords.length > 0 &&
        filteredRecords.every((r) => selectedIds.includes(r.Astronaut ?? r.id ?? ''));

    const toggleSelectAll = () => {
        if (isAllSelected) {
            const currentIds = new Set(filteredRecords.map((r) => r.Astronaut ?? r.id ?? ''));
            setSelectedIds((prev) => prev.filter((id) => !currentIds.has(id)));
        } else {
            const newIds = filteredRecords.map((r) => r.Astronaut ?? r.id ?? '');
            setSelectedIds((prev) => Array.from(new Set([...prev, ...newIds])));
        }
    };

    const toggleSelectRow = (id: string | number) => {
        setSelectedIds((prev) =>
            prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
        );
    };

    // Export helpers
    const exportDataToCsv = (items: DatasetRecordItem[], filename: string) => {
        if (!items.length) {
            toast.warning('No records to export');
            return;
        }

        const headers = [
            'Astronaut',
            'Name',
            'Age_at_mission_start',
            'Gender',
            'Country',
            'Mission_duration(Days)',
            'No_of_Mission',
            'Bone_Density_Loss',
            'Muscle_Mass_Loss',
            'Radiation_Exposure',
            'Cardiovascular_Risk_Score',
            'Immune_Response_Suppression',
            'Psychological_Impact_Score',
            'Vision_Change',
            'Countermeasures_Used',
            'Hazard_Focus',
            'Risk_Level',
            'NASA_HRP_Protocol',
        ];

        const csvRows = [
            headers.join(','),
            ...items.map((r) =>
                [
                    r.Astronaut ?? r.id ?? '',
                    `"${(r.Name || '').replace(/"/g, '""')}"`,
                    r.Age_at_mission_start ?? (r as any).age ?? '',
                    `"${r.Gender || ''}"`,
                    `"${(r.Country || '').replace(/"/g, '""')}"`,
                    r['Mission_duration(Days)'] ?? (r as any).duration ?? '',
                    r.No_of_Mission ?? 1,
                    `"${r.Bone_Density_Loss || ''}"`,
                    `"${r.Muscle_Mass_Loss || ''}"`,
                    r.Radiation_Exposure ?? '',
                    r.Cardiovascular_Risk_Score ?? '',
                    r.Immune_Response_Suppression ?? '',
                    r.Psychological_Impact_Score ?? '',
                    `"${(r.Vision_Change || '').replace(/"/g, '""')}"`,
                    `"${(r.Countermeasures_Used || '').replace(/"/g, '""')}"`,
                    `"${(r.Hazard_Focus || '').replace(/"/g, '""')}"`,
                    `"${(r.Risk_Level || '').replace(/"/g, '""')}"`,
                    `"${(r.NASA_HRP_Protocol || '').replace(/"/g, '""')}"`,
                ].join(',')
            ),
        ];

        const blob = new Blob([csvRows.join('\n')], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.setAttribute('href', url);
        link.setAttribute('download', filename);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const exportDataToJson = (items: DatasetRecordItem[], filename: string) => {
        if (!items.length) {
            toast.warning('No records to export');
            return;
        }
        const jsonStr = JSON.stringify(
            {
                agency: 'NASA Human Research Program (HRP)',
                classification: 'UNCLASSIFIED // NASA SPACEFLIGHT ARCHIVE',
                reference: 'https://www.nasa.gov/hrp/hazards/',
                exported_at: new Date().toISOString(),
                record_count: items.length,
                records: items,
            },
            null,
            2
        );
        const blob = new Blob([jsonStr], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.setAttribute('href', url);
        link.setAttribute('download', filename);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const exportAllCsv = () => {
        exportDataToCsv(localRecords, `NASA_HRP_5Hazards_Telemetry_${Date.now()}.csv`);
        toast.success(`Exported ${localRecords.length} records to CSV`);
    };

    const exportAllJson = () => {
        exportDataToJson(localRecords, `NASA_HRP_5Hazards_Telemetry_${Date.now()}.json`);
        toast.success(`Exported ${localRecords.length} records to JSON`);
    };

    const exportSelectedCsv = () => {
        const selectedItems = localRecords.filter((r) => selectedIds.includes(r.Astronaut ?? r.id ?? ''));
        exportDataToCsv(selectedItems, `NASA_HRP_Selected_${selectedItems.length}_Crew_${Date.now()}.csv`);
        toast.success(`Exported ${selectedItems.length} selected records to CSV`);
    };

    const exportSelectedJson = () => {
        const selectedItems = localRecords.filter((r) => selectedIds.includes(r.Astronaut ?? r.id ?? ''));
        exportDataToJson(selectedItems, `NASA_HRP_Selected_${selectedItems.length}_Crew_${Date.now()}.json`);
        toast.success(`Exported ${selectedItems.length} selected records to JSON`);
    };

    const exportDataToPdf = (items: DatasetRecordItem[], filename: string) => {
    if (!items.length) {
        toast.warning('No records to export');
        return;
    }

    const doc = new jsPDF({ orientation: 'landscape' });
    const cols = [
        { h: 'ID', w: 18 },
        { h: 'Name', w: 52 },
        { h: 'Hazard', w: 52 },
        { h: 'Risk', w: 24 },
        { h: 'Days', w: 18 },
        { h: 'BMD loss', w: 24 },
        { h: 'Radiation', w: 28 },
        { h: 'Agency', w: 61 },
    ];
    const left = 10;

    // Shorten text so it fits its column
    const fit = (text: string, w: number) => {
        let t = text;
        while (t.length > 1 && doc.getTextWidth(t) > w - 2) t = t.slice(0, -1);
        return t === text ? text : `${t.slice(0, -1)}...`;
    };

    const drawHeader = (y: number) => {
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(9);
        let x = left;
        cols.forEach((c) => {
            doc.text(c.h, x, y);
            x += c.w;
        });
        doc.line(left, y + 2, left + 277, y + 2);
        doc.setFont('helvetica', 'normal');
    };

    doc.setFontSize(16);
    doc.text('NASA HRP Astronaut Telemetry Dataset', left, 16);
    doc.setFontSize(9);
    doc.text(`Exported ${new Date().toLocaleString()} - ${items.length} records`, left, 22);

    let y = 32;
    drawHeader(y);
    y += 8;

    items.forEach((r) => {
        if (y > 195) {
            doc.addPage();
            y = 16;
            drawHeader(y);
            y += 8;
        }
        const row = [
            `AST-${r.Astronaut ?? r.id ?? ''}`,
            r.Name || '',
            r.Hazard_Focus || '',
            r.Risk_Level || 'Nominal',
            String(r['Mission_duration(Days)'] ?? (r as any).duration ?? ''),
            String(r.Bone_Density_Loss ?? ''),
            r.Radiation_Exposure ? `${r.Radiation_Exposure} mSv` : '',
            r.Country || '',
        ];
        doc.setFontSize(8);
        let x = left;
        row.forEach((cell, i) => {
            doc.text(fit(cell, cols[i].w), x, y);
            x += cols[i].w;
        });
        y += 6;
    });

    doc.save(filename);
};

const exportAllPdf = () => {
    exportDataToPdf(localRecords, `NASA_HRP_5Hazards_Telemetry_${Date.now()}.pdf`);
    toast.success(`Exported ${localRecords.length} records to PDF`);
};

const exportSelectedPdf = () => {
    const selectedItems = localRecords.filter((r) => selectedIds.includes(r.Astronaut ?? r.id ?? ''));
    exportDataToPdf(selectedItems, `NASA_HRP_Selected_${selectedItems.length}_Crew_${Date.now()}.pdf`);
    toast.success(`Exported ${selectedItems.length} selected records to PDF`);
};

    

    // Helper for BMD badge
    const getBoneLossBadge = (lossVal?: string | number) => {
    if (lossVal === undefined || lossVal === null || lossVal === '') {
        return { text: 'N/A', color: 'text-slate-400 bg-slate-800/50 border-slate-700' };
    }
    const str = String(lossVal);
    const num = parseFloat(str.replace('%', ''));
    const display = str.includes('%') ? str : `${num}%`;
    if (num <= -4.0) return { text: display, color: 'text-red-300 bg-red-500/10 border-red-500/30' };
    if (num <= -2.5) return { text: display, color: 'text-amber-300 bg-amber-400/10 border-amber-400/30' };
    return { text: display, color: 'text-emerald-300 bg-emerald-400/10 border-emerald-400/30' };
};

const HAZARD_STYLES: Record<string, { text: string; color: string }> = {
    R: { text: 'Radiation', color: 'text-red-300 bg-red-500/10 border-red-500/30' },
    I: { text: 'Isolation', color: 'text-purple-300 bg-purple-400/10 border-purple-400/30' },
    D: { text: 'Distance', color: 'text-amber-300 bg-amber-400/10 border-amber-400/30' },
    G: { text: 'Gravity', color: 'text-sky-300 bg-sky-400/10 border-sky-400/30' },
    E: { text: 'Closed env.', color: 'text-emerald-300 bg-emerald-400/10 border-emerald-400/30' },
};

const getHazardBadge = (hazardFocus?: string) => {
    const h = (hazardFocus || 'Gravity Fields (G)').toUpperCase();
    const code =
        h.match(/\(([RIDGE])\)/)?.[1] ??
        (h.includes('RADIATION') ? 'R' : h.includes('ISOLATION') ? 'I' : h.includes('DISTANCE') ? 'D' : h.includes('ENVIRONMENT') ? 'E' : 'G');
    return { code, ...HAZARD_STYLES[code] };
};

const getRiskLevelBadge = (level?: string) => {
    const lvl = (level || 'Nominal').toUpperCase();
    if (['ELEVATED', 'HIGH', 'CRITICAL'].includes(lvl)) return 'text-red-300 bg-red-500/10 border-red-500/30';
    if (['GUARDED', 'MODERATE', 'WARNING'].includes(lvl)) return 'text-amber-300 bg-amber-400/10 border-amber-400/30';
    return 'text-emerald-300 bg-emerald-400/10 border-emerald-400/30';
};

    // API: Manual Add Astronaut
    const handleManualAddSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        try {
            const res = await fetch('/api/dataset/records', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Accept: 'application/json',
                },
                body: JSON.stringify(manualForm),
            });
            const data = await res.json();
            if (!res.ok || !data.success) {
                throw new Error(data.message || 'Failed to create astronaut record');
            }

            if (data.records) {
                setLocalRecords(data.records);
            } else if (data.record) {
                setLocalRecords((prev) => [...prev, data.record]);
            }
            toast.success(`Astronaut ${data.record?.Name || manualForm.Name} added directly to database!`);
            setIsManualAddOpen(false);
            setManualForm({
                Astronaut: '',
                Name: '',
                Age_at_mission_start: 45,
                Gender: 'Male',
                Country: 'USA / NASA',
                'Mission_duration(Days)': 180,
                No_of_Mission: 2,
                Bone_Density_Loss: '-3.2%',
                Muscle_Mass_Loss: '2.5%',
                Radiation_Exposure: 95,
                Cardiovascular_Risk_Score: 4,
                Immune_Response_Suppression: 6.5,
                Psychological_Impact_Score: 3,
                Vision_Change: 'Clear',
                Countermeasures_Used: 'ARED Resistive Exercise, Bisphosphonates',
                Hazard_Focus: 'Gravity Fields (G)',
                Risk_Level: 'Nominal',
                NASA_HRP_Protocol: 'NASA-STD-3001',
            });
        } catch (err: any) {
            toast.error(err.message || 'Failed to add astronaut record');
        } finally {
            setIsSubmitting(false);
        }
    };

    // Open Edit Modal
    const handleOpenEdit = (record: DatasetRecordItem) => {
        setEditingRecord(record);
        setEditForm({
            Astronaut: record.Astronaut ?? record.id ?? '',
            Name: record.Name || '',
            Age_at_mission_start: Number(record.Age_at_mission_start ?? (record as any).age ?? (record as any).Age) || 40,
            Gender: record.Gender || 'Male',
            Country: record.Country || 'USA / NASA',
            'Mission_duration(Days)': Number(record['Mission_duration(Days)'] ?? (record as any).duration ?? (record as any).missionDurationDays ?? (record as any).Mission_duration) || 180,
            No_of_Mission: Number(record.No_of_Mission) || 1,
            Bone_Density_Loss: String(record.Bone_Density_Loss ?? '-3.0%'),
            Muscle_Mass_Loss: String(record.Muscle_Mass_Loss ?? '2.5%'),
            Radiation_Exposure: Number(record.Radiation_Exposure) || 95,
            Cardiovascular_Risk_Score: Number(record.Cardiovascular_Risk_Score) || 4,
            Immune_Response_Suppression: Number(record.Immune_Response_Suppression) || 6.5,
            Psychological_Impact_Score: Number(record.Psychological_Impact_Score) || 3,
            Vision_Change: record.Vision_Change || 'Clear',
            Countermeasures_Used: record.Countermeasures_Used || 'ARED Resistive Exercise, Bisphosphonates',
            Hazard_Focus: record.Hazard_Focus || 'Gravity Fields (G)',
            Risk_Level: record.Risk_Level || 'Nominal',
            NASA_HRP_Protocol: record.NASA_HRP_Protocol || 'NASA-STD-3001',
        });
        setIsEditModalOpen(true);
    };

    // API: Save Edit Record
    const handleEditSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingRecord) return;
        setIsSubmitting(true);
        const astronautId = editingRecord.Astronaut ?? editingRecord.id;

        try {
            const res = await fetch(`/api/dataset/records/${astronautId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    Accept: 'application/json',
                },
                body: JSON.stringify(editForm),
            });
            const data = await res.json();
            if (!res.ok || !data.success) {
                throw new Error(data.message || 'Failed to update astronaut record');
            }

            if (data.records) {
                setLocalRecords(data.records);
            } else if (data.record) {
                setLocalRecords((prev) =>
                    prev.map((r) => ((r.Astronaut ?? r.id) === astronautId ? data.record : r))
                );
            }
            toast.success(`Astronaut ${data.record?.Name || editForm.Name} updated successfully`);
            setIsEditModalOpen(false);
            setEditingRecord(null);
        } catch (err: any) {
            toast.error(err.message || 'Failed to update astronaut record');
        } finally {
            setIsSubmitting(false);
        }
    };

    // API: Delete Single Record
    const handleConfirmDelete = async () => {
        if (!deletingRecord) return;
        setIsSubmitting(true);
        const astronautId = deletingRecord.Astronaut ?? deletingRecord.id;

        try {
            const res = await fetch(`/api/dataset/records/${astronautId}`, {
                method: 'DELETE',
                headers: {
                    Accept: 'application/json',
                },
            });
            const data = await res.json();
            if (!res.ok || !data.success) {
                throw new Error(data.message || 'Failed to delete astronaut record');
            }

            if (data.records) {
                setLocalRecords(data.records);
            } else {
                setLocalRecords((prev) => prev.filter((r) => (r.Astronaut ?? r.id) !== astronautId));
            }
            setSelectedIds((prev) => prev.filter((id) => id !== astronautId));
            toast.success(`Astronaut ${deletingRecord.Name || astronautId} deleted from database`);
            setDeletingRecord(null);
        } catch (err: any) {
            toast.error(err.message || 'Failed to delete record');
        } finally {
            setIsSubmitting(false);
        }
    };

    // API: Bulk Delete Selected Records
    const handleConfirmBulkDelete = async () => {
        if (!selectedIds.length) return;
        setIsSubmitting(true);
        try {
            const res = await fetch('/api/dataset/records/bulk-delete', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Accept: 'application/json',
                },
                body: JSON.stringify({ ids: selectedIds }),
            });
            const data = await res.json();
            if (!res.ok || !data.success) {
                throw new Error(data.message || 'Failed to bulk-delete records');
            }

            if (data.records) {
                setLocalRecords(data.records);
            } else {
                const deletedSet = new Set(selectedIds);
                setLocalRecords((prev) => prev.filter((r) => !deletedSet.has(r.Astronaut ?? r.id ?? '')));
            }
            toast.success(`Successfully deleted ${data.count || selectedIds.length} astronaut record(s)`);
            setSelectedIds([]);
            setIsBulkDeleteConfirmOpen(false);
        } catch (err: any) {
            toast.error(err.message || 'Bulk deletion failed');
        } finally {
            setIsSubmitting(false);
        }
    };

    // API: Save Scan / Telemetry Import to Database
    const handleSaveImportToDatabase = async (data: ParsedImportPayload) => {
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
            Hazard_Focus: (data.rawRecord as any)?.Hazard_Focus || 'Gravity Fields (G)',
            Risk_Level: (data.rawRecord as any)?.Risk_Level || 'Nominal',
            NASA_HRP_Protocol: (data.rawRecord as any)?.NASA_HRP_Protocol || 'NASA-STD-3001',
            ...(data.rawRecord || {}),
        };

        const payload =
            data.detectedRows && data.detectedRows.length > 0
                ? { detectedRows: data.detectedRows }
                : { record: recordPayload };

        const res = await fetch('/api/dataset/import', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Accept: 'application/json',
            },
            body: JSON.stringify(payload),
        });

        const resJson = await res.json();
        if (!res.ok || !resJson.success) {
            throw new Error(resJson.message || 'Database import failed');
        }

        if (resJson.records) {
            setLocalRecords(resJson.records);
        }
        toast.success(`Database updated: ${resJson.count || 1} astronaut record(s) saved directly!`);
    };

    const hasActiveFilters = searchQuery !== '' || selectedGender !== 'all' || selectedCountry !== 'all' || selectedHazardFilter !== 'all';

        const card = 'rounded-2xl border border-slate-800 bg-[#0b1626]';
    const inputCls = 'w-full rounded-xl border border-slate-700 bg-[#0a1220] px-3 py-2.5 text-sm text-white outline-none placeholder:text-slate-600 focus:border-cyan-400';
    const labelCls = 'mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-400';
    const btn = 'inline-flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-slate-700 bg-slate-800/50 px-4 py-2.5 text-sm font-semibold text-slate-200 transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50';
    const btnPrimary = 'inline-flex cursor-pointer items-center justify-center gap-2 rounded-xl bg-cyan-400 px-4 py-2.5 text-sm font-bold text-slate-900 transition hover:bg-cyan-300 disabled:cursor-not-allowed disabled:opacity-50';
    const btnDanger = 'inline-flex cursor-pointer items-center justify-center gap-2 rounded-xl bg-red-500 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-red-400 disabled:cursor-not-allowed disabled:opacity-50';
    const selectCls = 'cursor-pointer rounded-xl border border-slate-700 bg-[#0a1220] px-3 py-2.5 text-sm text-slate-200 outline-none focus:border-cyan-400';
    const badge = 'inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-semibold';
    const iconBtn = 'cursor-pointer rounded-lg border border-slate-700 bg-slate-800/50 p-2 transition hover:bg-slate-800';

    const th = (label: string, field?: string) => (
        <th
            className={`px-4 py-3 font-semibold ${field ? 'cursor-pointer select-none hover:text-cyan-300' : ''}`}
            onClick={field ? () => handleSort(field) : undefined}
        >
            <span className="inline-flex items-center gap-1.5">
                {label}
                {field && <ArrowUpDown size={12} className={sortField === field ? 'text-cyan-300' : 'text-slate-600'} />}
            </span>
        </th>
    );

    const stat = (label: string, value: React.ReactNode, sub: React.ReactNode, icon: React.ReactNode) => (
        <div className={`${card} p-5`}>
            <div className="flex items-center justify-between text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                <span>{label}</span>
                {icon}
            </div>
            <div className="mt-2 text-2xl font-bold">{value}</div>
            <p className="mt-1 text-xs text-slate-500">{sub}</p>
        </div>
    );

    // Shared form for Add and Edit
    const recordFields = (form: any, setForm: (f: any) => void, withId: boolean) => {
        const set = (k: string, v: any) => setForm({ ...form, [k]: v });
        return (
            <div className="grid gap-4 sm:grid-cols-2">
                {withId && (
                    <div>
                        <label className={labelCls}>Astronaut ID (blank = auto)</label>
                        <input className={inputCls} value={form.Astronaut} onChange={(e) => set('Astronaut', e.target.value)} placeholder="e.g. 13" />
                    </div>
                )}
                <div>
                    <label className={labelCls}>Crew member name *</label>
                    <input required className={inputCls} value={form.Name} onChange={(e) => set('Name', e.target.value)} placeholder="e.g. CDR. Sarah Connor" />
                </div>
                <div>
                    <label className={labelCls}>Primary hazard</label>
                    <select className={inputCls} value={form.Hazard_Focus} onChange={(e) => set('Hazard_Focus', e.target.value)}>
                        <option value="Space Radiation (R)">R - Space Radiation</option>
                        <option value="Isolation and Confinement (I)">I - Isolation and Confinement</option>
                        <option value="Distance from Earth (D)">D - Distance from Earth</option>
                        <option value="Gravity Fields (G)">G - Gravity Fields</option>
                        <option value="Hostile and Closed Environments (E)">E - Hostile and Closed Environments</option>
                    </select>
                </div>
                <div>
                    <label className={labelCls}>Risk level</label>
                    <select className={inputCls} value={form.Risk_Level} onChange={(e) => set('Risk_Level', e.target.value)}>
                        {['Nominal', 'Guarded', 'Elevated', 'Critical'].map((l) => (
                            <option key={l}>{l}</option>
                        ))}
                    </select>
                </div>
                <div>
                    <label className={labelCls}>Launch age</label>
                    <input type="number" className={inputCls} value={form.Age_at_mission_start} onChange={(e) => set('Age_at_mission_start', parseInt(e.target.value) || 40)} />
                </div>
                <div>
                    <label className={labelCls}>Gender</label>
                    <select className={inputCls} value={form.Gender} onChange={(e) => set('Gender', e.target.value)}>
                        {['Male', 'Female', 'Other'].map((g) => (
                            <option key={g}>{g}</option>
                        ))}
                    </select>
                </div>
                <div>
                    <label className={labelCls}>Agency / country</label>
                    <input className={inputCls} value={form.Country} onChange={(e) => set('Country', e.target.value)} />
                </div>
                <div>
                    <label className={labelCls}>Mission duration (days)</label>
                    <input type="number" className={inputCls} value={form['Mission_duration(Days)']} onChange={(e) => set('Mission_duration(Days)', parseInt(e.target.value) || 180)} />
                </div>
                <div>
                    <label className={labelCls}>Bone density loss</label>
                    <input className={inputCls} value={form.Bone_Density_Loss} onChange={(e) => set('Bone_Density_Loss', e.target.value)} />
                </div>
                <div>
                    <label className={labelCls}>Radiation exposure (mSv)</label>
                    <input type="number" className={inputCls} value={form.Radiation_Exposure} onChange={(e) => set('Radiation_Exposure', parseInt(e.target.value) || 95)} />
                </div>
                <div className="sm:col-span-2">
                    <label className={labelCls}>Countermeasures protocol</label>
                    <input className={inputCls} value={form.Countermeasures_Used} onChange={(e) => set('Countermeasures_Used', e.target.value)} />
                </div>
            </div>
        );
    };
       return (
        <>
            <Head title="ORBIT • 5 Hazards of Human Spaceflight">
                <link rel="icon" href="/favicon.svg?v=nasa" type="image/svg+xml" />
            </Head>

            <div className="min-h-screen bg-[#060d18] p-4 text-white sm:p-8">
                <div className="mx-auto max-w-[1600px] space-y-6">
                    {/* Header */}
                    <header className="flex flex-wrap items-center justify-between gap-4">
                        <div className="flex items-center gap-4">
                            <div className="rounded-xl border border-slate-800 bg-[#0b1626] p-2">
                                <NasaLogo size={36} />
                            </div>
                            <div>
                                <p className="text-[10px] font-bold uppercase tracking-widest text-cyan-400">
                                    NASA Human Research Program
                                </p>
                                <h1 className="text-2xl font-bold">5 Hazards of Human Spaceflight</h1>
                                <a
                                    href="https://www.nasa.gov/hrp/hazards/"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center gap-1 text-xs text-slate-400 hover:text-cyan-300"
                                >
                                    nasa.gov/hrp/hazards <ExternalLink size={12} />
                                </a>
                            </div>
                        </div>

                        <div className="flex flex-wrap items-center gap-2">
                            <span className="mr-2 hidden items-center gap-2 text-xs text-slate-500 lg:flex">
                                <Clock size={14} /> {utcTimeStr}
                                <Radio size={14} className="ml-2 text-emerald-400" /> DSN locked
                            </span>
                            <button type="button" onClick={() => setIsManualAddOpen(true)} className={btnPrimary}>
                                <UserPlus size={16} /> Add crew record
                            </button>
                            <button type="button" onClick={() => setIsImportModalOpen(true)} className={btn}>
                                <Upload size={16} /> Import data
                            </button>
                            <button
                                type="button"
                                onClick={() => {
                                    setHealthRiskAstronaut(null);
                                    setIsHealthRiskOpen(true);
                                }}
                                className={btn}
                            >
                                <Activity size={16} className="text-amber-400" /> Risk analyzer
                            </button>
                            <button type="button" onClick={exportAllCsv} className={btn} title="Export all to CSV">
                                <FileSpreadsheet size={16} className="text-emerald-400" /> CSV
                            </button>
                            <button type="button" onClick={exportAllPdf} className={btn} title="Export all to PDF">
                                <FileText size={16} className="text-red-400" /> PDF
                            </button>
                            <button type="button" onClick={exportAllJson} className={btn} title="Export all to JSON">
                                <FileCode size={16} className="text-amber-400" /> JSON
                            </button>
                            <Link href="/" className={btn}>
                                <ArrowLeft size={16} /> Mission hub
                            </Link>
                        </div>
                    </header>

                    {/* Hazards */}
                    <section className={`${card} p-6`}>
                        <h2 className="font-bold">The 5 Hazards of Human Spaceflight</h2>
                        <p className="text-sm text-slate-400">
                            Click a card to see risks, metrics and countermeasures. Use "Filter crew" to narrow the table.
                        </p>

                        <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-5">
                            {activeHazards.map((hazard) => {
                                const active = selectedHazardFilter.toLowerCase() === hazard.hazard_code.toLowerCase();
                                return (
                                    <div
                                        key={hazard.hazard_code}
                                        onClick={() => setSelectedHazardModal(hazard)}
                                        className={`flex cursor-pointer flex-col justify-between rounded-xl border bg-[#0a1220] p-4 transition ${
                                            active ? 'border-cyan-400/70' : 'border-slate-800 hover:border-slate-600'
                                        }`}
                                    >
                                        <div>
                                            <div className="flex items-center justify-between">
                                                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-cyan-400/10 text-sm font-bold text-cyan-300">
                                                    {hazard.hazard_code}
                                                </span>
                                                <span
                                                    className={`rounded-full border px-2.5 py-0.5 text-[10px] font-bold ${
                                                        hazard.severity_level === 'CRITICAL'
                                                            ? 'border-red-500/30 bg-red-500/10 text-red-300'
                                                            : 'border-amber-400/30 bg-amber-400/10 text-amber-300'
                                                    }`}
                                                >
                                                    {hazard.severity_level}
                                                </span>
                                            </div>
                                            <h3 className="mt-3 text-sm font-bold">{hazard.title}</h3>
                                            <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-slate-500">
                                                {hazard.tagline || hazard.description}
                                            </p>
                                        </div>
                                        <div className="mt-4 flex items-center justify-between border-t border-slate-800 pt-3 text-xs">
                                            <span className="flex items-center gap-1 text-cyan-300">
                                                Details <ChevronRight size={14} />
                                            </span>
                                            <button
                                                type="button"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setSelectedHazardFilter(active ? 'all' : hazard.hazard_code);
                                                }}
                                                className={`cursor-pointer rounded-lg border px-2.5 py-1 font-semibold ${
                                                    active
                                                        ? 'border-cyan-400 bg-cyan-400 text-slate-900'
                                                        : 'border-slate-700 text-slate-400 hover:text-white'
                                                }`}
                                            >
                                                {active ? 'Filtered' : 'Filter crew'}
                                            </button>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </section>

                    {/* Stats */}
                    <section className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-6">
                        {stat('Cohort size', metrics.totalCount, 'Astronaut records', <User size={16} className="text-cyan-300" />)}
                        {stat(
                            'Mean flight',
                            <>
                                {metrics.avgDuration} <span className="text-xs font-normal text-slate-500">days</span>
                            </>,
                            `Max flight: ${metrics.maxDuration}d`,
                            <Clock size={16} className="text-sky-400" />,
                        )}
                        {stat(
                            'Mean BMD loss',
                            <span className="text-red-400">{metrics.avgBoneLoss}%</span>,
                            'Demineralization',
                            <Bone size={16} className="text-red-400" />,
                        )}
                        {stat(
                            'Mean dosimetry',
                            <span className="text-amber-300">
                                {metrics.avgRadiation} <span className="text-xs font-normal text-slate-500">mSv</span>
                            </span>,
                            'Cosmic and solar absorption',
                            <Zap size={16} className="text-amber-400" />,
                        )}
                        {stat('Agencies', metrics.distinctCountries, 'International partners', <Globe size={16} className="text-emerald-400" />)}
                        {stat(
                            'Selected',
                            <span className="text-cyan-300">
                                {selectedIds.length} <span className="text-xs font-normal text-slate-500">rows</span>
                            </span>,
                            'Ready for bulk actions',
                            <CheckSquare size={16} className="text-cyan-300" />,
                        )}
                    </section>

                    {/* Bulk bar */}
                    {selectedIds.length > 0 && (
                        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-cyan-400/40 bg-cyan-400/5 p-4">
                            <p className="text-sm">
                                <span className="font-bold text-cyan-300">{selectedIds.length}</span> record
                                {selectedIds.length > 1 ? 's' : ''} selected
                            </p>
                            <div className="flex flex-wrap gap-2">
                                <button type="button" onClick={exportSelectedCsv} className={btn}>
                                    <FileSpreadsheet size={16} className="text-emerald-400" /> Export CSV
                                </button>
                                <button type="button" onClick={exportSelectedJson} className={btn}>
                                    <FileCode size={16} className="text-amber-400" /> Export JSON
                                </button>
                                <button type="button" onClick={exportSelectedPdf} className={btn}>
                                    <FileText size={16} className="text-red-400" /> Export PDF
                                </button>
                                <button type="button" onClick={() => setIsBulkDeleteConfirmOpen(true)} className={btnDanger}>
                                    <Trash2 size={16} /> Delete ({selectedIds.length})
                                </button>
                                <button type="button" onClick={() => setSelectedIds([])} className={btn}>
                                    <X size={16} /> Clear
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Table card */}
                    <section className={`${card} p-6`}>
                        {/* Filters */}
                        <div className="flex flex-wrap items-center gap-3">
                            <div className="relative min-w-[240px] flex-1">
                                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                                <input
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    placeholder="Search astronaut, hazard, callsign, agency..."
                                    className={`${inputCls} pl-9 pr-9`}
                                />
                                {searchQuery && (
                                    <button
                                        type="button"
                                        onClick={() => setSearchQuery('')}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 cursor-pointer text-slate-400 hover:text-white"
                                    >
                                        <X size={14} />
                                    </button>
                                )}
                            </div>

                            <select value={selectedHazardFilter} onChange={(e) => setSelectedHazardFilter(e.target.value)} className={selectCls}>
                                <option value="all">All 5 hazards</option>
                                <option value="R">R - Space Radiation</option>
                                <option value="I">I - Isolation and Confinement</option>
                                <option value="D">D - Distance from Earth</option>
                                <option value="G">G - Gravity Fields</option>
                                <option value="E">E - Hostile and Closed Env.</option>
                            </select>

                            <select value={selectedGender} onChange={(e) => setSelectedGender(e.target.value)} className={selectCls}>
                                <option value="all">Gender: all</option>
                                <option value="male">Male</option>
                                <option value="female">Female</option>
                            </select>

                            <select value={selectedCountry} onChange={(e) => setSelectedCountry(e.target.value)} className={selectCls}>
                                <option value="all">Agency: all</option>
                                {countries.map((c) => (
                                    <option key={c} value={c}>
                                        {c}
                                    </option>
                                ))}
                            </select>

                            {hasActiveFilters && (
                                <button type="button" onClick={resetFilters} className={btn}>
                                    <RefreshCw size={14} /> Reset
                                </button>
                            )}

                            <span className="rounded-xl border border-slate-700 px-3 py-2.5 text-sm text-slate-300">
                                Showing <strong className="text-cyan-300">{filteredRecords.length}</strong> / {localRecords.length}
                            </span>
                        </div>

                        {/* Table */}
                        <div className="mt-5 overflow-x-auto rounded-xl border border-slate-800">
                            <table className="w-full text-left text-sm">
                                <thead className="bg-[#0a1220] text-xs uppercase tracking-wider text-slate-400">
                                    <tr>
                                        <th className="w-10 px-4 py-3">
                                            <button type="button" onClick={toggleSelectAll} className="cursor-pointer" title="Select all visible rows">
                                                {isAllSelected ? (
                                                    <CheckSquare size={16} className="text-cyan-300" />
                                                ) : (
                                                    <Square size={16} className="text-slate-500" />
                                                )}
                                            </button>
                                        </th>
                                        {th('Astronaut ID', 'id')}
                                        {th('Crew member', 'name')}
                                        {th('Primary hazard')}
                                        {th('Risk level')}
                                        {th('Flight duration', 'duration')}
                                        {th('BMD loss', 'boneLoss')}
                                        {th('Dosimetry', 'radiation')}
                                        {th('Agency')}
                                        <th className="px-4 py-3 text-right font-semibold">Actions</th>
                                    </tr>
                                </thead>

                                <tbody>
                                    {filteredRecords.length === 0 ? (
                                        <tr>
                                            <td colSpan={10} className="p-12 text-center">
                                                <AlertTriangle size={28} className="mx-auto text-amber-400" />
                                                <p className="mt-3 font-semibold">No matching records found</p>
                                                <p className="mt-1 text-sm text-slate-400">
                                                    Clear the search or reset the filters to see more.
                                                </p>
                                                <button type="button" onClick={resetFilters} className={`${btn} mt-4`}>
                                                    Reset all filters
                                                </button>
                                            </td>
                                        </tr>
                                    ) : (
                                        filteredRecords.map((record, index) => {
                                            const recordId = record.Astronaut ?? record.id ?? index;
                                            const isSelected = selectedIds.includes(recordId);
                                            const bone = getBoneLossBadge(record.Bone_Density_Loss);
                                            const hazard = getHazardBadge(record.Hazard_Focus);
                                            const durationNum =
                                                Number(
                                                    record['Mission_duration(Days)'] ??
                                                        (record as any).duration ??
                                                        (record as any).missionDurationDays ??
                                                        (record as any).Mission_duration,
                                                ) || 0;
                                            const pct = Math.min(100, Math.round((durationNum / 365) * 100));

                                            return (
                                                <tr
                                                    key={recordId}
                                                    onClick={() => setSelectedAstronaut(record)}
                                                    className={`cursor-pointer border-t border-slate-800/70 transition hover:bg-slate-800/30 ${
                                                        isSelected ? 'bg-cyan-400/5' : ''
                                                    }`}
                                                >
                                                    <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                                                        <button type="button" onClick={() => toggleSelectRow(recordId)} className="cursor-pointer">
                                                            {isSelected ? (
                                                                <CheckSquare size={16} className="text-cyan-300" />
                                                            ) : (
                                                                <Square size={16} className="text-slate-500" />
                                                            )}
                                                        </button>
                                                    </td>

                                                    <td className="px-4 py-3">
                                                        <span className="rounded-lg bg-cyan-400/10 px-2 py-1 text-xs font-bold text-cyan-300">
                                                            AST-{recordId}
                                                        </span>
                                                    </td>

                                                    <td className="px-4 py-3">
                                                        <div className="flex items-center gap-3">
                                                            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-800 text-xs font-bold text-cyan-300">
                                                                {(record.Name || 'A').charAt(0)}
                                                            </span>
                                                            <div>
                                                                <p className="font-semibold">{record.Name || 'Astronaut Specialist'}</p>
                                                                <p className="text-xs text-slate-500">
                                                                    {record.NASA_HRP_Protocol || 'NASA-STD-3001'}
                                                                </p>
                                                            </div>
                                                        </div>
                                                    </td>

                                                    <td className="px-4 py-3">
                                                        <span className={`${badge} ${hazard.color}`}>
                                                            [{hazard.code}] {hazard.text}
                                                        </span>
                                                    </td>

                                                    <td className="px-4 py-3">
                                                        <span className={`${badge} ${getRiskLevelBadge(record.Risk_Level)}`}>
                                                            {record.Risk_Level || 'Nominal'}
                                                        </span>
                                                    </td>

                                                    <td className="px-4 py-3">
                                                        <p className="font-semibold">
                                                            {durationNum} <span className="text-xs font-normal text-slate-500">days</span>
                                                        </p>
                                                        <div className="mt-1 h-1.5 w-24 overflow-hidden rounded-full bg-slate-800">
                                                            <div
                                                                className="h-full rounded-full bg-gradient-to-r from-cyan-400 to-emerald-400"
                                                                style={{ width: `${pct}%` }}
                                                            />
                                                        </div>
                                                    </td>

                                                    <td className="px-4 py-3">
                                                        <span className={`${badge} ${bone.color}`}>{bone.text}</span>
                                                    </td>

                                                    <td className="px-4 py-3">
                                                        <p className="font-semibold text-amber-300">
                                                            {record.Radiation_Exposure ? `${record.Radiation_Exposure} mSv` : '85 mSv'}
                                                        </p>
                                                        <p className="text-xs text-slate-500">Limit: 300 mSv</p>
                                                    </td>

                                                    <td className="px-4 py-3 text-slate-300">
                                                        <span className="flex items-center gap-1.5">
                                                            <Globe size={14} className="text-cyan-300" />
                                                            <span className="max-w-[150px] truncate">{record.Country || 'USA / NASA'}</span>
                                                        </span>
                                                    </td>

                                                    <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                                                        <div className="flex justify-end gap-2">
                                                            <button onClick={() => setSelectedAstronaut(record)} className={`${iconBtn} text-cyan-300`} title="View dossier">
                                                                <Eye size={16} />
                                                            </button>
                                                            <button onClick={() => handleOpenEdit(record)} className={`${iconBtn} text-amber-300`} title="Edit record">
                                                                <Edit3 size={16} />
                                                            </button>
                                                            <button onClick={() => setDeletingRecord(record)} className={`${iconBtn} text-red-400`} title="Delete record">
                                                                <Trash2 size={16} />
                                                            </button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            );
                                        })
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </section>

                    <footer className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-800 pt-4 text-xs text-slate-500">
                        <span>ORBIT • Flight Surgeon Bioastronautics Console</span>
                        <span>
                            Total records: <strong className="text-cyan-300">{localRecords.length}</strong>
                        </span>
                    </footer>
                </div>

                {/* Add modal */}
                {isManualAddOpen && (
                    <Modal
                        onClose={() => setIsManualAddOpen(false)}
                        title="Add astronaut record"
                        subtitle="Saved directly to the dataset database"
                        icon={<UserPlus size={20} />}
                    >
                        <form onSubmit={handleManualAddSubmit} className="space-y-5">
                            {recordFields(manualForm, setManualForm, true)}
                            <div className="flex justify-end gap-3 border-t border-slate-800 pt-4">
                                <button type="button" onClick={() => setIsManualAddOpen(false)} className={btn}>
                                    Cancel
                                </button>
                                <button type="submit" disabled={isSubmitting} className={btnPrimary}>
                                    <Check size={16} /> {isSubmitting ? 'Saving...' : 'Save record'}
                                </button>
                            </div>
                        </form>
                    </Modal>
                )}

                {/* Edit modal */}
                {isEditModalOpen && (
                    <Modal
                        onClose={() => setIsEditModalOpen(false)}
                        title={`Edit astronaut record #${editForm.Astronaut}`}
                        subtitle="Update physiological and hazard parameters"
                        icon={<Edit3 size={20} />}
                    >
                        <form onSubmit={handleEditSubmit} className="space-y-5">
                            {recordFields(editForm, setEditForm, false)}
                            <div className="flex justify-end gap-3 border-t border-slate-800 pt-4">
                                <button type="button" onClick={() => setIsEditModalOpen(false)} className={btn}>
                                    Cancel
                                </button>
                                <button type="submit" disabled={isSubmitting} className={btnPrimary}>
                                    <Check size={16} /> {isSubmitting ? 'Updating...' : 'Save changes'}
                                </button>
                            </div>
                        </form>
                    </Modal>
                )}

                {/* Delete modal */}
                {deletingRecord && (
                    <Modal
                        onClose={() => setDeletingRecord(null)}
                        title="Delete record"
                        icon={<AlertTriangle size={20} className="text-red-400" />}
                        size="max-w-md"
                    >
                        <p className="text-sm leading-relaxed text-slate-300">
                            Permanently remove{' '}
                            <strong className="text-white">
                                {deletingRecord.Name} (#{deletingRecord.Astronaut ?? deletingRecord.id})
                            </strong>{' '}
                            from the database? This cannot be undone.
                        </p>
                        <div className="mt-6 flex justify-end gap-3">
                            <button type="button" onClick={() => setDeletingRecord(null)} className={btn}>
                                Cancel
                            </button>
                            <button type="button" onClick={handleConfirmDelete} disabled={isSubmitting} className={btnDanger}>
                                <Trash2 size={16} /> {isSubmitting ? 'Deleting...' : 'Delete'}
                            </button>
                        </div>
                    </Modal>
                )}

                {/* Bulk delete modal */}
                {isBulkDeleteConfirmOpen && (
                    <Modal
                        onClose={() => setIsBulkDeleteConfirmOpen(false)}
                        title="Delete selected records"
                        icon={<AlertTriangle size={20} className="text-red-400" />}
                        size="max-w-md"
                    >
                        <p className="text-sm leading-relaxed text-slate-300">
                            You are about to permanently delete{' '}
                            <strong className="text-red-400">{selectedIds.length}</strong> astronaut records. This cannot be undone.
                        </p>
                        <div className="mt-6 flex justify-end gap-3">
                            <button type="button" onClick={() => setIsBulkDeleteConfirmOpen(false)} className={btn}>
                                Cancel
                            </button>
                            <button type="button" onClick={handleConfirmBulkDelete} disabled={isSubmitting} className={btnDanger}>
                                <Trash2 size={16} /> {isSubmitting ? 'Deleting...' : `Delete ${selectedIds.length} records`}
                            </button>
                        </div>
                    </Modal>
                )}

                {/* Import modal */}
                <TelemetryImportModal
                    isOpen={isImportModalOpen}
                    onClose={() => setIsImportModalOpen(false)}
                    onSaveToDatabase={handleSaveImportToDatabase}
                />

                {/* Hazard detail modal */}
                {selectedHazardModal && (
                    <Modal
                        onClose={() => setSelectedHazardModal(null)}
                        title={`${selectedHazardModal.title} (${selectedHazardModal.hazard_id})`}
                        subtitle={`${selectedHazardModal.category} • NASA Human Research Program`}
                        icon={<span className="font-bold">{selectedHazardModal.hazard_code}</span>}
                        size="max-w-3xl"
                    >
                        <div className="space-y-4 text-sm text-slate-300">
                            <div className="rounded-xl border border-slate-800 bg-[#0a1220] p-4">
                                <p className="text-xs font-bold uppercase tracking-wider text-cyan-300">Deep space context</p>
                                <p className="mt-2 leading-relaxed">{selectedHazardModal.description}</p>
                                {selectedHazardModal.deep_space_context && (
                                    <p className="mt-3 border-t border-slate-800 pt-3 italic text-slate-400">
                                        {selectedHazardModal.deep_space_context}
                                    </p>
                                )}
                            </div>

                            {selectedHazardModal.key_risks && selectedHazardModal.key_risks.length > 0 && (
                                <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-4">
                                    <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-red-300">
                                        <ShieldAlert size={14} /> Primary physiological risks
                                    </p>
                                    <ul className="mt-2 list-disc space-y-1.5 pl-5 marker:text-red-400">
                                        {selectedHazardModal.key_risks.map((risk, i) => (
                                            <li key={i}>{risk}</li>
                                        ))}
                                    </ul>
                                </div>
                            )}

                            {selectedHazardModal.biomedical_metrics && selectedHazardModal.biomedical_metrics.length > 0 && (
                                <div className="rounded-xl border border-slate-800 bg-[#0a1220] p-4">
                                    <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-cyan-300">
                                        <Activity size={14} /> Clinical thresholds
                                    </p>
                                    <div className="mt-3 grid gap-3 sm:grid-cols-2">
                                        {selectedHazardModal.biomedical_metrics.map((m, i) => (
                                            <div key={i} className="rounded-lg border border-slate-800 bg-[#0b1626] p-3">
                                                <p className="text-xs text-slate-400">{m.metric}</p>
                                                <p className="mt-1 text-xs font-semibold text-emerald-300">Nominal: {m.nominal}</p>
                                                <p className="text-xs font-semibold text-red-300">Alert: {m.critical}</p>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {selectedHazardModal.countermeasures && selectedHazardModal.countermeasures.length > 0 && (
                                <div className="rounded-xl border border-emerald-400/20 bg-emerald-400/5 p-4">
                                    <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-emerald-300">
                                        <CheckCircle2 size={14} /> Deployed countermeasures
                                    </p>
                                    <div className="mt-3 space-y-2">
                                        {selectedHazardModal.countermeasures.map((cm, i) => (
                                            <div key={i} className="rounded-lg border border-slate-800 bg-[#0b1626] p-3">
                                                <div className="flex items-center justify-between gap-2">
                                                    <strong className="text-sm text-white">{cm.name}</strong>
                                                    <span className="shrink-0 rounded-full border border-emerald-400/30 bg-emerald-400/10 px-2 py-0.5 text-[10px] font-semibold text-emerald-300">
                                                        {cm.status}
                                                    </span>
                                                </div>
                                                <p className="mt-1 text-xs text-slate-400">{cm.desc}</p>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-slate-800 pt-4">
                            <a href={selectedHazardModal.nasa_url} target="_blank" rel="noopener noreferrer" className={btn}>
                                NASA HRP documentation <ExternalLink size={14} />
                            </a>
                            <button
                                type="button"
                                onClick={() => {
                                    setSelectedHazardFilter(selectedHazardModal.hazard_code);
                                    setSelectedHazardModal(null);
                                    toast.info(`Filtered roster to crew evaluated under ${selectedHazardModal.title}`);
                                }}
                                className={btnPrimary}
                            >
                                Filter crew by this hazard
                            </button>
                        </div>
                    </Modal>
                )}

                {/* Astronaut dossier modal */}
                {selectedAstronaut && (
                    <Modal
                        onClose={() => setSelectedAstronaut(null)}
                        title={selectedAstronaut.Name || 'Astronaut Specialist'}
                        subtitle={`Callsign AST-${selectedAstronaut.Astronaut ?? selectedAstronaut.id ?? 'N/A'} • NASA HRP Bioastronautics`}
                        icon={<span className="font-bold">{(selectedAstronaut.Name || 'A').charAt(0)}</span>}
                        size="max-w-xl"
                    >
                        <div className="space-y-4 text-sm">
                            <div className="grid grid-cols-2 gap-3">
                                <div className="rounded-xl border border-slate-800 bg-[#0a1220] p-4">
                                    <p className="text-xs text-slate-500">Mission duration</p>
                                    <p className="mt-1 text-lg font-bold">
                                        {selectedAstronaut['Mission_duration(Days)'] ??
                                            (selectedAstronaut as any).duration ??
                                            (selectedAstronaut as any).missionDurationDays ??
                                            180}{' '}
                                        <span className="text-xs font-normal text-slate-500">days</span>
                                    </p>
                                </div>
                                <div className="rounded-xl border border-slate-800 bg-[#0a1220] p-4">
                                    <p className="text-xs text-slate-500">BMD loss</p>
                                    <p className="mt-1 text-lg font-bold text-red-400">{selectedAstronaut.Bone_Density_Loss || '-3.0%'}</p>
                                </div>
                                <div className="rounded-xl border border-slate-800 bg-[#0a1220] p-4">
                                    <p className="text-xs text-slate-500">Radiation exposure</p>
                                    <p className="mt-1 text-lg font-bold text-amber-300">
                                        {selectedAstronaut.Radiation_Exposure ? `${selectedAstronaut.Radiation_Exposure} mSv` : '88 mSv'}
                                    </p>
                                </div>
                                <div className="rounded-xl border border-slate-800 bg-[#0a1220] p-4">
                                    <p className="text-xs text-slate-500">Primary hazard</p>
                                    <p className="mt-1 truncate font-bold text-cyan-300">
                                        {selectedAstronaut.Hazard_Focus || 'Gravity Fields (G)'}
                                    </p>
                                </div>
                            </div>

                            <div className="rounded-xl border border-slate-800 bg-[#0a1220] p-4 leading-relaxed text-slate-300">
                                <div className="mb-3 flex items-center justify-between">
                                    <span className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-cyan-300">
                                        <Shield size={14} /> NASA HRP 5-hazard evaluation
                                    </span>
                                    <span className="rounded-full border border-cyan-400/30 bg-cyan-400/10 px-2.5 py-0.5 text-[10px] font-semibold text-cyan-300">
                                        {selectedAstronaut.NASA_HRP_Protocol || 'NASA-STD-3001'}
                                    </span>
                                </div>
                                <div className="space-y-2 text-xs">
                                    <p>
                                        <strong className="text-white">Active countermeasures:</strong>{' '}
                                        {selectedAstronaut.Countermeasures_Used || 'ARED exercise, bisphosphonate protocol, SSLA circadian lighting.'}
                                    </p>
                                    <p>
                                        <strong className="text-white">Neuro-ocular and vision (SANS):</strong>{' '}
                                        <span className="text-cyan-300">{selectedAstronaut.Vision_Change || 'Clear (nominal optic nerve sheath)'}</span>
                                    </p>
                                    <p>
                                        <strong className="text-white">Affiliation:</strong> {selectedAstronaut.Country || 'USA / NASA'} •{' '}
                                        {selectedAstronaut.No_of_Mission || 1} mission(s)
                                    </p>
                                </div>
                            </div>
                        </div>

                        <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-slate-800 pt-4">
                            <div className="flex gap-2">
                                <button type="button" onClick={() => setSelectedAstronaut(null)} className={btn}>
                                    Close
                                </button>
                                <button
                                    type="button"
                                    onClick={() => {
                                        setHealthRiskAstronaut(selectedAstronaut);
                                        setIsHealthRiskOpen(true);
                                    }}
                                    className={btn}
                                >
                                    <Activity size={16} className="text-amber-400" /> Evaluate health risks
                                </button>
                            </div>
                            <Link href="/" className={btnPrimary}>
                                Open in mission HUD <ChevronRight size={16} />
                            </Link>
                        </div>
                    </Modal>
                )}

                {/* Health risk modal (unchanged) */}
                <AstronautHealthRiskModal
                    isOpen={isHealthRiskOpen}
                    onClose={() => setIsHealthRiskOpen(false)}
                    astronaut={healthRiskAstronaut ? {
                        bio: {
                            id: String(healthRiskAstronaut.Astronaut ?? healthRiskAstronaut.id ?? 'AST-01'),
                            name: healthRiskAstronaut.Name || 'Mission Specialist',
                            role: healthRiskAstronaut.Role || 'Astronaut Specialist',
                            mission: 'ARTEMIS II',
                            evaStatus: 'ON-GOING',
                            age: Number(healthRiskAstronaut.Age_at_mission_start ?? 40),
                            gender: healthRiskAstronaut.Gender || 'Male',
                            country: healthRiskAstronaut.Country || 'USA / NASA',
                            missionDurationDays: Number(healthRiskAstronaut['Mission_duration(Days)'] ?? 180),
                            boneDensityLoss: String(healthRiskAstronaut.Bone_Density_Loss || '-3.0%'),
                        },
                        vitals: {
                            heartRate: { title: 'HEART RATE', value: '115 bpm', numericValue: 115, unit: 'bpm', color: '#5cdbdf', type: 'ecg', baseline: '60-100' },
                            spO2: { title: 'SpO2', value: '97%', numericValue: 97, unit: '%', color: '#5cdbdf', type: 'sine', baseline: '95-100%' },
                            coreTemp: { title: 'CORE TEMP', value: '37.1°C', numericValue: 37.1, unit: '°C', color: '#5cdbdf', type: 'ecg', baseline: '36.5-37.5°C' },
                            respiration: { title: 'RESPIRATION', value: '18 bpm', numericValue: 18, unit: 'bpm', color: '#5cdbdf', type: 'slow-sine', baseline: '12-20' },
                            hydration: { title: 'HYDRATION', value: 'Optimal, 74%', numericValue: 74, unit: '%', color: '#5cdbdf', type: 'flat', baseline: '80-100%' },
                        },
                        diagnostics: {
                            suitPressurePsi: 4.3,
                            suitPressurePercent: 60,
                            o2Percent: 21,
                            radiationStatus: `${healthRiskAstronaut.Radiation_Exposure || 95} mSv`,
                            radiationPercent: 85,
                            batteryPercent: 74,
                        },
                        alerts: [],
                        logs: [],
                    } as any : null}
                />
            </div>
        </>
    );
}

function Modal({
    onClose,
    title,
    subtitle,
    icon,
    size = 'max-w-2xl',
    children,
}: {
    onClose: () => void;
    title: string;
    subtitle?: string;
    icon?: React.ReactNode;
    size?: string;
    children: React.ReactNode;
}) {
    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
            onClick={onClose}
        >
            <div
                className={`flex max-h-[90vh] w-full ${size} flex-col rounded-2xl border border-slate-800 bg-[#0b1626] p-6 text-white shadow-2xl`}
                onClick={(e) => e.stopPropagation()}
            >
                <div className="mb-5 flex items-start justify-between gap-4">
                    <div className="flex items-center gap-3">
                        {icon && (
                            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-cyan-400/10 text-cyan-300">
                                {icon}
                            </span>
                        )}
                        <div>
                            <h3 className="font-bold">{title}</h3>
                            {subtitle && <p className="text-xs text-slate-400">{subtitle}</p>}
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
                <div className="flex-1 overflow-y-auto pr-1">{children}</div>
            </div>
        </div>
    );
}