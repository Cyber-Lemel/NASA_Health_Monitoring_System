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
        Schema::table('dataset_records', function (Blueprint $table) {
            if (!Schema::hasColumn('dataset_records', 'No_of_Mission')) {
                $table->integer('No_of_Mission')->default(1)->nullable();
            }
            if (!Schema::hasColumn('dataset_records', 'Muscle_Mass_Loss')) {
                $table->string('Muscle_Mass_Loss')->default('2.5%')->nullable();
            }
            if (!Schema::hasColumn('dataset_records', 'Radiation_Exposure')) {
                $table->integer('Radiation_Exposure')->default(95)->nullable();
            }
            if (!Schema::hasColumn('dataset_records', 'Cardiovascular_Risk_Score')) {
                $table->integer('Cardiovascular_Risk_Score')->default(6)->nullable();
            }
            if (!Schema::hasColumn('dataset_records', 'Immune_Response_Suppression')) {
                $table->float('Immune_Response_Suppression')->default(7.5)->nullable();
            }
            if (!Schema::hasColumn('dataset_records', 'Psychological_Impact_Score')) {
                $table->integer('Psychological_Impact_Score')->default(4)->nullable();
            }
            if (!Schema::hasColumn('dataset_records', 'Vision_Change')) {
                $table->string('Vision_Change')->default('Clear')->nullable();
            }
            if (!Schema::hasColumn('dataset_records', 'Countermeasures_Used')) {
                $table->text('Countermeasures_Used')->nullable();
            }
            if (!Schema::hasColumn('dataset_records', 'Hazard_Focus')) {
                $table->string('Hazard_Focus')->default('Gravity Fields (G)')->nullable();
            }
            if (!Schema::hasColumn('dataset_records', 'Risk_Level')) {
                $table->string('Risk_Level')->default('Nominal')->nullable();
            }
            if (!Schema::hasColumn('dataset_records', 'NASA_HRP_Protocol')) {
                $table->string('NASA_HRP_Protocol')->default('NASA-STD-3001')->nullable();
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('dataset_records', function (Blueprint $table) {
            $table->dropColumn([
                'No_of_Mission',
                'Muscle_Mass_Loss',
                'Radiation_Exposure',
                'Cardiovascular_Risk_Score',
                'Immune_Response_Suppression',
                'Psychological_Impact_Score',
                'Vision_Change',
                'Countermeasures_Used',
                'Hazard_Focus',
                'Risk_Level',
                'NASA_HRP_Protocol',
            ]);
        });
    }
};

