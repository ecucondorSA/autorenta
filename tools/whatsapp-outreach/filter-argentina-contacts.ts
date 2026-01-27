/**
 * Script para filtrar contactos de Argentina del CSV de Rentennials
 * Uso: bun run filter-argentina-contacts.ts
 */

import { parse } from 'csv-parse/sync';
import { stringify } from 'csv-stringify/sync';

const INPUT_FILE = '/home/edu/rentennials_owners.csv';
const OUTPUT_FILE = './contacts/argentina_owners.csv';

interface Contact {
  email: string;
  phone: string;
  firstName: string;
  lastName: string;
  city: string;
  province: string;
}

// Provincias argentinas para filtrar
const ARGENTINA_PROVINCES = [
  'Buenos Aires',
  'Provincia de Buenos Aires',
  'Cdad. Autónoma de Buenos Aires',
  'CABA',
  'Córdoba',
  'Santa Fe',
  'Mendoza',
  'Tucumán',
  'Entre Ríos',
  'Salta',
  'Misiones',
  'Chaco',
  'Corrientes',
  'Santiago del Estero',
  'San Juan',
  'Jujuy',
  'Río Negro',
  'Neuquén',
  'Formosa',
  'Chubut',
  'San Luis',
  'Catamarca',
  'La Rioja',
  'La Pampa',
  'Santa Cruz',
  'Tierra del Fuego',
];

// Estados de USA (para incluir argentinos en el exterior)
const USA_STATES = [
  'FL', 'Florida',
  'CA', 'California',
  'NY', 'New York',
  'TX', 'Texas',
  'NJ', 'New Jersey',
  'IL', 'Illinois',
  'GA', 'Georgia',
  'NC', 'North Carolina',
  'PA', 'Pennsylvania',
  'MA', 'Massachusetts',
];

// Ciudades de AMBA (para priorizar)
const AMBA_CITIES = [
  'CABA',
  'Capital Federal',
  'Buenos Aires',
  'Pilar',
  'Tigre',
  'San Isidro',
  'Vicente López',
  'Quilmes',
  'Lanús',
  'Lomas de Zamora',
  'Avellaneda',
  'Morón',
  'Tres de Febrero',
  'La Matanza',
  'Ezeiza',
  'Almirante Brown',
  'Berazategui',
  'Florencio Varela',
  'San Fernando',
  'Escobar',
  'Zárate',
  'Campana',
];

async function main() {
  const csvContent = await Bun.file(INPUT_FILE).text();

  const records: Contact[] = parse(csvContent, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
  });

  console.log(`Total contactos: ${records.length}`);

  // Filtrar Argentina + USA
  const argentinaContacts = records.filter(contact => {
    const isArgPhone = contact.phone.startsWith('+54');
    const isArgProvince = ARGENTINA_PROVINCES.some(
      p => contact.province.toLowerCase().includes(p.toLowerCase())
    );
    return isArgPhone || isArgProvince;
  });

  const usaContacts = records.filter(contact => {
    const isUsaPhone = contact.phone.startsWith('+1');
    const isUsaState = USA_STATES.some(
      s => contact.province.toLowerCase() === s.toLowerCase()
    );
    return isUsaPhone || isUsaState;
  });

  console.log(`Contactos Argentina: ${argentinaContacts.length}`);
  console.log(`Contactos USA: ${usaContacts.length}`);

  // Separar AMBA vs resto de Argentina
  const ambaContacts = argentinaContacts.filter(contact =>
    AMBA_CITIES.some(city =>
      contact.city.toLowerCase().includes(city.toLowerCase()) ||
      contact.province.toLowerCase().includes('buenos aires') ||
      contact.province.toLowerCase().includes('caba')
    )
  );

  const interiorContacts = argentinaContacts.filter(contact =>
    !ambaContacts.includes(contact)
  );

  console.log(`  - AMBA: ${ambaContacts.length}`);
  console.log(`  - Interior: ${interiorContacts.length}`);
  console.log(`  - USA: ${usaContacts.length}`);

  // Formatear teléfonos para WhatsApp (quitar + y espacios)
  const formatPhone = (phone: string): string => {
    return phone.replace(/[+\s-]/g, '');
  };

  // Priorizar: AMBA > Interior > USA
  const allContacts = [...ambaContacts, ...interiorContacts, ...usaContacts];
  const prioritizedContacts = allContacts.map(contact => ({
    ...contact,
    phone: formatPhone(contact.phone),
    whatsappId: `${formatPhone(contact.phone)}@c.us`,
    fullName: `${contact.firstName} ${contact.lastName}`.trim(),
    isAmba: ambaContacts.includes(contact),
    isUsa: usaContacts.includes(contact),
    region: ambaContacts.includes(contact) ? 'AMBA' :
            usaContacts.includes(contact) ? 'USA' : 'Interior',
  }));

  console.log(`\nTotal contactos a procesar: ${prioritizedContacts.length}`);

  // Crear directorio si no existe
  await Bun.write('./contacts/.gitkeep', '');

  // Guardar CSV filtrado
  const output = stringify(prioritizedContacts, {
    header: true,
    columns: ['email', 'phone', 'whatsappId', 'firstName', 'lastName', 'fullName', 'city', 'province', 'region'],
  });

  await Bun.write(OUTPUT_FILE, output);
  console.log(`Guardado en: ${OUTPUT_FILE}`);

  // Mostrar ejemplos por región
  console.log('\n--- Ejemplos AMBA (primeros 5):');
  ambaContacts.slice(0, 5).forEach((c, i) => {
    console.log(`  ${i + 1}. ${c.firstName} ${c.lastName} - ${c.city} - ${c.phone}`);
  });

  console.log('\n--- Ejemplos Interior (primeros 5):');
  interiorContacts.slice(0, 5).forEach((c, i) => {
    console.log(`  ${i + 1}. ${c.firstName} ${c.lastName} - ${c.city}, ${c.province} - ${c.phone}`);
  });

  console.log('\n--- Ejemplos USA (primeros 5):');
  usaContacts.slice(0, 5).forEach((c, i) => {
    console.log(`  ${i + 1}. ${c.firstName} ${c.lastName} - ${c.city}, ${c.province} - ${c.phone}`);
  });
}

main().catch(console.error);
