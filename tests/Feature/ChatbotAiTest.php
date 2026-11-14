<?php

use Illuminate\Support\Facades\Http;

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

test('chatbot testKey endpoint validates key and tests connection', function () {
    Http::fake([
        'generativelanguage.googleapis.com/*' => Http::response([
            'candidates' => [
                [
                    'content' => [
                        'parts' => [
                            ['text' => 'Pong'],
                        ],
                        'role' => 'model',
                    ],
                ],
            ],
        ], 200),
    ]);

    $response = $this->postJson('/api/ai/test-key', [
        'api_key' => 'test-api-key-12345',
        'model' => 'gemini-3-flash-preview',
    ]);

    $response->assertStatus(200)
        ->assertJson([
            'success' => true,
            'model' => 'gemini-3-flash-preview',
        ]);
});

test('chatbot testKey endpoint rejects missing key with 400', function () {
    config(['services.gemini.api_key' => null]);

    $response = $this->postJson('/api/ai/test-key', [
        'api_key' => '',
    ]);

    $response->assertStatus(400)
        ->assertJson([
            'success' => false,
        ]);
});
