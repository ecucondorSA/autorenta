import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  OnInit,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { injectSupabase } from '@core/services/infrastructure/supabase-client.service';
import { ToastService } from '@core/services/ui/toast.service';

interface QueueItem {
  id: string;
  content_type: string;
  platform: string;
  text_content: string;
  media_url: string | null;
  hashtags: string[] | null;
  call_to_action: string | null;
  scheduled_for: string;
  status: 'pending' | 'processing' | 'published' | 'failed';
  attempts: number;
  error_message: string | null;
  published_at: string | null;
  post_id: string | null;
  post_url: string | null;
  created_at: string;
}

interface PostLog {
  id: string;
  platform: string;
  post_id: string | null;
  content_type: string | null;
  text_content: string | null;
  engagement: Record<string, number> | null;
  published_at: string;
}

type TabType = 'queue' | 'published' | 'generate';
type Platform = 'tiktok' | 'instagram' | 'facebook' | 'twitter';
type ContentType = 'tip' | 'promo' | 'car_spotlight' | 'testimonial' | 'seasonal' | 'community';

@Component({
  standalone: true,
  selector: 'app-admin-marketing-page',
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './admin-marketing.page.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminMarketingPage implements OnInit {
  private readonly supabase = injectSupabase();
  private readonly toast = inject(ToastService);

  // State
  protected readonly activeTab = signal<TabType>('queue');
  protected readonly isLoading = signal(true);
  protected readonly isGenerating = signal(false);

  // Data
  protected readonly queueItems = signal<QueueItem[]>([]);
  protected readonly publishedPosts = signal<PostLog[]>([]);

  // Stats
  protected readonly pendingCount = computed(
    () => this.queueItems().filter((i) => i.status === 'pending').length
  );
  protected readonly publishedCount = computed(() => this.publishedPosts().length);
  protected readonly failedCount = computed(
    () => this.queueItems().filter((i) => i.status === 'failed').length
  );

  // Generate form
  protected readonly generateForm = signal({
    content_type: 'tip' as ContentType,
    platform: 'instagram' as Platform,
    theme: '',
    generate_image: false,
  });

  protected readonly generatedContent = signal<{
    caption: string;
    hashtags: string[];
    call_to_action: string;
  } | null>(null);

  // Edit modal
  protected readonly editingItem = signal<QueueItem | null>(null);
  protected readonly editForm = signal({
    text_content: '',
    scheduled_for: '',
  });

  // Platform colors
  protected readonly platformColors: Record<Platform, string> = {
    tiktok: 'bg-black text-white',
    instagram: 'bg-gradient-to-r from-purple-500 to-pink-500 text-white',
    facebook: 'bg-blue-600 text-white',
    twitter: 'bg-sky-500 text-white',
  };

  // Status colors
  protected readonly statusColors: Record<string, string> = {
    pending: 'bg-yellow-100 text-yellow-800',
    processing: 'bg-blue-100 text-blue-800',
    published: 'bg-green-100 text-green-800',
    failed: 'bg-red-100 text-red-800',
  };

  async ngOnInit(): Promise<void> {
    await this.loadData();
  }

  async loadData(): Promise<void> {
    this.isLoading.set(true);
    try {
      await Promise.all([this.loadQueue(), this.loadPublished()]);
    } catch (error) {
      console.error('Error loading marketing data:', error);
      this.toast.error('Error', 'No se pudieron cargar los datos de marketing');
    } finally {
      this.isLoading.set(false);
    }
  }

  private async loadQueue(): Promise<void> {
    const { data, error } = await this.supabase
      .from('marketing_content_queue')
      .select('*')
      .order('scheduled_for', { ascending: true })
      .limit(100);

    if (error) throw error;
    this.queueItems.set((data as QueueItem[]) || []);
  }

  private async loadPublished(): Promise<void> {
    const { data, error } = await this.supabase
      .from('marketing_posts_log')
      .select('*')
      .order('published_at', { ascending: false })
      .limit(50);

    if (error) throw error;
    this.publishedPosts.set((data as PostLog[]) || []);
  }

  setTab(tab: TabType): void {
    this.activeTab.set(tab);
  }

  // Generate content
  async generateContent(): Promise<void> {
    this.isGenerating.set(true);
    this.generatedContent.set(null);

    try {
      const form = this.generateForm();
      const response = await this.supabase.functions.invoke('generate-marketing-content', {
        body: {
          content_type: form.content_type,
          platform: form.platform,
          theme: form.theme || undefined,
          language: 'es',
          generate_image: form.generate_image,
        },
      });

      if (response.error) throw response.error;

      const result = response.data;
      if (!result.success) {
        throw new Error(result.error || 'Error al generar contenido');
      }

      this.generatedContent.set(result.text);
      this.toast.success('Listo', 'Contenido generado con Gemini');
    } catch (error) {
      console.error('Error generating content:', error);
      this.toast.error('Error', 'No se pudo generar el contenido');
    } finally {
      this.isGenerating.set(false);
    }
  }

  async scheduleGenerated(): Promise<void> {
    const content = this.generatedContent();
    const form = this.generateForm();
    if (!content) return;

    try {
      // Schedule for tomorrow at optimal time
      const scheduledFor = new Date();
      scheduledFor.setDate(scheduledFor.getDate() + 1);
      scheduledFor.setHours(12, 0, 0, 0);

      const { error } = await this.supabase.from('marketing_content_queue').insert({
        content_type: form.content_type,
        platform: form.platform,
        text_content: content.caption,
        hashtags: content.hashtags,
        call_to_action: content.call_to_action,
        scheduled_for: scheduledFor.toISOString(),
        status: 'pending',
      });

      if (error) throw error;

      this.toast.success('Programado', 'Post programado para mañana 12:00');
      this.generatedContent.set(null);
      await this.loadQueue();
      this.setTab('queue');
    } catch (error) {
      console.error('Error scheduling post:', error);
      this.toast.error('Error', 'No se pudo programar el post');
    }
  }

  // Edit queue item
  openEdit(item: QueueItem): void {
    this.editingItem.set(item);
    this.editForm.set({
      text_content: item.text_content,
      scheduled_for: item.scheduled_for.slice(0, 16), // Format for datetime-local
    });
  }

  closeEdit(): void {
    this.editingItem.set(null);
  }

  async saveEdit(): Promise<void> {
    const item = this.editingItem();
    const form = this.editForm();
    if (!item) return;

    try {
      const { error } = await this.supabase
        .from('marketing_content_queue')
        .update({
          text_content: form.text_content,
          scheduled_for: new Date(form.scheduled_for).toISOString(),
        })
        .eq('id', item.id);

      if (error) throw error;

      this.toast.success('Actualizado', 'Post actualizado correctamente');
      this.closeEdit();
      await this.loadQueue();
    } catch (error) {
      console.error('Error updating post:', error);
      this.toast.error('Error', 'No se pudo actualizar el post');
    }
  }

  // Delete queue item
  async deleteItem(item: QueueItem): Promise<void> {
    if (!confirm(`¿Eliminar post para ${item.platform}?`)) return;

    try {
      const { error } = await this.supabase
        .from('marketing_content_queue')
        .delete()
        .eq('id', item.id);

      if (error) throw error;

      this.toast.success('Eliminado', 'Post eliminado de la cola');
      await this.loadQueue();
    } catch (error) {
      console.error('Error deleting post:', error);
      this.toast.error('Error', 'No se pudo eliminar el post');
    }
  }

  // Retry failed post
  async retryItem(item: QueueItem): Promise<void> {
    try {
      const { error } = await this.supabase
        .from('marketing_content_queue')
        .update({
          status: 'pending',
          attempts: 0,
          error_message: null,
        })
        .eq('id', item.id);

      if (error) throw error;

      this.toast.success('Reencolado', 'El post se reintentará');
      await this.loadQueue();
    } catch (error) {
      console.error('Error retrying post:', error);
      this.toast.error('Error', 'No se pudo reencolar el post');
    }
  }

  // Publish now
  async publishNow(item: QueueItem): Promise<void> {
    if (!confirm(`¿Publicar ahora en ${item.platform}?`)) return;

    try {
      const response = await this.supabase.functions.invoke('social-media-publisher', {
        body: {
          platform: item.platform,
          content: {
            text: item.text_content,
            media_url: item.media_url,
            hashtags: item.hashtags,
          },
          queue_id: item.id,
        },
      });

      if (response.error) throw response.error;

      const result = response.data;
      if (!result.success) {
        throw new Error(result.error || 'Error al publicar');
      }

      this.toast.success('Publicado', `Post publicado en ${item.platform}`);
      await this.loadData();
    } catch (error) {
      console.error('Error publishing:', error);
      this.toast.error('Error', 'No se pudo publicar el post');
    }
  }

  // Run scheduler manually
  async runScheduler(): Promise<void> {
    try {
      const response = await this.supabase.functions.invoke('marketing-scheduler', {
        body: { max_posts: 10 },
      });

      if (response.error) throw response.error;

      const result = response.data;
      this.toast.success('Scheduler', `${result.published || 0} publicados, ${result.failed || 0} fallidos`);
      await this.loadData();
    } catch (error) {
      console.error('Error running scheduler:', error);
      this.toast.error('Error', 'No se pudo ejecutar el scheduler');
    }
  }

  // Form update helpers (arrow functions not allowed in AOT templates)
  updateGenerateFormField(field: 'platform' | 'content_type' | 'theme' | 'generate_image', value: unknown): void {
    this.generateForm.update((f) => ({ ...f, [field]: value }));
  }

  updateEditFormField(field: 'text_content' | 'scheduled_for', value: string): void {
    this.editForm.update((f) => ({ ...f, [field]: value }));
  }

  // Color helpers for platform and status (safe type access)
  getPlatformColor(platform: string): string {
    return this.platformColors[platform as Platform] || 'bg-gray-500 text-white';
  }

  getStatusColor(status: string): string {
    return this.statusColors[status] || 'bg-gray-100 text-gray-800';
  }

  // Helpers
  formatDate(dateStr: string): string {
    return new Date(dateStr).toLocaleString('es-AR', {
      dateStyle: 'short',
      timeStyle: 'short',
    });
  }

  formatPlatform(platform: string): string {
    return platform.charAt(0).toUpperCase() + platform.slice(1);
  }

  formatContentType(type: string): string {
    const labels: Record<string, string> = {
      tip: 'Consejo',
      promo: 'Promoción',
      car_spotlight: 'Auto destacado',
      testimonial: 'Testimonial',
      seasonal: 'Estacional',
      community: 'Comunidad',
    };
    return labels[type] || type;
  }

  truncate(text: string, maxLength: number): string {
    if (text.length <= maxLength) return text;
    return text.slice(0, maxLength) + '...';
  }
}
