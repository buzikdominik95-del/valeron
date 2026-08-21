<?php

namespace App\Console\Commands;

use App\Events\ChatPing;
use App\Models\Chat;
use App\Models\User;
use App\Support\ManagerTrafficAssigner;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;

class ReconcileLeadAssignments extends Command
{
    protected $signature = 'velora:reconcile-lead-assignments
        {--apply : Apply corrections instead of only reporting them}
        {--full : Also inspect every assigned manager against their handled levels}';

    protected $description = 'Checks and synchronizes the level and manager in users, leads and chats.';

    public function handle(): int
    {
        $apply = (bool) $this->option('apply');
        $checked = 0;
        $changed = 0;
        $chatIds = [];

        $candidateIds = User::query()
            ->leftJoin('leads', 'leads.user_id', '=', 'users.id')
            ->leftJoin('chats', 'chats.user_id', '=', 'users.id')
            ->where(function ($query): void {
                $query->whereRaw('COALESCE(users.commission_level_id, 1) <> COALESCE(leads.commission_level_id, 1)')
                    ->orWhereRaw('COALESCE(users.assigned_manager_id, 0) <> COALESCE(leads.assigned_manager_id, 0)')
                    ->orWhere(function ($chatQuery): void {
                        $chatQuery->where(function ($status): void {
                            $status->whereNull('chats.status')->orWhere('chats.status', '!=', 'completed');
                        })->whereRaw('COALESCE(chats.manager_id, 0) <> COALESCE(users.assigned_manager_id, 0)');
                    });
            })
            ->distinct()
            ->orderBy('users.id')
            ->pluck('users.id');

        if ($this->option('full')) {
            $candidateIds = User::query()->whereNotNull('assigned_manager_id')->orderBy('id')->pluck('id');
        }

        $candidateIds->chunk(200)->each(function ($ids) use ($apply, &$checked, &$changed, &$chatIds): void {
            $users = User::query()->whereIn('id', $ids->all())->orderBy('id')->get();
            foreach ($users as $row) {
                $checked++;
                $result = DB::transaction(function () use ($row, $apply) {
                    $user = User::query()->lockForUpdate()->find($row->id);
                    if (!$user) {
                        return null;
                    }

                    $lead = DB::table('leads')->where('user_id', $user->id)->lockForUpdate()->first();
                    $chat = Chat::query()->where('user_id', $user->id)->lockForUpdate()->first();
                    $level = max(1, (int) ($user->commission_level_id ?? 1));
                    $expectedManager = (int) ($user->assigned_manager_id ?? 0);
                    $leadOutOfSync = !$lead
                        || (int) ($lead->commission_level_id ?? 1) !== $level
                        || (int) ($lead->assigned_manager_id ?? 0) !== $expectedManager;
                    $chatOutOfSync = $chat
                        && (string) $chat->status !== 'completed'
                        && (int) ($chat->manager_id ?? 0) !== $expectedManager;
                    $managerInvalid = $expectedManager > 0
                        && !ManagerTrafficAssigner::managerCanHandleLevel($expectedManager, $level);

                    if (!$leadOutOfSync && !$chatOutOfSync && !$managerInvalid) {
                        return null;
                    }

                    if (!$apply) {
                        return ['id' => $user->id, 'chat_id' => $chat?->id];
                    }

                    ManagerTrafficAssigner::syncChatAssignment($user, $chat, false);
                    return ['id' => $user->id, 'chat_id' => $chat?->id];
                });

                if ($result) {
                    $changed++;
                    if (!empty($result['chat_id'])) {
                        $chatIds[] = (int) $result['chat_id'];
                    }
                }
            }
        });

        if ($apply) {
            foreach (array_unique($chatIds) as $chatId) {
                ChatPing::safeDispatch($chatId);
            }
        }

        $this->info(sprintf('%s: checked=%d, mismatches=%d', $apply ? 'Applied' : 'Dry run', $checked, $changed));

        return self::SUCCESS;
    }
}

