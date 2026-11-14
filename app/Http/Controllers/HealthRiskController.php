<?php

namespace App\Http\Controllers;

use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class HealthRiskController extends Controller
{
    /**
     * Analyze current astronaut vitals and spaceflight indicators to identify
     * acute & long-term health risks in microgravity, their microgravity pathophysiology,
     * and autonomous NASA-STD-3001 countermeasures.
     */
    public function analyze(Request $request): JsonResponse
    {
        $systolic = (int) ($request->input('systolic_bp') ?? $request->input('blood_pressure_systolic') ?? 120);
        $diastolic = (int) ($request->input('diastolic_bp') ?? $request->input('blood_pressure_diastolic') ?? 80);
        $heartRate = (int) ($request->input('heart_rate') ?? 75);
        $spo2 = (float) ($request->input('sp_o2') ?? $request->input('spo2') ?? 98.0);
        $coreTemp = (float) ($request->input('core_temp') ?? $request->input('core_temperature') ?? 37.0);
        $radiationRate = (float) ($request->input('radiation_rate') ?? 0.18); // mSv/h
        $cumulativeRadiation = (float) ($request->input('cumulative_radiation') ?? 85.0); // mSv
        $boneLossPct = (float) ($request->input('bone_loss_pct') ?? -2.8); // %
        $hydrationPct = (int) ($request->input('hydration_pct') ?? 78); // %
        $cabinCo2 = (float) ($request->input('cabin_co2') ?? 2.8); // mmHg
        $astronautName = $request->input('astronaut_name', 'Mission Specialist');
        $astronautId = $request->input('astronaut_id', 'AST-01');

        $identifiedRisks = [];
        $immediateActions = [];
        $hazardCorrelations = [];
        $overallScore = 100; // Deducted for each anomaly

        // -------------------------------------------------------------
        // 1. BLOOD PRESSURE ASSESSMENT (Hypertension in Microgravity)
        // -------------------------------------------------------------
        $bpEvaluation = $this->evaluateBloodPressure($systolic, $diastolic);
        if ($bpEvaluation['risk_severity'] !== 'NOMINAL') {
            $identifiedRisks[] = $bpEvaluation;
            $overallScore -= $bpEvaluation['score_penalty'];
            foreach ($bpEvaluation['countermeasures'] as $cm) {
                $immediateActions[] = $cm;
            }
            $hazardCorrelations[] = 'Gravity Fields (G) - Microgravity Cephalad Fluid Shift';
            if ($cabinCo2 > 3.0) {
                $hazardCorrelations[] = 'Hostile Closed Environment (E) - Hypercapnia Induced Cerebral Vasodilation';
            }
        }

        // -------------------------------------------------------------
        // 2. HEART RATE ASSESSMENT (Tachycardia / Bradycardia in EVA)
        // -------------------------------------------------------------
        $hrEvaluation = $this->evaluateHeartRate($heartRate);
        if ($hrEvaluation['risk_severity'] !== 'NOMINAL') {
            $identifiedRisks[] = $hrEvaluation;
            $overallScore -= $hrEvaluation['score_penalty'];
            foreach ($hrEvaluation['countermeasures'] as $cm) {
                $immediateActions[] = $cm;
            }
        }

        // -------------------------------------------------------------
        // 3. OXYGEN SATURATION ASSESSMENT (Hypoxia & Suit Depressurization)
        // -------------------------------------------------------------
        $spo2Evaluation = $this->evaluateSpO2($spo2);
        if ($spo2Evaluation['risk_severity'] !== 'NOMINAL') {
            $identifiedRisks[] = $spo2Evaluation;
            $overallScore -= $spo2Evaluation['score_penalty'];
            foreach ($spo2Evaluation['countermeasures'] as $cm) {
                $immediateActions[] = $cm;
            }
        }

        // -------------------------------------------------------------
        // 4. CORE TEMPERATURE ASSESSMENT (Hyperthermia / Heat Exhaustion)
        // -------------------------------------------------------------
        $tempEvaluation = $this->evaluateCoreTemp($coreTemp);
        if ($tempEvaluation['risk_severity'] !== 'NOMINAL') {
            $identifiedRisks[] = $tempEvaluation;
            $overallScore -= $tempEvaluation['score_penalty'];
            foreach ($tempEvaluation['countermeasures'] as $cm) {
                $immediateActions[] = $cm;
            }
        }

        // -------------------------------------------------------------
        // 5. SPACE RADIATION DOSIMETRY ASSESSMENT
        // -------------------------------------------------------------
        $radEvaluation = $this->evaluateRadiation($radiationRate, $cumulativeRadiation);
        if ($radEvaluation['risk_severity'] !== 'NOMINAL') {
            $identifiedRisks[] = $radEvaluation;
            $overallScore -= $radEvaluation['score_penalty'];
            foreach ($radEvaluation['countermeasures'] as $cm) {
                $immediateActions[] = $cm;
            }
            $hazardCorrelations[] = 'Space Radiation (R) - Galactic Cosmic Rays & Solar Particle Event';
        }

        // -------------------------------------------------------------
        // 6. BONE DENSITY & MUSCULOSKELETAL LOSS ASSESSMENT
        // -------------------------------------------------------------
        $boneEvaluation = $this->evaluateBoneDensity($boneLossPct);
        if ($boneEvaluation['risk_severity'] !== 'NOMINAL') {
            $identifiedRisks[] = $boneEvaluation;
            $overallScore -= $boneEvaluation['score_penalty'];
            foreach ($boneEvaluation['countermeasures'] as $cm) {
                $immediateActions[] = $cm;
            }
            $hazardCorrelations[] = 'Gravity Fields (G) - Musculoskeletal Deconditioning';
        }

        // -------------------------------------------------------------
        // 7. HABITAT CO2 & CABIN AIR ASSESSMENT
        // -------------------------------------------------------------
        $co2Evaluation = $this->evaluateCabinCo2($cabinCo2);
        if ($co2Evaluation['risk_severity'] !== 'NOMINAL') {
            $identifiedRisks[] = $co2Evaluation;
            $overallScore -= $co2Evaluation['score_penalty'];
            foreach ($co2Evaluation['countermeasures'] as $cm) {
                $immediateActions[] = $cm;
            }
            $hazardCorrelations[] = 'Hostile Closed Environment (E) - Toxic Gas & Scrubber Saturation';
        }

        // -------------------------------------------------------------
        // 8. HYDRATION & THROMBOSIS ASSESSMENT
        // -------------------------------------------------------------
        $hydrationEvaluation = $this->evaluateHydration($hydrationPct);
        if ($hydrationEvaluation['risk_severity'] !== 'NOMINAL') {
            $identifiedRisks[] = $hydrationEvaluation;
            $overallScore -= $hydrationEvaluation['score_penalty'];
            foreach ($hydrationEvaluation['countermeasures'] as $cm) {
                $immediateActions[] = $cm;
            }
        }

        // Calculate Overall Severity Level
        $overallScore = max(10, min(100, $overallScore));
        $riskLevel = 'NOMINAL';
        if ($overallScore < 50 || collect($identifiedRisks)->contains('risk_severity', 'CRITICAL')) {
            $riskLevel = 'CRITICAL_EMERGENCY';
        } elseif ($overallScore < 70 || collect($identifiedRisks)->contains('risk_severity', 'HIGH')) {
            $riskLevel = 'HIGH_RISK';
        } elseif ($overallScore < 88 || count($identifiedRisks) > 0) {
            $riskLevel = 'MODERATE_RISK';
        }

        return response()->json([
            'success' => true,
            'timestamp' => now()->toIso8601String(),
            'astronaut' => [
                'id' => $astronautId,
                'name' => $astronautName,
            ],
            'evaluated_metrics' => [
                'blood_pressure' => "{$systolic}/{$diastolic} mmHg",
                'heart_rate' => "{$heartRate} bpm",
                'spo2' => "{$spo2}%",
                'core_temperature' => "{$coreTemp}°C",
                'radiation_rate' => "{$radiationRate} mSv/h",
                'cumulative_radiation' => "{$cumulativeRadiation} mSv",
                'bone_loss' => "{$boneLossPct}%",
                'hydration' => "{$hydrationPct}%",
                'cabin_co2' => "{$cabinCo2} mmHg",
            ],
            'health_score' => $overallScore,
            'overall_risk_level' => $riskLevel,
            'identified_risks_count' => count($identifiedRisks),
            'identified_risks' => $identifiedRisks,
            'autonomous_countermeasures' => array_values(array_unique($immediateActions, SORT_REGULAR)),
            'hazard_correlations' => array_values(array_unique($hazardCorrelations)),
            'clinical_summary' => $this->buildClinicalSummary($riskLevel, $identifiedRisks, $astronautName),
        ]);
    }

    /**
     * Return knowledge base and reference threshold table for spaceflight vitals.
     */
    public function knowledge(Request $request): JsonResponse
    {
        $topic = strtolower((string) $request->input('topic', 'all'));

        $knowledgeBase = [
            'blood_pressure' => [
                'parameter' => 'Blood Pressure (Systolic / Diastolic)',
                'nominal_range' => '90-120 / 60-80 mmHg',
                'spaceflight_danger_threshold' => 'Systolic ≥ 140 mmHg or Diastolic ≥ 90 mmHg',
                'primary_spaceflight_pathology' => 'Cephalad microgravity fluid shift (~2 Liters of blood moves from legs to upper torso and head), compounding intracranial venous hypertension.',
                'possible_spaceflight_risks' => [
                    'Spaceflight-Associated Neuro-ocular Syndrome (SANS): Optic disc swelling (papilledema), globe flattening, irreversible choroidal folds, and hyperopic near-vision loss.',
                    'Internal Jugular Vein (IJV) Thrombosis: Venous stasis and elevated cerebral backpressure promote endothelial micro-thrombi.',
                    'Cerebrovascular Stroke: Arterial shear stress in microgravity environments with zero terrestrial catheterization capabilities.',
                    'Re-Entry Orthostatic Shock: Arterial baroreceptor down-regulation causing blackout (G-LOC) during 4G planetary re-entry.',
                ],
                'nasa_countermeasures' => [
                    'Lower Body Negative Pressure (LBNP) suit decompressed to -35 mmHg for 120 minutes.',
                    'NASA Medical Formulary: Lisinopril (ACE inhibitor) 10mg PO or Losartan 50mg PO.',
                    'Immediate Optic Nerve Sheath Diameter (ONSD) ultrasound self-scan.',
                ],
            ],
            'heart_rate' => [
                'parameter' => 'Heart Rate (ECG Sinus Rhythm)',
                'nominal_range' => '60 - 100 bpm (rest), up to 135 bpm (peak EVA)',
                'spaceflight_danger_threshold' => '> 120 bpm at rest or > 160 bpm during EVA',
                'primary_spaceflight_pathology' => 'Myocardial deconditioning, left ventricular mass reduction in 0G, adrenergic surge, or Liquid Cooling Garment (LCG) thermal loops failure.',
                'possible_spaceflight_risks' => [
                    'Cardiac Exhaustion & Heat Stroke during Extravehicular Activity (EVA).',
                    'Atrial Fibrillation / Ventricular Arrhythmias induced by hypokalemia and space radiation.',
                    'Hypercapnia-induced tachycardia from failing CO2 scrubber beds.',
                ],
                'nasa_countermeasures' => [
                    'Mandate immediate 180s station hold and pacing breath cycle.',
                    'Increase Liquid Cooling Garment (LCG) coolant flow rate to maximum.',
                    'Check cabin pCO2; administer oral hydration with magnesium/potassium salts.',
                ],
            ],
            'spo2' => [
                'parameter' => 'Oxygen Saturation (SpO2)',
                'nominal_range' => '95% - 100%',
                'spaceflight_danger_threshold' => '< 94% (Guarded), < 90% (Critical Emergency)',
                'primary_spaceflight_pathology' => 'Suit regulator failure, cabin pressure decay below 10.2 psi, or nitrogen pre-breathe inadequacy.',
                'possible_spaceflight_risks' => [
                    'Decompression Sickness (Bends / Chokes): Nitrogen bubbles forming in joints and pulmonary micro-vasculature.',
                    'Hypoxic Brain Injury: Rapid loss of cognitive vigilance, manual control dexterity, and consciousness.',
                ],
                'nasa_countermeasures' => [
                    'Engage secondary 100% O2 reserve purge valve.',
                    'Repressurize suit / habitat airlock immediately to 14.7 psi (101.3 kPa).',
                ],
            ],
            'radiation' => [
                'parameter' => 'Space Radiation Dosimetry',
                'nominal_range' => '< 0.25 mSv/day (LEO baseline)',
                'spaceflight_danger_threshold' => '> 0.50 mSv/h (acute SPE spike) or > 600 mSv cumulative career dose',
                'primary_spaceflight_pathology' => 'High-Z high-energy (HZE) cosmic ions and Solar Particle Event (SPE) proton cascades penetrating spacecraft hull.',
                'possible_spaceflight_risks' => [
                    'Acute Radiation Syndrome (ARS): Prodromal nausea, hematopoietic bone marrow depletion, severe immune compromise.',
                    'Cherenkov Retinal Phosphenes: Direct ionization flashes across retinal photoreceptors.',
                    'Long-Term REID: Elevated lifetime Risk of Exposure-Induced Death from cancer and cardiovascular sclerosis.',
                ],
                'nasa_countermeasures' => [
                    'Immediate lockdown inside Storm Haven radiation shelter surrounded by water-wall shielding.',
                    'Administer radioprotectant antioxidants and filgrastim for white blood cell count preservation.',
                ],
            ],
            'bone_density' => [
                'parameter' => 'Bone Mineral Density & Calcium Metabolism',
                'nominal_range' => '< 0.5% loss / month',
                'spaceflight_danger_threshold' => '> 1.0% loss / month or > 3.0% cumulative flight loss',
                'primary_spaceflight_pathology' => 'Lack of gravitational mechanical axial loading reduces osteoblast activity while osteoclasts resorb bone trabeculae.',
                'possible_spaceflight_risks' => [
                    'Nephrolithiasis (Kidney Stones): Hypercalciuria causes acute calcium oxalate stone formation, risking ureteral obstruction in deep space.',
                    'Fragility Fractures: High risk of calcaneal and femoral neck micro-fractures during lunar/Martian EVAs.',
                ],
                'nasa_countermeasures' => [
                    'Increase Advanced Resistive Exercise Device (ARED) squats and deadlifts to 600 N axial load daily.',
                    'Administer intravenous or oral bisphosphonates (Alendronate) and high-dose Vitamin D3.',
                ],
            ],
            'cabin_co2' => [
                'parameter' => 'Habitat Partial Pressure of CO2 (pCO2)',
                'nominal_range' => '< 2.0 mmHg (0.27 kPa)',
                'spaceflight_danger_threshold' => '≥ 3.0 mmHg (NASA-STD-3001 Limit)',
                'primary_spaceflight_pathology' => 'Without convective buoyancy in 0G, expired CO2 forms stagnant pockets around astronauts\' heads, creating severe localized hypercapnia.',
                'possible_spaceflight_risks' => [
                    'Severe Frontal "Space Headaches" and cognitive fatigue.',
                    'Cerebral Vasodilation aggravating optic disc edema and SANS.',
                    'Respiratory acidosis and sleep architecture breakdown.',
                ],
                'nasa_countermeasures' => [
                    'Command ECLSS amine-bed and lithium hydroxide (LiOH) canisters to high-flow purge cycle.',
                    'Adjust cabin air diffuser velocity fans to disperse localized CO2 pockets.',
                ],
            ],
        ];

        if ($topic !== 'all' && isset($knowledgeBase[$topic])) {
            return response()->json([
                'success' => true,
                'topic' => $topic,
                'data' => $knowledgeBase[$topic],
            ]);
        }

        return response()->json([
            'success' => true,
            'system' => 'ORBIT Astronaut Health Risk & Microgravity Pathophysiology Engine',
            'standard' => 'NASA-STD-3001 & Human Research Program (HRP)',
            'knowledge_base' => $knowledgeBase,
        ]);
    }

    // -------------------------------------------------------------
    // EVALUATION HELPERS
    // -------------------------------------------------------------

    /**
     * @return array{indicator?: string, value?: string, risk_severity: string, title?: string, score_penalty: int, pathophysiology?: string, possible_spaceflight_risks?: list<string>, countermeasures: list<string>}
     */
    private function evaluateBloodPressure(int $systolic, int $diastolic): array
    {
        $severity = 'NOMINAL';
        $title = 'Normal Blood Pressure in Microgravity';
        $penalty = 0;
        $risks = [];
        $countermeasures = [];

        if ($systolic >= 160 || $diastolic >= 100) {
            $severity = 'CRITICAL';
            $title = 'Stage 2 Hypertension / Acute Hypertensive Crisis';
            $penalty = 40;
            $risks = [
                'Spaceflight-Associated Neuro-ocular Syndrome (SANS) Accelerated Progression: Severe intracranial venous backpressure causing acute optic disc edema (papilledema Grade 3-4), posterior eye flattening, and permanent near-vision loss.',
                'Acute Cerebrovascular Event (Stroke / TIA): Elevated arterial shear stress combined with microgravity jugular vein stagnation.',
                'Severe Myocardial Afterload Overload: Left ventricular strain in a deconditioned spaceflight cardiovascular system.',
            ];
            $countermeasures = [
                'Immediately apply Lower Body Negative Pressure (LBNP) at -35 to -45 mmHg for 120 minutes to shift 1.5L venous volume into lower extremities.',
                'Administer emergency NASA formulary antihypertensive: Lisinopril 10mg PO or Losartan 50mg PO.',
                'Perform immediate ONSD ultrasound self-scan to verify optic nerve sheath diameter.',
                'Cease all strenuous ARED resistive lifting and high-g acceleration maneuvers.',
            ];
        } elseif ($systolic >= 140 || $diastolic >= 90) {
            $severity = 'HIGH';
            $title = 'Stage 1 Hypertension in Microgravity';
            $penalty = 25;
            $risks = [
                'SANS Exacerbation: Microgravity cephalad fluid shift (~2L) coupled with systemic arterial hypertension increases choroidal engorgement and optic sheath pressure.',
                'Orthostatic Intolerance Post-Flight: Vascular stiffening and baroreceptor desensitization causing G-LOC upon lunar or Martian landing.',
                'Persistent Incapacitating Space Headache and sleep fragmentation.',
            ];
            $countermeasures = [
                'Engage LBNP suit session (-30 mmHg for 60 minutes) to mitigate cephalad venous pressure.',
                'Check hydration balance; restrict dietary sodium intake to < 2,000 mg/day.',
                'Schedule autonomous optical coherence tomography (OCT) near-point visual acuity self-check.',
            ];
        } elseif ($systolic >= 130 || $diastolic >= 85) {
            $severity = 'MODERATE';
            $title = 'Elevated Pre-Hypertensive Blood Pressure';
            $penalty = 10;
            $risks = [
                'Mild cephalad fluid congestion causing nasal fullness and facial edema ("puffy-face" syndrome).',
                'Gradual near-point visual acuity shift when reading electronic flight procedures.',
            ];
            $countermeasures = [
                'Conduct 15-minute controlled diaphragmatic breathing pacing.',
                'Verify cabin pCO2 levels are strictly below 2.5 mmHg to prevent synergistic vasodilation.',
            ];
        } elseif ($systolic < 90 || $diastolic < 60) {
            $severity = 'HIGH';
            $title = 'Hypotension in Microgravity';
            $penalty = 25;
            $risks = [
                'Pre-syncopal dizziness when translating rapidly in 0G.',
                'Acute orthostatic collapse and shock during planetary re-entry maneuvers.',
            ];
            $countermeasures = [
                'Administer oral rehydration with 500mL electrolyte isotonic solution.',
                'Don lower extremity compression garments (G-suit inflation check).',
            ];
        }

        return [
            'indicator' => 'Blood Pressure',
            'value' => "{$systolic}/{$diastolic} mmHg",
            'risk_severity' => $severity,
            'title' => $title,
            'score_penalty' => $penalty,
            'pathophysiology' => 'In microgravity, absence of hydrostatic pressure gradient redistributes ~2,000 mL of vascular fluid toward the head. High arterial blood pressure compounds upper body venous hypertension, elevating intracranial and retrobulbar pressure.',
            'possible_spaceflight_risks' => $risks,
            'countermeasures' => $countermeasures,
        ];
    }

    /**
     * @return array{indicator?: string, value?: string, risk_severity: string, title?: string, score_penalty: int, pathophysiology?: string, possible_spaceflight_risks?: list<string>, countermeasures: list<string>}
     */
    private function evaluateHeartRate(int $hr): array
    {
        if ($hr > 125) {
            return [
                'indicator' => 'Heart Rate',
                'value' => "{$hr} bpm",
                'risk_severity' => 'HIGH',
                'title' => 'Tachycardia & Metabolic Exertion Limit Exceeded',
                'score_penalty' => 20,
                'pathophysiology' => 'Elevated cardiac rate reflects metabolic overload, suit cooling garment failure, or elevated cabin CO2 toxicity.',
                'possible_spaceflight_risks' => [
                    'Thermal Heat Stroke during spacewalks (EVA).',
                    'Atrial Fibrillation and cardiac arrhythmias in deconditioned heart.',
                    'Acute physical exhaustion preventing airlock return.',
                ],
                'countermeasures' => [
                    'Order immediate 180s rest hold; cease physical movement.',
                    'Check Liquid Cooling Garment (LCG) coolant flow and thermal delta.',
                ],
            ];
        }

        return ['risk_severity' => 'NOMINAL', 'score_penalty' => 0, 'countermeasures' => []];
    }

    /**
     * @return array{indicator?: string, value?: string, risk_severity: string, title?: string, score_penalty: int, pathophysiology?: string, possible_spaceflight_risks?: list<string>, countermeasures: list<string>}
     */
    private function evaluateSpO2(float $spo2): array
    {
        if ($spo2 < 93.0) {
            return [
                'indicator' => 'Oxygen Saturation (SpO2)',
                'value' => "{$spo2}%",
                'risk_severity' => 'CRITICAL',
                'title' => 'Acute Spaceflight Hypoxia & Decompression Risk',
                'score_penalty' => 45,
                'pathophysiology' => 'Suit or cabin oxygen partial pressure is insufficient, threatening cerebral oxygenation.',
                'possible_spaceflight_risks' => [
                    'Loss of consciousness within 180 seconds.',
                    'Decompression Sickness (Bends) if cabin pressure has decayed.',
                    'Irreversible cognitive and motor function impairment.',
                ],
                'countermeasures' => [
                    'Switch suit oxygen regulator to 100% emergency O2 supply.',
                    'Confirm airlock/habitat pressure is maintained at ≥ 14.7 psi (101.3 kPa).',
                ],
            ];
        } elseif ($spo2 < 95.0) {
            return [
                'indicator' => 'Oxygen Saturation (SpO2)',
                'value' => "{$spo2}%",
                'risk_severity' => 'MODERATE',
                'title' => 'Sub-acute Hypoxia',
                'score_penalty' => 15,
                'pathophysiology' => 'Mild oxygen deprivation impairing decision latency and night vision.',
                'possible_spaceflight_risks' => ['Cognitive latency and slowing of procedural responses.'],
                'countermeasures' => ['Increase primary oxygen flow rate by 15%.'],
            ];
        }

        return ['risk_severity' => 'NOMINAL', 'score_penalty' => 0, 'countermeasures' => []];
    }

    /**
     * @return array{indicator?: string, value?: string, risk_severity: string, title?: string, score_penalty: int, pathophysiology?: string, possible_spaceflight_risks?: list<string>, countermeasures: list<string>}
     */
    private function evaluateCoreTemp(float $temp): array
    {
        if ($temp > 38.2) {
            return [
                'indicator' => 'Core Temperature',
                'value' => "{$temp}°C",
                'risk_severity' => 'HIGH',
                'title' => 'Hyperthermia & Thermal Dissipation Failure',
                'score_penalty' => 25,
                'pathophysiology' => 'Sweat does not drip in microgravity; it forms a boundary layer that prevents convective cooling.',
                'possible_spaceflight_risks' => [
                    'Heat stroke and cardiovascular collapse inside EVA suit.',
                    'Delirium and disorientation during critical maneuvers.',
                ],
                'countermeasures' => [
                    'Set Liquid Cooling Garment (LCG) loop to maximum chilling flow.',
                    'Consume 250mL chilled electrolyte water.',
                ],
            ];
        }

        return ['risk_severity' => 'NOMINAL', 'score_penalty' => 0, 'countermeasures' => []];
    }

    /**
     * @return array{indicator?: string, value?: string, risk_severity: string, title?: string, score_penalty: int, pathophysiology?: string, possible_spaceflight_risks?: list<string>, countermeasures: list<string>}
     */
    private function evaluateRadiation(float $rate, float $cumulative): array
    {
        if ($rate > 0.40 || $cumulative > 150.0) {
            return [
                'indicator' => 'Space Radiation',
                'value' => "Rate: {$rate} mSv/h, Cumulative: {$cumulative} mSv",
                'risk_severity' => 'HIGH',
                'title' => 'Elevated Radiation Dose / Solar Particle Event Warning',
                'score_penalty' => 30,
                'pathophysiology' => 'High ionizing energy deposited into deep tissues causing cellular DNA double-strand breaks.',
                'possible_spaceflight_risks' => [
                    'Acute Radiation Syndrome (ARS): Immune suppression and prodromal nausea.',
                    'Visual light flashes (Cherenkov radiation across retina).',
                    'Elevated lifetime cancer Risk of Exposure-Induced Death (REID).',
                ],
                'countermeasures' => [
                    'Initiate shelter lockdown inside Storm Haven radiation vault.',
                    'Administer radioprotectant antioxidant regimen.',
                ],
            ];
        }

        return ['risk_severity' => 'NOMINAL', 'score_penalty' => 0, 'countermeasures' => []];
    }

    /**
     * @return array{indicator?: string, value?: string, risk_severity: string, title?: string, score_penalty: int, pathophysiology?: string, possible_spaceflight_risks?: list<string>, countermeasures: list<string>}
     */
    private function evaluateBoneDensity(float $loss): array
    {
        if ($loss <= -3.5) {
            return [
                'indicator' => 'Bone Mineral Density',
                'value' => "{$loss}% loss",
                'risk_severity' => 'HIGH',
                'title' => 'Accelerated Bone Mineral Loss & Hypercalciuria',
                'score_penalty' => 20,
                'pathophysiology' => 'Unloaded skeletal bones lose 1.0% to 1.5% mineral density monthly, flooding the bloodstream with calcium.',
                'possible_spaceflight_risks' => [
                    'Nephrolithiasis (Kidney Stones): Acute obstructive stone formation in microgravity.',
                    'Micro-fractures and skeletal trauma during planetary landing impact.',
                ],
                'countermeasures' => [
                    'Increase ARED resistive loading squats to 600 N daily.',
                    'Administer oral Alendronate / Bisphosphonate and Vitamin D3.',
                ],
            ];
        }

        return ['risk_severity' => 'NOMINAL', 'score_penalty' => 0, 'countermeasures' => []];
    }

    /**
     * @return array{indicator?: string, value?: string, risk_severity: string, title?: string, score_penalty: int, pathophysiology?: string, possible_spaceflight_risks?: list<string>, countermeasures: list<string>}
     */
    private function evaluateCabinCo2(float $pco2): array
    {
        if ($pco2 >= 3.0) {
            return [
                'indicator' => 'Cabin CO2 (pCO2)',
                'value' => "{$pco2} mmHg",
                'risk_severity' => 'HIGH',
                'title' => 'Hypercapnia (Elevated Cabin Carbon Dioxide)',
                'score_penalty' => 20,
                'pathophysiology' => 'Elevated ambient CO2 causes cerebral arterial vasodilation, compounding microgravity intracranial fluid pressures.',
                'possible_spaceflight_risks' => [
                    'Severe frontal headaches and cognitive degradation.',
                    'Accelerated SANS progression due to increased cerebral blood volume.',
                ],
                'countermeasures' => [
                    'Command ECLSS amine-bed CO2 scrubbers to maximum purge cycle.',
                    'Ensure cabin circulation fans are operating to disperse localized CO2 pockets.',
                ],
            ];
        }

        return ['risk_severity' => 'NOMINAL', 'score_penalty' => 0, 'countermeasures' => []];
    }

    /**
     * @return array{indicator?: string, value?: string, risk_severity: string, title?: string, score_penalty: int, pathophysiology?: string, possible_spaceflight_risks?: list<string>, countermeasures: list<string>}
     */
    private function evaluateHydration(int $hydration): array
    {
        if ($hydration < 68) {
            return [
                'indicator' => 'Hydration Level',
                'value' => "{$hydration}%",
                'risk_severity' => 'MODERATE',
                'title' => 'Dehydration & Thrombosis Vulnerability',
                'score_penalty' => 15,
                'pathophysiology' => 'Hypovolemia and hemoconcentration increase blood viscosity in microgravity.',
                'possible_spaceflight_risks' => [
                    'Internal Jugular Vein (IJV) Thrombosis risk.',
                    'Severe orthostatic dizziness upon standing.',
                ],
                'countermeasures' => [
                    'Consume 300mL balanced electrolyte beverage.',
                ],
            ];
        }

        return ['risk_severity' => 'NOMINAL', 'score_penalty' => 0, 'countermeasures' => []];
    }

    /**
     * @param  list<array<string, mixed>>  $risks
     */
    private function buildClinicalSummary(string $riskLevel, array $risks, string $name): string
    {
        if ($riskLevel === 'NOMINAL') {
            return "All biomedical telemetry and environmental indicators for {$name} are within nominal NASA-STD-3001 spaceflight tolerances.";
        }

        $count = count($risks);
        $topRisk = $risks[0]['title'] ?? 'Identified Physiological Anomaly';

        return "{$riskLevel} detected for {$name} across {$count} indicator(s). Primary concern: {$topRisk}. Autonomous countermeasures have been generated for immediate execution.";
    }
}
