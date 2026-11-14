<?php

use App\Events\AstronautTelemetryUpdated;
use App\Http\Controllers\ChatbotController;
use App\Http\Controllers\DatasetController;
use App\Http\Controllers\HealthRiskController;
use App\Models\DatasetRecord;
use App\Models\NasaHazard;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Route;

// Main Mission Control Dashboard (Direct entry point - no landing page, no authentication required)
$dashboardHandler = function () {
    if (DatasetRecord::count() === 0) {
        Artisan::call('db:seed', ['--class' => 'DatabaseSeeder', '--force' => true]);
    }

    $records = DatasetRecord::orderBy('Astronaut', 'asc')->get();
    $hazards = NasaHazard::orderBy('id', 'asc')->get();

    return inertia('dashboard', [
        'records' => $records,
        'hazards' => $hazards,
    ]);
};

Route::get('/', $dashboardHandler)->name('home');
Route::get('/dashboard', $dashboardHandler)->name('dashboard');

// NASA Human Research Program (HRP) - 5 Hazards of Human Spaceflight & Telemetry Archive
Route::get('/dataset', [DatasetController::class, 'index'])->name('dataset.index');
Route::get('/api/dataset/records', [DatasetController::class, 'records'])->name('dataset.records');
Route::get('/api/nasa/hazards', [DatasetController::class, 'hazards'])->name('nasa.hazards');
Route::post('/api/dataset/import', [DatasetController::class, 'import'])->name('dataset.import');
Route::post('/api/dataset/records', [DatasetController::class, 'store'])->name('dataset.store');
Route::put('/api/dataset/records/{astronaut}', [DatasetController::class, 'update'])->name('dataset.update');
Route::delete('/api/dataset/records/{astronaut}', [DatasetController::class, 'destroy'])->name('dataset.destroy');
Route::post('/api/dataset/records/bulk-delete', [DatasetController::class, 'bulkDestroy'])->name('dataset.bulkDestroy');

// ORBIT Astronaut Health Risk & Microgravity Pathophysiology Engine API
Route::post('/api/astronaut/health-risk/analyze', [HealthRiskController::class, 'analyze'])->name('health-risk.analyze');
Route::get('/api/astronaut/health-risk/knowledge', [HealthRiskController::class, 'knowledge'])->name('health-risk.knowledge');
Route::get('/api/astronaut/health-risk', [HealthRiskController::class, 'analyze'])->name('health-risk.get');

// Real-time Telemetry & WebSockets
Route::post('/api/telemetry/ping', function (Request $request) {
    $astronautId = $request->input('astronaut_id', 'AST-01');
    $astronautName = $request->input('astronaut_name');
    $role = $request->input('role');

    if (! $astronautName) {
        $dbRecord = DatasetRecord::where('Astronaut', $astronautId)->first();

        if ($dbRecord) {
            $astronautName = $dbRecord->Name;
            $role = $dbRecord->Role ?? 'Mission Commander';
        } else {
            $fallbackRoster = [
                'AST-01' => ['name' => 'CDR. Reid Wiseman', 'role' => 'Mission Commander'],
                'AST-02' => ['name' => 'Victor Glover', 'role' => 'Pilot / Flight Surgeon Ops'],
                'AST-03' => ['name' => 'Christina Koch', 'role' => 'Mission Specialist'],
                'AST-04' => ['name' => 'Jeremy Hansen', 'role' => 'Mission Specialist'],
            ];
            $found = $fallbackRoster[$astronautId] ?? ['name' => 'Mission Specialist', 'role' => 'Astronaut Specialist'];
            $astronautName = $found['name'];
            $role = $found['role'];
        }
    }

    $heartRate = (int) ($request->input('heart_rate') ?: rand(70, 138));
    $oxygen = (float) ($request->input('oxygen_saturation') ?: round(rand(955, 995) / 10, 1));
    $temp = (float) ($request->input('core_temperature') ?: round(rand(366, 384) / 10, 1));
    $respiration = (int) ($request->input('respiration') ?: rand(15, 23));
    $hydration = (int) ($request->input('hydration') ?: rand(70, 84));
    $pressure = (float) ($request->input('suit_pressure') ?: round(rand(41, 45) / 10, 1)); // 4.1 to 4.5 psi
    $radiation = (float) ($request->input('radiation_rate') ?: round(rand(180, 245) / 1000, 3));

    $status = $heartRate > 115 ? 'Elevated Activity' : ($heartRate > 100 ? 'Moderate Workload' : 'Nominal');

    $telemetry = [
        'astronaut_id' => $astronautId,
        'astronaut_name' => $astronautName,
        'role' => $role,
        'heart_rate' => $heartRate,
        'oxygen_saturation' => $oxygen,
        'core_temperature' => $temp,
        'respiration' => $respiration,
        'hydration' => $hydration,
        'suit_pressure' => $pressure,
        'radiation_rate' => $radiation,
        'status' => $status,
        'mission_elapsed_time' => 'MET +14:08:'.str_pad((string) rand(10, 59), 2, '0', STR_PAD_LEFT),
    ];

    event(new AstronautTelemetryUpdated($telemetry));

    return response()->json([
        'success' => true,
        'message' => 'Telemetry synchronized to real-time DSN telemetry stream and WebSocket channel',
        'telemetry' => $telemetry,
    ]);
})->name('telemetry.ping');

// Route to preview / test the Flare (Ignition) error page
Route::get('/flare-demo', function () {
    throw new Exception('Flare / Ignition Error Display Test: Telemetry and database error tracking is active.');
});

// NASA AI Chatbot endpoint & Gemini AI health check (accessible across the entire system)
Route::post('/api/ai/chat', [ChatbotController::class, 'chat'])->name('ai.chat');
Route::post('/api/ai/test-key', [ChatbotController::class, 'testKey'])->name('ai.testKey');

// Catch-all auth redirects to ensure no login screens or gates are shown
Route::redirect('/login', '/')->name('login');
Route::redirect('/register', '/')->name('register');
Route::redirect('/forgot-password', '/')->name('password.request');
Route::redirect('/reset-password', '/')->name('password.reset');
Route::redirect('/two-factor-challenge', '/');
Route::redirect('/email/verify', '/');

Route::redirect('/settings', '/');

Route::get('/health-monitoring', function () {
    return inertia('health-monitoring');
});

Route::get('/reports', function () {
    $records = DatasetRecord::orderBy('Astronaut', 'asc')->get();

    return inertia('reports', [
        'records' => $records,
    ]);
});
