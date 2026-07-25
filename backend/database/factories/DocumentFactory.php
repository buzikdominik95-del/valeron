<?php

namespace Database\Factories;

use App\Modules\Users\Models\Document;
use Illuminate\Database\Eloquent\Factories\Factory;

class DocumentFactory extends Factory
{
    protected $model = Document::class;

    public function definition(): array
    {
        return [
            'type' => fake()->randomElement(['passport', 'license', 'contract', 'proof_of_address']),
            'filename' => fake()->fileName(),
            'mime_type' => 'application/pdf',
            'path' => 'documents/' . rand(1, 10) . '/' . fake()->slug() . '.pdf',
            'size' => fake()->numberBetween(1024, 10240000),
            'status' => 'pending',
        ];
    }
}
