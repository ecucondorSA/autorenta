/**
 * Helper functions para MercadoPago Customers API
 * 
 * Funciones compartidas para crear y obtener customers de MercadoPago
 */

interface CustomerData {
  email: string;
  first_name: string;
  last_name: string;
  phone?: { area_code: string; number: string };
  identification?: { type: string; number: string };
}

/**
 * Crea o obtiene un customer de MercadoPago
 * 
 * @param supabase - Cliente de Supabase
 * @param userId - ID del usuario
 * @param mpAccessToken - Access token de MercadoPago
 * @returns Customer ID de MercadoPago
 */
export async function createOrGetCustomer(
  supabase: any,
  userId: string,
  mpAccessToken: string
): Promise<string | null> {
  try {
    // 1. Verificar si ya tiene customer_id (usa view con datos desencriptados)
    const { data: profile, error: profileError } = await supabase
      .from('profiles_decrypted')
      .select('mercadopago_customer_id, email, full_name, phone, dni, gov_id_number, gov_id_type')
      .eq('id', userId)
      .single();

    if (profileError || !profile) {
      console.error('Error fetching profile:', profileError);
      return null;
    }

    // Si ya tiene customer_id, retornarlo
    if (profile.mercadopago_customer_id) {
      console.log('Customer already exists:', profile.mercadopago_customer_id);
      return profile.mercadopago_customer_id;
    }

    // 2. Obtener datos del usuario autenticado
    const { data: authUser } = await supabase.auth.admin.getUserById(userId);
    
    // 3. Preparar datos del customer
    const fullName = profile.full_name || authUser?.user?.user_metadata?.full_name || 'Usuario AutoRenta';
    const nameParts = fullName.trim().split(' ');
    const firstName = nameParts[0] || 'Usuario';
    const lastName = nameParts.slice(1).join(' ') || 'AutoRenta';

    // Formatear phone
    let phoneFormatted: { area_code: string; number: string } | undefined;
    if (profile.phone) {
      const phoneCleaned = profile.phone.replace(/[^0-9]/g, '');
      const phoneWithoutCountry = phoneCleaned.startsWith('54') 
        ? phoneCleaned.substring(2) 
        : phoneCleaned;
      const areaCode = phoneWithoutCountry.substring(0, 2) || '11';
      const number = phoneWithoutCountry.substring(2) || '';
      if (number.length >= 8) {
        phoneFormatted = {
          area_code: areaCode,
          number: number,
        };
      }
    }

    // Obtener DNI
    const dniNumber = profile.gov_id_number || profile.dni;
    const dniType = profile.gov_id_type || 'DNI';
    let identification: { type: string; number: string } | undefined;
    if (dniNumber) {
      const dniCleaned = dniNumber.replace(/[^0-9]/g, '');
      if (dniCleaned.length >= 7) {
        identification = {
          type: dniType.toUpperCase(),
          number: dniCleaned,
        };
      }
    }

    // 4. Crear customer en MercadoPago
    const customerData: CustomerData = {
      email: authUser?.user?.email || profile.email || `${userId}@autorenta.com`,
      first_name: firstName,
      last_name: lastName,
      ...(phoneFormatted && { phone: phoneFormatted }),
      ...(identification && { identification }),
    };

    console.log('Creating MercadoPago customer:', JSON.stringify(customerData, null, 2));

    const mpResponse = await fetch('https://api.mercadopago.com/v1/customers', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${mpAccessToken}`,
      },
      body: JSON.stringify(customerData),
    });

    if (!mpResponse.ok) {
      const errorData = await mpResponse.json();
      console.error('Error creating MercadoPago customer:', errorData);
      return null;
    }

    const customer = await mpResponse.json();
    console.log('MercadoPago customer created:', customer.id);

    // 5. Guardar customer_id en profile
    const { error: updateError } = await supabase
      .from('profiles')
      .update({ mercadopago_customer_id: customer.id.toString() })
      .eq('id', userId);

    if (updateError) {
      console.error('Error saving customer_id to profile:', updateError);
      // No fallar, el customer se creó en MP
    }

    return customer.id.toString();
  } catch (error) {
    console.error('Error in createOrGetCustomer:', error);
    return null;
  }
}








