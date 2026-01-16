# Automated Android Build & Deploy Workflow

## 🚀 Professional-Grade CI/CD Solution

This is the **most robust and professional** approach: completely automated build, version management, verification, and deployment to Google Play Console.

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                   GitHub Actions Workflow                       │
├─────────────────────────────────────────────────────────────────┤
│ 1. Auto-Bump versionCode (optional, default: enabled)          │
│ 2. Compile AAB                                                  │
│ 3. Verify AD_ID permission removed (security check)            │
│ 4. Upload to Google Play (closed_testing track)                │
│ 5. Auto-Commit version bump to main (with [skip ci])           │
└─────────────────────────────────────────────────────────────────┘
```

**No manual intervention required.**

---

## Quick Start (Recommended)

### One-Click Deploy to Closed Testing

```bash
gh workflow run build-android.yml \
  -f build_type=release \
  -f upload_to_play_store=true \
  -f auto_version_bump=true
```

That's it. The workflow will:

✅ Bump versionCode automatically (e.g., 46 → 47)
✅ Compile the AAB with new version
✅ Verify AD_ID is removed (security validation)
✅ Upload to Google Play closed_testing track
✅ Commit version bump to main automatically
✅ All changes tracked in git history

---

## Workflow Parameters

### `build_type` (required)

```
release  → Compile AAB for Google Play submission
debug    → Compile debug APK for testing
```

### `upload_to_play_store` (optional)

```
true  → Upload to Google Play Console (closed_testing)
false → Build only, don't upload
```

**Default:** false (recommended for testing)

### `auto_version_bump` (optional) ⭐ Recommended

```
true  → Automatically increment versionCode (prevents conflicts)
false → Use current versionCode as-is (manual management)
```

**Default:** true (recommended for production)

---

## Full Workflow Examples

### Example 1: Test Build Only (No Upload)

```bash
gh workflow run build-android.yml \
  -f build_type=release \
  -f upload_to_play_store=false \
  -f auto_version_bump=false
```

**Output:**
- ✅ Builds AAB
- ✅ Verifies AD_ID
- ✅ No upload
- ✅ No version bump
- 📦 Artifact saved for manual testing

**Use case:** QA testing before release

---

### Example 2: Full Release (Recommended)

```bash
gh workflow run build-android.yml \
  -f build_type=release \
  -f upload_to_play_store=true \
  -f auto_version_bump=true
```

**Output:**
- ✅ Auto-bumps versionCode (46 → 47)
- ✅ Builds AAB with new version
- ✅ Verifies AD_ID (security check)
- ✅ Uploads to closed_testing
- ✅ Auto-commits version bump to main
- ✅ All logged in GitHub Actions

**Use case:** Production release to closed testing

---

### Example 3: Manual Version Management

```bash
# Step 1: Locally increment version
cd apps/web/android
./bump-version-code.sh
git add app/build.gradle
git commit -m "chore: bump version"
git push

# Step 2: Trigger workflow WITHOUT auto-bump
gh workflow run build-android.yml \
  -f build_type=release \
  -f upload_to_play_store=true \
  -f auto_version_bump=false
```

**Use case:** If you want manual control over version bumping

---

## What Happens Step-by-Step

### 1️⃣ Auto-Bump Version Code

```bash
# If auto_version_bump=true and build_type=release:

Current versionCode: 46
Next versionCode: 47

✅ Version code bumped: 46 → 47
```

**Only if enabled.** If `auto_version_bump=false`, skips this step.

---

### 2️⃣ Get Version & Setup Environment

```
versionCode: 47 (from build.gradle)
versionName: 1.0.12 (from build.gradle)
```

Extracts version info for build output and naming.

---

### 3️⃣ Install Dependencies

```
pnpm install --frozen-lockfile
```

Ensures consistent dependency versions.

---

### 4️⃣ Build Web App

```
pnpm build:web
```

Compiles Angular web app with environment variables.

---

### 5️⃣ Sync Capacitor

```
pnpm exec cap sync android
```

Synchronizes web assets to Android project.

---

### 6️⃣ Build AAB (Android App Bundle)

```
./gradlew bundleRelease --stacktrace --info
```

Creates production-ready AAB signed with keystore.

---

### 7️⃣ Verify AD_ID Removal

```bash
🔍 Verifying AD_ID permission removal...
✅ VERIFICATION PASSED
✓ AD_ID permission is NOT present in the compiled artifact
```

**Security validation.** Fails build if permission is found.

---

### 8️⃣ Upload to Google Play

```
Uploading autorentar-1.0.12-release.aab
Track: closed_testing
Status: completed

✅ Upload successful
Edit ID: 06834816788620506657
```

Only if `upload_to_play_store=true`.

---

### 9️⃣ Auto-Commit Version Bump

```bash
📝 Committing version bump to main...

chore(android): auto-bump versionCode for release

Automatically incremented versionCode to prevent Google Play conflicts.

Version: 1.0.12
Code: 47
Track: closed_testing

This was auto-generated by CI/CD workflow.
[skip ci]
```

Only if `auto_version_bump=true` and upload was successful.

---

### 🔟 Workflow Summary

```
## 📱 Android AAB Build Complete
- **Version:** 1.0.12
- **Type:** release
- **Format:** AAB

## 🚀 Google Play Upload
- **Track:** closed_testing
- **Status:** completed
- **Auto-Bump:** true

📌 Version code was automatically bumped and committed to main.
```

All logged to GitHub Actions summary.

---

## Security Features

### ✅ AD_ID Permission Verification

**What it does:**
- Extracts AndroidManifest.xml from compiled AAB
- Searches for `com.google.android.gms.permission.AD_ID`
- **Fails build if found** (app doesn't use advertising ID)

**Why it matters:**
- Prevents Google Play rejection
- Ensures compliance with app's privacy declaration
- Automated security check

### ✅ Signed Release Build

**Security:**
- Keystore managed via GitHub Secrets
- Signing done in secure CI/CD environment
- Never exposed to local machines
- Passwords stored encrypted

---

## Error Handling

### "El código de versión XX ya se ha usado"

**Automatic handling:**
- Auto-bump prevents this by incrementing every time
- Even if multiple builds run in parallel, each gets unique code

**Manual fix (if needed):**
```bash
cd apps/web/android
./bump-version-code.sh  # Increments manually
git add . && git commit -m "chore: bump version"
git push
```

### "AD_ID permission found in APK"

**Automatic handling:**
- Build fails at verification step
- Prevents upload to Google Play

**Fix:**
- Check `AD_ID_PERMISSION_REMOVAL.md`
- Likely missing `tools:node="remove"` in manifest
- Verify and rebuild

---

## Monitoring Builds

### View Workflow Runs

```bash
# List recent workflows
gh run list --workflow build-android.yml --limit 5

# Watch specific run in real-time
gh run watch <run_id>

# View full logs
gh run view <run_id> --log

# Check last run status
gh run list --workflow build-android.yml --limit 1 --json status,conclusion
```

### GitHub Actions Dashboard

Navigate to: **Actions → Build Android AAB**

Shows:
- ✅ Status (success/failure)
- 📊 Timing per step
- 📝 Full logs
- 📦 Artifacts
- 📋 Summary

---

## Best Practices

### ✅ DO

- ✅ **Always use auto-bump for releases**
  ```bash
  gh workflow run build-android.yml \
    -f build_type=release \
    -f upload_to_play_store=true \
    -f auto_version_bump=true
  ```

- ✅ **Test builds without upload first**
  ```bash
  gh workflow run build-android.yml \
    -f build_type=release \
    -f upload_to_play_store=false
  ```

- ✅ **Review builds before production**
  - Download artifact from GitHub Actions
  - Test with `adb install`
  - Verify functionality

- ✅ **Monitor GitHub Actions logs**
  - Check for security warnings
  - Verify version bump was committed
  - Ensure upload completed

### ❌ DON'T

- ❌ **Don't build and upload manually**
  - CI/CD is more reliable
  - Reduces human error
  - Better audit trail

- ❌ **Don't skip version bumping**
  - Will cause conflicts with Google Play
  - Always enable `auto_version_bump=true`

- ❌ **Don't ignore AD_ID failures**
  - Build verification is important
  - Prevents rejection by Google Play

- ❌ **Don't push to main without CI/CD running**
  - Always use the workflow
  - Ensures consistent builds

---

## Troubleshooting

### Workflow Fails at "Auto-Bump"

**Symptom:**
```
Error: Failed to update versionCode
```

**Solution:**
1. Check `build.gradle` for correct format:
   ```gradle
   versionCode 46
   versionName "1.0.12"
   ```

2. Re-run workflow with `auto_version_bump=false`

3. Manually bump locally:
   ```bash
   cd apps/web/android
   ./bump-version-code.sh
   ```

### Workflow Fails at "Upload to Google Play"

**Symptom:**
```
error: failed to upload to Play Store
```

**Solutions:**
- Check if versionCode already exists (re-run with auto-bump)
- Verify service account has permissions
- Check Google Play Console for alerts

### Workflow Succeeds but Version Not Committed

**Symptom:**
```
Auto-commit step skipped (no changes)
```

**Reason:**
- `auto_version_bump=false` was used
- Version was not bumped in this run

**Solution:**
- Manually commit:
  ```bash
  git add apps/web/android/app/build.gradle
  git commit -m "chore: bump version"
  git push
  ```

---

## CI/CD Flow Diagram

```
┌─────────────────────┐
│ Developer runs:     │
│ gh workflow run ... │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────────────────────────┐
│ GitHub Actions Starts Job               │
└──────────┬──────────────────────────────┘
           │
           ├─→ ✅ Auto-Bump versionCode
           │
           ├─→ ✅ Compile (pnpm, Capacitor, Gradle)
           │
           ├─→ ✅ Verify AD_ID (Security)
           │   │
           │   ├─ Found? → ❌ FAIL BUILD
           │   └─ Not found? → ✅ CONTINUE
           │
           ├─→ ✅ Upload to Google Play
           │   │
           │   ├─ Error? → ❌ FAIL
           │   └─ Success? → ✅ CONTINUE
           │
           ├─→ ✅ Auto-Commit to main
           │
           └─→ ✅ Job Complete
               (Logs available in Actions)
```

---

## Comparison: Manual vs Automated

| Aspect | Manual | Automated (Recommended) |
|--------|--------|------------------------|
| Version bumping | Manual (error-prone) | Automatic ✅ |
| Build process | Local machine | CI/CD ✅ |
| Security checks | Optional | Required ✅ |
| Upload to Play Store | Manual | Automatic ✅ |
| Version tracking | Manual commits | Auto-committed ✅ |
| Audit trail | Limited | Complete in Actions ✅ |
| Consistency | Varies | 100% reproducible ✅ |
| Conflict prevention | Difficult | Automatic ✅ |

---

## Summary

| Feature | Status |
|---------|--------|
| **Auto-bump versionCode** | ✅ Enabled |
| **AD_ID verification** | ✅ Required |
| **Upload to Play Store** | ✅ Optional (default: off) |
| **Auto-commit changes** | ✅ Enabled |
| **Documentation** | ✅ Complete |
| **Error handling** | ✅ Comprehensive |
| **Production ready** | ✅ YES |

---

## Next Steps

### To Make Your First Release:

```bash
# Option 1: Full automated release (recommended)
gh workflow run build-android.yml \
  -f build_type=release \
  -f upload_to_play_store=true \
  -f auto_version_bump=true

# Option 2: Build only (for testing)
gh workflow run build-android.yml \
  -f build_type=release \
  -f upload_to_play_store=false
```

### Monitor the Build:

```bash
# Watch in real-time
gh run list --workflow build-android.yml --limit 1
gh run watch <run_id>

# Or check GitHub Actions UI
# https://github.com/ecucondorSA/autorenta/actions
```

---

**Last Updated:** 2026-01-16
**Status:** ✅ Production Ready
**Version:** v1.0.12 (versionCode 46)
