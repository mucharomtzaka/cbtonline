<?php

namespace App\Http\Controllers;

use App\Http\Resources\UserResource;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\Rules;

class UserController extends Controller
{
    public function index(Request $request)
    {
        $query = User::query();
        
        $role = $request->query('role');
        if ($role) {
            $query->whereHas('roles', function($q) use ($role) {
                $q->where('name', $role);
            });
        }
        
        $search = $request->query('search');
        if ($search) {
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                  ->orWhere('username', 'like', "%{$search}%");
            });
        }
        
        $users = UserResource::collection($query->orderBy('id', 'desc')->get());
        return response()->json(['data' => $users]);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'username' => ['required', 'string', 'max:255', 'unique:users'],
            'email' => ['required', 'string', 'email', 'max:255', 'unique:users'],
            'password' => ['required', 'string', 'min:4'],
            'roles' => ['required', 'array'],
            'roles.*' => ['string', 'in:admin,guru,operator,viewer,peserta'],
        ]);

        $user = User::create([
            'name' => $validated['name'],
            'username' => $validated['username'],
            'email' => $validated['email'],
            'password' => Hash::make($validated['password']),
        ]);

        $user->assignRole($validated['roles']);

        return response()->json(['data' => new UserResource($user), 'message' => 'User created successfully'], 201);
    }

    public function show(User $user)
    {
        return response()->json(['data' => new UserResource($user)]);
    }

    public function update(Request $request, User $user)
    {
        $validated = $request->validate([
            'name' => ['sometimes', 'string', 'max:255'],
            'username' => ['sometimes', 'string', 'max:255', 'unique:users,username,' . $user->id],
            'email' => ['sometimes', 'string', 'email', 'max:255', 'unique:users,email,' . $user->id],
            'password' => ['sometimes', 'string', 'min:4'],
            'roles' => ['sometimes', 'array'],
            'roles.*' => ['string', 'in:admin,guru,operator,viewer,peserta'],
        ]);

        if (isset($validated['name'])) $user->name = $validated['name'];
        if (isset($validated['username'])) $user->username = $validated['username'];
        if (isset($validated['email'])) $user->email = $validated['email'];
        if (isset($validated['password'])) $user->password = Hash::make($validated['password']);
        if (isset($validated['roles'])) {
            $user->syncRoles($validated['roles']);
        }

        $user->save();

        return response()->json(['data' => new UserResource($user), 'message' => 'User updated successfully']);
    }

    public function destroy(User $user)
    {
        if ($user->id === auth()->id()) {
            return response()->json(['message' => 'Cannot delete yourself'], 422);
        }

        $user->delete();

        return response()->json(['message' => 'User deleted successfully']);
    }

    public function search(Request $request)
    {
        $q = $request->query('q', '');
        
        $users = User::where('name', 'like', "%{$q}%")
            ->orWhere('username', 'like', "%{$q}%")
            ->limit(10)
            ->get(['id', 'name', 'username', 'email']);

        return response()->json(['data' => $users]);
    }
}