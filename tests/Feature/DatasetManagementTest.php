<?php

use App\Models\DatasetRecord;

test('dataset page loads successfully with astronaut records and nasa hazards', function () {
    $response = $this->get('/dataset');

    $response->assertStatus(200);
});

test('api dataset records endpoint returns all seeded records', function () {
    $response = $this->getJson('/api/dataset/records');

    $response->assertStatus(200)
        ->assertJson([
            'success' => true,
        ]);

    $records = $response->json('records');
    expect(count($records))->toBeGreaterThanOrEqual(12);
});

test('api nasa hazards endpoint returns 5 official human spaceflight hazards', function () {
    $response = $this->getJson('/api/nasa/hazards');

    $response->assertStatus(200)
        ->assertJson([
            'success' => true,
            'count' => 5,
        ]);
});

test('can store a new astronaut record via api', function () {
    $payload = [
        'Astronaut' => 'AST-99',
        'Name' => 'Dr. Test Cosmonaut',
        'Age_at_mission_start' => 44,
        'Gender' => 'Male',
        'Country' => 'USA / NASA',
        'Mission_duration(Days)' => 120,
        'No_of_Mission' => 1,
        'Bone_Density_Loss' => '-1.8%',
        'Muscle_Mass_Loss' => '1.2%',
        'Radiation_Exposure' => 65,
        'Cardiovascular_Risk_Score' => 2,
        'Immune_Response_Suppression' => 4.1,
        'Psychological_Impact_Score' => 2,
        'Vision_Change' => 'Clear',
        'Countermeasures_Used' => 'ARED Daily, Hydration Protocols',
        'Hazard_Focus' => 'Gravity Fields (G)',
        'Risk_Level' => 'Nominal',
        'NASA_HRP_Protocol' => 'HRP-TEST-01',
    ];

    $response = $this->postJson('/api/dataset/records', $payload);

    $response->assertStatus(200)
        ->assertJson([
            'success' => true,
        ]);

    $this->assertDatabaseHas('dataset_records', [
        'Astronaut' => 'AST-99',
        'Name' => 'Dr. Test Cosmonaut',
    ]);
});

test('can update an existing astronaut record by string id', function () {
    $record = DatasetRecord::firstOrCreate(
        ['Astronaut' => 'AST-01'],
        [
            'Name' => 'CDR. Reid Wiseman',
            'Age_at_mission_start' => 48,
            'Gender' => 'Male',
            'Country' => 'USA / NASA',
            'Mission_duration(Days)' => 165,
            'No_of_Mission' => 2,
            'Bone_Density_Loss' => '-2.6%',
            'Muscle_Mass_Loss' => '2.1%',
            'Radiation_Exposure' => 88,
            'Cardiovascular_Risk_Score' => 4,
            'Immune_Response_Suppression' => 5.2,
            'Psychological_Impact_Score' => 3,
            'Vision_Change' => 'Clear (Normal ONSD)',
            'Countermeasures_Used' => 'ARED Resistive Exercise',
            'Hazard_Focus' => 'Distance from Earth (D)',
            'Risk_Level' => 'Nominal',
            'NASA_HRP_Protocol' => 'HRP-EXMC-01',
        ]
    );

    $response = $this->putJson("/api/dataset/records/{$record->Astronaut}", [
        'Name' => 'CDR. Reid Wiseman (Updated)',
        'Risk_Level' => 'Guarded',
    ]);

    $response->assertStatus(200)
        ->assertJson([
            'success' => true,
        ]);

    $this->assertDatabaseHas('dataset_records', [
        'Astronaut' => 'AST-01',
        'Name' => 'CDR. Reid Wiseman (Updated)',
        'Risk_Level' => 'Guarded',
    ]);
});

test('can delete an astronaut record by string id', function () {
    DatasetRecord::updateOrCreate(
        ['Astronaut' => 'AST-88'],
        [
            'Name' => 'Temporary Astronaut',
            'Age_at_mission_start' => 39,
            'Gender' => 'Female',
            'Country' => 'Canada / CSA',
            'Mission_duration(Days)' => 30,
        ]
    );

    $response = $this->deleteJson('/api/dataset/records/AST-88');

    $response->assertStatus(200)
        ->assertJson([
            'success' => true,
        ]);

    $this->assertDatabaseMissing('dataset_records', [
        'Astronaut' => 'AST-88',
    ]);
});

test('can bulk delete astronaut records', function () {
    DatasetRecord::updateOrCreate(['Astronaut' => 'AST-71'], ['Name' => 'Bulk Subject 1']);
    DatasetRecord::updateOrCreate(['Astronaut' => 'AST-72'], ['Name' => 'Bulk Subject 2']);

    $response = $this->postJson('/api/dataset/records/bulk-delete', [
        'ids' => ['AST-71', 'AST-72'],
    ]);

    $response->assertStatus(200)
        ->assertJson([
            'success' => true,
            'count' => 2,
        ]);

    $this->assertDatabaseMissing('dataset_records', ['Astronaut' => 'AST-71']);
    $this->assertDatabaseMissing('dataset_records', ['Astronaut' => 'AST-72']);
});
