<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        if (! Schema::hasTable('nasa_hazards')) {
            Schema::create('nasa_hazards', function (Blueprint $table) {
                $table->id();
                $table->string('hazard_code', 10)->unique(); // 'R', 'I', 'D', 'G', 'E'
                $table->string('hazard_id', 20)->unique();   // 'HAZ-01' to 'HAZ-05'
                $table->string('title');                     // 'Space Radiation', etc.
                $table->string('tagline')->nullable();
                $table->string('icon')->default('Shield');
                $table->string('category')->nullable();
                $table->text('description');
                $table->text('deep_space_context')->nullable();
                $table->json('key_risks')->nullable();
                $table->json('biomedical_metrics')->nullable();
                $table->json('countermeasures')->nullable();
                $table->json('hrp_elements')->nullable();
                $table->string('nasa_url')->default('https://www.nasa.gov/hrp/hazards/');
                $table->string('severity_level')->default('CRITICAL');
                $table->timestamps();
            });
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('nasa_hazards');
    }
};
