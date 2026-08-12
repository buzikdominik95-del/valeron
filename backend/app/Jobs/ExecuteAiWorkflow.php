<?php

namespace App\Jobs;

use App\Models\AiWorkflowRun;
use App\Services\AiManager\WorkflowEngine;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;

class ExecuteAiWorkflow implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $tries = 1;
    public int $timeout = 300;

    public function __construct(
        public int $runId,
        public ?string $fromNodeId = null,
    ) {}

    public function handle(WorkflowEngine $engine): void
    {
        $run = AiWorkflowRun::find($this->runId);
        if (!$run) {
            return;
        }
        if ($run->status === 'waiting') {
            $run->status = 'running';
            $run->save();
        }
        $engine->resume($run, $this->fromNodeId);
    }
}
