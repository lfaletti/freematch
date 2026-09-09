import { query } from './connection';

// Dev/test slot map used by `getUserId()` (legacy `X-User-Id` header) and the
// `/api/session` slot label. These users are NOT seeded into the database — the
// app only ever contains accounts created manually via registration.
export const TEST_USERS: Record<string, {
  id: string; name: string; born_date: string; bio: string;
  photo_url: string; interests: string[]; location: string;
  phone_number: string; email: string;
}> = {
  alex: {
    id: '00000000-0000-0000-0000-000000000002',
    name: 'Alex',
    born_date: '1999-03-15',
    bio: 'Coffee lover, weekend hiker and aspiring chef. Looking for someone to share adventures with!',
    photo_url: 'https://randomuser.me/api/portraits/men/32.jpg',
    interests: ['hiking', 'cooking', 'coffee', 'travel'],
    location: 'New York, NY',
    phone_number: '+15550000001',
    email: 'alex@freematch.test',
  },
  jordan: {
    id: '00000000-0000-0000-0000-000000000003',
    name: 'Jordan',
    born_date: '2001-06-20',
    bio: 'Software engineer by day, guitarist by night. I love live music and craft beer.',
    photo_url: 'https://randomuser.me/api/portraits/women/44.jpg',
    interests: ['music', 'coding', 'craft beer', 'concerts'],
    location: 'Austin, TX',
    phone_number: '+15550000002',
    email: 'jordan@freematch.test',
  },
  sophia: {
    id: '00000000-0000-0000-0000-000000000004',
    name: 'Sophia',
    born_date: '2000-09-12',
    bio: 'Art history grad, museum enthusiast. Always up for a gallery hop or a new brunch spot.',
    photo_url: 'https://randomuser.me/api/portraits/women/1.jpg',
    interests: ['art', 'museums', 'brunch', 'reading'],
    location: 'Chicago, IL',
    phone_number: '+15550000003',
    email: 'sophia@freematch.test',
  },
  liam: {
    id: '00000000-0000-0000-0000-000000000005',
    name: 'Liam',
    born_date: '1997-02-08',
    bio: "Personal trainer and outdoor sports fanatic. Let's go climbing or kayaking!",
    photo_url: 'https://randomuser.me/api/portraits/men/2.jpg',
    interests: ['fitness', 'climbing', 'kayaking', 'nutrition'],
    location: 'Denver, CO',
    phone_number: '+15550000004',
    email: 'liam@freematch.test',
  },
  emma: {
    id: '00000000-0000-0000-0000-000000000006',
    name: 'Emma',
    born_date: '2002-04-25',
    bio: 'Yoga instructor and plant mom. I meditate, make sourdough and binge Netflix equally.',
    photo_url: 'https://randomuser.me/api/portraits/women/3.jpg',
    interests: ['yoga', 'meditation', 'baking', 'netflix'],
    location: 'Los Angeles, CA',
    phone_number: '+15550000005',
    email: 'emma@freematch.test',
  },
  noah: {
    id: '00000000-0000-0000-0000-000000000007',
    name: 'Noah',
    born_date: '1995-11-30',
    bio: 'Photographer and storyteller. Always chasing golden hour. Into film, food and philosophy.',
    photo_url: 'https://randomuser.me/api/portraits/men/4.jpg',
    interests: ['photography', 'film', 'food', 'philosophy'],
    location: 'San Francisco, CA',
    phone_number: '+15550000006',
    email: 'noah@freematch.test',
  },
  olivia: {
    id: '00000000-0000-0000-0000-000000000008',
    name: 'Olivia',
    born_date: '1999-07-14',
    bio: 'Marine biologist who loves the ocean as much as a good thriller novel. Rescue dog mom.',
    photo_url: 'https://randomuser.me/api/portraits/women/5.jpg',
    interests: ['ocean', 'marine life', 'reading', 'dogs'],
    location: 'Miami, FL',
    phone_number: '+15550000007',
    email: 'olivia@freematch.test',
  },
  ethan: {
    id: '00000000-0000-0000-0000-000000000009',
    name: 'Ethan',
    born_date: '1998-01-22',
    bio: 'Chef at a local bistro. I will cook for you. Huge into jazz, travel and trying new cuisines.',
    photo_url: 'https://randomuser.me/api/portraits/men/6.jpg',
    interests: ['cooking', 'jazz', 'travel', 'food'],
    location: 'New Orleans, LA',
    phone_number: '+15550000008',
    email: 'ethan@freematch.test',
  },
};

export async function runMigrations() {
  const fs = require('fs');
  const path = require('path');

  const sql001 = fs.readFileSync(path.join(__dirname, 'migrations/001_init.sql'), 'utf8');
  await query(sql001);

  const sql002 = fs.readFileSync(path.join(__dirname, 'migrations/002_auth.sql'), 'utf8');
  await query(sql002);

  const sql003 = fs.readFileSync(path.join(__dirname, 'migrations/003_photos.sql'), 'utf8');
  await query(sql003);

  const sql004 = fs.readFileSync(path.join(__dirname, 'migrations/004_jwt_auth.sql'), 'utf8');
  await query(sql004);

  const sql005 = fs.readFileSync(path.join(__dirname, 'migrations/005_remove_mock_users.sql'), 'utf8');
  await query(sql005);

  const sql009_likes = fs.readFileSync(path.join(__dirname, 'migrations/009_add_message_likes.sql'), 'utf8');
  await query(sql009_likes);

  const sql006_refresh = fs.readFileSync(path.join(__dirname, 'migrations/006_refresh_tokens.sql'), 'utf8');
  await query(sql006_refresh);

  const sql007 = fs.readFileSync(path.join(__dirname, 'migrations/007_email_verification.sql'), 'utf8');
  await query(sql007);

  const sql008 = fs.readFileSync(path.join(__dirname, 'migrations/008_gender_fields.sql'), 'utf8');
  await query(sql008);

  const sql010_lang = fs.readFileSync(path.join(__dirname, 'migrations/010_language.sql'), 'utf8');
  await query(sql010_lang);

  const sql011_privacy = fs.readFileSync(path.join(__dirname, 'migrations/011_privacy.sql'), 'utf8');
  await query(sql011_privacy);

  const sql012_coords = fs.readFileSync(path.join(__dirname, 'migrations/012_location_coords.sql'), 'utf8');
  await query(sql012_coords);

  const sql013_radius = fs.readFileSync(path.join(__dirname, 'migrations/013_search_radius.sql'), 'utf8');
  await query(sql013_radius);

  const sql014_photo_sync = fs.readFileSync(path.join(__dirname, 'migrations/014_photo_url_sync.sql'), 'utf8');
  await query(sql014_photo_sync);

  const sql015_reports = fs.readFileSync(path.join(__dirname, 'migrations/015_reports.sql'), 'utf8');
  await query(sql015_reports);

  const sql016_age = fs.readFileSync(path.join(__dirname, 'migrations/016_age_range.sql'), 'utf8');
  await query(sql016_age);

  const sql017_analytics = fs.readFileSync(path.join(__dirname, 'migrations/017_analytics_events.sql'), 'utf8');
  await query(sql017_analytics);

  console.log('Migrations ran successfully');
}


