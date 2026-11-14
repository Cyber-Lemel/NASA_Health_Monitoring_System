<?php

test('it evaluates nominal vitals with 100 health index', function () {
    $response = $this->postJson('/api/astronaut/health-risk/analyze', [
        'systolic_bp' => 118,
        'diastolic_bp' => 76,
        'heart_rate' => 72,
        'sp_o2' => 99.0,
        'core_temp' => 36.8,
        'radiation_rate' => 0.15,
        'cumulative_radiation' => 45.0,
        'bone_loss_pct' => -1.2,
        'hydration_pct' => 82,
        'cabin_co2' => 2.1,
        'astronaut_name' => 'CDR. Elena Rovani',
    ]);

    $response->assertOk()
        ->assertJson([
            'success' => true,
            'overall_risk_level' => 'NOMINAL',
            'health_score' => 100,
        ]);
});

test('it detects acute hypertension and cephalad fluid shift risks', function () {
    $response = $this->postJson('/api/astronaut/health-risk/analyze', [
        'systolic_bp' => 165,
        'diastolic_bp' => 105,
        'heart_rate' => 88,
        'sp_o2' => 98.0,
        'core_temp' => 37.0,
        'astronaut_name' => 'CDR. Elena Rovani',
    ]);

    $response->assertOk()
        ->assertJson([
            'success' => true,
            'overall_risk_level' => 'CRITICAL_EMERGENCY',
        ])
        ->assertJsonFragment([
            'title' => 'Stage 2 Hypertension / Acute Hypertensive Crisis',
            'risk_severity' => 'CRITICAL',
        ]);
});

test('it detects hypoxia and oxygen saturation drop', function () {
    $response = $this->postJson('/api/astronaut/health-risk/analyze', [
        'systolic_bp' => 120,
        'diastolic_bp' => 80,
        'heart_rate' => 80,
        'sp_o2' => 91.5,
        'core_temp' => 37.0,
    ]);

    $response->assertOk()
        ->assertJson([
            'success' => true,
            'overall_risk_level' => 'CRITICAL_EMERGENCY',
        ])
        ->assertJsonFragment([
            'title' => 'Acute Spaceflight Hypoxia & Decompression Risk',
        ]);
});

test('it returns microgravity pathophysiology knowledge base', function () {
    $response = $this->getJson('/api/astronaut/health-risk/knowledge');

    $response->assertOk()
        ->assertJson([
            'success' => true,
            'system' => 'ORBIT Astronaut Health Risk & Microgravity Pathophysiology Engine',
        ])
        ->assertJsonStructure([
            'knowledge_base' => [
                'blood_pressure',
                'heart_rate',
                'spo2',
                'radiation',
                'bone_density',
            ],
        ]);
});
