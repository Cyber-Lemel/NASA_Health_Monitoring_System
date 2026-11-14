<?php

test('reports page loads successfully and receives dataset records', function () {
    $response = $this->get('/reports');

    $response->assertStatus(200);
});
