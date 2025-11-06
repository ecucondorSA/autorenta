import { test, expect } from '@playwright/test';
import { ProfilePage } from '../pages/profile/ProfilePage';
import { createClient } from '@supabase/supabase-js';
import * as path from 'path';
import * as fs from 'fs';

/**
 * Renter Test: Profile Edit
 *
 * Tests user profile editing functionality.
 *
 * Pre-requisites:
 * - Renter user authenticated (via setup:renter)
 *
 * Test Coverage:
 * - Edit profile name
 * - Edit phone number
 * - Edit WhatsApp number
 * - Upload avatar image
 * - Delete avatar image
 * - Verify changes persist in database
 */

const supabaseUrl = process.env.NG_APP_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NG_APP_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

test.describe('Renter - Profile Edit', () => {
  let profilePage: ProfilePage;
  let testUserId: string;

  test.beforeEach(async ({ page }) => {
    profilePage = new ProfilePage(page);

    // Get the test renter user ID
    const { data: user } = await supabase
      .from('profiles')
      .select('id')
      .ilike('email', '%renter.test%')
      .single();

    if (!user) {
      throw new Error('Renter test user not found');
    }

    testUserId = user.id;
  });

  test('should navigate to profile page', async () => {
    await profilePage.goto();
    await expect(profilePage.pageTitle).toBeVisible();
    console.log('✅ Profile page loaded successfully');
  });

  test('should display current profile information', async () => {
    await profilePage.goto();

    const info = await profilePage.getProfileInfo();
    console.log('📋 Current Profile:');
    console.log(`  - Name: ${info.fullName}`);
    console.log(`  - Phone: ${info.phone || 'Not set'}`);
    console.log(`  - WhatsApp: ${info.whatsapp || 'Not set'}`);

    expect(info.fullName).toBeTruthy();
  });

  test('should enter edit mode when clicking "Edit profile"', async () => {
    await profilePage.goto();

    // Should not be in edit mode initially
    let inEditMode = await profilePage.isEditMode();
    expect(inEditMode).toBe(false);

    // Click edit button
    await profilePage.clickEditProfile();

    // Should now be in edit mode
    inEditMode = await profilePage.isEditMode();
    expect(inEditMode).toBe(true);

    console.log('✅ Entered edit mode successfully');
  });

  test('should edit profile name successfully', async () => {
    await profilePage.goto();

    // Get original name
    const originalInfo = await profilePage.getProfileInfo();
    const newName = `Test Renter ${Date.now()}`;

    // Edit profile
    await profilePage.editProfile({ fullName: newName });

    // Wait for save
    await profilePage.page.waitForTimeout(2000);

    // Verify change in UI
    const updatedInfo = await profilePage.getProfileInfo();
    expect(updatedInfo.fullName).toContain('Test Renter');

    // Verify change in database
    const { data: dbProfile } = await supabase
      .from('profiles')
      .select('full_name')
      .eq('id', testUserId)
      .single();

    expect(dbProfile?.full_name).toContain('Test Renter');

    console.log(`✅ Profile name updated: "${originalInfo.fullName}" → "${dbProfile?.full_name}"`);
  });

  test('should edit phone number successfully', async () => {
    await profilePage.goto();

    const newPhone = '+598 99 555 1234';

    // Edit profile
    await profilePage.editProfile({ phone: newPhone });
    await profilePage.page.waitForTimeout(2000);

    // Verify change in database
    const { data: dbProfile } = await supabase
      .from('profiles')
      .select('phone')
      .eq('id', testUserId)
      .single();

    expect(dbProfile?.phone).toBe(newPhone);
    console.log(`✅ Phone number updated to: ${newPhone}`);
  });

  test('should edit multiple fields simultaneously', async () => {
    await profilePage.goto();

    const updates = {
      fullName: `Multi Update Test ${Date.now()}`,
      phone: '+598 99 888 7777',
      whatsapp: '+598 99 999 6666',
    };

    // Edit profile
    await profilePage.editProfile(updates);
    await profilePage.page.waitForTimeout(2000);

    // Verify changes in database
    const { data: dbProfile } = await supabase
      .from('profiles')
      .select('full_name, phone, whatsapp')
      .eq('id', testUserId)
      .single();

    expect(dbProfile?.full_name).toContain('Multi Update Test');
    expect(dbProfile?.phone).toBe(updates.phone);
    expect(dbProfile?.whatsapp).toBe(updates.whatsapp);

    console.log('✅ Multiple fields updated successfully');
  });

  test('should cancel edit without saving changes', async () => {
    await profilePage.goto();

    // Get original info
    const originalInfo = await profilePage.getProfileInfo();

    // Enter edit mode
    await profilePage.clickEditProfile();

    // Change name but don't save
    await profilePage.fullNameInput.clear();
    await profilePage.fullNameInput.fill('Should Not Be Saved');

    // Cancel
    await profilePage.cancelEdit();

    // Verify name didn't change
    const currentInfo = await profilePage.getProfileInfo();
    expect(currentInfo.fullName).toBe(originalInfo.fullName);

    console.log('✅ Cancel edit works correctly');
  });
});

test.describe('Renter - Avatar Upload', () => {
  let profilePage: ProfilePage;
  let testUserId: string;
  let testImagePath: string;

  test.beforeAll(async () => {
    // Create a test image file (1x1 pixel PNG)
    const testDir = path.join(__dirname, '../fixtures');
    if (!fs.existsSync(testDir)) {
      fs.mkdirSync(testDir, { recursive: true });
    }

    testImagePath = path.join(testDir, 'test-avatar.png');

    // Create a minimal valid PNG file (1x1 transparent pixel)
    const pngBuffer = Buffer.from([
      0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, // PNG signature
      0x00, 0x00, 0x00, 0x0d, // IHDR chunk length
      0x49, 0x48, 0x44, 0x52, // IHDR
      0x00, 0x00, 0x00, 0x01, // Width: 1
      0x00, 0x00, 0x00, 0x01, // Height: 1
      0x08, 0x06, 0x00, 0x00, 0x00, // Bit depth, color type, etc.
      0x1f, 0x15, 0xc4, 0x89, // CRC
      0x00, 0x00, 0x00, 0x0a, // IDAT chunk length
      0x49, 0x44, 0x41, 0x54, // IDAT
      0x08, 0xd7, 0x63, 0x60, 0x00, 0x00, 0x00, 0x02, 0x00, 0x01,
      0xe2, 0x21, 0xbc, 0x33, // CRC
      0x00, 0x00, 0x00, 0x00, // IEND chunk length
      0x49, 0x45, 0x4e, 0x44, // IEND
      0xae, 0x42, 0x60, 0x82, // CRC
    ]);

    fs.writeFileSync(testImagePath, pngBuffer);
    console.log(`✅ Created test image at: ${testImagePath}`);
  });

  test.beforeEach(async ({ page }) => {
    profilePage = new ProfilePage(page);

    // Get the test renter user ID
    const { data: user } = await supabase
      .from('profiles')
      .select('id')
      .ilike('email', '%renter.test%')
      .single();

    if (!user) {
      throw new Error('Renter test user not found');
    }

    testUserId = user.id;
  });

  test.afterAll(async () => {
    // Clean up test image
    if (fs.existsSync(testImagePath)) {
      fs.unlinkSync(testImagePath);
      console.log('🧹 Cleaned up test image');
    }
  });

  test('should upload avatar successfully', async () => {
    await profilePage.goto();

    // Check if avatar exists before upload
    const hadAvatarBefore = await profilePage.hasAvatar();

    // Upload avatar
    await profilePage.uploadAvatar(testImagePath);

    // Wait for upload to complete
    await profilePage.page.waitForTimeout(3000);

    // Check if avatar exists after upload
    const hasAvatarAfter = await profilePage.hasAvatar();
    expect(hasAvatarAfter).toBe(true);

    // Verify in database
    const { data: dbProfile } = await supabase
      .from('profiles')
      .select('avatar_url')
      .eq('id', testUserId)
      .single();

    expect(dbProfile?.avatar_url).toBeTruthy();
    console.log(`✅ Avatar uploaded successfully`);
    console.log(`   Had avatar before: ${hadAvatarBefore}`);
    console.log(`   Has avatar after: ${hasAvatarAfter}`);
    console.log(`   Avatar URL: ${dbProfile?.avatar_url}`);
  });

  test('should display uploaded avatar image', async () => {
    await profilePage.goto();

    // Upload avatar
    await profilePage.uploadAvatar(testImagePath);
    await profilePage.page.waitForTimeout(3000);

    // Verify avatar image is visible
    const avatarSrc = await profilePage.avatarImage.getAttribute('src');
    expect(avatarSrc).toBeTruthy();
    expect(avatarSrc).not.toContain('placeholder');

    console.log(`✅ Avatar image displayed with src: ${avatarSrc}`);
  });

  test('should delete avatar successfully', async () => {
    await profilePage.goto();

    // First, ensure we have an avatar
    const hasAvatar = await profilePage.hasAvatar();
    if (!hasAvatar) {
      await profilePage.uploadAvatar(testImagePath);
      await profilePage.page.waitForTimeout(3000);
    }

    // Delete avatar
    await profilePage.deleteAvatar();
    await profilePage.page.waitForTimeout(2000);

    // Verify avatar is removed from database
    const { data: dbProfile } = await supabase
      .from('profiles')
      .select('avatar_url')
      .eq('id', testUserId)
      .single();

    // Avatar URL should be empty or null
    expect(dbProfile?.avatar_url).toBeFalsy();
    console.log('✅ Avatar deleted successfully');
  });
});
