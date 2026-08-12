<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class AiWorkflowRun extends Model
{
    protected $fillable = ['workflow_id', 'chat_id', 'status', 'current_node', 'context', 'started_at', 'finished_at', 'error'];

    protected $casts = [
        'context' => 'array',
        'started_at' => 'datetime',
        'finished_at' => 'datetime',
    ];

    public function workflow()
    {
        return $this->belongsTo(AiWorkflow::class, 'workflow_id');
    }
}
