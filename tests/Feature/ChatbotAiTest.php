<?php

test('chatbot rejects empty messages with 400 status', function () {
    $response = $this->postJson('/api/ai/chat', [
        'message' => '   ',
    ]);

    $response->assertStatus(400)
        ->assertJson([
            'success' => false,
        ]);
});

test('chatbot provides authoritative responses for cardiovascular and blood pressure inquiries', function () {
    $response = $this->postJson('/api/ai/chat', [
        'message' => 'What is the risk of high blood pressure and hypertension in microgravity?',
    ]);

    $response->assertStatus(200)
        ->assertJson([
            'success' => true,
        ]);

    $reply = $response->json('reply');
    expect(strtolower($reply))->toContain('blood pressure');
    expect($response->json('sources'))->toBeArray();
});

test('chatbot provides authoritative responses for space radiation hazard inquiries', function () {
    $response = $this->postJson('/api/ai/chat', [
        'message' => 'Explain the space radiation hazard and galactic cosmic rays during deep space exploration.',
    ]);

    $response->assertStatus(200)
        ->assertJson([
            'success' => true,
        ]);

    $reply = $response->json('reply');
    expect(strtolower($reply))->toContain('radiation');
});
