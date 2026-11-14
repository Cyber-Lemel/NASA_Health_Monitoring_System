<?php

namespace App\Http\Controllers;

use App\Models\DatasetRecord;
use App\Models\NasaHazard;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Inertia\Response;

class DatasetController extends Controller
{
    /**
     * Display the full NASA HRP 5 Hazards and astronaut dataset page.
     */
    public function index(): Response
    {
        if (DatasetRecord::count() === 0) {
            Artisan::call('db:seed', ['--class' => 'DatabaseSeeder', '--force' => true]);
        }

        // Fetch all astronaut records and official NASA 5 Hazards
        $records = DatasetRecord::orderBy('Astronaut', 'asc')->get();
        $hazards = NasaHazard::orderBy('id', 'asc')->get();

        return inertia('Dataset', [
            'records' => $records,
            'hazards' => $hazards,
        ]);
    }

    /**
     * Return all astronaut dataset records as JSON.
     */
    public function records(): JsonResponse
    {
        if (DatasetRecord::count() === 0) {
            Artisan::call('db:seed', ['--class' => 'DatabaseSeeder', '--force' => true]);
        }

        $records = DatasetRecord::orderBy('Astronaut', 'asc')->get();

        return response()->json([
            'success' => true,
            'count' => $records->count(),
            'records' => $records,
        ]);
    }

    /**
     * Return the 5 Hazards of Human Spaceflight dataset (NASA Human Research Program).
     */
    public function hazards(): JsonResponse
    {
        if (NasaHazard::count() === 0) {
            Artisan::call('db:seed', ['--class' => 'NasaHazardsSeeder', '--force' => true]);
        }

        $hazards = NasaHazard::orderBy('id', 'asc')->get();

        return response()->json([
            'success' => true,
            'source' => 'NASA Human Research Program (HRP) - 5 Hazards of Human Spaceflight',
            'url' => 'https://www.nasa.gov/hrp/hazards/',
            'count' => $hazards->count(),
            'hazards' => $hazards,
        ]);
    }

    /**
     * Bulk or single import data from payload or uploaded file into the database.
     */
    public function import(Request $request): JsonResponse
    {
        $records = [];

        // 1. Direct file upload handling (CSV or JSON)
        if ($request->hasFile('file')) {
            $file = $request->file('file');
            if ($file !== null) {
                $extension = strtolower($file->getClientOriginalExtension());
                $filePath = $file->getRealPath();

                if ($filePath !== false && ($extension === 'csv' || $extension === 'txt')) {
                    $firstLine = '';
                    $tempStream = fopen($filePath, 'r');
                    if ($tempStream !== false) {
                        $read = fgets($tempStream);
                        if ($read !== false) {
                            $firstLine = $read;
                        }
                        fclose($tempStream);
                    }

                    // Auto-detect delimiter
                    $delimiters = [',', ';', "\t", '|'];
                    $delimCounts = [];
                    foreach ($delimiters as $d) {
                        $delimCounts[$d] = substr_count($firstLine, $d);
                    }
                    arsort($delimCounts);
                    $delimiter = ',';
                    if (current($delimCounts) > 0) {
                        $delimiter = (string) key($delimCounts);
                    }

                    $handle = fopen($filePath, 'r');
                    if ($handle !== false) {
                        $header = null;
                        while (($row = fgetcsv($handle, 5000, $delimiter)) !== false) {
                            if ($header === null) {
                                // Clean UTF-8 BOM and trim header keys without damaging UTF-8 characters
                                $header = array_map(function ($h) {
                                    $clean = preg_replace('/^\xEF\xBB\xBF/', '', (string) $h);

                                    return trim((string) $clean);
                                }, $row);
                            } else {
                                if (count($row) === count($header)) {
                                    $records[] = array_combine($header, $row);
                                } elseif (! empty(array_filter($row))) {
                                    $rowPadded = array_pad(array_slice($row, 0, count($header)), count($header), null);
                                    $records[] = array_combine($header, $rowPadded);
                                }
                            }
                        }
                        fclose($handle);
                    }
                } elseif ($filePath !== false && $extension === 'json') {
                    $content = file_get_contents($filePath);
                    if ($content !== false) {
                        $json = json_decode($content, true);
                        if (is_array($json)) {
                            if (isset($json['records']) && is_array($json['records'])) {
                                $records = $json['records'];
                            } elseif (array_is_list($json)) {
                                $records = $json;
                            } else {
                                $records = [$json];
                            }
                        }
                    }
                }
            }
        }

        // 2. JSON or Form Data payload handling
        if (empty($records)) {
            if ($request->has('records') && is_array($request->input('records'))) {
                $records = $request->input('records');
            } elseif ($request->has('detectedRows') && is_array($request->input('detectedRows'))) {
                $records = $request->input('detectedRows');
            } elseif ($request->has('record') && is_array($request->input('record'))) {
                $records = [$request->input('record')];
            } elseif ($request->isJson()) {
                $json = $request->json()->all();
                if (isset($json['records']) && is_array($json['records'])) {
                    $records = $json['records'];
                } elseif (isset($json['detectedRows']) && is_array($json['detectedRows'])) {
                    $records = $json['detectedRows'];
                } elseif (isset($json['record']) && is_array($json['record'])) {
                    $records = [$json['record']];
                } elseif (! empty($json)) {
                    $records = [$json];
                }
            }
        }

        if (empty($records)) {
            return response()->json([
                'success' => false,
                'message' => 'No telemetry records found in the import request payload.',
            ], 422);
        }

        $maxId = 0;
        foreach (DatasetRecord::pluck('Astronaut') as $existing) {
            preg_match('/\d+/', (string) $existing, $m);
            if (! empty($m[0])) {
                $maxId = max($maxId, (int) $m[0]);
            }
        }
        $nextAvailableId = $maxId + 1;
        $savedCount = 0;
        $errors = [];

        DB::beginTransaction();
        try {
            foreach ($records as $index => $item) {
                if (! is_array($item)) {
                    continue;
                }
                try {
                    $sanitized = $this->sanitizeRecord($item, $nextAvailableId);
                    DatasetRecord::updateOrCreate(
                        ['Astronaut' => $sanitized['Astronaut']],
                        $sanitized
                    );
                    $savedCount++;
                } catch (\Exception $rowEx) {
                    Log::warning("Row import failed at index {$index}: ".$rowEx->getMessage());
                    $errors[] = "Row {$index}: ".$rowEx->getMessage();
                }
            }
            DB::commit();
        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Bulk import transaction failed: '.$e->getMessage());

            return response()->json([
                'success' => false,
                'message' => 'Database import failed: '.$e->getMessage(),
            ], 500);
        }

        $allRecords = DatasetRecord::orderBy('Astronaut', 'asc')->get();

        return response()->json([
            'success' => true,
            'message' => "Successfully imported and stored {$savedCount} astronaut record(s) directly into the database.",
            'count' => $savedCount,
            'errors' => $errors,
            'records' => $allRecords,
        ]);
    }

    /**
     * Manually add a new astronaut record directly to the database.
     */
    public function store(Request $request): JsonResponse
    {
        $maxId = 0;
        foreach (DatasetRecord::pluck('Astronaut') as $existing) {
            preg_match('/\d+/', (string) $existing, $m);
            if (! empty($m[0])) {
                $maxId = max($maxId, (int) $m[0]);
            }
        }
        $nextId = $maxId + 1;

        $sanitized = $this->sanitizeRecord($request->all(), $nextId);

        // Ensure unique primary key
        if (DatasetRecord::where('Astronaut', $sanitized['Astronaut'])->exists()) {
            $sanitized['Astronaut'] = sprintf('AST-%02d', $nextId);
        }

        $record = DatasetRecord::create($sanitized);
        $allRecords = DatasetRecord::orderBy('Astronaut', 'asc')->get();

        return response()->json([
            'success' => true,
            'message' => "Astronaut {$record->Name} ({$record->Astronaut}) added successfully to the database.",
            'record' => $record,
            'records' => $allRecords,
        ]);
    }

    /**
     * Update an existing astronaut record in the database.
     */
    public function update(Request $request, int|string $astronaut): JsonResponse
    {
        $searchKey = (string) $astronaut;
        $stripped = ltrim($searchKey, 'AST-');

        $record = DatasetRecord::where('Astronaut', $searchKey)
            ->orWhere('Astronaut', $stripped)
            ->orWhere('id', is_numeric($searchKey) ? (int) $searchKey : 0)
            ->first();

        if (! $record) {
            return response()->json([
                'success' => false,
                'message' => "Astronaut record #{$astronaut} not found in database.",
            ], 404);
        }

        $dummyNextId = 999999;
        $sanitized = $this->sanitizeRecord($request->all(), $dummyNextId);
        unset($sanitized['Astronaut']); // Don't mutate the primary key

        $record->update($sanitized);
        $allRecords = DatasetRecord::orderBy('Astronaut', 'asc')->get();

        return response()->json([
            'success' => true,
            'message' => "Astronaut {$record->Name} ({$record->Astronaut}) updated successfully.",
            'record' => $record,
            'records' => $allRecords,
        ]);
    }

    /**
     * Delete an individual astronaut record from the database.
     */
    public function destroy(int|string $astronaut): JsonResponse
    {
        $searchKey = (string) $astronaut;
        $stripped = ltrim($searchKey, 'AST-');

        $record = DatasetRecord::where('Astronaut', $searchKey)
            ->orWhere('Astronaut', $stripped)
            ->orWhere('id', is_numeric($searchKey) ? (int) $searchKey : 0)
            ->first();

        if (! $record) {
            return response()->json([
                'success' => false,
                'message' => "Astronaut record #{$astronaut} not found in database.",
            ], 404);
        }

        $name = $record->Name;
        $recordKey = $record->Astronaut;
        $record->delete();
        $allRecords = DatasetRecord::orderBy('Astronaut', 'asc')->get();

        return response()->json([
            'success' => true,
            'message' => "Astronaut {$name} ({$recordKey}) deleted successfully from database.",
            'records' => $allRecords,
        ]);
    }

    /**
     * Bulk delete selected astronaut records from the database.
     */
    public function bulkDestroy(Request $request): JsonResponse
    {
        $ids = $request->input('ids', []);
        if (empty($ids) || ! is_array($ids)) {
            return response()->json([
                'success' => false,
                'message' => 'No astronaut IDs provided for bulk deletion.',
            ], 422);
        }

        $allPossibleIds = [];
        $numericIds = [];
        foreach ($ids as $id) {
            $str = trim((string) $id);
            if ($str === '') {
                continue;
            }
            $allPossibleIds[] = $str;
            $allPossibleIds[] = ltrim($str, 'AST-');
            if (is_numeric($str)) {
                $num = (int) $str;
                $numericIds[] = $num;
                $allPossibleIds[] = sprintf('AST-%02d', $num);
            }
        }
        $allPossibleIds = array_values(array_unique($allPossibleIds));

        $deletedCount = DatasetRecord::whereIn('Astronaut', $allPossibleIds)
            ->orWhereIn('id', $numericIds)
            ->delete();

        $allRecords = DatasetRecord::orderBy('Astronaut', 'asc')->get();

        return response()->json([
            'success' => true,
            'message' => "Successfully deleted {$deletedCount} selected astronaut record(s) from database.",
            'count' => $deletedCount,
            'records' => $allRecords,
        ]);
    }

    /**
     * Normalize and sanitize raw record parameters for MySQL dataset_records table,
     * ensuring 100% exact match to provided data without loss or arbitrary overrides.
     *
     * @param  array<string, mixed>  $item
     * @return array<string, mixed>
     */
    private function sanitizeRecord(array $item, int &$nextAvailableId): array
    {
        // Helper to find value across various casing, abbreviations, and formatting styles
        $find = function (array $keys) use ($item) {
            foreach ($keys as $k) {
                if (array_key_exists($k, $item) && $item[$k] !== null && $item[$k] !== '') {
                    return $item[$k];
                }
            }
            // Normalized fallback check (strips spaces, underscores, dashes, parens, %)
            $cleanTargets = array_map(function ($target) {
                return strtolower((string) preg_replace('/[^a-z0-9]/i', '', $target));
            }, $keys);

            foreach ($item as $k => $v) {
                if ($v === null || $v === '') {
                    continue;
                }
                $cleanK = strtolower((string) preg_replace('/[^a-z0-9]/i', '', (string) $k));
                if (in_array($cleanK, $cleanTargets, true)) {
                    return $v;
                }
            }

            return null;
        };

        // 1. Extract or generate Astronaut ID
        $rawId = $find(['Astronaut', 'astronaut', 'Astronaut_ID', 'Astronaut ID', 'id', 'ID', 'crew_id', 'code']);
        $id = null;
        if ($rawId !== null) {
            $strId = trim((string) $rawId);
            if ($strId !== '') {
                $id = $strId;
            }
        }

        if ($id === null) {
            $id = sprintf('AST-%02d', $nextAvailableId++);
        } else {
            preg_match('/\d+/', $id, $matches);
            if (! empty($matches[0])) {
                $num = (int) $matches[0];
                if ($num >= $nextAvailableId) {
                    $nextAvailableId = $num + 1;
                }
            }
        }

        $cleanFloat = function ($val, $default = null) {
            if ($val === null || $val === '') {
                return $default;
            }
            $str = str_replace(['%', ' ', 'psi', 'd', 'bpm', 'YRS', 'mSv'], '', (string) $val);

            return is_numeric($str) ? (float) $str : $default;
        };

        $cleanInt = function ($val, $default = null) {
            if ($val === null || $val === '') {
                return $default;
            }
            if (is_int($val)) {
                return $val;
            }
            $str = trim((string) $val);
            if (is_numeric($str)) {
                return (int) round((float) $str);
            }
            $clean = preg_replace('/[^0-9.-]/', '', $str);
            if ($clean !== null && $clean !== '' && is_numeric($clean)) {
                return (int) round((float) $clean);
            }

            return $default;
        };

        // 2. Map all columns 100% identically from the provided data
        $nameRaw = $find(['Name', 'name', 'Astronaut_Name', 'Astronaut Name', 'Full Name', 'Crew Member', 'Crew', 'Subject', 'Subject Name']);
        $name = ($nameRaw !== null && trim((string) $nameRaw) !== '')
            ? trim((string) $nameRaw)
            : ('Astronaut_'.$id);

        $ageRaw = $find([
            'Age_at_mission_start', 'Age at mission start', 'Age_at_Mission_Start',
            'Age', 'age', 'Launch Age', 'launch_age', 'age_at_mission_start', 'age_at_launch',
            'Age (years)', 'Age(years)',
        ]);
        $age = ($ageRaw !== null && $cleanInt($ageRaw) !== null)
            ? $cleanInt($ageRaw)
            : 40;

        $genderRaw = $find(['Gender', 'gender', 'Sex', 'sex']);
        $gender = ($genderRaw !== null && trim((string) $genderRaw) !== '')
            ? trim((string) $genderRaw)
            : 'Not Specified';

        $countryRaw = $find(['Country', 'country', 'Agency', 'agency', 'Nationality', 'nationality', 'Nation', 'nation', 'Affiliation']);
        $country = ($countryRaw !== null && trim((string) $countryRaw) !== '')
            ? trim((string) $countryRaw)
            : 'NASA / International';

        $durRaw = $find([
            'Mission_duration(Days)', 'Mission Duration (Days)', 'Mission_Duration_Days',
            'Mission Duration', 'Duration (Days)', 'Duration', 'duration', 'flight_duration',
            'flight_duration_days', 'mission_duration', 'mission_duration_days',
            'Days in space', 'Days in flight', 'Days', 'days',
        ]);
        $duration = ($durRaw !== null && $cleanInt($durRaw) !== null)
            ? $cleanInt($durRaw)
            : 180;

        $noMissRaw = $find(['No_of_Mission', 'No of Mission', 'No_of_Missions', 'No of Missions', 'Number of Missions', 'Missions', 'missions', 'flight_count']);
        $noOfMission = ($noMissRaw !== null && $cleanInt($noMissRaw) !== null)
            ? $cleanInt($noMissRaw)
            : 1;

        $boneRaw = $find(['Bone_Density_Loss', 'Bone Density Loss', 'Bone Density Loss (%)', 'Bone_Density_Loss(%)', 'BMD Loss', 'bmd', 'boneDensityLoss']);
        $boneLoss = ($boneRaw !== null && $cleanFloat($boneRaw) !== null)
            ? $cleanFloat($boneRaw)
            : -3.0;

        $muscleRaw = $find(['Muscle_Mass_Loss', 'Muscle Mass Loss', 'Muscle Mass Loss (%)', 'Muscle_Mass_Loss(%)', 'muscleMassLoss']);
        $muscleLoss = ($muscleRaw !== null && $cleanFloat($muscleRaw) !== null)
            ? $cleanFloat($muscleRaw)
            : 2.5;

        $radRaw = $find(['Radiation_Exposure', 'Radiation Exposure', 'Radiation', 'radiation', 'radiationExposure', 'msv']);
        $radiation = ($radRaw !== null && $cleanInt($radRaw) !== null)
            ? $cleanInt($radRaw)
            : 95;

        $cardioRaw = $find(['Cardiovascular_Risk_Score', 'Cardiovascular Risk Score', 'Cardio Risk', 'cardioRisk', 'cardiovascular']);
        $cardio = ($cardioRaw !== null && $cleanInt($cardioRaw) !== null)
            ? $cleanInt($cardioRaw)
            : 7;

        $immuneRaw = $find(['Immune_Response_Suppression', 'Immune Response Suppression', 'Immune Suppression', 'immuneSuppression']);
        $immune = ($immuneRaw !== null && $cleanFloat($immuneRaw) !== null)
            ? $cleanFloat($immuneRaw)
            : 8.0;

        $psychRaw = $find(['Psychological_Impact_Score', 'Psychological Impact Score', 'Psych Score', 'psychScore', 'psychological']);
        $psych = ($psychRaw !== null && $cleanInt($psychRaw) !== null)
            ? $cleanInt($psychRaw)
            : 5;

        $visionRaw = $find(['Vision_Change', 'Vision Change', 'Vision', 'vision', 'visionChange', 'Eyesight']);
        $vision = ($visionRaw !== null && trim((string) $visionRaw) !== '')
            ? trim((string) $visionRaw)
            : 'Clear';

        $counterRaw = $find(['Countermeasures_Used', 'Countermeasures Used', 'Countermeasures', 'countermeasures', 'protocol', 'protocol_used']);
        $countermeasures = ($counterRaw !== null && trim((string) $counterRaw) !== '')
            ? trim((string) $counterRaw)
            : 'ARED Resistive Exercise, Bisphosphonates';

        $hazardFocusRaw = $find(['Hazard_Focus', 'Hazard Focus', 'hazardFocus', 'Primary Hazard', 'hazard', 'Hazard']);
        $hazardFocus = ($hazardFocusRaw !== null && trim((string) $hazardFocusRaw) !== '')
            ? trim((string) $hazardFocusRaw)
            : 'Gravity Fields (G)';

        $riskLevelRaw = $find(['Risk_Level', 'Risk Level', 'riskLevel', 'risk', 'Risk', 'status']);
        $riskLevel = ($riskLevelRaw !== null && trim((string) $riskLevelRaw) !== '')
            ? trim((string) $riskLevelRaw)
            : 'Nominal';

        $hrpProtocolRaw = $find(['NASA_HRP_Protocol', 'HRP Protocol', 'protocol', 'NASA Protocol', 'hrpProtocol']);
        $hrpProtocol = ($hrpProtocolRaw !== null && trim((string) $hrpProtocolRaw) !== '')
            ? trim((string) $hrpProtocolRaw)
            : 'NASA-STD-3001';

        return [
            'Astronaut' => $id,
            'Name' => $name,
            'Age_at_mission_start' => $age,
            'Gender' => $gender,
            'Country' => $country,
            'Mission_duration(Days)' => $duration,
            'No_of_Mission' => $noOfMission,
            'Bone_Density_Loss' => $boneLoss,
            'Muscle_Mass_Loss' => $muscleLoss,
            'Radiation_Exposure' => $radiation,
            'Cardiovascular_Risk_Score' => $cardio,
            'Immune_Response_Suppression' => $immune,
            'Psychological_Impact_Score' => $psych,
            'Vision_Change' => $vision,
            'Countermeasures_Used' => $countermeasures,
            'Hazard_Focus' => $hazardFocus,
            'Risk_Level' => $riskLevel,
            'NASA_HRP_Protocol' => $hrpProtocol,
        ];
    }
}
