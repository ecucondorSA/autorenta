
import { Injectable, inject } from '@angular/core';
import { LoggerService } from '@core/services/infrastructure/logger.service';
import { injectSupabase } from '@core/services/infrastructure/supabase-client.service';
import { VerificationService } from './verification.service';

@Injectable({ providedIn: 'root' })
export class LicenseVerificationService {
    private readonly supabase = injectSupabase();
    private readonly logger = inject(LoggerService);
    private readonly verificationService = inject(VerificationService);

    /**
     * Processes a captured license image: uploads it and analyzes it with Gemini.
     * @param blob The image blob captured from the camera
     * @param country The country code (default 'AR')
     */
    async processLicense(blob: Blob, country: string = 'AR'): Promise<void> {
        this.logger.info('Processing captured license...');

        try {
            // 1. Convert Blob to File for upload
            const file = new File([blob], `license_${Date.now()}.jpg`, { type: 'image/jpeg' });

            // 2. Upload to storage (persists as 'driver_license')
            // Note: 'driver_license' is the generic type, but usually valid types are 'license_front'/'license_back'.
            // We'll use 'license_front' as the primary one for now.
            const storagePath = await this.verificationService.uploadDocument(file, 'license_front');
            this.logger.debug('License uploaded to', storagePath);

            // 3. Prepare for Gemini Analysis
            const base64 = await this.blobToBase64(blob);

            // 4. Call Gemini Edge Function
            const { data, error } = await this.supabase.functions.invoke('gemini3-document-analyzer', {
                body: {
                    image_base64: base64,
                    document_type: 'DRIVER_LICENSE',
                    country: country,
                },
            });

            if (error) {
                this.logger.error('Gemini Analysis Failed', error);
                throw error;
            }

            this.logger.info('Gemini Analysis Result:', data);

            // 5. Update user_identity_levels with extracted data
            if (data.success && data.extracted_data) {
                const user = (await this.supabase.auth.getUser()).data.user;
                if (user) {
                    const ed = data.extracted_data;
                    const updates: Record<string, unknown> = {};

                    if (ed.license_categories) updates['driver_license_categories'] = ed.license_categories;
                    if (ed.expiry_date) updates['driver_license_expiry'] = ed.expiry_date;
                    if (ed.license_points !== undefined) updates['driver_license_points'] = ed.license_points;
                    if (ed.is_professional !== undefined) updates['driver_license_professional'] = ed.is_professional;
                    if (ed.document_number) updates['driver_license_number'] = ed.document_number;

                    if (Object.keys(updates).length > 0) {
                        updates['updated_at'] = new Date().toISOString();

                        // Upsert to ensure record exists
                        const { error: updateError } = await this.supabase
                            .from('user_identity_levels')
                            .upsert({ user_id: user.id, ...updates }, { onConflict: 'user_id' });

                        if (updateError) {
                            this.logger.warn('Could not update identity levels from license analysis', updateError);
                        } else {
                            this.logger.info('Updated identity levels with license data');
                        }
                    }
                }
            }

            // 5. Reload status
            await this.verificationService.loadDocuments();

        } catch (error) {
            this.logger.error('Error processing license', error);
            throw error;
        }
    }

    private blobToBase64(blob: Blob): Promise<string> {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => {
                const result = reader.result as string;
                // Remove data URL prefix if present
                const base64 = result.includes(',') ? result.split(',')[1] : result;
                resolve(base64);
            };
            reader.onerror = reject;
            reader.readAsDataURL(blob);
        });
    }
}
