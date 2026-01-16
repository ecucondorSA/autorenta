# Android Version Code Management Strategy

## Overview

AutoRenta uses a **robust, automated version code management system** to prevent conflicts with Google Play Console.

**Problem:**
- Google Play rejects builds with a versionCode that's already been used
- Manual version code bumping is error-prone
- Without coordination, local dev builds can conflict with CI/CD builds

**Solution:**
- Automatic version code incrementation
- Simple, deterministic numbering scheme
- Integrated into CI/CD pipeline
- Manual override available for edge cases

---

## Version Code Format

```
versionCode = Build Number (incremented with each release)
versionName = Semantic Version (e.g., "1.0.11")
```

### Examples

| versionCode | versionName | Type | Release Track |
|-------------|-------------|------|----------------|
| 45 | 1.0.11 | Release | closed_testing ✅ |
| 46 | 1.0.12 | Release | closed_testing (next) |
| 47 | 1.1.0 | Release | production (future) |

**Key Rule:** versionCode MUST always increase, never decrease.

---

## Automatic Bumping (Recommended)

### When to Use

✅ **Use automatic bumping for:**
- Regular release builds
- CI/CD automated builds
- Most development workflows

❌ **Don't use for:**
- Custom version codes with specific meaning
- Beta/internal builds with experimental versioning

### How It Works

#### Local Development

1. **Bump before committing:**
   ```bash
   cd apps/web/android
   ./bump-version-code.sh
   ```

2. **Review the change:**
   ```bash
   git diff app/build.gradle
   ```

3. **Commit the change:**
   ```bash
   git add app/build.gradle
   git commit -m "chore(android): bump versionCode XX → YY"
   ```

4. **Build:**
   ```bash
   pnpm build:web
   pnpm --filter autorentar-web exec cap sync android
   ./gradlew bundleRelease
   ```

#### GitHub Actions (Automated)

The workflow (`build-android.yml`) can be enhanced to auto-bump:

```yaml
- name: Bump Version Code
  run: |
    cd apps/web/android
    ./bump-version-code.sh

- name: Commit version bump
  run: |
    git config user.name "GitHub Actions"
    git config user.email "actions@github.com"
    git add apps/web/android/app/build.gradle
    git commit -m "chore(android): auto-bump versionCode for build"
```

---

## Manual Overrides

### When You Need Custom Version Codes

If you need to set a specific versionCode (e.g., recovering from conflicts):

1. **Edit build.gradle directly:**
   ```gradle
   versionCode 50  // Set to your desired code
   versionName "1.0.12"
   ```

2. **Commit the change:**
   ```bash
   git add apps/web/android/app/build.gradle
   git commit -m "chore(android): set versionCode to 50 (manual override)"
   ```

3. **Important:** Document why in the commit message

### Recovering from Conflicts

If Google Play rejects with "version code already used":

1. **Check highest code in Google Play Console manually** (via UI)

2. **Bump beyond that:**
   ```bash
   # Edit build.gradle
   versionCode 52  # Use a code higher than anything in Play Store
   ```

3. **Commit and rebuild:**
   ```bash
   git add apps/web/android/app/build.gradle
   git commit -m "chore(android): resolve Play Store versionCode conflict"
   pnpm build:web && ./gradlew bundleRelease
   ```

---

## Scripts Reference

### 1. `bump-version-code.sh` (Recommended)

**Purpose:** Simple, local version code increment

**Usage:**
```bash
./bump-version-code.sh
```

**What it does:**
- Reads current versionCode
- Increments by 1
- Updates build.gradle
- Prints summary
- **Doesn't commit** (you do it manually)

**Best for:**
- Local development
- Manual control over commits
- CI/CD pre-build step

---

### 2. `sync-version-code.sh` (Advanced)

**Purpose:** Sync with Google Play Console, auto-detect conflicts

**Usage:**
```bash
./sync-version-code.sh                   # Dry run
./sync-version-code.sh --auto-commit     # Auto-commit changes
```

**Requirements:**
- `gcloud` SDK installed
- Valid Google Play service account
- Network access to Google Play API

**What it does:**
- Queries Google Play Console
- Finds highest versionCode in use
- Compares with local versionCode
- Auto-increments if conflict detected
- Optionally auto-commits changes

**Best for:**
- Production CI/CD with full API integration
- Ensuring zero conflicts with existing releases
- Automatic resolution of version conflicts

---

### 3. `sync-version-code-ci.sh` (CI/CD)

**Purpose:** Lightweight CI/CD version for GitHub Actions

**Usage:**
```bash
export GOOGLE_PLAY_SERVICE_ACCOUNT_JSON="$(cat /path/to/service-account.json)"
./sync-version-code-ci.sh
```

**What it does:**
- Attempts to query Google Play API
- Falls back gracefully if API unavailable
- Increments if conflict detected
- Outputs GitHub Actions environment variables

**Best for:**
- GitHub Actions workflows
- Environments without gcloud SDK
- Minimal dependency management

---

## Workflow Integration (Future)

The recommended approach is to integrate automatic bumping into the GitHub Actions workflow:

### Current Workflow (Manual)

```
1. Developer manually updates versionCode
2. Developer commits change
3. Developer triggers workflow manually
4. Workflow builds and uploads
```

### Future Workflow (Automated)

```
1. Developer pushes code
2. Workflow triggers
3. Workflow automatically bumps versionCode
4. Workflow builds with new version code
5. Workflow uploads to Google Play
6. Workflow commits version bump
```

---

## Best Practices

### ✅ DO

- ✅ **Bump before each release build**
  ```bash
  ./bump-version-code.sh && git add . && git commit -m "bump: versionCode"
  ```

- ✅ **Keep versionCode and versionName in sync**
  - If versionName is 1.0.12, update versionCode too

- ✅ **Document custom version codes**
  ```bash
  git commit -m "chore(android): set versionCode to 55 - recovering from conflict"
  ```

- ✅ **Test locally before pushing**
  ```bash
  ./bump-version-code.sh && ./gradlew bundleRelease
  ```

- ✅ **Review version changes in code review**
  - Version code changes should be explicit in PR diffs

### ❌ DON'T

- ❌ **Don't reuse version codes**
  - Google Play permanently reserves used codes

- ❌ **Don't decrease versionCode**
  - Violates Android OS assumptions
  - May break update detection

- ❌ **Don't skip version bumping**
  - Will cause Google Play upload failures

- ❌ **Don't use manual version codes without documenting**
  - Makes it hard for others to understand the strategy

- ❌ **Don't rely on versionName for versioning**
  - Google Play uses versionCode, not versionName

---

## Troubleshooting

### "El código de versión XX ya se ha usado"

**This means:** Google Play already has a build with this versionCode.

**Solution:**

1. **Check local version:**
   ```bash
   grep versionCode apps/web/android/app/build.gradle
   ```

2. **Increment it:**
   ```bash
   cd apps/web/android
   ./bump-version-code.sh
   git add app/build.gradle && git commit -m "chore: bump versionCode"
   ```

3. **Rebuild and upload:**
   ```bash
   pnpm build:web
   gh workflow run build-android.yml -f build_type=release -f upload_to_play_store=true
   ```

### My local versionCode is way behind Play Store

**This happens if:**
- Another developer pushed version bumps
- CI/CD auto-bumped versions

**Solution:**

1. **Pull latest:**
   ```bash
   git pull origin main
   ```

2. **Check current version:**
   ```bash
   grep versionCode apps/web/android/app/build.gradle
   ```

3. **You're good to go** - use that version for next build

---

## References

- [Android Versioning Documentation](https://developer.android.com/studio/publish/versioning)
- [Google Play Version Code Requirements](https://play.google.com/console/about/faq/)
- [AGP Build Documentation](https://developer.android.com/studio/build)

---

## Summary

| Aspect | Detail |
|--------|--------|
| **Versioning Strategy** | Automatic incremental versionCode |
| **Current versionCode** | 45 (for v1.0.11) |
| **Script to Use** | `bump-version-code.sh` (local) |
| **Frequency** | Before each release build |
| **Manual Override** | Edit build.gradle + commit |
| **Conflict Resolution** | Sync script or manual bump |

---

**Last Updated:** 2026-01-16
**Status:** ✅ Production Ready
