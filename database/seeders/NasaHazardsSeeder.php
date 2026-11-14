<?php

namespace Database\Seeders;

use App\Models\NasaHazard;
use Illuminate\Database\Seeder;

class NasaHazardsSeeder extends Seeder
{
    /**
     * Run the database seeds for the 5 Hazards of Human Spaceflight.
     * Source: NASA Human Research Program (HRP) - https://www.nasa.gov/hrp/hazards/
     */
    public function run(): void
    {
        NasaHazard::truncate();

        $hazards = [
            [
                'hazard_code' => 'R',
                'hazard_id' => 'HAZ-01',
                'title' => 'Space Radiation',
                'tagline' => 'Invisible ionizing particle flux beyond Earth’s protective magnetosphere',
                'icon' => 'Radioactive',
                'category' => 'Deep Space Environment',
                'description' => "Above Earth's atmosphere and protective magnetic field, astronauts are exposed to galactic cosmic rays (GCR) from outside the solar system and solar particle events (SPE) from solar coronal mass ejections. Deep space radiation consists of high-energy protons and heavy atomic nuclei (HZE ions) that easily penetrate spacecraft aluminum hull shielding and human biological tissue.",
                'deep_space_context' => "On a 3-year round trip to Mars or deep space lunar missions (Artemis/Gateway), astronauts will encounter cumulative radiation doses up to 100 times higher than typical background radiation on Earth, drastically elevating lifetime cancer mortality and CNS impairment.",
                'key_risks' => [
                    'Increased lifetime risk of exposure-induced death (REID) from lethal carcinomas and leukemia',
                    'Damage to the Central Nervous System (CNS) causing cognitive deceleration, memory deficits, and motor decrements',
                    'Acute Radiation Sickness (ARS) during high-energy Solar Particle Events (nausea, fatigue, lymphocyte depletion)',
                    'Degenerative tissue changes including premature cataractogenesis, cardiovascular endothelial damage, and accelerated arterial stiffening',
                ],
                'biomedical_metrics' => [
                    ['metric' => 'ISS Ambient Dosimetry', 'nominal' => '0.3 - 0.5 mSv/day', 'critical' => '> 1.0 mSv/day', 'unit' => 'mSv/day'],
                    ['metric' => 'Deep Space / Mars Transit', 'nominal' => '1.0 - 1.8 mSv/day', 'critical' => '> 5.0 mSv/day', 'unit' => 'mSv/day'],
                    ['metric' => 'Solar Particle Event (SPE)', 'nominal' => '< 50 mSv/event', 'critical' => '> 250 mSv/event', 'unit' => 'mSv'],
                    ['metric' => 'Career REID Ceiling', 'nominal' => '< 3.0% mean risk', 'critical' => '≥ 3.0% threshold', 'unit' => '% REID'],
                ],
                'countermeasures' => [
                    ['name' => 'Hydrogen-Rich Polyethylene & Water Wall Shielding', 'status' => 'Deployed on Orion & Gateway', 'desc' => 'Spacecraft architecture incorporates water storage bladders and low-Z polymer linings to absorb secondary neutron recoil.'],
                    ['name' => 'Solar Storm Haven Configuration', 'status' => 'Operational Protocol', 'desc' => 'During intense coronal mass ejections, crew retreats to innermost fortified equipment lockers surrounded by food and water supplies.'],
                    ['name' => 'Active Crew Dosimetry & Fast Neutron Spectrometers', 'status' => 'Active Monitoring', 'desc' => 'Continuous wearable silicon semiconductor sensors (CPDS/BIRD) providing real-time absorbed dose rate alarms to flight surgeons.'],
                    ['name' => 'Biomedical Radioprotectants & Antioxidant Formulations', 'status' => 'Clinical Research', 'desc' => 'Targeted pharmaceutical scavenging of reactive oxygen species (ROS) and DNA repair up-regulators.'],
                ],
                'hrp_elements' => ['Space Radiation Element (SR)', 'Human Health Countermeasures (HHC)'],
                'nasa_url' => 'https://www.nasa.gov/hrp/hazards/',
                'severity_level' => 'CRITICAL',
            ],
            [
                'hazard_code' => 'I',
                'hazard_id' => 'HAZ-02',
                'title' => 'Isolation and Confinement',
                'tagline' => 'Psychological and circadian strain of living in cramped habitats with small crews',
                'icon' => 'Moon',
                'category' => 'Behavioral Health & Performance',
                'description' => "Expedition crews are confined to tight habitable modules for months or years, completely isolated from family, friends, natural terrestrial sensory variety, and Earth's normal day-night cycle. The psychological friction of prolonged confinement is one of the highest human risks for deep space transit.",
                'deep_space_context' => "During an extended Mars mission lasting ~1,000 days, astronauts cannot step outside, have no real-time voice calls with loved ones due to distance latency, and must maintain flawless cooperative team dynamics under high-consequence operational pressure.",
                'key_risks' => [
                    'Severe circadian rhythm desynchronization, chronic sleep debt, and insomnia',
                    'Psychological fatigue, depressive/affective episodes, and motivational decline',
                    'Interpersonal tension, crew-ground communication friction, and team cohesion breakdown',
                    'Impaired psychomotor vigilance, increased operational error rate, and attentional tunneling',
                ],
                'biomedical_metrics' => [
                    ['metric' => 'Actigraphy Sleep Duration', 'nominal' => '≥ 7.5 hrs/night', 'critical' => '< 6.0 hrs/night', 'unit' => 'hours'],
                    ['metric' => 'Sleep Efficiency Index', 'nominal' => '≥ 85%', 'critical' => '< 75%', 'unit' => '%'],
                    ['metric' => 'PVT (Psychomotor Vigilance) Lapses', 'nominal' => '0 - 1 lapse', 'critical' => '≥ 4 lapses', 'unit' => 'count'],
                    ['metric' => 'Circadian Phase Angle Shift', 'nominal' => '± 30 mins', 'critical' => '> 90 mins', 'unit' => 'minutes'],
                ],
                'countermeasures' => [
                    ['name' => 'Solid-State Dynamic Spectrum Lighting (SSLA)', 'status' => 'Deployed on ISS', 'desc' => 'Circadian-adjusted blue-enriched LED illumination during morning shifts for alertness, shifting to red-spectrum dimming at night for melatonin synthesis.'],
                    ['name' => 'Mandatory 8-Hour Protected Sleep Schedule', 'status' => 'Mission Rule', 'desc' => 'Strict flight rule adherence prohibiting work intrusions into circadian rest periods with sound-attenuated private quarters.'],
                    ['name' => 'Earth-Ambient VR & Olfactory Nature Stimulation', 'status' => 'Under Testing', 'desc' => 'Immersive sensory stimulation simulations restoring visual, acoustic, and olfactory exposure to natural terrestrial environments.'],
                    ['name' => 'Autonomous Behavioral Health & Mood Tracking', 'status' => 'Active Protocol', 'desc' => 'Standardized computerized cognitive battery and voice stress acoustic analysis for early intervention.'],
                ],
                'hrp_elements' => ['Behavioral Health & Performance (BHP)', 'Human Factors & Behavioral Performance (HFBP)'],
                'nasa_url' => 'https://www.nasa.gov/hrp/hazards/',
                'severity_level' => 'HIGH',
            ],
            [
                'hazard_code' => 'D',
                'hazard_id' => 'HAZ-03',
                'title' => 'Distance from Earth',
                'tagline' => 'Extreme distance, communication time delay, and the requirement for clinical autonomy',
                'icon' => 'Compass',
                'category' => 'Autonomous Exploration Operations',
                'description' => "As astronauts venture toward the Moon (240,000 miles) and Mars (up to 140-250 million miles), immediate abort to Earth and emergency evacuation become physically impossible. Radio communications experience speed-of-light delays up to 22 minutes each direction, requiring crews to solve complex medical emergencies autonomously.",
                'deep_space_context' => "If an astronaut develops acute surgical abdomen (e.g. appendicitis), cardiac arrhythmia, or trauma during Mars transit, Mission Control flight surgeons in Houston cannot provide real-time guidance. The crew and onboard AI must independently diagnose and treat.",
                'key_risks' => [
                    'Communication latency up to 44 minutes round-trip preventing real-time Earth medical consultation',
                    'Inability to evacuate ill or injured crew members or receive emergency medical supply flights',
                    'Accelerated degradation and shelf-life expiration of pharmaceuticals exposed to cosmic radiation',
                    'Misdiagnosis or procedural errors during high-stress autonomous clinical procedures',
                ],
                'biomedical_metrics' => [
                    ['metric' => 'One-Way Light Speed Comm Delay', 'nominal' => '< 1.3 sec (Moon)', 'critical' => '4 - 22 mins (Mars)', 'unit' => 'mins'],
                    ['metric' => 'Round-Trip Telemedicine Latency', 'nominal' => '< 3.0 sec', 'critical' => '8 - 44 mins', 'unit' => 'mins'],
                    ['metric' => 'Clinical Autonomy Readiness Index', 'nominal' => '≥ Level 4', 'critical' => '< Level 3', 'unit' => 'Level (1-5)'],
                    ['metric' => 'Medical Formulary Potency Retention', 'nominal' => '≥ 90%', 'critical' => '< 75%', 'unit' => '% potency'],
                ],
                'countermeasures' => [
                    ['name' => 'Autonomous Medical Decision Support (AHMS AI)', 'status' => 'Active Architecture', 'desc' => 'Clinical algorithmic guidance providing immediate differential diagnosis, surgical protocols, and pharmacology recommendations.'],
                    ['name' => 'Exploration Medical Capability (ExMC) System', 'status' => 'In Development', 'desc' => 'Compact modular ultrasound, blood electrolyte analyzers, automated intravenous fluid generators, and sterilization kits.'],
                    ['name' => 'Just-in-Time VR Procedural Clinical Training', 'status' => 'Deployed for Deep Space', 'desc' => 'Interactive virtual reality clinical refreshers allowing astronauts to review emergency procedures immediately before intervention.'],
                    ['name' => 'Radiation-Shielded Pharmaceutical Containment', 'status' => 'Under Qualification', 'desc' => 'Hermetically sealed, temperature-regulated, heavy-shielded formulary pods prolonging drug chemical stability.'],
                ],
                'hrp_elements' => ['Exploration Medical Capability (ExMC)'],
                'nasa_url' => 'https://www.nasa.gov/hrp/hazards/',
                'severity_level' => 'CRITICAL',
            ],
            [
                'hazard_code' => 'G',
                'hazard_id' => 'HAZ-04',
                'title' => 'Gravity Fields (Altered Gravity)',
                'tagline' => 'Transitions between 0g weightlessness, Moon 1/6g, Mars 3/8g, and Earth 1g',
                'icon' => 'Orbit',
                'category' => 'Physiological Countermeasures',
                'description' => "Astronauts experience dramatic gravitational shifts: high-g launch acceleration, continuous microgravity (0g) during transit, partial gravity on the Moon (1/6g) or Mars (3/8g), and abrupt hypergravity during atmospheric entry. Prolonged unloading causes systemic musculoskeletal deconditioning, fluid redistribution, and cardiovascular atrophy.",
                'deep_space_context' => "Without constant gravity pulling bodily fluids toward the feet, ~2 liters of interstitial fluid shifts cephalad (headward), expanding the optic nerve sheath and causing SANS (Spaceflight-Associated Neuro-ocular Syndrome). Bones shed calcium into urine, increasing kidney stone risk and fragility fractures.",
                'key_risks' => [
                    'Progressive bone mineral density (BMD) loss of 1.0% to 1.5% per month in weight-bearing skeleton',
                    'Disuse muscular atrophy with fast-to-slow muscle fiber transition and loss of postural torque',
                    'Spaceflight-Associated Neuro-ocular Syndrome (SANS): optic disc edema, globe flattening, hyperopic vision shift',
                    'Orthostatic intolerance and neurovascular syncope upon landing in planetary gravity',
                    'Vestibular and sensorimotor ataxia, space motion sickness, and spatial disorientation',
                ],
                'biomedical_metrics' => [
                    ['metric' => 'Monthly BMD Loss (Weight-Bearing)', 'nominal' => '< -0.8% / mo', 'critical' => '≥ -1.5% / mo', 'unit' => '%/month'],
                    ['metric' => 'Optic Nerve Sheath Diameter (ONSD)', 'nominal' => '4.5 - 5.5 mm', 'critical' => '> 5.8 mm (SANS)', 'unit' => 'mm'],
                    ['metric' => 'Calf Muscle Cross-Sectional Area', 'nominal' => '< -3% loss', 'critical' => '> -8% loss', 'unit' => '% loss'],
                    ['metric' => 'Post-Landing Orthostatic Heart Rate Delta', 'nominal' => '< 25 bpm spike', 'critical' => '≥ 35 bpm (syncope risk)', 'unit' => 'bpm'],
                ],
                'countermeasures' => [
                    ['name' => 'Advanced Resistive Exercise Device (ARED)', 'status' => 'Operational ISS Gold Standard', 'desc' => 'High-load vacuum cylinder resistance training delivering up to 600 lbs of load daily to mimic heavy 1g squats and deadlifts.'],
                    ['name' => 'T2 Treadmill & Cycle Ergometer with Vibration Isolation (CEVIS)', 'status' => 'Daily Operational Requirement', 'desc' => 'Aerobic cardiovascular conditioning maintaining VO2 max, stroke volume, and arterial baroreflex sensitivity.'],
                    ['name' => 'Lower Body Negative Pressure (LBNP) Suits', 'status' => 'Clinical Validation', 'desc' => 'Suction chambers pulling pooled headward fluids back into the lower pelvis and legs to reverse SANS intracranial hypertension.'],
                    ['name' => 'Bisphosphonate Therapy & Fluid Loading Protocol', 'status' => 'Standard Clinical Protocol', 'desc' => 'Intravenous zoledronic acid preventing osteoclastic resorption combined with isotonic electrolyte rehydration before descent.'],
                ],
                'hrp_elements' => ['Human Health Countermeasures (HHC)'],
                'nasa_url' => 'https://www.nasa.gov/hrp/hazards/',
                'severity_level' => 'CRITICAL',
            ],
            [
                'hazard_code' => 'E',
                'hazard_id' => 'HAZ-05',
                'title' => 'Hostile and Closed Environments',
                'tagline' => 'Hermetic life support ecology, recycled air/water, altered microbiome, and toxic regolith',
                'icon' => 'Biohazard',
                'category' => 'Habitability & Life Support Ecology',
                'description' => "The spacecraft or extraterrestrial surface habitat is an artificial closed ecosystem. Astronauts continuously breathe recycled atmosphere and drink reclaimed condensation and urine. Mechanical systems, toxic trace contaminants, carbon dioxide accumulation, microbial mutations, and extraterrestrial regolith dust present constant threats.",
                'deep_space_context' => "In a sealed module, common benign bacteria mutate to become more virulent or antibiotic-resistant while crew immune defenses weaken. Lunar and Martian regolith (fine, jagged, chemically reactive mineral dust) clings to EVA suits, abrades airlocks, and threatens pulmonary health.",
                'key_risks' => [
                    'Carbon dioxide (pCO2) elevation causing hypercapnia, cognitive lethargy, headaches, and visual disturbances',
                    'Immune system dysregulation, T-cell suppression, and asymptomatic reactivation of latent viruses (EBV, VZV, CMV)',
                    'Microbiome shifts and acceleration of opportunistic microbial biofilm colonization on life support pipes',
                    'Pulmonary and ocular inflammation from fine abrasive extraterrestrial dust (lunar/Martian regolith)',
                    'Toxic trace volatile organic chemical buildup from habitat outgassing and life support malfunctions',
                ],
                'biomedical_metrics' => [
                    ['metric' => 'Cabin Carbon Dioxide Partial Pressure', 'nominal' => '< 2.0 mmHg', 'critical' => '≥ 3.0 mmHg (Toxicity)', 'unit' => 'mmHg'],
                    ['metric' => 'Atmospheric Cabin Pressure', 'nominal' => '14.7 psi (101.3 kPa)', 'critical' => '< 10.2 psi (Hypoxia)', 'unit' => 'psi'],
                    ['metric' => 'ECLSS Water Recycling Recovery Rate', 'nominal' => '≥ 98.0%', 'critical' => '< 90.0%', 'unit' => '% recovery'],
                    ['metric' => 'Airborne Particulate Dust Concentration', 'nominal' => '< 0.05 mg/m³', 'critical' => '> 0.3 mg/m³', 'unit' => 'mg/m³'],
                    ['metric' => 'Latent Viral Reactivation Shedding', 'nominal' => 'Negative / Undetectable', 'critical' => 'Positive High Titer', 'unit' => 'copies/mL'],
                ],
                'countermeasures' => [
                    ['name' => 'ECLSS Regenerative Sabatier & Carbon Dioxide Scrubbing', 'status' => 'Operational Station Subsystem', 'desc' => 'Thermal catalytic Sabatier reactors and Rapid Cycling Amine (RCA) adsorbents recovering breathable oxygen from CO2.'],
                    ['name' => 'Trace Contaminant Control Subsystem (TCCS) & HEPA Filtration', 'status' => 'Continuous Scrubbing', 'desc' => 'High-temperature catalytic oxidizers and activated carbon beds eliminating volatile organic compounds and airborne spores.'],
                    ['name' => 'Electrostatic & Magnetic Regolith Mitigation Airlocks', 'status' => 'Artemis Surface Hardware', 'desc' => 'Active dust repelling shields and vacuum airlocks preventing toxic extraterrestrial dust intrusion into living quarters.'],
                    ['name' => 'Microbial DNA Rapid Sequencing & Potable Water Disinfection', 'status' => 'Operational Biomolecular Sequencer', 'desc' => 'Nanopore in-flight sequencing identifying bacterial mutations and silver-ion biocides preventing water pipeline biofilms.'],
                ],
                'hrp_elements' => ['Environmental Control and Life Support Systems (ECLSS)', 'Immunology Element'],
                'nasa_url' => 'https://www.nasa.gov/hrp/hazards/',
                'severity_level' => 'HIGH',
            ],
        ];

        foreach ($hazards as $hazard) {
            NasaHazard::create($hazard);
        }
    }
}

