<?php

use Illuminate\Support\Facades\Broadcast;
use Illuminate\Support\Facades\DB;

Broadcast::channel('App.Models.User.{id}', function ($user, $id) {
    return (int) $user->id === (int) $id;
});

// Все авторизованные админы/менеджеры получают пинги по всем чатам.
Broadcast::channel('admin.chats', function ($user) {
    if (!$user) {
        return false;
    }

    // AdminUser (sanctum admin guard) или наличие admin-роли
    if (isset($user->role) && in_array((string) $user->role, ['manager', 'team_lead', 'observer', 'admin', 'super_admin'], true)) {
        return true;
    }

    try {
        return DB::table('admin_users')->where('email', (string) ($user->email ?? ''))->exists();
    } catch (\Throwable $e) {
        return false;
    }
});

// Клиент слушает только собственный чат.
Broadcast::channel('chat.{id}', function ($user, $id) {
    if (!$user) {
        return false;
    }

    // Админ тоже может слушать конкретный чат
    if (isset($user->role) && in_array((string) $user->role, ['manager', 'team_lead', 'observer', 'admin', 'super_admin'], true)) {
        return true;
    }

    try {
        $ownerId = DB::table('chats')->where('id', (int) $id)->value('user_id');
        return (int) $ownerId === (int) $user->id;
    } catch (\Throwable $e) {
        return false;
    }
});
