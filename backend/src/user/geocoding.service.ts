import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';

/**
 * Geocoding result from external API (T-2.1)
 */
export interface GeoResult {
  latitude: number;
  longitude: number;
  formattedAddress: string;
}

/**
 * Geocoding service — wraps Nominatim (OpenStreetMap) or Google Maps API
 * For V1: uses fake/mock mode (user requested fake keys for all external services)
 *
 * In production, this would:
 * 1. Call Google Maps Geocoding API or Nominatim
 * 2. Store lat/lng in the user's geom column (PostGIS POINT)
 * 3. Cache results to avoid repeated API calls
 */
@Injectable()
export class GeocodingService {
  private readonly logger = new Logger(GeocodingService.name);
  private readonly useFake: boolean;

  constructor(
    private configService: ConfigService,
    private prisma: PrismaService,
  ) {
    // Use fake geocoding by default for V1 (no real API keys)
    this.useFake = this.configService.get('GEOCODING_API_KEY') !== 'required';
  }

  /**
   * Geocode an address string to latitude/longitude
   * @param address Full address string (e.g., "Paris, France")
   * @returns Geocoding result or null if failed
   */
  async geocode(address: string): Promise<GeoResult | null> {
    if (!address || address.trim().length === 0) {
      return null;
    }

    if (this.useFake) {
      return this.fakeGeocode(address);
    }

    try {
      return await this.realGeocode(address);
    } catch (error) {
      this.logger.error(`Geocoding failed for "${address}": ${error}`);
      return null;
    }
  }

  /**
   * Reverse geocode lat/lng to address
   */
  async reverseGeocode(latitude: number, longitude: number): Promise<string | null> {
    if (this.useFake) {
      return `Fake address near ${latitude}, ${longitude}`;
    }

    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json`,
        { headers: { 'User-Agent': '3d-marketplace' } },
      );
      const data = await response.json();
      return data.display_name || null;
    } catch {
      return null;
    }
  }

  /**
   * Store geocoded location for a user (T-2.1)
   * Updates both the JSON localisation field and PostGIS geom column
   */
  async storeUserLocation(userId: string, address: string) {
    const geo = await this.geocode(address);
    if (!geo) {
      return null;
    }

    // Update user's localisation JSON field and PostGIS geom column
    await this.prisma.$executeRaw`
      UPDATE "User"
      SET localisation = jsonb_build_object(
        'address', ${address},
        'latitude', ${geo.latitude},
        'longitude', ${geo.longitude},
        'formattedAddress', ${geo.formattedAddress}
      ),
      geom = ST_SetSRID(ST_MakePoint(${geo.longitude}, ${geo.latitude}), 4326)
      WHERE id = ${userId}
    `;

    return geo;
  }

  private async fakeGeocode(address: string): Promise<GeoResult> {
    // Deterministic fake geocoding based on address hash
    const hash = address.split('').reduce((a, b) => a + b.charCodeAt(0), 0);
    return {
      latitude: 48.8566 + (hash % 100) / 10000,
      longitude: 2.3522 + ((hash * 7) % 100) / 10000,
      formattedAddress: address,
    };
  }

  private async realGeocode(address: string): Promise<GeoResult> {
    // Use Nominatim (OpenStreetMap) free API
    const response = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}&limit=1`,
      { headers: { 'User-Agent': '3d-marketplace' } },
    );

    if (!response.ok) {
      throw new Error(`Geocoding API error: ${response.status}`);
    }

    const data = await response.json();
    if (data.length === 0) {
      return null;
    }

    return {
      latitude: parseFloat(data[0].lat),
      longitude: parseFloat(data[0].lon),
      formattedAddress: data[0].display_name,
    };
  }
}
