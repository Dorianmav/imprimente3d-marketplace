-- ============================================
-- CDC v1.3 — Database Init Script
-- Enables PostGIS and pg_trgm extensions
-- ============================================

-- Enable PostGIS (spatial queries, distance calculations)
CREATE EXTENSION IF NOT EXISTS postgis;

-- Enable pg_trgm (fuzzy text search, typo tolerance)
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Enable uuid-ossp (if needed for UUID generation)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
