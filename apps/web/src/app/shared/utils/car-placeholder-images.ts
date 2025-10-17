/**
 * Car Placeholder Images Utility
 *
 * Provides a set of high-quality car placeholder images for cars without photos.
 * Uses Unsplash Source for free, high-quality automotive imagery.
 */

export interface CarPlaceholderImage {
  url: string;
  alt: string;
}

/**
 * Collection of car placeholder images from Unsplash
 * These are generic car images that work well as placeholders
 */
const CAR_PLACEHOLDER_IMAGES: CarPlaceholderImage[] = [
  {
    url: 'https://images.unsplash.com/photo-1494976388531-d1058494cdd8?w=800&h=600&fit=crop',
    alt: 'Auto deportivo moderno',
  },
  {
    url: 'https://images.unsplash.com/photo-1552519507-da3b142c6e3d?w=800&h=600&fit=crop',
    alt: 'SUV elegante',
  },
  {
    url: 'https://images.unsplash.com/photo-1583121274602-3e2820c69888?w=800&h=600&fit=crop',
    alt: 'Sedán premium',
  },
  {
    url: 'https://images.unsplash.com/photo-1605559424843-9e4c228bf1c2?w=800&h=600&fit=crop',
    alt: 'Auto compacto',
  },
  {
    url: 'https://images.unsplash.com/photo-1550355291-bbee04a92027?w=800&h=600&fit=crop',
    alt: 'Cupé deportivo',
  },
  {
    url: 'https://images.unsplash.com/photo-1609521263047-f8f205293f24?w=800&h=600&fit=crop',
    alt: 'Camioneta pickup',
  },
  {
    url: 'https://images.unsplash.com/photo-1619405399517-d7fce0f13302?w=800&h=600&fit=crop',
    alt: 'Auto eléctrico moderno',
  },
  {
    url: 'https://images.unsplash.com/photo-1568605117036-5fe5e7bab0b7?w=800&h=600&fit=crop',
    alt: 'Crossover familiar',
  },
];

/**
 * Get a placeholder image for a car based on its ID
 * Uses a deterministic hash to ensure the same car always gets the same placeholder
 *
 * @param carId - The unique ID of the car
 * @returns A placeholder image object with url and alt text
 */
export function getCarPlaceholderImage(carId: string): CarPlaceholderImage {
  // Simple hash function to get a consistent index for the same carId
  const hash = carId.split('').reduce((acc, char) => {
    return acc + char.charCodeAt(0);
  }, 0);

  const index = hash % CAR_PLACEHOLDER_IMAGES.length;
  return CAR_PLACEHOLDER_IMAGES[index];
}

/**
 * Get a random car placeholder image
 * @returns A random placeholder image object
 */
export function getRandomCarPlaceholder(): CarPlaceholderImage {
  const index = Math.floor(Math.random() * CAR_PLACEHOLDER_IMAGES.length);
  return CAR_PLACEHOLDER_IMAGES[index];
}

/**
 * Check if a car has photos
 * @param car - The car object
 * @returns true if the car has at least one photo
 */
export function hasCarPhotos(car: { photos?: any[] }): boolean {
  return !!(car.photos && car.photos.length > 0);
}
