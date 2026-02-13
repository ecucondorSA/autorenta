/**
 * Validate Photo EXIF Edge Function
 *
 * Extracts and validates EXIF metadata from photos to detect manipulation,
 * verify recency, and extract location data for fraud prevention.
 *
 * POST /validate-photo-exif
 *   Body: { image_url, expected_date?, expected_location? }
 */

import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { getCorsHeaders } from '../_shared/cors.ts';

// ============================================================================
// TYPES
// ============================================================================

interface ValidateExifRequest {
  image_url: string;
  expected_date?: string; // ISO date string
  expected_location?: {
    latitude: number;
    longitude: number;
    radius_km?: number;
  };
}

interface ExifData {
  date_taken?: string;
  date_modified?: string;
  camera_make?: string;
  camera_model?: string;
  software?: string;
  gps_latitude?: number;
  gps_longitude?: number;
  image_width?: number;
  image_height?: number;
  orientation?: number;
  has_thumbnail?: boolean;
}

interface ValidateExifResponse {
  success: boolean;
  has_exif: boolean;
  exif_data: ExifData;
  validation: {
    is_original: boolean;
    is_recent: boolean;
    location_match: boolean;
    manipulation_score: number; // 0-100 (higher = more likely manipulated)
  };
  warnings: string[];
  error?: string;
}

// ============================================================================
// EXIF PARSING HELPERS
// ============================================================================

// EXIF tag constants
const EXIF_TAGS: Record<number, string> = {
  0x010f: 'camera_make',
  0x0110: 'camera_model',
  0x0131: 'software',
  0x0132: 'date_modified',
  0x9003: 'date_taken',
  0x9004: 'date_digitized',
  0x8827: 'iso',
  0xa002: 'image_width',
  0xa003: 'image_height',
  0x0112: 'orientation',
};

const GPS_TAGS: Record<number, string> = {
  0x0001: 'gps_lat_ref',
  0x0002: 'gps_latitude',
  0x0003: 'gps_lon_ref',
  0x0004: 'gps_longitude',
  0x0005: 'gps_alt_ref',
  0x0006: 'gps_altitude',
};

function readUint16(buffer: Uint8Array, offset: number, littleEndian: boolean): number {
  if (littleEndian) {
    return buffer[offset] | (buffer[offset + 1] << 8);
  }
  return (buffer[offset] << 8) | buffer[offset + 1];
}

function readUint32(buffer: Uint8Array, offset: number, littleEndian: boolean): number {
  if (littleEndian) {
    return buffer[offset] | (buffer[offset + 1] << 8) | (buffer[offset + 2] << 16) | (buffer[offset + 3] << 24);
  }
  return (buffer[offset] << 24) | (buffer[offset + 1] << 16) | (buffer[offset + 2] << 8) | buffer[offset + 3];
}

function readString(buffer: Uint8Array, offset: number, length: number): string {
  let str = '';
  for (let i = 0; i < length; i++) {
    const char = buffer[offset + i];
    if (char === 0) break;
    str += String.fromCharCode(char);
  }
  return str.trim();
}

function readRational(buffer: Uint8Array, offset: number, littleEndian: boolean): number {
  const numerator = readUint32(buffer, offset, littleEndian);
  const denominator = readUint32(buffer, offset + 4, littleEndian);
  return denominator !== 0 ? numerator / denominator : 0;
}

function convertGpsCoordinate(values: number[], ref: string): number {
  if (values.length < 3) return 0;
  let decimal = values[0] + values[1] / 60 + values[2] / 3600;
  if (ref === 'S' || ref === 'W') {
    decimal = -decimal;
  }
  return decimal;
}

function parseExif(buffer: Uint8Array): ExifData | null {
  const exifData: ExifData = {};

  // Check for JPEG magic bytes
  if (buffer[0] !== 0xFF || buffer[1] !== 0xD8) {
    return null; // Not a JPEG
  }

  let offset = 2;

  // Search for EXIF marker (APP1)
  while (offset < buffer.length - 4) {
    if (buffer[offset] !== 0xFF) {
      offset++;
      continue;
    }

    const marker = buffer[offset + 1];
    const size = readUint16(buffer, offset + 2, false);

    if (marker === 0xE1) { // APP1 - EXIF
      // Check for "Exif\0\0" signature
      if (readString(buffer, offset + 4, 4) === 'Exif') {
        const tiffStart = offset + 10;

        // Check byte order
        const byteOrder = readUint16(buffer, tiffStart, false);
        const littleEndian = byteOrder === 0x4949; // "II" = Intel = little endian

        // Verify TIFF magic (42)
        if (readUint16(buffer, tiffStart + 2, littleEndian) !== 42) {
          return exifData;
        }

        // Get IFD0 offset
        const ifd0Offset = readUint32(buffer, tiffStart + 4, littleEndian);

        // Parse IFD0
        parseIFD(buffer, tiffStart, tiffStart + ifd0Offset, littleEndian, exifData, EXIF_TAGS);

        // Look for EXIF IFD pointer (tag 0x8769)
        const exifIfdOffset = findTag(buffer, tiffStart, tiffStart + ifd0Offset, littleEndian, 0x8769);
        if (exifIfdOffset) {
          parseIFD(buffer, tiffStart, tiffStart + exifIfdOffset, littleEndian, exifData, EXIF_TAGS);
        }

        // Look for GPS IFD pointer (tag 0x8825)
        const gpsIfdOffset = findTag(buffer, tiffStart, tiffStart + ifd0Offset, littleEndian, 0x8825);
        if (gpsIfdOffset) {
          const gpsData: Record<string, number | string | number[]> = {};
          parseGpsIFD(buffer, tiffStart, tiffStart + gpsIfdOffset, littleEndian, gpsData);

          // Convert GPS coordinates
          if (gpsData.gps_latitude && gpsData.gps_lat_ref) {
            exifData.gps_latitude = convertGpsCoordinate(
              gpsData.gps_latitude as number[],
              gpsData.gps_lat_ref as string
            );
          }
          if (gpsData.gps_longitude && gpsData.gps_lon_ref) {
            exifData.gps_longitude = convertGpsCoordinate(
              gpsData.gps_longitude as number[],
              gpsData.gps_lon_ref as string
            );
          }
        }

        break;
      }
    } else if (marker === 0xDA) { // Start of scan - end of headers
      break;
    }

    offset += 2 + size;
  }

  return exifData;
}

function findTag(buffer: Uint8Array, tiffStart: number, ifdOffset: number, littleEndian: boolean, targetTag: number): number | null {
  const numEntries = readUint16(buffer, ifdOffset, littleEndian);

  for (let i = 0; i < numEntries; i++) {
    const entryOffset = ifdOffset + 2 + i * 12;
    const tag = readUint16(buffer, entryOffset, littleEndian);

    if (tag === targetTag) {
      return readUint32(buffer, entryOffset + 8, littleEndian);
    }
  }

  return null;
}

function parseIFD(
  buffer: Uint8Array,
  tiffStart: number,
  ifdOffset: number,
  littleEndian: boolean,
  exifData: ExifData,
  tags: Record<number, string>
): void {
  const numEntries = readUint16(buffer, ifdOffset, littleEndian);

  for (let i = 0; i < numEntries; i++) {
    const entryOffset = ifdOffset + 2 + i * 12;
    const tag = readUint16(buffer, entryOffset, littleEndian);
    const type = readUint16(buffer, entryOffset + 2, littleEndian);
    const count = readUint32(buffer, entryOffset + 4, littleEndian);
    const valueOffset = entryOffset + 8;

    const tagName = tags[tag];
    if (!tagName) continue;

    let value: string | number | undefined;

    switch (type) {
      case 2: // ASCII string
        if (count > 4) {
          const strOffset = tiffStart + readUint32(buffer, valueOffset, littleEndian);
          value = readString(buffer, strOffset, count);
        } else {
          value = readString(buffer, valueOffset, count);
        }
        break;
      case 3: // SHORT (16-bit)
        value = readUint16(buffer, valueOffset, littleEndian);
        break;
      case 4: // LONG (32-bit)
        value = readUint32(buffer, valueOffset, littleEndian);
        break;
    }

    if (value !== undefined) {
      (exifData as Record<string, string | number>)[tagName] = value;
    }
  }
}

function parseGpsIFD(
  buffer: Uint8Array,
  tiffStart: number,
  ifdOffset: number,
  littleEndian: boolean,
  gpsData: Record<string, number | string | number[]>
): void {
  const numEntries = readUint16(buffer, ifdOffset, littleEndian);

  for (let i = 0; i < numEntries; i++) {
    const entryOffset = ifdOffset + 2 + i * 12;
    const tag = readUint16(buffer, entryOffset, littleEndian);
    const type = readUint16(buffer, entryOffset + 2, littleEndian);
    const count = readUint32(buffer, entryOffset + 4, littleEndian);
    const valueOffset = entryOffset + 8;

    const tagName = GPS_TAGS[tag];
    if (!tagName) continue;

    if (type === 2) { // ASCII (N/S/E/W)
      gpsData[tagName] = readString(buffer, valueOffset, count);
    } else if (type === 5 && count === 3) { // RATIONAL x3 (degrees, minutes, seconds)
      const dataOffset = tiffStart + readUint32(buffer, valueOffset, littleEndian);
      const values: number[] = [];
      for (let j = 0; j < 3; j++) {
        values.push(readRational(buffer, dataOffset + j * 8, littleEndian));
      }
      gpsData[tagName] = values;
    }
  }
}

// ============================================================================
// VALIDATION LOGIC
// ============================================================================

function validateExifData(
  exifData: ExifData,
  expectedDate?: string,
  expectedLocation?: { latitude: number; longitude: number; radius_km?: number }
): { is_original: boolean; is_recent: boolean; location_match: boolean; manipulation_score: number; warnings: string[] } {
  const warnings: string[] = [];
  let manipulationScore = 0;

  // Check if photo is original (has camera info, no editing software)
  let isOriginal = true;

  if (!exifData.camera_make && !exifData.camera_model) {
    isOriginal = false;
    manipulationScore += 20;
    warnings.push('No se detectó información de cámara');
  }

  if (exifData.software) {
    const editingSoftware = ['photoshop', 'gimp', 'lightroom', 'snapseed', 'picsart'];
    const softwareLower = exifData.software.toLowerCase();
    if (editingSoftware.some(s => softwareLower.includes(s))) {
      isOriginal = false;
      manipulationScore += 40;
      warnings.push(`Imagen editada con: ${exifData.software}`);
    }
  }

  // Check if dates are suspicious
  if (exifData.date_taken && exifData.date_modified) {
    const taken = new Date(exifData.date_taken.replace(/:/g, '-').replace(' ', 'T'));
    const modified = new Date(exifData.date_modified.replace(/:/g, '-').replace(' ', 'T'));

    if (modified.getTime() - taken.getTime() > 24 * 60 * 60 * 1000) { // >1 day difference
      manipulationScore += 15;
      warnings.push('Fecha de modificación significativamente posterior a la captura');
    }
  }

  // Check recency
  let isRecent = true;
  if (expectedDate && exifData.date_taken) {
    const expected = new Date(expectedDate);
    const actual = new Date(exifData.date_taken.replace(/:/g, '-').replace(' ', 'T'));
    const daysDiff = Math.abs((expected.getTime() - actual.getTime()) / (1000 * 60 * 60 * 24));

    if (daysDiff > 7) {
      isRecent = false;
      warnings.push(`Foto tomada hace ${Math.round(daysDiff)} días`);
    }
  } else if (!exifData.date_taken) {
    isRecent = false;
    warnings.push('No se pudo determinar la fecha de captura');
  }

  // Check location
  let locationMatch = true;
  if (expectedLocation && exifData.gps_latitude && exifData.gps_longitude) {
    const radius = expectedLocation.radius_km || 50; // Default 50km radius
    const distance = calculateDistance(
      expectedLocation.latitude,
      expectedLocation.longitude,
      exifData.gps_latitude,
      exifData.gps_longitude
    );

    if (distance > radius) {
      locationMatch = false;
      manipulationScore += 25;
      warnings.push(`Ubicación de foto a ${Math.round(distance)}km del punto esperado`);
    }
  } else if (expectedLocation && (!exifData.gps_latitude || !exifData.gps_longitude)) {
    locationMatch = false;
    warnings.push('La foto no tiene datos de ubicación GPS');
  }

  return {
    is_original: isOriginal,
    is_recent: isRecent,
    location_match: locationMatch,
    manipulation_score: Math.min(manipulationScore, 100),
    warnings,
  };
}

function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Earth's radius in km
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function toRad(deg: number): number {
  return deg * (Math.PI / 180);
}

// ============================================================================
// MAIN HANDLER
// ============================================================================

serve(async (req: Request) => {
  const corsHeaders = getCorsHeaders(req);

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  try {
    const payload: ValidateExifRequest = await req.json();
    const { image_url, expected_date, expected_location } = payload;

    if (!image_url) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Se requiere image_url',
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('[validate-photo-exif] Fetching image...');

    // Fetch image
    const response = await fetch(image_url);
    if (!response.ok) {
      return new Response(
        JSON.stringify({
          success: false,
          has_exif: false,
          exif_data: {},
          validation: {
            is_original: false,
            is_recent: false,
            location_match: false,
            manipulation_score: 100,
          },
          warnings: ['No se pudo cargar la imagen'],
          error: 'Failed to fetch image',
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const arrayBuffer = await response.arrayBuffer();
    const buffer = new Uint8Array(arrayBuffer);

    console.log('[validate-photo-exif] Parsing EXIF data...');

    const exifData = parseExif(buffer);
    const hasExif = exifData !== null && Object.keys(exifData).length > 0;

    if (!hasExif) {
      return new Response(
        JSON.stringify({
          success: true,
          has_exif: false,
          exif_data: {},
          validation: {
            is_original: false,
            is_recent: false,
            location_match: false,
            manipulation_score: 50,
          },
          warnings: ['La imagen no contiene datos EXIF'],
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const validation = validateExifData(exifData!, expected_date, expected_location);

    console.log(`[validate-photo-exif] Original: ${validation.is_original}, Manipulation score: ${validation.manipulation_score}`);

    return new Response(
      JSON.stringify({
        success: true,
        has_exif: true,
        exif_data: exifData,
        validation: {
          is_original: validation.is_original,
          is_recent: validation.is_recent,
          location_match: validation.location_match,
          manipulation_score: validation.manipulation_score,
        },
        warnings: validation.warnings,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('[validate-photo-exif] Error:', error);

    return new Response(
      JSON.stringify({
        success: false,
        error: 'Error desconocido',
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
