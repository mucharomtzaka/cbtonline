<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('questions', function (Blueprint $table) {
            $table->string('media_type')->nullable()->after('prompt');
            $table->string('media_url')->nullable()->after('media_type');
            $table->text('media_caption')->nullable()->after('media_url');
        });
    }

    public function down(): void
    {
        Schema::table('questions', function (Blueprint $table) {
            $table->dropColumn(['media_type', 'media_url', 'media_caption']);
        });
    }
};