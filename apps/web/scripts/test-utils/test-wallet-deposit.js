import { config } from "dotenv";
config({ path: ".env.local" });

#!/usr/bin/env node
/**
 * Script de prueba para el flujo de depósito de fondos del wallet
 *
 * Este script:
 * 1. Se conecta a Supabase con credenciales de admin
 * 2. Crea o usa un usuario de prueba
 * 3. Inicia un depósito de fondos
 * 4. Llama a la Edge Function mercadopago-create-preference
 * 5. Muestra la URL de checkout de MercadoPago
 */

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;

// Usuario de prueba
const TEST_USER = {
  email: 'test-wallet@autorenta.com',
  password: 'TestWallet123!',
  full_name: 'Usuario Test Wallet',
  role: 'locatario'
};

async function main() {
  console.log('🔍 [TEST] Iniciando prueba de depósito de wallet...\n');

  // 1. Verificar conexión con Supabase usando fetch
  console.log('1️⃣ Verificando conexión con Supabase...');
  const healthCheck = await fetch(`${SUPABASE_URL}/rest/v1/`, {
    headers: {
      'apikey': SUPABASE_ANON_KEY,
      'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
    }
  });

  if (!healthCheck.ok) {
    console.error('❌ No se pudo conectar a Supabase');
    process.exit(1);
  }
  console.log('✅ Conexión a Supabase OK\n');

  // 2. Crear o autenticar usuario de prueba
  console.log('2️⃣ Autenticando usuario de prueba...');

  // Intentar login primero
  let authResponse = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
    method: 'POST',
    headers: {
      'apikey': SUPABASE_ANON_KEY,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      email: TEST_USER.email,
      password: TEST_USER.password
    })
  });

  let session;

  if (!authResponse.ok) {
    console.log('⚠️  Usuario no existe, creando nuevo usuario...');

    // Crear usuario
    const signupResponse = await fetch(`${SUPABASE_URL}/auth/v1/signup`, {
      method: 'POST',
      headers: {
        'apikey': SUPABASE_ANON_KEY,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        email: TEST_USER.email,
        password: TEST_USER.password,
        data: {
          full_name: TEST_USER.full_name
        }
      })
    });

    if (!signupResponse.ok) {
      const error = await signupResponse.json();
      console.error('❌ Error al crear usuario:', error);
      process.exit(1);
    }

    const signupData = await signupResponse.json();
    session = signupData;

    // Crear perfil
    const profileResponse = await fetch(`${SUPABASE_URL}/rest/v1/profiles`, {
      method: 'POST',
      headers: {
        'apikey': SUPABASE_SERVICE_KEY,
        'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=representation'
      },
      body: JSON.stringify({
        id: signupData.user.id,
        full_name: TEST_USER.full_name,
        role: TEST_USER.role
      })
    });

    if (!profileResponse.ok) {
      const error = await profileResponse.json();
      console.error('❌ Error al crear perfil:', error);
    } else {
      console.log('✅ Usuario y perfil creados');
    }
  } else {
    session = await authResponse.json();
    console.log('✅ Login exitoso');
  }

  const userId = session.user.id;
  const accessToken = session.access_token;

  console.log(`   User ID: ${userId}`);
  console.log(`   Access Token: ${accessToken.substring(0, 20)}...\n`);

  // 3. Verificar/crear wallet
  console.log('3️⃣ Verificando wallet del usuario...');

  const walletResponse = await fetch(`${SUPABASE_URL}/rest/v1/user_wallets?user_id=eq.${userId}`, {
    headers: {
      'apikey': SUPABASE_SERVICE_KEY,
      'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`
    }
  });

  const wallets = await walletResponse.json();

  if (!wallets || wallets.length === 0) {
    console.log('⚠️  Wallet no existe, creando...');

    const createWalletResponse = await fetch(`${SUPABASE_URL}/rest/v1/user_wallets`, {
      method: 'POST',
      headers: {
        'apikey': SUPABASE_SERVICE_KEY,
        'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=representation'
      },
      body: JSON.stringify({
        user_id: userId,
        balance: 0,
        locked_balance: 0
      })
    });

    if (!createWalletResponse.ok) {
      const error = await createWalletResponse.json();
      console.error('❌ Error al crear wallet:', error);
      process.exit(1);
    }

    console.log('✅ Wallet creado');
  } else {
    const wallet = wallets[0];
    console.log('✅ Wallet encontrado');
    console.log(`   Balance: ARS ${wallet.balance}`);
    console.log(`   Balance bloqueado: ARS ${wallet.locked_balance}\n`);
  }

  // 4. Iniciar depósito usando RPC
  console.log('4️⃣ Iniciando depósito de ARS 1000...');

  const initiateResponse = await fetch(`${SUPABASE_URL}/rest/v1/rpc/wallet_initiate_deposit`, {
    method: 'POST',
    headers: {
      'apikey': SUPABASE_ANON_KEY,
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      p_amount: 1000,
      p_provider: 'mercadopago'
    })
  });

  if (!initiateResponse.ok) {
    const error = await initiateResponse.text();
    console.error('❌ Error al iniciar depósito:', error);
    process.exit(1);
  }

  const depositData = await initiateResponse.json();
  const transactionId = depositData.transaction_id;

  console.log('✅ Depósito iniciado');
  console.log(`   Transaction ID: ${transactionId}\n`);

  // 5. Llamar a Edge Function para crear preferencia de MercadoPago
  console.log('5️⃣ Creando preferencia de pago en MercadoPago...');
  console.log(`   Edge Function URL: ${SUPABASE_URL}/functions/v1/mercadopago-create-preference`);

  const requestBody = {
    transaction_id: transactionId,
    amount: 1000,
    description: 'Depósito de prueba - Test Wallet'
  };

  console.log('   Request body:', JSON.stringify(requestBody, null, 2));

  const edgeFunctionResponse = await fetch(`${SUPABASE_URL}/functions/v1/mercadopago-create-preference`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${accessToken}`
    },
    body: JSON.stringify(requestBody)
  });

  console.log(`   Response status: ${edgeFunctionResponse.status}`);

  if (!edgeFunctionResponse.ok) {
    const errorText = await edgeFunctionResponse.text();
    console.error('❌ Error en Edge Function:', errorText);

    // Verificar la transacción en la DB
    const txCheckResponse = await fetch(`${SUPABASE_URL}/rest/v1/wallet_transactions?id=eq.${transactionId}`, {
      headers: {
        'apikey': SUPABASE_SERVICE_KEY,
        'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`
      }
    });
    const txData = await txCheckResponse.json();
    console.log('   Transacción en DB:', JSON.stringify(txData, null, 2));

    process.exit(1);
  }

  const mpData = await edgeFunctionResponse.json();

  console.log('✅ Preferencia creada en MercadoPago\n');
  console.log('📋 Detalles de la preferencia:');
  console.log(`   Preference ID: ${mpData.preference_id}`);
  console.log(`   Init Point: ${mpData.init_point}`);

  if (mpData.sandbox_init_point) {
    console.log(`   Sandbox Init Point: ${mpData.sandbox_init_point}`);
  }

  console.log('\n🎉 ¡PRUEBA EXITOSA!');
  console.log('\n🔗 Abrir en el navegador:');
  console.log(`   ${mpData.init_point}`);
  console.log('\n💡 El usuario puede completar el pago en MercadoPago');
  console.log('   El webhook procesará la confirmación automáticamente\n');
}

main().catch(error => {
  console.error('❌ Error fatal:', error);
  process.exit(1);
});
