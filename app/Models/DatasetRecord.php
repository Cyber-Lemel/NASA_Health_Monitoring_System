<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class DatasetRecord extends Model
{
    // Point directly to the exact table name in MySQL
    protected $table = 'dataset_records';

    // The primary identifier in MySQL/SQLite is 'Astronaut' (string, e.g. AST-01)
    protected $primaryKey = 'Astronaut';

    public $incrementing = false;

    protected $keyType = 'string';

    // Disable automatic created_at / updated_at
    public $timestamps = false;

    // Allow all columns to be mass assigned
    protected $guarded = [];

    protected static function boot(): void
    {
        parent::boot();

        static::creating(function ($model): void {
            // Auto-assign sequential astronaut ID if missing
            if (empty($model->Astronaut)) {
                $maxId = 0;
                foreach (static::pluck('Astronaut') as $existing) {
                    preg_match('/\d+/', (string) $existing, $m);
                    if (! empty($m[0])) {
                        $maxId = max($maxId, (int) $m[0]);
                    }
                }
                $model->Astronaut = sprintf('AST-%02d', $maxId + 1);
            }
        });
    }
}
