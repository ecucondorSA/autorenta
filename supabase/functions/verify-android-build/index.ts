import { createClient } from 'jsr:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface PlayStoreConfig {
  packageName: string;
  serviceAccountEmail: string;
  privateKey: string;
}

interface BuildVerificationResult {
  success: boolean;
  errors: string[];
  warnings: string[];
  checks: {
    apiLevel: { passed: boolean; message: string };
    versionCode: { passed: boolean; message: string };
    packageName: { passed: boolean; message: string };
    signing: { passed: boolean; message: string };
    policies: { passed: boolean; message: string };
  };
  currentProduction?: {
    versionCode: number;
    versionName: string;
    status: string;
  };
}

/**
 * Generate Google OAuth2 token for API access
 */
async function getGoogleAccessToken(config: PlayStoreConfig): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const expiry = now + 3600;

  const header = {
    alg: 'RS256',
    typ: 'JWT',
  };

  const claimSet = {
    iss: config.serviceAccountEmail,
    scope: 'https://www.googleapis.com/auth/androidpublisher',
    aud: 'https://oauth2.googleapis.com/token',
    exp: expiry,
    iat: now,
  };

  const encodedHeader = btoa(JSON.stringify(header));
  const encodedClaimSet = btoa(JSON.stringify(claimSet));
  const signatureInput = `${encodedHeader}.${encodedClaimSet}`;

  const pemHeader = '-----BEGIN PRIVATE KEY-----';
  const pemFooter = '-----END PRIVATE KEY-----';
  const pemContents = config.privateKey
    .replace(pemHeader, '')
    .replace(pemFooter, '')
    .replace(/\\n/g, '')
    .trim();

  const binaryDer = Uint8Array.from(atob(pemContents), (c) => c.charCodeAt(0));

  const cryptoKey = await crypto.subtle.importKey(
    'pkcs8',
    binaryDer,
    {
      name: 'RSASSA-PKCS1-v1_5',
      hash: 'SHA-256',
    },
    false,
    ['sign']
  );

  const signature = await crypto.subtle.sign(
    'RSASSA-PKCS1-v1_5',
    cryptoKey,
    new TextEncoder().encode(signatureInput)
  );

  const encodedSignature = btoa(String.fromCharCode(...new Uint8Array(signature)));
  const jwt = `${signatureInput}.${encodedSignature}`;

  const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: jwt,
    }),
  });

  if (!tokenResponse.ok) {
    const error = await tokenResponse.text();
    throw new Error(`Failed to get access token: ${error}`);
  }

  const tokenData = await tokenResponse.json();
  return tokenData.access_token;
}

async function getCurrentProductionVersion(
  accessToken: string,
  packageName: string
): Promise<{ versionCode: number; versionName: string; status: string } | null> {
  try {
    const response = await fetch(
      `https://androidpublisher.googleapis.com/androidpublisher/v3/applications/${packageName}/edits`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
      }
    );

    if (!response.ok) return null;

    const edit = await response.json();
    const editId = edit.id;

    const trackResponse = await fetch(
      `https://androidpublisher.googleapis.com/androidpublisher/v3/applications/${packageName}/edits/${editId}/tracks/production`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    if (!trackResponse.ok) return null;

    const track = await trackResponse.json();
    const latestRelease = track.releases?.[0];

    if (!latestRelease) return null;

    return {
      versionCode: latestRelease.versionCodes?.[0] || 0,
      versionName: latestRelease.name || 'Unknown',
      status: latestRelease.status || 'Unknown',
    };
  } catch (error) {
    console.error('Error fetching production version:', error);
    return null;
  }
}

function verifyBuildLocally(appInfo: {
  versionCode: number;
  versionName: string;
  targetSdkVersion: number;
  packageName: string;
}): BuildVerificationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  const checks = {
    apiLevel: { passed: false, message: '' },
    versionCode: { passed: false, message: '' },
    packageName: { passed: false, message: '' },
    signing: { passed: false, message: '' },
    policies: { passed: false, message: '' },
  };

  if (appInfo.targetSdkVersion >= 35) {
    checks.apiLevel.passed = true;
    checks.apiLevel.message = `✅ targetSdkVersion ${appInfo.targetSdkVersion} meets 2025 requirement (API 35+)`;
  } else {
    checks.apiLevel.passed = false;
    checks.apiLevel.message = `❌ targetSdkVersion ${appInfo.targetSdkVersion} is TOO LOW. Required: API 35+ (Android 15)`;
    errors.push(`Target SDK version must be 35 or higher. Current: ${appInfo.targetSdkVersion}`);
  }

  if (appInfo.versionCode > 0) {
    checks.versionCode.passed = true;
    checks.versionCode.message = `✅ versionCode: ${appInfo.versionCode}`;
  } else {
    checks.versionCode.passed = false;
    checks.versionCode.message = '❌ Invalid versionCode';
    errors.push('versionCode must be greater than 0');
  }

  if (appInfo.packageName === 'com.autorentar.app') {
    checks.packageName.passed = true;
    checks.packageName.message = '✅ Package name is correct';
  } else {
    checks.packageName.passed = false;
    checks.packageName.message = `❌ Package name mismatch. Expected: com.autorentar.app, Got: ${appInfo.packageName}`;
    errors.push('Package name does not match expected value');
  }

  checks.signing.passed = true;
  checks.signing.message = '⚠️  Signing verification requires AAB file upload';
  warnings.push('Upload AAB to verify signing configuration');

  const policyChecks = [];
  policyChecks.push('Privacy Policy: https://autorentar.com/privacy');
  policyChecks.push('Account Deletion: https://autorentar.com/delete-account');
  policyChecks.push('Terms of Service: https://autorentar.com/terminos');

  checks.policies.passed = true;
  checks.policies.message = `✅ Required policies:\n${policyChecks.join('\n')}`;

  const allPassed = Object.values(checks).every((check) => check.passed);

  return {
    success: allPassed && errors.length === 0,
    errors,
    warnings,
    checks,
  };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    );

    const {
      data: { user },
      error: authError,
    } = await supabaseClient.auth.getUser();

    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { data: profile } = await supabaseClient
      .from('users')
      .select('is_admin')
      .eq('id', user.id)
      .single();

    if (!profile?.is_admin) {
      return new Response(JSON.stringify({ error: 'Admin access required' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { appInfo, checkPlayStore } = await req.json();

    const result = verifyBuildLocally(appInfo);

    if (checkPlayStore) {
      const serviceAccountEmail = Deno.env.get('PLAY_STORE_SERVICE_ACCOUNT_EMAIL');
      const privateKey = Deno.env.get('PLAY_STORE_PRIVATE_KEY');

      if (serviceAccountEmail && privateKey) {
        try {
          const config: PlayStoreConfig = {
            packageName: appInfo.packageName,
            serviceAccountEmail,
            privateKey,
          };

          const accessToken = await getGoogleAccessToken(config);
          const productionVersion = await getCurrentProductionVersion(
            accessToken,
            appInfo.packageName
          );

          if (productionVersion) {
            result.currentProduction = productionVersion;

            if (appInfo.versionCode <= productionVersion.versionCode) {
              result.errors.push(
                `New versionCode (${appInfo.versionCode}) must be higher than production (${productionVersion.versionCode})`
              );
              result.success = false;
            }
          }
        } catch (error) {
          result.warnings.push(`Play Store API check failed: ${error.message}`);
        }
      } else {
        result.warnings.push('Play Store API credentials not configured');
      }
    }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error in verify-android-build:', error);
    return new Response(
      JSON.stringify({
        error: 'Internal server error',
        message: error.message,
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
