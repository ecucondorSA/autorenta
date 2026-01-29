import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { getCorsHeaders } from '../_shared/cors.ts';

const FACEBOOK_GRAPH_URL = 'https://graph.facebook.com/me';

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error('Missing required environment variables');
    }

    if (req.method !== 'POST') {
      return new Response(JSON.stringify({ error: 'Method not allowed' }), {
        status: 405,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { accessToken } = await req.json();

    if (!accessToken) {
      return new Response(JSON.stringify({ error: 'Missing access token' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // 1. Verify Token with Facebook Graph API
    const fbResponse = await fetch(
      `${FACEBOOK_GRAPH_URL}?fields=id,name,email,picture.type(large)&access_token=${accessToken}`
    );
    const fbData = await fbResponse.json();

    if (!fbResponse.ok || fbData.error) {
      console.error('❌ Facebook API Error:', fbData);
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Failed to verify Facebook token',
          details: fbData.error
        }),
        {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const { id: fbId, email, name, picture } = fbData;
    const avatarUrl = picture?.data?.url;

    // Facebook emails are optional (users can sign up with phone).
    // If no email, generate a placeholder or fail?
    // Usually allow it but generate a unique email.
    const userEmail = email || `facebook_${fbId}@autorenta.local`;

    console.log(`✅ Facebook User Verified: ${name} (${fbId})`);

    // 2. Init Supabase Admin
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // 3. Find Existing User by Provider ID
    const { data: existingProfile } = await supabase
      .from('profiles')
      .select('id')
      .eq('provider_id', fbId)
      .eq('provider', 'facebook')
      .single();

    let userId: string;

    if (existingProfile) {
      userId = existingProfile.id;
      // Update profile
      await supabase
        .from('profiles')
        .update({
          display_name: name,
          avatar_url: avatarUrl,
          updated_at: new Date().toISOString(),
        })
        .eq('id', userId);
    } else {
      // Create New User
      // Check if email already exists in Auth to avoid conflicts if they used same email
      // Note: If they signed up with email/password and now use FB with same email,
      // we might want to link them. For now, simpliest is to assume conflict or unique fb email.

      const { data: existingAuthUser } = await supabase.auth.admin.listUsers();
      // listUsers is not efficient for checking existence, but createUser handles conflict.

      // Try to create user
      const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
        email: userEmail,
        email_confirm: true,
        user_metadata: {
          full_name: name,
          provider: 'facebook',
          provider_id: fbId,
          avatar_url: avatarUrl,
        },
      });

      if (authError) {
        // If user already exists by email, we might want to just link (return that user id)
        // BUT calling createUser on existing email returns error.
        // For simplicity in this iteration: if email exists, finding the user ID and updating metadata would be better.
        // But for now let's handle the specific case just by throwing.
        console.error('❌ Error creating user:', authError);
        throw new Error(`Failed to create user: ${authError.message}`);
      }

      userId = authUser.user.id;

      // Create Profile
      const { error: profileError } = await supabase
        .from('profiles')
        .insert({
          id: userId,
          email: userEmail,
          display_name: name,
          avatar_url: avatarUrl,
          provider: 'facebook',
          provider_id: fbId,
          role: 'ambos', // default role
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        });

      if (profileError) {
        console.error('❌ Error creating profile:', profileError);
        throw new Error(`Failed to create profile: ${profileError.message}`);
      }
    }

    // 4. Create Session
    const { data: sessionData, error: sessionError } = await supabase.auth.admin.createSession(userId);

    if (sessionError) {
      throw new Error(`Failed to create session: ${sessionError.message}`);
    }

    return new Response(
      JSON.stringify({
        success: true,
        session: sessionData.session,
        user: { id: userId, email: userEmail, name }
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error('❌ Fatal error in facebook-native-login:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error',
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
