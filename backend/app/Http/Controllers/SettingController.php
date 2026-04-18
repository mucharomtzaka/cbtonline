<?php

namespace App\Http\Controllers;

use App\Models\Setting;
use Illuminate\Http\Request;

class SettingController extends Controller
{
    public function index()
    {
        $settings = [
            'school_name' => Setting::get('school_name', ''),
            'school_level' => Setting::get('school_level', ''),
            'school_email' => Setting::get('school_email', ''),
            'school_address' => Setting::get('school_address', ''),
            'school_logo' => Setting::get('school_logo', ''),
            // AI Settings
            'ai_provider' => Setting::get('ai_provider', 'gemini'),
            'gemini_api_key' => Setting::get('gemini_api_key', ''),
            'gemini_model' => Setting::get('gemini_model', 'gemini-2.0-flash'),
            'openai_api_key' => Setting::get('openai_api_key', ''),
            'openai_model' => Setting::get('openai_model', 'gpt-4o-mini'),
            'anthropic_api_key' => Setting::get('anthropic_api_key', ''),
            'anthropic_model' => Setting::get('anthropic_model', 'claude-3-haiku-20240307'),
        ];
        return response()->json($settings);
    }

    public function update(Request $request)
    {
        $data = $request->validate([
            'school_name' => 'nullable|string|max:255',
            'school_level' => 'nullable|string|max:100',
            'school_email' => 'nullable|email|max:255',
            'school_address' => 'nullable|string|max:500',
            'school_logo' => 'nullable|string',
            // AI Settings
            'ai_provider' => 'nullable|string|in:gemini,openai,anthropic',
            'gemini_api_key' => 'nullable|string',
            'gemini_model' => 'nullable|string|max:100',
            'openai_api_key' => 'nullable|string',
            'openai_model' => 'nullable|string|max:100',
            'anthropic_api_key' => 'nullable|string',
            'anthropic_model' => 'nullable|string|max:100',
        ]);

        foreach ($data as $key => $value) {
            Setting::set($key, $value);
        }

        return response()->json(['message' => 'Settings updated successfully']);
    }

    public function uploadLogo(Request $request)
    {
        $request->validate([
            'logo' => 'required|image|mimes:jpeg,png,jpg,gif,svg|max:2048',
        ]);

        $file = $request->file('logo');
        $filename = 'logo_' . time() . '.' . $file->getClientOriginalExtension();
        $path = $file->storeAs('public/settings', $filename);

        Setting::set('school_logo', $filename);

        return response()->json([
            'message' => 'Logo uploaded successfully',
            'filename' => $filename,
        ]);
    }
}