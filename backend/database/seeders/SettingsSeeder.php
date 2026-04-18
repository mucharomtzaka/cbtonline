<?php

namespace Database\Seeders;

use App\Models\Setting;
use Illuminate\Database\Seeder;

class SettingsSeeder extends Seeder
{
    public function run(): void
    {
        $settings = [
            ['key' => 'school_name', 'value' => 'CBT Online'],
            ['key' => 'school_level', 'value' => 'SMK'],
            ['key' => 'school_email', 'value' => 'info@cbt-online.test'],
            ['key' => 'school_address', 'value' => 'Jl. Teknologi No. 1, Jakarta'],
            ['key' => 'school_logo', 'value' => ''],
        ];

        foreach ($settings as $setting) {
            Setting::updateOrCreate(
                ['key' => $setting['key']],
                ['value' => $setting['value']]
            );
        }
    }
}