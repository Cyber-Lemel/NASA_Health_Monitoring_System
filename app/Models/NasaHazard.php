<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class NasaHazard extends Model
{
    protected $table = 'nasa_hazards';

    protected $guarded = [];

    protected $casts = [
        'key_risks' => 'array',
        'biomedical_metrics' => 'array',
        'countermeasures' => 'array',
        'hrp_elements' => 'array',
    ];
}
