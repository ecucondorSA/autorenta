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
  'Mercedes-Benz': { from: 'var(--text-primary)', to: 'var(--text-secondary)' }, // Gris oscuro elegante
  BMW: { from: 'var(--system-blue-default)', to: 'var(--system-blue-dark)' }, // Azul BMW
  Audi: { from: 'var(--error-default)', to: 'var(--error-dark)' }, // Rojo Audi
  Porsche: { from: 'var(--warning-default)', to: 'var(--warning-dark)' }, // Dorado
  Tesla: { from: 'var(--error-default)', to: 'var(--error-dark)' }, // Rojo Tesla
  Lexus: { from: 'var(--system-blue-dark)', to: 'var(--text-primary)' }, // Azul oscuro

  // Marcas japonesas
  Toyota: { from: 'var(--error-default)', to: 'var(--error-dark)' }, // Rojo Toyota
  Honda: { from: 'var(--error-default)', to: 'var(--error-dark)' }, // Rojo Honda
  Nissan: { from: 'var(--surface-dark)', to: 'var(--text-primary)' }, // Negro/Gris oscuro
  Mazda: { from: 'var(--error-default)', to: 'var(--error-dark)' }, // Rojo Mazda
  Subaru: { from: 'var(--system-blue-default)', to: 'var(--system-blue-dark)' }, // Azul Subaru
  Mitsubishi: { from: 'var(--error-default)', to: 'var(--error-dark)' }, // Rojo
  Suzuki: { from: 'var(--system-blue-default)', to: 'var(--system-blue-dark)' }, // Azul

  // Marcas coreanas
  Hyundai: { from: 'var(--system-blue-default)', to: 'var(--system-blue-dark)' }, // Azul Hyundai
  Kia: { from: 'var(--error-default)', to: 'var(--error-dark)' }, // Rojo Kia
  Genesis: { from: 'var(--surface-dark)', to: 'var(--text-primary)' }, // Negro premium

  // Marcas americanas
  Ford: { from: 'var(--system-blue-default)', to: 'var(--system-blue-dark)' }, // Azul Ford
  Chevrolet: { from: 'var(--warning-default)', to: 'var(--warning-dark)' }, // Dorado Chevy
  Dodge: { from: 'var(--error-default)', to: 'var(--error-dark)' }, // Rojo
  Jeep: { from: 'var(--success-default)', to: 'var(--success-dark)' }, // Verde militar
  RAM: { from: 'var(--surface-dark)', to: 'var(--text-primary)' }, // Negro/Gris
  GMC: { from: 'var(--error-default)', to: 'var(--error-dark)' }, // Rojo

  // Marcas europeas
  Volkswagen: { from: 'var(--system-blue-default)', to: 'var(--system-blue-dark)' }, // Azul VW
  Renault: { from: 'var(--warning-default)', to: 'var(--warning-dark)' }, // Amarillo Renault
  Peugeot: { from: 'var(--system-blue-default)', to: 'var(--system-blue-dark)' }, // Azul
  Citroën: { from: 'var(--error-default)', to: 'var(--error-dark)' }, // Rojo
  Fiat: { from: 'var(--error-default)', to: 'var(--error-dark)' }, // Rojo Fiat
  'Alfa Romeo': { from: 'var(--error-default)', to: 'var(--error-dark)' }, // Rojo Alfa
  Ferrari: { from: 'var(--error-default)', to: 'var(--error-dark)' }, // Rojo Ferrari
  Lamborghini: { from: 'var(--warning-default)', to: 'var(--warning-dark)' }, // Amarillo/Naranja
  Maserati: { from: 'var(--system-blue-default)', to: 'var(--system-blue-dark)' }, // Azul
  Volvo: { from: 'var(--system-blue-default)', to: 'var(--system-blue-dark)' }, // Azul Volvo
  SEAT: { from: 'var(--error-default)', to: 'var(--error-dark)' }, // Rojo SEAT
  Skoda: { from: 'var(--success-default)', to: 'var(--success-dark)' }, // Verde Skoda

  // Marcas chinas
  BYD: { from: 'var(--system-blue-default)', to: 'var(--system-blue-dark)' }, // Azul
  Chery: { from: 'var(--error-default)', to: 'var(--error-dark)' }, // Rojo
  Geely: { from: 'var(--system-blue-default)', to: 'var(--system-blue-dark)' }, // Azul

  // Marcas indias
  Tata: { from: 'var(--system-blue-default)', to: 'var(--system-blue-dark)' }, // Azul
  Mahindra: { from: 'var(--error-default)', to: 'var(--error-dark)' }, // Rojo
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

  // Usar color sólido (from) para fondo, evitando gradientes
  return colors.from;
}

/**
 * Genera un SVG placeholder inline para usar como src
 */
export function getCarPlaceholderSvg(data: CarPlaceholderData): string {
  const brand = data.brand || 'Auto';
  const model = data.model || '';
  const year = data.year || '';

  const baseColor = getCarPlaceholderGradient(data);

  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="800" height="600" viewBox="0 0 800 600">
      <!-- Fondo sólido (sin gradiente) -->
      <rect width="800" height="600" fill="${baseColor}"/>

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
