<?php

namespace Tests\Feature\Users;

use Tests\TestCase;
use App\Modules\Users\Models\User;
use App\Modules\Users\Models\Document;
use Illuminate\Http\UploadedFile;
use Illuminate\Foundation\Testing\RefreshDatabase;

class DocumentTest extends TestCase
{
    use RefreshDatabase;

    public function test_user_can_upload_document()
    {
        $user = User::factory()->create();
        
        $response = $this->actingAs($user, 'sanctum')
            ->postJson('/api/users/documents/upload', [
                'file' => UploadedFile::fake()->create('document.pdf', 1024),
                'type' => 'passport',
            ]);

        $response->assertStatus(201)
            ->assertJsonStructure(['message', 'data']);
    }

    public function test_user_can_get_documents()
    {
        $user = User::factory()->create();
        Document::factory(3)->create(['user_id' => $user->id]);

        $response = $this->actingAs($user, 'sanctum')
            ->getJson('/api/users/documents/');

        $response->assertStatus(200)
            ->assertJsonStructure(['data']);
    }

    public function test_user_can_delete_document()
    {
        $user = User::factory()->create();
        $document = Document::factory()->create(['user_id' => $user->id]);

        $response = $this->actingAs($user, 'sanctum')
            ->deleteJson('/api/users/documents/' . $document->id);

        $response->assertStatus(200);
        $this->assertDatabaseMissing('documents', ['id' => $document->id]);
    }
}
