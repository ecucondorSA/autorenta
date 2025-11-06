# CLAUDE_STORAGE.md

Supabase Storage: buckets, RLS policies y path conventions.

## Storage Buckets

La aplicación usa Supabase Storage con los siguientes buckets:

| Bucket | Purpose | Public | Path Pattern |
|--------|---------|--------|--------------|
| `avatars` | Fotos de perfil de usuario | ✅ Yes | `{user_id}/{filename}` |
| `car-images` | Fotos de listings de autos | ✅ Yes | `{user_id}/{car_id}/{filename}` |
| `documents` | Documentos de verificación | ❌ No | `{user_id}/{document_type}/{filename}` |

## Storage Path Conventions

### CRITICAL: NO incluir bucket name como prefijo

**❌ INCORRECTO** - Incluir nombre de bucket en path:
```typescript
const filePath = `avatars/${userId}/${filename}`;
await supabase.storage.from('avatars').upload(filePath, file);
```

**✅ CORRECTO** - Path sin prefijo de bucket:
```typescript
const filePath = `${userId}/${filename}`;
await supabase.storage.from('avatars').upload(filePath, file);
```

### Por qué?

Las políticas RLS validan que el primer folder en el path coincida con `auth.uid()`:

```sql
(storage.foldername(name))[1] = auth.uid()::text
```

Si incluyes el prefijo de bucket, la policy check falla:
- Con `avatars/user-id/file.jpg`: `foldername()[1]` = `'avatars'` ❌
- Con `user-id/file.jpg`: `foldername()[1]` = `user-id` ✅

## RLS Policies for Storage

### Avatar Uploads (`storage.objects` table)

```sql
-- Users pueden upload a su propia carpeta
CREATE POLICY "Users can upload own avatar"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'avatars' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Users pueden actualizar sus propios archivos
CREATE POLICY "Users can update own avatar"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'avatars' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Users pueden eliminar sus propios archivos
CREATE POLICY "Users can delete own avatar"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'avatars' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Cualquiera puede ver (bucket público)
CREATE POLICY "Anyone can view avatars"
ON storage.objects FOR SELECT
USING (bucket_id = 'avatars');
```

### Car Images Upload

```sql
-- Locadores pueden upload fotos de sus autos
CREATE POLICY "Locadores can upload car photos"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'car-images' AND
  (storage.foldername(name))[1] = auth.uid()::text AND
  EXISTS (
    SELECT 1 FROM cars
    WHERE cars.id::text = (storage.foldername(name))[2]
    AND cars.locador_id = auth.uid()
  )
);

-- Locadores pueden actualizar fotos de sus autos
CREATE POLICY "Locadores can update car photos"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'car-images' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Locadores pueden eliminar fotos de sus autos
CREATE POLICY "Locadores can delete car photos"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'car-images' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Cualquiera puede ver car images
CREATE POLICY "Anyone can view car images"
ON storage.objects FOR SELECT
USING (bucket_id = 'car-images');
```

### Document Verification (Private Bucket)

```sql
-- Users pueden upload sus propios documentos
CREATE POLICY "Users can upload own documents"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'documents' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Users pueden ver solo sus propios documentos
CREATE POLICY "Users can view own documents"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'documents' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Admins pueden ver todos los documentos
CREATE POLICY "Admins can view all documents"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'documents' AND
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.is_admin = true
  )
);
```

## Storage Service Patterns

### ProfileService Example

**File**: `apps/web/src/app/core/services/profile.service.ts`

```typescript
async uploadAvatar(file: File): Promise<string> {
  const { data: { user } } = await this.supabase.auth.getUser();
  if (!user) throw new Error('Usuario no autenticado');

  // Validaciones
  if (!file.type.startsWith('image/')) {
    throw new Error('El archivo debe ser una imagen');
  }
  if (file.size > 2 * 1024 * 1024) {
    throw new Error('La imagen no debe superar 2MB');
  }

  const extension = file.name.split('.').pop() ?? 'jpg';
  const filePath = `${user.id}/${uuidv4()}.${extension}`; // ✅ No bucket prefix

  // Upload
  const { error } = await this.supabase.storage
    .from('avatars')
    .upload(filePath, file, {
      cacheControl: '3600',
      upsert: true, // Replace existing
    });

  if (error) throw error;

  // Get public URL
  const { data: { publicUrl } } = this.supabase.storage
    .from('avatars')
    .getPublicUrl(filePath);

  // Update profile
  await this.updateProfile({ avatar_url: publicUrl });

  return publicUrl;
}
```

### CarsService Example

**File**: `apps/web/src/app/core/services/cars.service.ts`

```typescript
async uploadPhoto(file: File, carId: string, position = 0): Promise<CarPhoto> {
  const userId = (await this.supabase.auth.getUser()).data.user?.id;
  if (!userId) throw new Error('Usuario no autenticado');

  // Validaciones
  if (!file.type.startsWith('image/')) {
    throw new Error('El archivo debe ser una imagen');
  }
  if (file.size > 5 * 1024 * 1024) {
    throw new Error('La imagen no debe superar 5MB');
  }

  const extension = file.name.split('.').pop() ?? 'jpg';
  const filePath = `${userId}/${carId}/${uuidv4()}.${extension}`; // ✅ No bucket prefix

  // Upload
  const { error } = await this.supabase.storage
    .from('car-images')
    .upload(filePath, file, {
      cacheControl: '3600',
      upsert: false, // Don't replace existing
    });

  if (error) throw error;

  // Get public URL
  const { data } = this.supabase.storage
    .from('car-images')
    .getPublicUrl(filePath);

  // Save to database
  const { data: photoData, error: photoError } = await this.supabase
    .from('car_photos')
    .insert({
      id: uuidv4(),
      car_id: carId,
      stored_path: filePath,
      url: data.publicUrl,
      position,
      sort_order: position,
    })
    .select()
    .single();

  if (photoError) throw photoError;
  return photoData as CarPhoto;
}
```

## Deleting Files from Storage

### Extract Path from Public URL

Cuando eliminas archivos, extrae el path de la URL pública:

```typescript
async deleteAvatar(): Promise<void> {
  const profile = await this.getCurrentProfile();
  if (!profile?.avatar_url) return;

  // Extract storage path from public URL
  const url = new URL(profile.avatar_url);
  const pathParts = url.pathname.split('/avatars/');

  if (pathParts.length > 1) {
    const storagePath = pathParts[1]; // ✅ Sin prefijo de bucket
    await this.supabase.storage.from('avatars').remove([storagePath]);
  }

  // Update profile
  await this.updateProfile({ avatar_url: '' });
}
```

### Batch Delete

```typescript
async deleteCarPhotos(carId: string): Promise<void> {
  const userId = (await this.supabase.auth.getUser()).data.user?.id;
  if (!userId) throw new Error('Usuario no autenticado');

  // Get all photos for car
  const { data: photos } = await this.supabase
    .from('car_photos')
    .select('stored_path')
    .eq('car_id', carId);

  if (!photos || photos.length === 0) return;

  // Delete from storage
  const paths = photos.map(p => p.stored_path);
  await this.supabase.storage.from('car-images').remove(paths);

  // Delete from database
  await this.supabase
    .from('car_photos')
    .delete()
    .eq('car_id', carId);
}
```

## Common Pitfalls

### 1. Storage Path Errors

**Problem**: Incluir nombre de bucket en storage path

```typescript
// ❌ WRONG
const filePath = `avatars/${userId}/${filename}`;
```

**Solution**: Omitir nombre de bucket

```typescript
// ✅ CORRECT
const filePath = `${userId}/${filename}`;
```

**Why**: RLS policies verifican `(storage.foldername(name))[1] = auth.uid()::text`

### 2. File Size Limits

**Problem**: Archivos demasiado grandes para Supabase Storage

**Solution**: Validar antes de upload

```typescript
if (file.size > 2 * 1024 * 1024) {
  throw new Error('El archivo debe ser menor a 2MB');
}
```

**Limites Recomendados**:
- Avatars: 2MB
- Car Photos: 5MB
- Documents: 10MB

### 3. Avatar URL Extraction

**Problem**: Extracción incorrecta de path al eliminar archivos

```typescript
// ❌ WRONG - Incluye prefijo de bucket nuevamente
const storagePath = `avatars/${pathParts[1]}`;

// ✅ CORRECT - Path directo
const storagePath = pathParts[1];
```

### 4. Public vs Private Buckets

**Problem**: Bucket privado con políticas públicas de lectura

**Solution**: Verificar configuración de bucket

```sql
-- Check bucket configuration
SELECT id, name, public
FROM storage.buckets;

-- avatars: public = true
-- car-images: public = true
-- documents: public = false
```

### 5. Missing File Extensions

**Problem**: Archivos sin extensión o con extensión incorrecta

**Solution**: Siempre extraer y validar extensión

```typescript
const extension = file.name.split('.').pop() ?? 'jpg';
const allowedExtensions = ['jpg', 'jpeg', 'png', 'webp'];

if (!allowedExtensions.includes(extension.toLowerCase())) {
  throw new Error('Formato de archivo no permitido');
}
```

## Image Optimization

### Recommended Settings

```typescript
// Resize antes de upload (usar library como browser-image-compression)
const options = {
  maxSizeMB: 1,
  maxWidthOrHeight: 1920,
  useWebWorker: true,
};

const compressedFile = await imageCompression(file, options);
```

### Cloudflare Image Resizing

Si usas Cloudflare (recomendado para producción):

```typescript
// En lugar de getPublicUrl directo, usa Image Resizing
const publicUrl = `https://autorenta.com/cdn-cgi/image/width=800,quality=80/${filePath}`;
```

**Ventajas**:
- Resize on-the-fly
- WebP conversion automática
- Caching edge
- Menor costo de storage

## Monitoring Storage Usage

### Check Storage Size

```sql
-- Total storage usado por bucket
SELECT
  bucket_id,
  COUNT(*) as file_count,
  SUM(metadata->>'size')::bigint as total_bytes,
  pg_size_pretty(SUM(metadata->>'size')::bigint) as total_size
FROM storage.objects
GROUP BY bucket_id;
```

### Find Large Files

```sql
-- Archivos más grandes
SELECT
  name,
  bucket_id,
  (metadata->>'size')::bigint as size_bytes,
  pg_size_pretty((metadata->>'size')::bigint) as size,
  created_at
FROM storage.objects
ORDER BY (metadata->>'size')::bigint DESC
LIMIT 20;
```

### Cleanup Old Files

```typescript
// Eliminar avatars antiguos no usados
async cleanupOldAvatars(): Promise<void> {
  const { data: profiles } = await this.supabase
    .from('profiles')
    .select('avatar_url')
    .not('avatar_url', 'is', null);

  const usedUrls = new Set(profiles?.map(p => p.avatar_url) ?? []);

  const { data: allFiles } = await this.supabase.storage
    .from('avatars')
    .list();

  const filesToDelete = allFiles
    ?.filter(file => {
      const url = this.getPublicUrl('avatars', file.name);
      return !usedUrls.has(url);
    })
    .map(file => file.name) ?? [];

  if (filesToDelete.length > 0) {
    await this.supabase.storage.from('avatars').remove(filesToDelete);
  }
}
```

## Testing Storage Operations

### Unit Tests

```typescript
describe('ProfileService.uploadAvatar', () => {
  it('should upload avatar with correct path', async () => {
    const mockFile = new File([''], 'avatar.jpg', { type: 'image/jpeg' });
    const userId = 'user-id';

    // Mock supabase.auth.getUser
    jest.spyOn(supabase.auth, 'getUser').mockResolvedValue({
      data: { user: { id: userId } }
    });

    await service.uploadAvatar(mockFile);

    // Verify upload was called with correct path
    expect(supabase.storage.from).toHaveBeenCalledWith('avatars');
    expect(uploadMock).toHaveBeenCalledWith(
      expect.stringMatching(new RegExp(`^${userId}/`)),
      mockFile,
      expect.any(Object)
    );
  });

  it('should reject files larger than 2MB', async () => {
    const largeFile = new File(['x'.repeat(3 * 1024 * 1024)], 'large.jpg');

    await expect(service.uploadAvatar(largeFile))
      .rejects
      .toThrow('La imagen no debe superar 2MB');
  });
});
```

### E2E Tests

```typescript
test('should upload and display avatar', async ({ page }) => {
  await page.goto('/profile');

  // Upload file
  const fileInput = page.locator('input[type="file"]');
  await fileInput.setInputFiles('tests/fixtures/avatar.jpg');

  // Wait for upload
  await page.waitForSelector('img[alt="Avatar"]');

  // Verify image is displayed
  const avatar = page.locator('img[alt="Avatar"]');
  const src = await avatar.getAttribute('src');
  expect(src).toContain('supabase.co/storage/v1/object/public/avatars/');
});
```

## References

- **Database Setup**: `apps/web/database/setup-profiles.sql`
- **Storage Policies**: Lines 69-109 in setup-profiles.sql
- **TypeScript Types**: `apps/web/src/app/core/types/database.types.ts`
- **Storage Constants**: Lines 201-205 in database.types.ts
- **Audit Document**: `PHOTO_UPLOAD_AUDIT.md` - Análisis completo de avatar upload RLS issue
- **Architecture**: [CLAUDE_ARCHITECTURE.md](./CLAUDE_ARCHITECTURE.md)
