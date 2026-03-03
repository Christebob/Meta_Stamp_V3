// =============================================================================
// META-STAMP V3 - Demo User Seed Script
// =============================================================================
// Creates a demo user for local development and demo purposes.
// This script runs automatically on first MongoDB initialization.
//
// Demo Credentials:
//   Email: demo@metastamp.io
//   Password: demo1234
//
// Password is stored as SHA-256 hash (matching backend auth logic).
// =============================================================================

db = db.getSiblingDB('metastamp');

// Only insert if demo user doesn't already exist
if (db.users.countDocuments({ email: 'demo@metastamp.io' }) === 0) {
  db.users.insertOne({
    email: 'demo@metastamp.io',
    name: 'Demo Creator',
    role: 'creator',
    // SHA-256 hash of 'demo1234'
    hashed_password: '0ead2060b65992dca4769af601a1b3a35ef38cfad2c2c465bb160ea764157c5d',
    auth0_id: null,
    avatar_url: null,
    bio: 'Meta-Stamp demo account for showcasing creator protection features.',
    created_at: new Date(),
    updated_at: new Date(),
    last_login: null,
    is_active: true,
  });
  print('✅ Demo user created: demo@metastamp.io / demo1234');
} else {
  print('ℹ️  Demo user already exists, skipping.');
}
