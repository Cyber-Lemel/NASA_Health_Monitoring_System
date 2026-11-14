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
} from 'lucide-react';
import NasaLogo from '@/components/nasa-logo';
import TelemetryImportModal from '@/components/telemetry-import-modal';
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

    // Helper for BMD badge
    const getBoneLossBadge = (lossVal?: string | number) => {
        if (lossVal === undefined || lossVal === null || lossVal === '') {
            return { text: 'N/A', color: 'text-slate-400 bg-[#0a1f2e] border-[#1a4b6c]' };
        }
        const str = String(lossVal);
        const num = parseFloat(str.replace('%', ''));
        const display = str.includes('%') ? str : `${num}%`;

        if (num <= -4.0) {
            return { text: display, color: 'text-rose-400 bg-rose-950/40 border-rose-800/80 shadow-[0_0_8px_rgba(244,63,94,0.25)]' };
        }
        if (num <= -2.5) {
            return { text: display, color: 'text-amber-400 bg-amber-950/40 border-amber-800/80' };
        }
        return { text: display, color: 'text-emerald-400 bg-emerald-950/40 border-emerald-800/80' };
    };

    // Helper for Hazard badge color
    const getHazardBadge = (hazardFocus?: string) => {
        if (!hazardFocus) return { text: 'Gravity Fields (G)', code: 'G', color: 'text-sky-400 bg-sky-950/40 border-sky-800/80' };
        const h = hazardFocus.toUpperCase();
        if (h.includes('RADIATION') || h.includes('R')) {
            return { text: 'Radiation (R)', code: 'R', color: 'text-rose-400 bg-rose-950/50 border-rose-700/80' };
        }
        if (h.includes('ISOLATION') || h.includes('I')) {
            return { text: 'Isolation (I)', code: 'I', color: 'text-purple-400 bg-purple-950/50 border-purple-700/80' };
        }
        if (h.includes('DISTANCE') || h.includes('D')) {
            return { text: 'Distance (D)', code: 'D', color: 'text-amber-400 bg-amber-950/50 border-amber-700/80' };
        }
        if (h.includes('ENVIRONMENT') || h.includes('E')) {
            return { text: 'Closed Env (E)', code: 'E', color: 'text-emerald-400 bg-emerald-950/50 border-emerald-700/80' };
        }
        return { text: 'Gravity (G)', code: 'G', color: 'text-cyan-400 bg-cyan-950/50 border-cyan-700/80' };
    };

    // Helper for Risk Level badge
    const getRiskLevelBadge = (level?: string) => {
        const lvl = (level || 'Nominal').toUpperCase();
        if (lvl === 'ELEVATED' || lvl === 'HIGH' || lvl === 'CRITICAL') {
            return 'text-rose-400 bg-rose-950/40 border-rose-800/80 shadow-[0_0_8px_rgba(244,63,94,0.2)]';
        }
        if (lvl === 'GUARDED' || lvl === 'MODERATE' || lvl === 'WARNING') {
            return 'text-amber-400 bg-amber-950/40 border-amber-800/80';
        }
        return 'text-emerald-400 bg-emerald-950/40 border-emerald-800/80';
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

    return (
        <>
            <Head title="ORBIT • 5 Hazards of Human Spaceflight & Telemetry Archive">
                <link rel="icon" href="/favicon.svg?v=nasa" type="image/svg+xml" />
            </Head>

            {/* ORBIT HUD Main Container */}
            <div className="min-h-screen bg-[#030b14] text-[#5cdbdf] font-mono selection:bg-[#0284c7] selection:text-white p-3 sm:p-6 relative select-none overflow-x-hidden">
                {/* Background Tech Gradients */}
                <div className="fixed inset-0 pointer-events-none z-0">
                    <div className="absolute top-0 right-1/4 w-[600px] h-[600px] bg-[#0b3d91]/15 rounded-full blur-[160px]" />
                    <div className="absolute top-1/3 left-1/4 w-[500px] h-[500px] bg-[#0284c7]/10 rounded-full blur-[170px]" />
                    <div className="absolute bottom-0 right-10 w-[400px] h-[400px] bg-[#5cdbdf]/5 rounded-full blur-[140px]" />
                    <div
                        className="absolute inset-0 opacity-[0.035]"
                        style={{
                            backgroundImage:
                                'linear-gradient(to right, #ffffff 1px, transparent 1px), linear-gradient(to bottom, #ffffff 1px, transparent 1px)',
                            backgroundSize: '40px 40px',
                        }}
                    />
                </div>

                <div className="relative z-10 max-w-[1700px] mx-auto space-y-5">
                    {/* Top Bar: ORBIT Mission Control Header */}
                    <header className="border border-[#1a4b6c] bg-[#06121e]/90 p-4 relative backdrop-blur-md">
                        <div className="absolute top-0 left-0 w-3 h-3 border-t-2 border-l-2 border-[#5cdbdf]" />
                        <div className="absolute top-0 right-0 w-3 h-3 border-t-2 border-r-2 border-[#5cdbdf]" />
                        <div className="absolute bottom-0 left-0 w-3 h-3 border-b-2 border-l-2 border-[#5cdbdf]" />
                        <div className="absolute bottom-0 right-0 w-3 h-3 border-b-2 border-r-2 border-[#5cdbdf]" />

                        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
                            {/* Brand Identity */}
                            <div className="flex items-center gap-3 sm:gap-4">
                                <div className="p-1.5 border border-[#1a4b6c] bg-[#0a1f2e] shadow-[0_0_12px_rgba(92,219,223,0.15)] flex-shrink-0">
                                    <NasaLogo size={36} />
                                </div>
                                <div>
                                    <div className="flex flex-wrap items-center gap-2">
                                        <h1 className="text-base sm:text-xl font-bold tracking-wider text-white">
                                            ORBIT <span className="text-[#5cdbdf]">// 5 HAZARDS OF HUMAN SPACEFLIGHT</span>
                                        </h1>
                                        <span className="px-2 py-0.5 text-[10px] tracking-widest border border-cyan-800/80 bg-cyan-950/60 text-cyan-300">
                                            SQLITE DATABASE: <code className="text-[#5cdbdf]">nasa_hazards & dataset_records</code>
                                        </span>
                                    </div>
                                    <p className="text-[11px] text-slate-400 tracking-wider mt-0.5 flex flex-wrap items-center gap-2">
                                        <span>NASA HUMAN RESEARCH PROGRAM (HRP)</span>
                                        <span className="text-slate-600">•</span>
                                        <span>RIDGE FRAMEWORK</span>
                                        <span className="text-slate-600">•</span>
                                        <a
                                            href="https://www.nasa.gov/hrp/hazards/"
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="text-cyan-400 hover:text-white underline inline-flex items-center gap-1"
                                        >
                                            <span>NASA.GOV/HRP/HAZARDS</span>
                                            <ExternalLink className="w-3 h-3" />
                                        </a>
                                    </p>
                                </div>
                            </div>

                            {/* Middle Status Indicators */}
                            <div className="hidden xl:flex items-center gap-5 text-[11px] border-x border-[#1a4b6c]/60 px-5">
                                <div className="flex items-center gap-2">
                                    <Clock className="w-3.5 h-3.5 text-[#5cdbdf]" />
                                    <span className="text-slate-400">TIME:</span>
                                    <span className="text-white font-bold tracking-widest">{utcTimeStr}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Radio className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
                                    <span className="text-slate-400">DSN:</span>
                                    <span className="text-emerald-400 font-bold">LOCKED // 40-MS</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Shield className="w-3.5 h-3.5 text-[#5cdbdf]" />
                                    <span className="text-slate-400">STANDARD:</span>
                                    <span className="text-cyan-300 font-bold">NASA-STD-3001</span>
                                </div>
                            </div>

                            {/* Action Buttons: Manual Add, Scan Import, Mission HUD, Exports */}
                            <div className="flex flex-wrap items-center gap-2 text-xs">
                                <button
                                    type="button"
                                    onClick={() => setIsManualAddOpen(true)}
                                    className="border border-[#5cdbdf] bg-[#5cdbdf]/15 text-[#5cdbdf] hover:bg-[#5cdbdf] hover:text-[#030b14] px-3.5 py-2 text-xs tracking-wider uppercase transition-all flex items-center gap-1.5 font-bold cursor-pointer shadow-[0_0_12px_rgba(92,219,223,0.2)]"
                                >
                                    <UserPlus className="w-3.5 h-3.5" />
                                    <span>ADD CREW RECORD</span>
                                </button>

                                <button
                                    type="button"
                                    onClick={() => setIsImportModalOpen(true)}
                                    className="border border-emerald-500/80 bg-emerald-950/40 text-emerald-400 hover:bg-emerald-600 hover:text-white px-3.5 py-2 text-xs tracking-wider uppercase transition-all flex items-center gap-1.5 font-bold cursor-pointer shadow-[0_0_12px_rgba(16,185,129,0.2)]"
                                >
                                    <Upload className="w-3.5 h-3.5" />
                                    <span>IMPORT DATA</span>
                                </button>

                                <Link
                                    href="/"
                                    className="border border-[#1a4b6c] bg-[#0a1f2e] text-[#5cdbdf] px-3.5 py-2 text-xs tracking-widest uppercase hover:bg-[#0b3d91]/30 hover:border-[#5cdbdf] hover:text-white transition-all flex items-center gap-1.5 font-bold shadow-[0_0_10px_rgba(92,219,223,0.1)]"
                                >
                                    <ArrowLeft className="w-3.5 h-3.5" />
                                    <span>MISSION HUD</span>
                                </Link>

                                <button
                                    onClick={exportAllCsv}
                                    type="button"
                                    className="border border-[#1a4b6c] bg-[#0a1f2e] text-slate-300 hover:text-white hover:border-[#5cdbdf] px-2.5 py-2 text-xs tracking-wider uppercase transition-all flex items-center gap-1 cursor-pointer"
                                    title="Export all cohort records to CSV"
                                >
                                    <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
                                    <span>CSV</span>
                                </button>

                                <button
                                    onClick={exportAllJson}
                                    type="button"
                                    className="border border-[#1a4b6c] bg-[#0a1f2e] text-slate-300 hover:text-white hover:border-[#5cdbdf] px-2.5 py-2 text-xs tracking-wider uppercase transition-all flex items-center gap-1 cursor-pointer"
                                    title="Export all cohort records to JSON"
                                >
                                    <FileCode className="w-3.5 h-3.5 text-amber-400" />
                                    <span>JSON</span>
                                </button>
                            </div>
                        </div>
                    </header>

                    {/* SECTION: NASA 5 HAZARDS OF HUMAN SPACEFLIGHT (RIDGE) INTERACTIVE MATRIX */}
                    <section className="border border-[#1a4b6c] bg-[#06121e]/90 p-4 sm:p-5 relative backdrop-blur-md">
                        <div className="absolute top-0 left-0 w-3 h-3 border-t-2 border-l-2 border-[#5cdbdf]" />
                        <div className="absolute top-0 right-0 w-3 h-3 border-t-2 border-r-2 border-[#5cdbdf]" />
                        <div className="absolute bottom-0 left-0 w-3 h-3 border-b-2 border-l-2 border-[#5cdbdf]" />
                        <div className="absolute bottom-0 right-0 w-3 h-3 border-b-2 border-r-2 border-[#5cdbdf]" />

                        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3 mb-4 border-b border-[#1a4b6c]/50 pb-3">
                            <div>
                                <div className="flex items-center gap-2">
                                    <span className="px-2 py-0.5 text-xs font-bold bg-[#5cdbdf] text-slate-950 tracking-wider">
                                        NASA HRP RIDGE FRAMEWORK
                                    </span>
                                    <h2 className="text-sm sm:text-base font-bold text-white tracking-wider">
                                        THE 5 HAZARDS OF HUMAN SPACEFLIGHT
                                    </h2>
                                </div>
                                <p className="text-[11px] text-slate-400 mt-1">
                                    Official environmental stressors defined by the NASA Human Research Program. Click any card to inspect risks, metrics, and deployed countermeasures.
                                </p>
                            </div>

                            <div className="flex items-center gap-2 text-xs">
                                <a
                                    href="https://www.nasa.gov/hrp/hazards/"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="px-3 py-1.5 border border-[#1a4b6c] bg-[#0a1f2e] text-[#5cdbdf] hover:border-[#5cdbdf] hover:text-white transition-all flex items-center gap-1.5 text-[11px]"
                                >
                                    <span>NASA HRP HAZARDS PORTAL</span>
                                    <ExternalLink className="w-3 h-3" />
                                </a>
                            </div>
                        </div>

                        {/* 5 Hazard Cards Grid (R-I-D-G-E) */}
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3.5">
                            {activeHazards.map((hazard) => {
                                const isFilterActive = selectedHazardFilter.toLowerCase() === hazard.hazard_code.toLowerCase();
                                return (
                                    <div
                                        key={hazard.hazard_code}
                                        onClick={() => setSelectedHazardModal(hazard)}
                                        className={`group relative p-4 border transition-all cursor-pointer flex flex-col justify-between ${
                                            isFilterActive
                                                ? 'border-[#5cdbdf] bg-[#0b3d91]/30 shadow-[0_0_15px_rgba(92,219,223,0.3)]'
                                                : 'border-[#1a4b6c] bg-[#0a1f2e]/70 hover:border-[#5cdbdf] hover:bg-[#0a1f2e]'
                                        }`}
                                    >
                                        <div>
                                            <div className="flex items-center justify-between mb-2">
                                                <div className="flex items-center gap-2">
                                                    <span className="w-7 h-7 flex items-center justify-center font-bold text-sm bg-[#030b14] border border-[#1a4b6c] text-[#5cdbdf] group-hover:border-[#5cdbdf] group-hover:text-white transition-colors">
                                                        {hazard.hazard_code}
                                                    </span>
                                                    <span className="text-[10px] text-slate-400 tracking-wider">
                                                        {hazard.hazard_id}
                                                    </span>
                                                </div>
                                                <span
                                                    className={`text-[9px] font-bold px-1.5 py-0.5 border ${
                                                        hazard.severity_level === 'CRITICAL'
                                                            ? 'border-rose-700 bg-rose-950/60 text-rose-300'
                                                            : 'border-amber-700 bg-amber-950/60 text-amber-300'
                                                    }`}
                                                >
                                                    {hazard.severity_level}
                                                </span>
                                            </div>

                                            <h3 className="text-xs sm:text-sm font-bold text-white group-hover:text-[#5cdbdf] transition-colors leading-snug">
                                                {hazard.title}
                                            </h3>

                                            <p className="text-[10px] text-slate-400 mt-1.5 line-clamp-2 leading-relaxed">
                                                {hazard.tagline || hazard.description}
                                            </p>
                                        </div>

                                        <div className="mt-4 pt-3 border-t border-[#1a4b6c]/50 flex items-center justify-between text-[10px]">
                                            <span className="text-[#5cdbdf] flex items-center gap-1 group-hover:underline">
                                                <span>DETAILS</span>
                                                <ChevronRight className="w-3 h-3" />
                                            </span>
                                            <button
                                                type="button"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setSelectedHazardFilter(
                                                        selectedHazardFilter.toLowerCase() === hazard.hazard_code.toLowerCase()
                                                            ? 'all'
                                                            : hazard.hazard_code
                                                    );
                                                }}
                                                className={`px-1.5 py-0.5 border text-[9px] transition-colors ${
                                                    isFilterActive
                                                        ? 'border-[#5cdbdf] bg-[#5cdbdf] text-[#030b14] font-bold'
                                                        : 'border-[#1a4b6c] text-slate-400 hover:text-white'
                                                }`}
                                            >
                                                {isFilterActive ? 'FILTERED' : 'FILTER CREW'}
                                            </button>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </section>

                    {/* Stat Metrics Strip */}
                    <section className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
                        <div className="border border-[#1a4b6c] bg-[#06121e]/80 p-3.5 relative">
                            <div className="flex items-center justify-between text-[10px] text-slate-400 tracking-wider">
                                <span>COHORT SIZE</span>
                                <User className="w-3.5 h-3.5 text-[#5cdbdf]" />
                            </div>
                            <div className="text-2xl font-bold text-white mt-1.5 tracking-tight">
                                {metrics.totalCount}
                            </div>
                            <div className="text-[10px] text-[#5cdbdf] mt-1 flex items-center gap-1">
                                <span className="inline-block w-1.5 h-1.5 rounded-full bg-[#5cdbdf] animate-ping" />
                                NASA Astronaut Records
                            </div>
                        </div>

                        <div className="border border-[#1a4b6c] bg-[#06121e]/80 p-3.5 relative">
                            <div className="flex items-center justify-between text-[10px] text-slate-400 tracking-wider">
                                <span>MEAN FLIGHT</span>
                                <Clock className="w-3.5 h-3.5 text-sky-400" />
                            </div>
                            <div className="text-2xl font-bold text-white mt-1.5 tracking-tight">
                                {metrics.avgDuration} <span className="text-xs text-sky-400 font-normal">DAYS</span>
                            </div>
                            <div className="text-[10px] text-slate-400 mt-1">
                                Max Flight: <strong className="text-white">{metrics.maxDuration}d</strong>
                            </div>
                        </div>

                        <div className="border border-[#1a4b6c] bg-[#06121e]/80 p-3.5 relative">
                            <div className="flex items-center justify-between text-[10px] text-slate-400 tracking-wider">
                                <span>MEAN BMD LOSS (G)</span>
                                <Bone className="w-3.5 h-3.5 text-rose-400" />
                            </div>
                            <div className="text-2xl font-bold text-rose-400 mt-1.5 tracking-tight">
                                {metrics.avgBoneLoss}%
                            </div>
                            <div className="text-[10px] text-slate-400 mt-1">
                                Microgravity Demineralization
                            </div>
                        </div>

                        <div className="border border-[#1a4b6c] bg-[#06121e]/80 p-3.5 relative">
                            <div className="flex items-center justify-between text-[10px] text-slate-400 tracking-wider">
                                <span>MEAN DOSIMETRY (R)</span>
                                <Zap className="w-3.5 h-3.5 text-amber-400" />
                            </div>
                            <div className="text-2xl font-bold text-amber-300 mt-1.5 tracking-tight">
                                {metrics.avgRadiation} <span className="text-xs text-amber-400 font-normal">mSv</span>
                            </div>
                            <div className="text-[10px] text-slate-400 mt-1">
                                Cosmic & Solar Absorption
                            </div>
                        </div>

                        <div className="border border-[#1a4b6c] bg-[#06121e]/80 p-3.5 relative">
                            <div className="flex items-center justify-between text-[10px] text-slate-400 tracking-wider">
                                <span>AGENCIES / NATIONS</span>
                                <Globe className="w-3.5 h-3.5 text-emerald-400" />
                            </div>
                            <div className="text-2xl font-bold text-white mt-1.5 tracking-tight">
                                {metrics.distinctCountries}
                            </div>
                            <div className="text-[10px] text-slate-400 mt-1">
                                International HRP Partners
                            </div>
                        </div>

                        <div className="border border-[#1a4b6c] bg-[#06121e]/80 p-3.5 relative">
                            <div className="flex items-center justify-between text-[10px] text-slate-400 tracking-wider">
                                <span>SELECTED DATA</span>
                                <CheckSquare className="w-3.5 h-3.5 text-[#5cdbdf]" />
                            </div>
                            <div className="text-2xl font-bold text-[#5cdbdf] mt-1.5 tracking-wider">
                                {selectedIds.length} <span className="text-xs text-slate-400 font-normal">ROWS</span>
                            </div>
                            <div className="text-[10px] text-slate-400 mt-1">
                                Ready for Bulk Ops
                            </div>
                        </div>
                    </section>

                    {/* Bulk Selection Action Bar */}
                    {selectedIds.length > 0 && (
                        <div className="border-2 border-[#5cdbdf] bg-[#0a1f2e] p-3.5 shadow-[0_0_20px_rgba(92,219,223,0.3)] flex flex-wrap items-center justify-between gap-3 animate-in fade-in duration-150">
                            <div className="flex items-center gap-3">
                                <span className="px-2.5 py-1 bg-[#5cdbdf] text-[#030b14] font-bold text-xs uppercase tracking-wider">
                                    {selectedIds.length} RECORD{selectedIds.length > 1 ? 'S' : ''} SELECTED
                                </span>
                                <span className="text-xs text-slate-300">
                                    Perform bulk operations on chosen astronaut records
                                </span>
                            </div>

                            <div className="flex flex-wrap items-center gap-2 text-xs">
                                <button
                                    type="button"
                                    onClick={exportSelectedCsv}
                                    className="flex items-center gap-1.5 border border-emerald-500 bg-emerald-950/60 text-emerald-300 hover:bg-emerald-900/80 px-3 py-1.5 text-xs transition-colors cursor-pointer"
                                >
                                    <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
                                    <span>EXPORT SELECTED (CSV)</span>
                                </button>

                                <button
                                    type="button"
                                    onClick={exportSelectedJson}
                                    className="flex items-center gap-1.5 border border-amber-500 bg-amber-950/60 text-amber-300 hover:bg-amber-900/80 px-3 py-1.5 text-xs transition-colors cursor-pointer"
                                >
                                    <FileCode className="w-3.5 h-3.5 text-amber-400" />
                                    <span>EXPORT SELECTED (JSON)</span>
                                </button>

                                <button
                                    type="button"
                                    onClick={() => setIsBulkDeleteConfirmOpen(true)}
                                    className="flex items-center gap-1.5 border border-red-500 bg-red-950/80 text-red-300 hover:bg-red-600 hover:text-white px-3 py-1.5 text-xs transition-colors cursor-pointer font-bold shadow-[0_0_10px_rgba(239,68,68,0.3)]"
                                >
                                    <Trash2 className="w-3.5 h-3.5" />
                                    <span>BULK DELETE ({selectedIds.length})</span>
                                </button>

                                <button
                                    type="button"
                                    onClick={() => setSelectedIds([])}
                                    className="flex items-center gap-1 border border-slate-700 bg-slate-900 text-slate-400 hover:text-white px-2.5 py-1.5 text-xs transition-colors cursor-pointer"
                                >
                                    <X className="w-3.5 h-3.5" />
                                    <span>CLEAR</span>
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Filter and Query Command Bar */}
                    <div className="border border-[#1a4b6c] bg-[#06121e]/90 p-3.5 backdrop-blur-md flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3 text-xs">
                        {/* Search Input */}
                        <div className="relative flex-1 max-w-lg">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                            <input
                                type="text"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder="SEARCH ASTRONAUT, HAZARD, CALLSIGN, AGENCY..."
                                className="w-full pl-9 pr-8 py-2 bg-[#030b14] border border-[#1a4b6c] text-[#5cdbdf] placeholder:text-slate-600 focus:outline-none focus:border-[#5cdbdf] transition-all text-xs tracking-wider"
                            />
                            {searchQuery && (
                                <button
                                    onClick={() => setSearchQuery('')}
                                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                                >
                                    <X className="w-3.5 h-3.5" />
                                </button>
                            )}
                        </div>

                        {/* Filter Dropdowns */}
                        <div className="flex flex-wrap items-center gap-2">
                            {/* Hazard Filter */}
                            <div className="flex items-center gap-1 border border-[#1a4b6c] bg-[#030b14] px-2 py-1">
                                <Shield className="w-3.5 h-3.5 text-[#5cdbdf]" />
                                <select
                                    value={selectedHazardFilter}
                                    onChange={(e) => setSelectedHazardFilter(e.target.value)}
                                    className="bg-transparent text-slate-200 focus:outline-none cursor-pointer uppercase text-xs"
                                >
                                    <option value="all" className="bg-[#030b14] text-slate-200">
                                        ALL 5 HAZARDS
                                    </option>
                                    <option value="R" className="bg-[#030b14] text-rose-300">
                                        R - SPACE RADIATION
                                    </option>
                                    <option value="I" className="bg-[#030b14] text-purple-300">
                                        I - ISOLATION & CONFINEMENT
                                    </option>
                                    <option value="D" className="bg-[#030b14] text-amber-300">
                                        D - DISTANCE FROM EARTH
                                    </option>
                                    <option value="G" className="bg-[#030b14] text-sky-300">
                                        G - GRAVITY FIELDS
                                    </option>
                                    <option value="E" className="bg-[#030b14] text-emerald-300">
                                        E - HOSTILE CLOSED ENV
                                    </option>
                                </select>
                            </div>

                            {/* Gender Filter */}
                            <div className="flex items-center gap-1 border border-[#1a4b6c] bg-[#030b14] px-2 py-1">
                                <User className="w-3.5 h-3.5 text-[#5cdbdf]" />
                                <select
                                    value={selectedGender}
                                    onChange={(e) => setSelectedGender(e.target.value)}
                                    className="bg-transparent text-slate-200 focus:outline-none cursor-pointer uppercase text-xs"
                                >
                                    <option value="all" className="bg-[#030b14] text-slate-200">
                                        GENDER: ALL
                                    </option>
                                    <option value="male" className="bg-[#030b14] text-slate-200">
                                        MALE
                                    </option>
                                    <option value="female" className="bg-[#030b14] text-slate-200">
                                        FEMALE
                                    </option>
                                </select>
                            </div>

                            {/* Country / Agency Filter */}
                            <div className="flex items-center gap-1 border border-[#1a4b6c] bg-[#030b14] px-2 py-1">
                                <Globe className="w-3.5 h-3.5 text-[#5cdbdf]" />
                                <select
                                    value={selectedCountry}
                                    onChange={(e) => setSelectedCountry(e.target.value)}
                                    className="bg-transparent text-slate-200 focus:outline-none cursor-pointer text-xs"
                                >
                                    <option value="all" className="bg-[#030b14] text-slate-200">
                                        AGENCY: ALL
                                    </option>
                                    {countries.map((c) => (
                                        <option key={c} value={c} className="bg-[#030b14] text-slate-200">
                                            {c}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            {/* Reset Filters */}
                            {hasActiveFilters && (
                                <button
                                    onClick={resetFilters}
                                    className="px-3 py-2 border border-slate-700 bg-slate-900 text-slate-400 hover:text-white hover:border-slate-500 transition-all flex items-center gap-1 cursor-pointer"
                                    title="Reset active filters"
                                >
                                    <RefreshCw className="w-3 h-3" />
                                    <span>RESET</span>
                                </button>
                            )}

                            <div className="px-3 py-2 border border-[#1a4b6c] bg-[#0a1f2e] text-slate-300 text-xs tracking-wider">
                                SHOWING: <strong className="text-[#5cdbdf]">{filteredRecords.length}</strong> / {localRecords.length}
                            </div>
                        </div>
                    </div>

                    {/* Main Telemetry Table Container */}
                    <div className="border border-[#1a4b6c] bg-[#06121e]/90 relative backdrop-blur-md overflow-hidden">
                        <div className="absolute top-0 left-0 w-3 h-3 border-t-2 border-l-2 border-[#5cdbdf]" />
                        <div className="absolute top-0 right-0 w-3 h-3 border-t-2 border-r-2 border-[#5cdbdf]" />
                        <div className="absolute bottom-0 left-0 w-3 h-3 border-b-2 border-l-2 border-[#5cdbdf]" />
                        <div className="absolute bottom-0 right-0 w-3 h-3 border-b-2 border-r-2 border-[#5cdbdf]" />

                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse text-xs">
                                <thead>
                                    <tr className="bg-[#0a1f2e] border-b border-[#1a4b6c] text-[#5cdbdf] tracking-wider uppercase font-bold">
                                        {/* Selection Checkbox */}
                                        <th className="p-3.5 w-10 text-center">
                                            <button
                                                type="button"
                                                onClick={toggleSelectAll}
                                                className="p-1 hover:text-white transition-colors cursor-pointer"
                                                title={isAllSelected ? 'Deselect all visible rows' : 'Select all visible rows'}
                                            >
                                                {isAllSelected ? (
                                                    <CheckSquare className="w-4 h-4 text-[#5cdbdf]" />
                                                ) : (
                                                    <Square className="w-4 h-4 text-slate-500" />
                                                )}
                                            </button>
                                        </th>
                                        <th
                                            className="p-3.5 cursor-pointer hover:text-white transition-colors"
                                            onClick={() => handleSort('id')}
                                        >
                                            <div className="flex items-center gap-1.5">
                                                <span>ASTRONAUT ID</span>
                                                <ArrowUpDown className="w-3 h-3" />
                                            </div>
                                        </th>
                                        <th
                                            className="p-3.5 cursor-pointer hover:text-white transition-colors"
                                            onClick={() => handleSort('name')}
                                        >
                                            <div className="flex items-center gap-1.5">
                                                <span>CREW MEMBER</span>
                                                <ArrowUpDown className="w-3 h-3" />
                                            </div>
                                        </th>
                                        <th className="p-3.5">PRIMARY HAZARD (RIDGE)</th>
                                        <th className="p-3.5">RISK LEVEL</th>
                                        <th
                                            className="p-3.5 cursor-pointer hover:text-white transition-colors"
                                            onClick={() => handleSort('duration')}
                                        >
                                            <div className="flex items-center gap-1.5">
                                                <span>FLIGHT DURATION</span>
                                                <ArrowUpDown className="w-3 h-3" />
                                            </div>
                                        </th>
                                        <th
                                            className="p-3.5 cursor-pointer hover:text-white transition-colors"
                                            onClick={() => handleSort('boneLoss')}
                                        >
                                            <div className="flex items-center gap-1.5">
                                                <span>BMD LOSS (G)</span>
                                                <ArrowUpDown className="w-3 h-3" />
                                            </div>
                                        </th>
                                        <th
                                            className="p-3.5 cursor-pointer hover:text-white transition-colors"
                                            onClick={() => handleSort('radiation')}
                                        >
                                            <div className="flex items-center gap-1.5">
                                                <span>DOSIMETRY (R)</span>
                                                <ArrowUpDown className="w-3 h-3" />
                                            </div>
                                        </th>
                                        <th className="p-3.5">AFFILIATION / AGENCY</th>
                                        <th className="p-3.5 text-right">ACTIONS</th>
                                    </tr>
                                </thead>

                                <tbody className="divide-y divide-[#1a4b6c]/40">
                                    {filteredRecords.length === 0 ? (
                                        <tr>
                                            <td colSpan={10} className="p-12 text-center text-slate-400 font-mono">
                                                <div className="max-w-md mx-auto space-y-3">
                                                    <AlertTriangle className="w-8 h-8 text-amber-400 mx-auto" />
                                                    <p className="text-white font-bold text-sm tracking-widest">
                                                        NO MATCHING TELEMETRY RECORDS FOUND
                                                    </p>
                                                    <p className="text-slate-400 text-xs">
                                                        No records match the selected filter parameters. Clear the search input or reset filters.
                                                    </p>
                                                    <button
                                                        onClick={resetFilters}
                                                        className="px-4 py-2 border border-[#1a4b6c] bg-[#0a1f2e] text-[#5cdbdf] hover:border-[#5cdbdf] transition-all text-xs tracking-wider cursor-pointer"
                                                    >
                                                        RESET ALL FILTERS
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ) : (
                                        filteredRecords.map((record, index) => {
                                            const recordId = record.Astronaut ?? record.id ?? index;
                                            const isSelected = selectedIds.includes(recordId);
                                            const boneBadge = getBoneLossBadge(record.Bone_Density_Loss);
                                            const hazardBadge = getHazardBadge(record.Hazard_Focus);
                                            const riskBadgeClass = getRiskLevelBadge(record.Risk_Level);
                                            const durationNum = Number(record['Mission_duration(Days)'] ?? (record as any).duration ?? (record as any).missionDurationDays ?? (record as any).Mission_duration) || 0;
                                            const durationPercent = Math.min(100, Math.round((durationNum / 365) * 100));

                                            return (
                                                <tr
                                                    key={recordId}
                                                    onClick={() => setSelectedAstronaut(record)}
                                                    className={`hover:bg-[#0b3d91]/20 transition-colors cursor-pointer group ${
                                                        isSelected ? 'bg-[#5cdbdf]/10 border-l-2 border-l-[#5cdbdf]' : ''
                                                    }`}
                                                >
                                                    {/* Row Checkbox */}
                                                    <td
                                                        className="p-3.5 text-center"
                                                        onClick={(e) => e.stopPropagation()}
                                                    >
                                                        <button
                                                            type="button"
                                                            onClick={() => toggleSelectRow(recordId)}
                                                            className="p-1 hover:text-white transition-colors cursor-pointer"
                                                            title={isSelected ? 'Deselect row' : 'Select row'}
                                                        >
                                                            {isSelected ? (
                                                                <CheckSquare className="w-4 h-4 text-[#5cdbdf]" />
                                                            ) : (
                                                                <Square className="w-4 h-4 text-slate-500" />
                                                            )}
                                                        </button>
                                                    </td>

                                                    {/* Astronaut ID */}
                                                    <td className="p-3.5 font-bold text-slate-300 font-mono">
                                                        <span className="px-2 py-0.5 border border-[#1a4b6c] bg-[#0a1f2e] text-[#5cdbdf]">
                                                            AST-{recordId}
                                                        </span>
                                                    </td>

                                                    {/* Crew Member Name */}
                                                    <td className="p-3.5">
                                                        <div className="font-bold text-white group-hover:text-[#5cdbdf] transition-colors flex items-center gap-2">
                                                            <div className="w-6 h-6 rounded bg-[#0a1f2e] border border-[#1a4b6c] flex items-center justify-center text-[10px] text-[#5cdbdf] font-bold">
                                                                {(record.Name || 'A').charAt(0)}
                                                            </div>
                                                            <span>{record.Name || 'Astronaut Specialist'}</span>
                                                        </div>
                                                        <div className="text-[10px] text-slate-400 mt-0.5">
                                                            Flight Protocol: {record.NASA_HRP_Protocol || 'NASA-STD-3001'}
                                                        </div>
                                                    </td>

                                                    {/* Primary Hazard Focus (RIDGE) */}
                                                    <td className="p-3.5">
                                                        <span className={`px-2 py-0.5 text-[10px] font-bold border rounded-sm inline-flex items-center gap-1.5 ${hazardBadge.color}`}>
                                                            <span>[{hazardBadge.code}]</span>
                                                            <span>{hazardBadge.text}</span>
                                                        </span>
                                                    </td>

                                                    {/* Risk Level */}
                                                    <td className="p-3.5">
                                                        <span className={`px-2 py-0.5 text-[10px] font-bold border rounded-sm ${riskBadgeClass}`}>
                                                            {record.Risk_Level || 'Nominal'}
                                                        </span>
                                                    </td>

                                                    {/* Flight Duration */}
                                                    <td className="p-3.5">
                                                        <div className="font-bold text-white">
                                                            {durationNum} <span className="text-[10px] text-slate-400 font-normal">DAYS</span>
                                                        </div>
                                                        <div className="w-24 h-1.5 bg-[#0a1f2e] border border-[#1a4b6c] mt-1 overflow-hidden">
                                                            <div
                                                                className="h-full bg-gradient-to-r from-sky-500 to-[#5cdbdf]"
                                                                style={{ width: `${durationPercent}%` }}
                                                            />
                                                        </div>
                                                    </td>

                                                    {/* BMD Loss (Bone) */}
                                                    <td className="p-3.5">
                                                        <span
                                                            className={`px-2 py-0.5 border text-xs font-bold inline-block font-mono ${boneBadge.color}`}
                                                        >
                                                            {boneBadge.text}
                                                        </span>
                                                    </td>

                                                    {/* Radiation Exposure */}
                                                    <td className="p-3.5 font-mono">
                                                        <div className="text-amber-300 font-bold">
                                                            {record.Radiation_Exposure ? `${record.Radiation_Exposure} mSv` : '85 mSv'}
                                                        </div>
                                                        <span className="text-[10px] text-slate-500">
                                                            Max Limit: 300 mSv
                                                        </span>
                                                    </td>

                                                    {/* Affiliation / Agency */}
                                                    <td className="p-3.5 text-slate-300">
                                                        <div className="flex items-center gap-1.5">
                                                            <Globe className="w-3.5 h-3.5 text-[#5cdbdf]" />
                                                            <span className="truncate max-w-[150px]">{record.Country || 'USA / NASA'}</span>
                                                        </div>
                                                    </td>

                                                    {/* Actions */}
                                                    <td
                                                        className="p-3.5 text-right space-x-1"
                                                        onClick={(e) => e.stopPropagation()}
                                                    >
                                                        <button
                                                            onClick={() => setSelectedAstronaut(record)}
                                                            className="p-1.5 border border-[#1a4b6c] bg-[#0a1f2e] text-[#5cdbdf] hover:border-[#5cdbdf] hover:text-white transition-colors cursor-pointer inline-block"
                                                            title="Inspect Full Medical Dossier"
                                                        >
                                                            <Eye className="w-3.5 h-3.5" />
                                                        </button>

                                                        <button
                                                            onClick={() => handleOpenEdit(record)}
                                                            className="p-1.5 border border-[#1a4b6c] bg-[#0a1f2e] text-amber-400 hover:border-amber-400 hover:text-white transition-colors cursor-pointer inline-block"
                                                            title="Edit record parameters"
                                                        >
                                                            <Edit3 className="w-3.5 h-3.5" />
                                                        </button>

                                                        <button
                                                            onClick={() => setDeletingRecord(record)}
                                                            className="p-1.5 border border-[#1a4b6c] bg-[#0a1f2e] text-rose-400 hover:border-rose-400 hover:text-white transition-colors cursor-pointer inline-block"
                                                            title="Delete record from database"
                                                        >
                                                            <Trash2 className="w-3.5 h-3.5" />
                                                        </button>
                                                    </td>
                                                </tr>
                                            );
                                        })
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* Bottom Status & Help Note */}
                    <footer className="flex flex-col sm:flex-row items-center justify-between gap-3 text-[11px] text-slate-500 border-t border-[#1a4b6c]/40 pt-4 font-mono">
                        <div>
                            ORBIT • FLIGHT SURGEON BIOASTRONAUTICS CONSOLE // JSC-HOU-9904
                        </div>
                        <div className="flex items-center gap-4 text-slate-400">
                            <span>TOTAL DATABASE RECORDS: <strong className="text-[#5cdbdf]">{localRecords.length}</strong></span>
                            <span>SYNC ENGINE: <strong className="text-emerald-400">SQLITE // NASA HRP ATOMIC</strong></span>
                        </div>
                    </footer>
                </div>

                {/* MODAL 1: Manual Add Astronaut Modal */}
                {isManualAddOpen && (
                    <div
                        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in"
                        onClick={() => setIsManualAddOpen(false)}
                    >
                        <div
                            className="relative w-full max-w-2xl border border-[#1a4b6c] bg-[#06121e] p-6 shadow-[0_0_50px_rgba(0,0,0,0.9)] overflow-hidden font-mono max-h-[92vh] flex flex-col"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <div className="absolute top-0 left-0 w-3.5 h-3.5 border-t-2 border-l-2 border-[#5cdbdf]" />
                            <div className="absolute top-0 right-0 w-3.5 h-3.5 border-t-2 border-r-2 border-[#5cdbdf]" />
                            <div className="absolute bottom-0 left-0 w-3.5 h-3.5 border-b-2 border-l-2 border-[#5cdbdf]" />
                            <div className="absolute bottom-0 right-0 w-3.5 h-3.5 border-b-2 border-r-2 border-[#5cdbdf]" />

                            <div className="flex items-center justify-between border-b border-[#1a4b6c] pb-3 mb-4 shrink-0">
                                <div className="flex items-center gap-2.5">
                                    <div className="p-1.5 border border-[#5cdbdf]/40 bg-[#5cdbdf]/10 text-[#5cdbdf]">
                                        <UserPlus className="w-5 h-5" />
                                    </div>
                                    <div>
                                        <h3 className="text-sm sm:text-base font-bold text-white tracking-wider">
                                            MANUAL ADD ASTRONAUT RECORD
                                        </h3>
                                        <p className="text-[11px] text-slate-400">
                                            Inserts record directly into SQLite <code className="text-[#5cdbdf]">dataset_records</code>
                                        </p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => setIsManualAddOpen(false)}
                                    className="p-1.5 text-slate-400 hover:text-white cursor-pointer"
                                >
                                    <X className="w-4 h-4" />
                                </button>
                            </div>

                            <form onSubmit={handleManualAddSubmit} className="space-y-4 overflow-y-auto flex-1 pr-1 text-xs">
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    <div>
                                        <label className="block text-[10px] text-slate-400 mb-1">
                                            ASTRONAUT ID (LEAVE BLANK FOR AUTO-INCREMENT)
                                        </label>
                                        <input
                                            type="text"
                                            value={manualForm.Astronaut}
                                            onChange={(e) => setManualForm({ ...manualForm, Astronaut: e.target.value })}
                                            placeholder="e.g. 13 (or auto)"
                                            className="w-full bg-[#0a1f2e] border border-[#1a4b6c] px-3 py-1.5 text-white focus:outline-none focus:border-[#5cdbdf]"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-[10px] text-slate-400 mb-1">
                                            CREW MEMBER NAME *
                                        </label>
                                        <input
                                            type="text"
                                            required
                                            value={manualForm.Name}
                                            onChange={(e) => setManualForm({ ...manualForm, Name: e.target.value })}
                                            placeholder="e.g. CDR. Sarah Connor"
                                            className="w-full bg-[#0a1f2e] border border-[#1a4b6c] px-3 py-1.5 text-white focus:outline-none focus:border-[#5cdbdf]"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-[10px] text-slate-400 mb-1">
                                            PRIMARY HAZARD FOCUS (RIDGE)
                                        </label>
                                        <select
                                            value={manualForm.Hazard_Focus}
                                            onChange={(e) => setManualForm({ ...manualForm, Hazard_Focus: e.target.value })}
                                            className="w-full bg-[#0a1f2e] border border-[#1a4b6c] px-3 py-1.5 text-white focus:outline-none focus:border-[#5cdbdf]"
                                        >
                                            <option value="Space Radiation (R)">R - Space Radiation</option>
                                            <option value="Isolation and Confinement (I)">I - Isolation & Confinement</option>
                                            <option value="Distance from Earth (D)">D - Distance from Earth</option>
                                            <option value="Gravity Fields (G)">G - Gravity Fields</option>
                                            <option value="Hostile and Closed Environments (E)">E - Hostile & Closed Environments</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-[10px] text-slate-400 mb-1">
                                            RISK LEVEL
                                        </label>
                                        <select
                                            value={manualForm.Risk_Level}
                                            onChange={(e) => setManualForm({ ...manualForm, Risk_Level: e.target.value })}
                                            className="w-full bg-[#0a1f2e] border border-[#1a4b6c] px-3 py-1.5 text-white focus:outline-none focus:border-[#5cdbdf]"
                                        >
                                            <option value="Nominal">Nominal</option>
                                            <option value="Guarded">Guarded</option>
                                            <option value="Elevated">Elevated</option>
                                            <option value="Critical">Critical</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-[10px] text-slate-400 mb-1">
                                            LAUNCH AGE
                                        </label>
                                        <input
                                            type="number"
                                            value={manualForm.Age_at_mission_start}
                                            onChange={(e) =>
                                                setManualForm({
                                                    ...manualForm,
                                                    Age_at_mission_start: parseInt(e.target.value) || 40,
                                                })
                                            }
                                            className="w-full bg-[#0a1f2e] border border-[#1a4b6c] px-3 py-1.5 text-white focus:outline-none focus:border-[#5cdbdf]"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-[10px] text-slate-400 mb-1">
                                            GENDER
                                        </label>
                                        <select
                                            value={manualForm.Gender}
                                            onChange={(e) => setManualForm({ ...manualForm, Gender: e.target.value })}
                                            className="w-full bg-[#0a1f2e] border border-[#1a4b6c] px-3 py-1.5 text-white focus:outline-none focus:border-[#5cdbdf] uppercase"
                                        >
                                            <option value="Male">Male</option>
                                            <option value="Female">Female</option>
                                            <option value="Other">Other</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-[10px] text-slate-400 mb-1">
                                            AGENCY / COUNTRY
                                        </label>
                                        <input
                                            type="text"
                                            value={manualForm.Country}
                                            onChange={(e) => setManualForm({ ...manualForm, Country: e.target.value })}
                                            className="w-full bg-[#0a1f2e] border border-[#1a4b6c] px-3 py-1.5 text-white focus:outline-none focus:border-[#5cdbdf]"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-[10px] text-slate-400 mb-1">
                                            MISSION DURATION (DAYS)
                                        </label>
                                        <input
                                            type="number"
                                            value={manualForm['Mission_duration(Days)']}
                                            onChange={(e) =>
                                                setManualForm({
                                                    ...manualForm,
                                                    'Mission_duration(Days)': parseInt(e.target.value) || 180,
                                                })
                                            }
                                            className="w-full bg-[#0a1f2e] border border-[#1a4b6c] px-3 py-1.5 text-white focus:outline-none focus:border-[#5cdbdf]"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-[10px] text-slate-400 mb-1">
                                            BONE MINERAL DENSITY LOSS
                                        </label>
                                        <input
                                            type="text"
                                            value={manualForm.Bone_Density_Loss}
                                            onChange={(e) => setManualForm({ ...manualForm, Bone_Density_Loss: e.target.value })}
                                            className="w-full bg-[#0a1f2e] border border-[#1a4b6c] px-3 py-1.5 text-white focus:outline-none focus:border-[#5cdbdf]"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-[10px] text-slate-400 mb-1">
                                            RADIATION EXPOSURE (mSv)
                                        </label>
                                        <input
                                            type="number"
                                            value={manualForm.Radiation_Exposure}
                                            onChange={(e) => setManualForm({ ...manualForm, Radiation_Exposure: parseInt(e.target.value) || 95 })}
                                            className="w-full bg-[#0a1f2e] border border-[#1a4b6c] px-3 py-1.5 text-white focus:outline-none focus:border-[#5cdbdf]"
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-[10px] text-slate-400 mb-1">
                                        COUNTERMEASURES PROTOCOL
                                    </label>
                                    <input
                                        type="text"
                                        value={manualForm.Countermeasures_Used}
                                        onChange={(e) => setManualForm({ ...manualForm, Countermeasures_Used: e.target.value })}
                                        className="w-full bg-[#0a1f2e] border border-[#1a4b6c] px-3 py-1.5 text-white focus:outline-none focus:border-[#5cdbdf]"
                                    />
                                </div>

                                <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#1a4b6c]">
                                    <button
                                        type="button"
                                        onClick={() => setIsManualAddOpen(false)}
                                        className="px-4 py-2 border border-slate-700 text-slate-300 hover:text-white cursor-pointer"
                                    >
                                        CANCEL
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={isSubmitting}
                                        className="px-5 py-2 border border-[#5cdbdf] bg-[#5cdbdf] text-[#030b14] font-bold hover:brightness-110 cursor-pointer disabled:opacity-50 flex items-center gap-2"
                                    >
                                        <Check className="w-4 h-4" />
                                        <span>{isSubmitting ? 'INSERTING...' : 'SAVE RECORD'}</span>
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}

                {/* MODAL 2: Edit Record Modal */}
                {isEditModalOpen && (
                    <div
                        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in"
                        onClick={() => setIsEditModalOpen(false)}
                    >
                        <div
                            className="relative w-full max-w-2xl border border-sky-600 bg-[#06121e] p-6 shadow-[0_0_50px_rgba(2,132,199,0.3)] overflow-hidden font-mono max-h-[92vh] flex flex-col"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <div className="flex items-center justify-between border-b border-[#1a4b6c] pb-3 mb-4 shrink-0">
                                <div className="flex items-center gap-2.5">
                                    <div className="p-1.5 border border-sky-400/40 bg-sky-950/60 text-sky-400">
                                        <Edit3 className="w-5 h-5" />
                                    </div>
                                    <div>
                                        <h3 className="text-sm sm:text-base font-bold text-white tracking-wider">
                                            EDIT ASTRONAUT RECORD #{editForm.Astronaut}
                                        </h3>
                                        <p className="text-[11px] text-slate-400">
                                            Update physiological & hazard monitoring parameters
                                        </p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => setIsEditModalOpen(false)}
                                    className="p-1.5 text-slate-400 hover:text-white cursor-pointer"
                                >
                                    <X className="w-4 h-4" />
                                </button>
                            </div>

                            <form onSubmit={handleEditSubmit} className="space-y-4 overflow-y-auto flex-1 pr-1 text-xs">
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    <div>
                                        <label className="block text-[10px] text-slate-400 mb-1">
                                            CREW MEMBER NAME *
                                        </label>
                                        <input
                                            type="text"
                                            required
                                            value={editForm.Name}
                                            onChange={(e) => setEditForm({ ...editForm, Name: e.target.value })}
                                            className="w-full bg-[#0a1f2e] border border-[#1a4b6c] px-3 py-1.5 text-white focus:outline-none focus:border-[#5cdbdf]"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-[10px] text-slate-400 mb-1">
                                            PRIMARY HAZARD FOCUS (RIDGE)
                                        </label>
                                        <select
                                            value={editForm.Hazard_Focus}
                                            onChange={(e) => setEditForm({ ...editForm, Hazard_Focus: e.target.value })}
                                            className="w-full bg-[#0a1f2e] border border-[#1a4b6c] px-3 py-1.5 text-white focus:outline-none focus:border-[#5cdbdf]"
                                        >
                                            <option value="Space Radiation (R)">R - Space Radiation</option>
                                            <option value="Isolation and Confinement (I)">I - Isolation & Confinement</option>
                                            <option value="Distance from Earth (D)">D - Distance from Earth</option>
                                            <option value="Gravity Fields (G)">G - Gravity Fields</option>
                                            <option value="Hostile and Closed Environments (E)">E - Hostile & Closed Environments</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-[10px] text-slate-400 mb-1">
                                            RISK LEVEL
                                        </label>
                                        <select
                                            value={editForm.Risk_Level}
                                            onChange={(e) => setEditForm({ ...editForm, Risk_Level: e.target.value })}
                                            className="w-full bg-[#0a1f2e] border border-[#1a4b6c] px-3 py-1.5 text-white focus:outline-none focus:border-[#5cdbdf]"
                                        >
                                            <option value="Nominal">Nominal</option>
                                            <option value="Guarded">Guarded</option>
                                            <option value="Elevated">Elevated</option>
                                            <option value="Critical">Critical</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-[10px] text-slate-400 mb-1">
                                            AGENCY / COUNTRY
                                        </label>
                                        <input
                                            type="text"
                                            value={editForm.Country}
                                            onChange={(e) => setEditForm({ ...editForm, Country: e.target.value })}
                                            className="w-full bg-[#0a1f2e] border border-[#1a4b6c] px-3 py-1.5 text-white focus:outline-none focus:border-[#5cdbdf]"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-[10px] text-slate-400 mb-1">
                                            MISSION DURATION (DAYS)
                                        </label>
                                        <input
                                            type="number"
                                            value={editForm['Mission_duration(Days)']}
                                            onChange={(e) =>
                                                setEditForm({
                                                    ...editForm,
                                                    'Mission_duration(Days)': parseInt(e.target.value) || 180,
                                                })
                                            }
                                            className="w-full bg-[#0a1f2e] border border-[#1a4b6c] px-3 py-1.5 text-white focus:outline-none focus:border-[#5cdbdf]"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-[10px] text-slate-400 mb-1">
                                            BONE MINERAL DENSITY LOSS
                                        </label>
                                        <input
                                            type="text"
                                            value={editForm.Bone_Density_Loss}
                                            onChange={(e) => setEditForm({ ...editForm, Bone_Density_Loss: e.target.value })}
                                            className="w-full bg-[#0a1f2e] border border-[#1a4b6c] px-3 py-1.5 text-white focus:outline-none focus:border-[#5cdbdf]"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-[10px] text-slate-400 mb-1">
                                            RADIATION EXPOSURE (mSv)
                                        </label>
                                        <input
                                            type="number"
                                            value={editForm.Radiation_Exposure}
                                            onChange={(e) => setEditForm({ ...editForm, Radiation_Exposure: parseInt(e.target.value) || 95 })}
                                            className="w-full bg-[#0a1f2e] border border-[#1a4b6c] px-3 py-1.5 text-white focus:outline-none focus:border-[#5cdbdf]"
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-[10px] text-slate-400 mb-1">
                                        COUNTERMEASURES PROTOCOL
                                    </label>
                                    <input
                                        type="text"
                                        value={editForm.Countermeasures_Used}
                                        onChange={(e) =>
                                            setEditForm({ ...editForm, Countermeasures_Used: e.target.value })
                                        }
                                        className="w-full bg-[#0a1f2e] border border-[#1a4b6c] px-3 py-1.5 text-white focus:outline-none focus:border-[#5cdbdf]"
                                    />
                                </div>

                                <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#1a4b6c]">
                                    <button
                                        type="button"
                                        onClick={() => setIsEditModalOpen(false)}
                                        className="px-4 py-2 border border-slate-700 text-slate-300 hover:text-white cursor-pointer"
                                    >
                                        CANCEL
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={isSubmitting}
                                        className="px-5 py-2 border border-sky-400 bg-sky-500 text-[#030b14] font-bold hover:brightness-110 cursor-pointer disabled:opacity-50 flex items-center gap-2"
                                    >
                                        <Check className="w-4 h-4" />
                                        <span>{isSubmitting ? 'UPDATING...' : 'SAVE CHANGES'}</span>
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}

                {/* MODAL 3: Delete Record Confirmation */}
                {deletingRecord && (
                    <div
                        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in"
                        onClick={() => setDeletingRecord(null)}
                    >
                        <div
                            className="relative w-full max-w-md border border-red-800/80 bg-[#06121e] p-6 shadow-[0_0_50px_rgba(239,68,68,0.3)] overflow-hidden font-mono text-xs space-y-4"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <div className="flex items-center gap-3 text-red-400">
                                <AlertTriangle className="w-6 h-6 shrink-0" />
                                <h3 className="text-base font-bold text-white tracking-wider">
                                    CONFIRM RECORD DELETION
                                </h3>
                            </div>
                            <p className="text-slate-300 leading-relaxed">
                                Are you sure you want to permanently remove astronaut record{' '}
                                <strong className="text-white">
                                    {deletingRecord.Name} (#{deletingRecord.Astronaut ?? deletingRecord.id})
                                </strong>{' '}
                                from the SQLite database?
                            </p>
                            <div className="flex items-center justify-end gap-3 pt-2">
                                <button
                                    type="button"
                                    onClick={() => setDeletingRecord(null)}
                                    className="px-4 py-2 border border-slate-700 text-slate-300 hover:text-white cursor-pointer"
                                >
                                    CANCEL
                                </button>
                                <button
                                    type="button"
                                    onClick={handleConfirmDelete}
                                    disabled={isSubmitting}
                                    className="px-4 py-2 border border-red-500 bg-red-600 text-white font-bold hover:bg-red-500 cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
                                >
                                    <Trash2 className="w-3.5 h-3.5" />
                                    <span>{isSubmitting ? 'DELETING...' : 'CONFIRM DELETE'}</span>
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* MODAL 4: Bulk Delete Confirmation */}
                {isBulkDeleteConfirmOpen && (
                    <div
                        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in"
                        onClick={() => setIsBulkDeleteConfirmOpen(false)}
                    >
                        <div
                            className="relative w-full max-w-md border border-red-800/80 bg-[#06121e] p-6 shadow-[0_0_50px_rgba(239,68,68,0.3)] overflow-hidden font-mono text-xs space-y-4"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <div className="flex items-center gap-3 text-red-400">
                                <AlertTriangle className="w-6 h-6 shrink-0" />
                                <h3 className="text-base font-bold text-white tracking-wider">
                                    BULK DELETE CONFIRMATION
                                </h3>
                            </div>
                            <p className="text-slate-300 leading-relaxed">
                                You are about to permanently delete{' '}
                                <strong className="text-red-400">{selectedIds.length}</strong> selected astronaut records from the database.
                            </p>
                            <div className="flex items-center justify-end gap-3 pt-2">
                                <button
                                    type="button"
                                    onClick={() => setIsBulkDeleteConfirmOpen(false)}
                                    className="px-4 py-2 border border-slate-700 text-slate-300 hover:text-white cursor-pointer"
                                >
                                    CANCEL
                                </button>
                                <button
                                    type="button"
                                    onClick={handleConfirmBulkDelete}
                                    disabled={isSubmitting}
                                    className="px-4 py-2 border border-red-500 bg-red-600 text-white font-bold hover:bg-red-500 cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
                                >
                                    <Trash2 className="w-3.5 h-3.5" />
                                    <span>{isSubmitting ? 'DELETING ALL...' : `DELETE ALL ${selectedIds.length} RECORDS`}</span>
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* MODAL 5: Telemetry Scan & Bulk Import Modal */}
                <TelemetryImportModal
                    isOpen={isImportModalOpen}
                    onClose={() => setIsImportModalOpen(false)}
                    onSaveToDatabase={handleSaveImportToDatabase}
                />

                {/* MODAL 6: NASA 5 HAZARDS DETAIL MODAL */}
                {selectedHazardModal && (
                    <div
                        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in"
                        onClick={() => setSelectedHazardModal(null)}
                    >
                        <div
                            className="relative w-full max-w-3xl border border-[#5cdbdf] bg-[#06121e] p-6 sm:p-8 shadow-[0_0_60px_rgba(92,219,223,0.3)] overflow-hidden font-mono max-h-[90vh] flex flex-col"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-[#5cdbdf]" />
                            <div className="absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 border-[#5cdbdf]" />
                            <div className="absolute bottom-0 left-0 w-4 h-4 border-b-2 border-l-2 border-[#5cdbdf]" />
                            <div className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-[#5cdbdf]" />

                            {/* Header */}
                            <div className="flex items-center justify-between border-b border-[#1a4b6c] pb-4 mb-4 shrink-0">
                                <div className="flex items-center gap-3">
                                    <span className="w-10 h-10 flex items-center justify-center font-bold text-xl bg-[#030b14] border-2 border-[#5cdbdf] text-[#5cdbdf]">
                                        {selectedHazardModal.hazard_code}
                                    </span>
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <h3 className="text-base sm:text-lg font-bold text-white tracking-wider">
                                                {selectedHazardModal.title}
                                            </h3>
                                            <span className="text-[10px] px-2 py-0.5 border border-[#1a4b6c] bg-[#0a1f2e] text-[#5cdbdf]">
                                                {selectedHazardModal.hazard_id}
                                            </span>
                                        </div>
                                        <p className="text-[11px] text-slate-400 mt-0.5">
                                            {selectedHazardModal.category} • NASA Human Research Program (HRP)
                                        </p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => setSelectedHazardModal(null)}
                                    className="p-1.5 border border-[#1a4b6c] bg-[#0a1f2e] text-slate-400 hover:text-white hover:border-[#5cdbdf] transition-colors cursor-pointer"
                                >
                                    <X className="w-4 h-4" />
                                </button>
                            </div>

                            {/* Modal Content Scrollable */}
                            <div className="space-y-4 overflow-y-auto flex-1 pr-1 text-xs text-slate-300">
                                {/* Description & Deep Space Context */}
                                <div className="p-3.5 border border-[#1a4b6c] bg-[#0a1f2e]/70 space-y-2">
                                    <span className="text-[10px] text-[#5cdbdf] font-bold tracking-wider block">
                                        DEEP SPACE FLIGHT CONTEXT
                                    </span>
                                    <p className="leading-relaxed">
                                        {selectedHazardModal.description}
                                    </p>
                                    {selectedHazardModal.deep_space_context && (
                                        <p className="text-slate-400 font-sans italic pt-1 border-t border-[#1a4b6c]/40">
                                            {selectedHazardModal.deep_space_context}
                                        </p>
                                    )}
                                </div>

                                {/* Key Physiological Risks */}
                                {selectedHazardModal.key_risks && selectedHazardModal.key_risks.length > 0 && (
                                    <div className="p-3.5 border border-rose-950/80 bg-rose-950/20 space-y-2">
                                        <span className="text-[10px] text-rose-400 font-bold tracking-wider flex items-center gap-1.5">
                                            <ShieldAlert className="w-3.5 h-3.5" /> PRIMARY PHYSIOLOGICAL RISKS & CLINICAL PATHOLOGY
                                        </span>
                                        <ul className="space-y-1.5 text-slate-300 pl-4 list-disc marker:text-rose-400">
                                            {selectedHazardModal.key_risks.map((risk, idx) => (
                                                <li key={idx} className="leading-relaxed">
                                                    {risk}
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                )}

                                {/* Key Biomedical Sensor Metrics */}
                                {selectedHazardModal.biomedical_metrics && selectedHazardModal.biomedical_metrics.length > 0 && (
                                    <div className="p-3.5 border border-[#1a4b6c] bg-[#0a1f2e]/60 space-y-2">
                                        <span className="text-[10px] text-[#5cdbdf] font-bold tracking-wider flex items-center gap-1.5">
                                            <Activity className="w-3.5 h-3.5" /> CLINICAL THRESHOLDS & DOSIMETRY METRICS
                                        </span>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2">
                                            {selectedHazardModal.biomedical_metrics.map((m, idx) => (
                                                <div key={idx} className="p-2 border border-[#1a4b6c]/60 bg-[#06121e]">
                                                    <span className="text-[10px] text-slate-400 block">{m.metric}</span>
                                                    <div className="flex items-center justify-between mt-1">
                                                        <span className="text-emerald-400 font-bold text-[11px] font-mono">
                                                            Nominal: {m.nominal}
                                                        </span>
                                                        <span className="text-rose-400 text-[11px] font-mono">
                                                            Alert: {m.critical}
                                                        </span>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* NASA Countermeasures & Technologies */}
                                {selectedHazardModal.countermeasures && selectedHazardModal.countermeasures.length > 0 && (
                                    <div className="p-3.5 border border-emerald-950/80 bg-emerald-950/20 space-y-2">
                                        <span className="text-[10px] text-emerald-400 font-bold tracking-wider flex items-center gap-1.5">
                                            <CheckCircle2 className="w-3.5 h-3.5" /> DEPLOYED NASA COUNTERMEASURES & TECHNOLOGIES
                                        </span>
                                        <div className="space-y-2 mt-2">
                                            {selectedHazardModal.countermeasures.map((cm, idx) => (
                                                <div key={idx} className="p-2 border border-emerald-900/60 bg-[#06121e]">
                                                    <div className="flex items-center justify-between">
                                                        <strong className="text-white text-[11px]">{cm.name}</strong>
                                                        <span className="text-[9px] px-1.5 py-0.5 border border-emerald-700 bg-emerald-950/60 text-emerald-300">
                                                            {cm.status}
                                                        </span>
                                                    </div>
                                                    <p className="text-[10px] text-slate-400 mt-1">{cm.desc}</p>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Footer Buttons */}
                            <div className="flex items-center justify-between gap-3 pt-4 border-t border-[#1a4b6c] mt-4 shrink-0">
                                <a
                                    href={selectedHazardModal.nasa_url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="px-3.5 py-2 border border-[#1a4b6c] bg-[#0a1f2e] text-[#5cdbdf] hover:border-[#5cdbdf] hover:text-white transition-all flex items-center gap-1.5 text-xs font-bold"
                                >
                                    <span>OFFICIAL NASA HRP DOCUMENTATION</span>
                                    <ExternalLink className="w-3.5 h-3.5" />
                                </a>

                                <button
                                    onClick={() => {
                                        setSelectedHazardFilter(selectedHazardModal.hazard_code);
                                        setSelectedHazardModal(null);
                                        toast.info(`Filtered roster to crew evaluated under ${selectedHazardModal.title}`);
                                    }}
                                    className="px-4 py-2 border border-[#5cdbdf] bg-[#5cdbdf] text-[#030b14] font-bold hover:brightness-110 transition-all text-xs"
                                >
                                    FILTER CREW BY THIS HAZARD
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* MODAL 7: Astronaut Inspection Detail Modal (NASA Dossier with 5 Hazards Profile) */}
                {selectedAstronaut && (
                    <div
                        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in"
                        onClick={() => setSelectedAstronaut(null)}
                    >
                        <div
                            className="relative w-full max-w-xl border border-[#1a4b6c] bg-[#06121e] p-6 sm:p-8 shadow-[0_0_50px_rgba(0,0,0,0.9)] overflow-hidden font-mono max-h-[92vh] flex flex-col"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-[#5cdbdf]" />
                            <div className="absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 border-[#5cdbdf]" />
                            <div className="absolute bottom-0 left-0 w-4 h-4 border-b-2 border-l-2 border-[#5cdbdf]" />
                            <div className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-[#5cdbdf]" />

                            <div className="flex items-center justify-between border-b border-[#1a4b6c] pb-4 mb-4 shrink-0">
                                <div className="flex items-center gap-3">
                                    <div className="h-10 w-10 border border-[#1a4b6c] bg-[#0a1f2e] flex items-center justify-center text-[#5cdbdf] font-bold text-base shadow-[0_0_10px_rgba(92,219,223,0.2)]">
                                        {(selectedAstronaut.Name || 'A').charAt(0)}
                                    </div>
                                    <div>
                                        <h3 className="text-base sm:text-lg font-bold text-white tracking-wider">
                                            {selectedAstronaut.Name || 'Astronaut Specialist'}
                                        </h3>
                                        <span className="text-[11px] text-[#5cdbdf] tracking-widest">
                                            CALLSIGN: AST-{selectedAstronaut.Astronaut ?? selectedAstronaut.id ?? 'N/A'} • NASA HRP BIOASTRONAUTICS
                                        </span>
                                    </div>
                                </div>
                                <button
                                    onClick={() => setSelectedAstronaut(null)}
                                    className="p-1.5 border border-[#1a4b6c] bg-[#0a1f2e] text-slate-400 hover:text-white hover:border-[#5cdbdf] transition-colors cursor-pointer"
                                >
                                    <X className="w-4 h-4" />
                                </button>
                            </div>

                            <div className="space-y-4 overflow-y-auto flex-1 pr-1 text-xs">
                                <div className="grid grid-cols-2 gap-3">
                                    <div className="p-3 border border-[#1a4b6c] bg-[#0a1f2e]">
                                        <span className="text-slate-400 block text-[10px] tracking-wider">MISSION DURATION</span>
                                        <span className="text-lg font-bold text-white mt-1 block">
                                            {selectedAstronaut['Mission_duration(Days)'] ?? (selectedAstronaut as any).duration ?? (selectedAstronaut as any).missionDurationDays ?? 180} <span className="text-xs text-sky-400 font-normal">Days</span>
                                        </span>
                                    </div>

                                    <div className="p-3 border border-[#1a4b6c] bg-[#0a1f2e]">
                                        <span className="text-slate-400 block text-[10px] tracking-wider">BMD LOSS (G)</span>
                                        <span className="text-lg font-bold text-rose-400 mt-1 block">
                                            {selectedAstronaut.Bone_Density_Loss || '-3.0%'}
                                        </span>
                                    </div>

                                    <div className="p-3 border border-[#1a4b6c] bg-[#0a1f2e]">
                                        <span className="text-slate-400 block text-[10px] tracking-wider">RADIATION EXPOSURE (R)</span>
                                        <span className="text-lg font-bold text-amber-300 mt-1 block">
                                            {selectedAstronaut.Radiation_Exposure ? `${selectedAstronaut.Radiation_Exposure} mSv` : '88 mSv'}
                                        </span>
                                    </div>

                                    <div className="p-3 border border-[#1a4b6c] bg-[#0a1f2e]">
                                        <span className="text-slate-400 block text-[10px] tracking-wider">PRIMARY HAZARD (RIDGE)</span>
                                        <span className="text-sm font-bold text-[#5cdbdf] mt-1 block truncate">
                                            {selectedAstronaut.Hazard_Focus || 'Gravity Fields (G)'}
                                        </span>
                                    </div>
                                </div>

                                {/* NASA 5-Hazard Clinical Assessment Box */}
                                <div className="p-4 border border-[#1a4b6c] bg-[#0a1f2e]/80 text-slate-300 leading-relaxed">
                                    <div className="text-[#5cdbdf] font-bold mb-2 flex items-center justify-between tracking-wider">
                                        <span className="flex items-center gap-1.5">
                                            <Shield className="w-3.5 h-3.5" /> NASA HRP 5-HAZARD EVALUATION
                                        </span>
                                        <span className="text-[10px] px-2 py-0.5 border border-cyan-800 bg-cyan-950/60 text-cyan-300">
                                            {selectedAstronaut.NASA_HRP_Protocol || 'NASA-STD-3001'}
                                        </span>
                                    </div>
                                    <div className="space-y-1.5 text-[11px]">
                                        <div>
                                            <strong className="text-white">Active Countermeasures:</strong>{' '}
                                            {selectedAstronaut.Countermeasures_Used || 'ARED High-Resistance Exercise, Bisphosphonate protocol, SSLA dynamic circadian spectrum lighting.'}
                                        </div>
                                        <div>
                                            <strong className="text-white">Neuro-Ocular & Vision (SANS):</strong>{' '}
                                            <span className="text-cyan-300">{selectedAstronaut.Vision_Change || 'Clear (Nominal optic nerve sheath)'}</span>
                                        </div>
                                        <div>
                                            <strong className="text-white">Affiliation & Role:</strong>{' '}
                                            {selectedAstronaut.Country || 'USA / NASA'} • {selectedAstronaut.No_of_Mission || 1} Spaceflight Mission(s)
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="flex items-center justify-between gap-3 text-xs pt-4 border-t border-[#1a4b6c] shrink-0">
                                <button
                                    onClick={() => setSelectedAstronaut(null)}
                                    className="px-4 py-2 border border-[#1a4b6c] bg-[#0a1f2e] text-slate-300 hover:text-white hover:border-[#5cdbdf] transition-all cursor-pointer tracking-wider"
                                >
                                    CLOSE DOSSIER
                                </button>
                                <Link
                                    href="/"
                                    className="inline-flex items-center gap-2 px-5 py-2 border border-[#5cdbdf] bg-[#5cdbdf] text-slate-950 font-bold hover:bg-cyan-300 transition-all shadow-[0_0_15px_rgba(92,219,223,0.3)] tracking-wider"
                                >
                                    <span>OPEN IN MISSION HUD</span>
                                    <ChevronRight className="w-4 h-4" />
                                </Link>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </>
    );
}
