<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class AiWorkflow extends Model
{
    protected $fillable = ['name', 'description', 'trigger_type', 'graph', 'enabled', 'version'];

    protected $casts = [
        'graph' => 'array',
        'enabled' => 'boolean',
    ];

    public function runs()
    {
        return $this->hasMany(AiWorkflowRun::class, 'workflow_id');
    }
}
