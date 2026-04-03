const { User, Ride, RideParticipant, Rating } = require('../models');
const { sequelize } = require('../models');

async function seed() {
  try {
    console.log('Starting database seeding...\n');

    // Clear existing data (optional - comment out if you want to keep existing data)
    await sequelize.sync({ force: true });
    console.log('✅ Database cleared.\n');

    // Create test users
    console.log('Creating test users...');
    const users = await User.bulkCreate([
      {
        walletAddress: '0x1234567890123456789012345678901234567890',
        username: 'alice_driver',
        email: 'alice@iiitkottayam.ac.in',
        emailVerified: true,
        password: '$2a$10$RT0qGUt2pmS.u2AX.p1LGuCC0/AUTxvrRDxq/mOqsvhxYR3jLYjiy', // password123
        phoneNumber: '+1234567890',
        bio: 'Experienced driver, love carpooling!',
        role: 'user',
        isActive: true,
        isBanned: false
      },
      {
        walletAddress: '0x2234567890123456789012345678901234567890',
        username: 'bob_rider',
        email: 'bob@iiitkottayam.ac.in',
        emailVerified: true,
        password: '$2a$10$RT0qGUt2pmS.u2AX.p1LGuCC0/AUTxvrRDxq/mOqsvhxYR3jLYjiy', // password123
        phoneNumber: '+1234567891',
        bio: 'Regular commuter',
        role: 'user',
        isActive: true,
        isBanned: false
      },
      {
        walletAddress: '0x3234567890123456789012345678901234567890',
        username: 'admin',
        email: 'admin@iiitkottayam.ac.in',
        emailVerified: true,
        password: '$2a$10$RT0qGUt2pmS.u2AX.p1LGuCC0/AUTxvrRDxq/mOqsvhxYR3jLYjiy', // password123
        phoneNumber: '+1234567892',
        bio: 'Platform administrator',
        role: 'admin',
        isActive: true,
        isBanned: false
      },
      {
        walletAddress: '0x4234567890123456789012345678901234567890',
        username: 'diana_driver',
        email: 'diana@iiitkottayam.ac.in',
        emailVerified: true,
        password: '$2a$10$RT0qGUt2pmS.u2AX.p1LGuCC0/AUTxvrRDxq/mOqsvhxYR3jLYjiy', // password123
        phoneNumber: '+1234567893',
        bio: 'Weekend driver',
        role: 'user',
        isActive: true,
        isBanned: false
      },
      {
        walletAddress: '0x5234567890123456789012345678901234567890',
        username: 'eve_rider',
        email: 'eve@iiitkottayam.ac.in',
        emailVerified: true,
        password: '$2a$10$RT0qGUt2pmS.u2AX.p1LGuCC0/AUTxvrRDxq/mOqsvhxYR3jLYjiy', // password123
        phoneNumber: '+1234567894',
        bio: 'College student',
        role: 'user',
        isActive: true,
        isBanned: false
      }
    ]);
    console.log(`✅ Created ${users.length} test users.\n`);

    // Create test rides
    console.log('Creating test rides...');
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(9, 0, 0, 0);

    const nextWeek = new Date();
    nextWeek.setDate(nextWeek.getDate() + 7);
    nextWeek.setHours(18, 0, 0, 0);

    const rides = await Ride.bulkCreate([
      {
        blockchainRideId: 0,
        hostId: users[0].id, // Alice
        startLocation: 'Downtown, New York',
        endLocation: 'Airport, New York',
        startLatitude: 40.7128,
        startLongitude: -74.0060,
        endLatitude: 40.6413,
        endLongitude: -73.7781,
        rideDateTime: tomorrow,
        availableSeats: 3,
        totalSeats: 3,
        pricePerSeat: 15.00,
        tags: ['Airport Drop', 'Morning'],
        vehicleInfo: { make: 'Toyota', model: 'Camry', color: 'Blue', plate: 'ABC123' },
        status: 'active',
        notes: 'Leaving early morning, no stops'
      },
      {
        blockchainRideId: 1,
        hostId: users[3].id, // Diana
        startLocation: 'Brooklyn, New York',
        endLocation: 'Manhattan, New York',
        startLatitude: 40.6782,
        startLongitude: -73.9442,
        endLatitude: 40.7580,
        endLongitude: -73.9855,
        rideDateTime: tomorrow,
        availableSeats: 2,
        totalSeats: 4,
        pricePerSeat: 10.00,
        tags: ['Office Commute', 'Daily'],
        vehicleInfo: { make: 'Honda', model: 'Civic', color: 'Silver', plate: 'XYZ789' },
        status: 'active',
        notes: 'Regular office commute'
      },
      {
        blockchainRideId: 2,
        hostId: users[0].id, // Alice
        startLocation: 'Queens, New York',
        endLocation: 'Long Island, New York',
        startLatitude: 40.7282,
        startLongitude: -73.7949,
        endLatitude: 40.7891,
        endLongitude: -73.1350,
        rideDateTime: nextWeek,
        availableSeats: 3,
        totalSeats: 3,
        pricePerSeat: 20.00,
        tags: ['Weekend Trip', 'Leisure'],
        vehicleInfo: { make: 'Toyota', model: 'Camry', color: 'Blue', plate: 'ABC123' },
        status: 'active',
        notes: 'Weekend trip to the beach'
      },
      {
        blockchainRideId: 3,
        hostId: users[3].id, // Diana
        startLocation: 'Manhattan, New York',
        endLocation: 'Columbia University, New York',
        startLatitude: 40.7580,
        startLongitude: -73.9855,
        endLatitude: 40.8075,
        endLongitude: -73.9626,
        rideDateTime: tomorrow,
        availableSeats: 1,
        totalSeats: 2,
        pricePerSeat: 5.00,
        tags: ['College Ride', 'Student'],
        vehicleInfo: { make: 'Honda', model: 'Civic', color: 'Silver', plate: 'XYZ789' },
        status: 'active',
        notes: 'Going to campus'
      }
    ]);
    console.log(`✅ Created ${rides.length} test rides.\n`);

    // Create ride participants
    console.log('Creating ride participants...');
    const participants = await RideParticipant.bulkCreate([
      {
        rideId: rides[1].id,
        riderId: users[1].id, // Bob joins Diana's ride
        status: 'joined'
      },
      {
        rideId: rides[1].id,
        riderId: users[4].id, // Eve joins Diana's ride
        status: 'joined'
      },
      {
        rideId: rides[3].id,
        riderId: users[4].id, // Eve joins Diana's college ride
        status: 'joined'
      }
    ]);
    console.log(`✅ Created ${participants.length} ride participants.\n`);

    // Update available seats
    await rides[1].update({ availableSeats: 2 });
    await rides[3].update({ availableSeats: 1 });

    // Create sample ratings
    console.log('Creating sample ratings...');
    const ratings = await Rating.bulkCreate([
      {
        raterId: users[1].id, // Bob rates Alice
        rateeId: users[0].id,
        rideId: rides[0].id,
        stars: 5,
        comment: 'Great driver, very punctual!',
        blockchainTxHash: '0xabc123...'
      },
      {
        raterId: users[4].id, // Eve rates Diana
        rateeId: users[3].id,
        rideId: rides[1].id,
        stars: 4,
        comment: 'Nice ride, comfortable car',
        blockchainTxHash: '0xdef456...'
      },
      {
        raterId: users[0].id, // Alice rates Bob
        rateeId: users[1].id,
        rideId: rides[0].id,
        stars: 5,
        comment: 'Excellent passenger, respectful',
        blockchainTxHash: '0xghi789...'
      }
    ]);
    console.log(`✅ Created ${ratings.length} sample ratings.\n`);

    console.log('Database seeding completed successfully! 🎉\n');
    console.log('Test Users:');
    console.log('  - alice_driver (Driver)');
    console.log('  - bob_rider (Rider)');
    console.log('  - charlie_admin (Admin)');
    console.log('  - diana_driver (Driver)');
    console.log('  - eve_rider (Rider)');
    console.log('\nYou can now start the server and test the application!\n');

    process.exit(0);
  } catch (error) {
    console.error('❌ Seeding failed:', error);
    process.exit(1);
  }
}

seed();
