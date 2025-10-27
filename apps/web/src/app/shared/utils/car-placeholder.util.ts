/**
 * Utilidad para generar placeholders visuales para autos sin fotos
 * Genera gradientes consistentes basados en marca/modelo
 */

export interface CarPlaceholderData {
  brand?: string;
  model?: string;
  year?: number;
  id: string;
}

/**
 * Colores de marcas reconocidas (gradientes brand-specific)
 */
const BRAND_COLORS: Record<string, { from: string; to: string }> = {
  // Marcas premium
  'Mercedes-Benz': { from: '#1e293b', to: '#475569' }, // Gris oscuro elegante
  BMW: { from: '#0ea5e9', to: '#0284c7' }, // Azul BMW
  Audi: { from: '#dc2626', to: '#991b1b' }, // Rojo Audi
  Porsche: { from: '#fbbf24', to: '#f59e0b' }, // Dorado
  Tesla: { from: '#ef4444', to: '#dc2626' }, // Rojo Tesla
  Lexus: { from: '#1e40af', to: '#1e3a8a' }, // Azul oscuro

  // Marcas japonesas
  Toyota: { from: '#dc2626', to: '#991b1b' }, // Rojo Toyota
  Honda: { from: '#dc2626', to: '#b91c1c' }, // Rojo Honda
  Nissan: { from: '#1f2937', to: '#111827' }, // Negro/Gris oscuro
  Mazda: { from: '#dc2626', to: '#991b1b' }, // Rojo Mazda
  Subaru: { from: '#0ea5e9', to: '#0284c7' }, // Azul Subaru
  Mitsubishi: { from: '#dc2626', to: '#991b1b' }, // Rojo
  Suzuki: { from: '#0ea5e9', to: '#0369a1' }, // Azul

  // Marcas coreanas
  Hyundai: { from: '#0ea5e9', to: '#0369a1' }, // Azul Hyundai
  Kia: { from: '#dc2626', to: '#991b1b' }, // Rojo Kia
  Genesis: { from: '#1e293b', to: '#0f172a' }, // Negro premium

  // Marcas americanas
  Ford: { from: '#0ea5e9', to: '#0369a1' }, // Azul Ford
  Chevrolet: { from: '#fbbf24', to: '#d97706' }, // Dorado Chevy
  Dodge: { from: '#dc2626', to: '#991b1b' }, // Rojo
  Jeep: { from: '#15803d', to: '#166534' }, // Verde militar
  RAM: { from: '#1e293b', to: '#0f172a' }, // Negro/Gris
  GMC: { from: '#dc2626', to: '#991b1b' }, // Rojo

  // Marcas europeas
  Volkswagen: { from: '#0ea5e9', to: '#0369a1' }, // Azul VW
  Renault: { from: '#fbbf24', to: '#d97706' }, // Amarillo Renault
  Peugeot: { from: '#0ea5e9', to: '#0369a1' }, // Azul
  Citroën: { from: '#dc2626', to: '#991b1b' }, // Rojo
  Fiat: { from: '#dc2626', to: '#991b1b' }, // Rojo Fiat
  'Alfa Romeo': { from: '#dc2626', to: '#7f1d1d' }, // Rojo Alfa
  Ferrari: { from: '#dc2626', to: '#7f1d1d' }, // Rojo Ferrari
  Lamborghini: { from: '#fbbf24', to: '#d97706' }, // Amarillo/Naranja
  Maserati: { from: '#0ea5e9', to: '#0c4a6e' }, // Azul
  Volvo: { from: '#0ea5e9', to: '#075985' }, // Azul Volvo
  SEAT: { from: '#dc2626', to: '#991b1b' }, // Rojo SEAT
  Skoda: { from: '#15803d', to: '#14532d' }, // Verde Skoda

  // Marcas chinas
  BYD: { from: '#0ea5e9', to: '#0369a1' }, // Azul
  Chery: { from: '#dc2626', to: '#991b1b' }, // Rojo
  Geely: { from: '#0ea5e9', to: '#0369a1' }, // Azul

  // Marcas indias
  Tata: { from: '#0ea5e9', to: '#075985' }, // Azul
  Mahindra: { from: '#dc2626', to: '#991b1b' }, // Rojo
};

/**
 * Genera un color consistente basado en un string (para marcas desconocidas)
 */
function stringToColor(str: string): { from: string; to: string } {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }

  const hue = Math.abs(hash % 360);
  const saturation = 65 + (Math.abs(hash) % 20); // 65-85%
  const lightness = 45 + (Math.abs(hash >> 8) % 15); // 45-60%

  return {
    from: `hsl(${hue}, ${saturation}%, ${lightness}%)`,
    to: `hsl(${hue}, ${saturation}%, ${lightness - 15}%)`,
  };
}

/**
 * Obtiene el gradiente apropiado para una marca
 */
export function getCarPlaceholderGradient(data: CarPlaceholderData): string {
  const brand = data.brand || 'Auto';

  // Buscar color de marca (case-insensitive)
  const brandKey = Object.keys(BRAND_COLORS).find(
    (key) => key.toLowerCase() === brand.toLowerCase(),
  );

  const colors = brandKey ? BRAND_COLORS[brandKey] : stringToColor(data.id + brand);

  return `linear-gradient(135deg, ${colors.from} 0%, ${colors.to} 100%)`;
}

/**
 * Genera un SVG placeholder inline para usar como src
 */
export function getCarPlaceholderSvg(data: CarPlaceholderData): string {
  const brand = data.brand || 'Auto';
  const model = data.model || '';
  const year = data.year || '';

  const gradient = getCarPlaceholderGradient(data);

  // Extraer colores del gradiente
  const fromColor = gradient.match(/linear-gradient\(135deg, ([^,]+)/)?.[1] || '#475569';
  const toColor = gradient.match(/, ([^)]+)\)/)?.[1] || '#1e293b';

  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="800" height="600" viewBox="0 0 800 600">
      <defs>
        <linearGradient id="bg-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style="stop-color:${fromColor};stop-opacity:1" />
          <stop offset="100%" style="stop-color:${toColor};stop-opacity:1" />
        </linearGradient>
      </defs>

      <!-- Fondo con gradiente -->
      <rect width="800" height="600" fill="url(#bg-gradient)"/>

      <!-- Patrón de fondo sutil -->
      <circle cx="100" cy="100" r="80" fill="white" opacity="0.05"/>
      <circle cx="700" cy="500" r="120" fill="white" opacity="0.05"/>
      <circle cx="400" cy="300" r="200" fill="white" opacity="0.03"/>

      <!-- Ícono de auto (simplificado) -->
      <g transform="translate(250, 200)">
        <!-- Cuerpo del auto -->
        <rect x="0" y="80" width="300" height="100" rx="10" fill="white" opacity="0.15"/>

        <!-- Techo -->
        <path d="M 50 80 L 80 30 L 220 30 L 250 80 Z" fill="white" opacity="0.15"/>

        <!-- Ventanas -->
        <rect x="85" y="40" width="60" height="35" fill="white" opacity="0.25"/>
        <rect x="155" y="40" width="60" height="35" fill="white" opacity="0.25"/>

        <!-- Ruedas -->
        <circle cx="60" cy="180" r="30" fill="white" opacity="0.2"/>
        <circle cx="60" cy="180" r="18" fill="white" opacity="0.3"/>
        <circle cx="240" cy="180" r="30" fill="white" opacity="0.2"/>
        <circle cx="240" cy="180" r="18" fill="white" opacity="0.3"/>

        <!-- Luces -->
        <rect x="10" y="100" width="15" height="20" rx="3" fill="white" opacity="0.3"/>
        <rect x="275" y="100" width="15" height="20" rx="3" fill="white" opacity="0.3"/>
      </g>

      <!-- Texto de marca y modelo -->
      <text x="400" y="450" font-family="system-ui, -apple-system, sans-serif" font-size="48" font-weight="bold" fill="white" text-anchor="middle" opacity="0.9">
        ${brand}
      </text>
      ${model ? `<text x="400" y="490" font-family="system-ui, -apple-system, sans-serif" font-size="28" fill="white" text-anchor="middle" opacity="0.7">${model}</text>` : ''}
      ${year ? `<text x="400" y="520" font-family="system-ui, -apple-system, sans-serif" font-size="20" fill="white" text-anchor="middle" opacity="0.6">${year}</text>` : ''}
    </svg>
  `.trim();

  return `data:image/svg+xml;base64,${btoa(svg)}`;
}

/**
 * Obtiene la URL de la foto o un placeholder
 */
export function getCarImageUrl(
  photos: Array<{ url: string }> | undefined,
  car: CarPlaceholderData,
): string {
  // Si tiene fotos, retornar la primera
  if (photos && photos.length > 0 && photos[0].url) {
    return photos[0].url;
  }

  // Generar placeholder SVG
  return getCarPlaceholderSvg(car);
}
