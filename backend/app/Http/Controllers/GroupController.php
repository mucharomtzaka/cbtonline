<?php

namespace App\Http\Controllers;

use App\Models\Group;
use App\Models\User;
use Illuminate\Http\Request;

class GroupController extends Controller
{
    public function show(Group $group)
    {
        $group->loadCount('users');
        return response()->json(['data' => $group]);
    }

    public function update(Request $request, Group $group)
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'description' => ['nullable', 'string'],
        ]);

        $group->update($data);
        return response()->json(['group' => $group->fresh()]);
    }

    public function destroy(Group $group)
    {
        $group->delete();
        return response()->json(['ok' => true]);
    }

    public function members(Group $group)
    {
        $users = $group->users()
            ->orderByDesc('id')
            ->paginate(50);

        return response()->json($users);
    }

    public function index()
    {
        return response()->json(
            Group::query()->withCount('users')->orderByDesc('id')->paginate(20)
        );
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'description' => ['nullable', 'string'],
        ]);

        $group = Group::create($data);
        return response()->json(['group' => $group], 201);
    }

    public function addMember(Request $request, Group $group)
    {
        $data = $request->validate([
            'user_id' => ['required', 'integer', 'exists:users,id'],
        ]);

        /** @var User $user */
        $user = User::query()->findOrFail($data['user_id']);
        $group->users()->syncWithoutDetaching([$user->id]);

        return response()->json(['ok' => true], 201);
    }

    public function addMembersBulk(Request $request, Group $group)
    {
        $data = $request->validate([
            'user_ids' => ['required', 'array'],
            'user_ids.*' => ['integer', 'exists:users,id'],
        ]);

        $group->users()->syncWithoutDetaching($data['user_ids']);

        return response()->json(['ok' => true, 'count' => count($data['user_ids'])]);
    }

    public function removeMember(Group $group, User $user)
    {
        $group->users()->detach($user->id);
        return response()->json(['ok' => true]);
    }
}

