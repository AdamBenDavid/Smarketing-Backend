import mongoose from 'mongoose';
import userModel from '../models/user_model';

const MONGODB_URI = 'mongodb://127.0.0.1:27017/smarketing'; // Changed from Smarketing to smarketing

const migrateUsers = async () => {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('Connected successfully');
    
    // Show users before update
    console.log('\nBefore update:');
    const beforeUsers = await userModel.find({}, { email: 1, role: 1, expertise: 1, online: 1, lastSeen: 1 });
    console.log(beforeUsers);

    const result = await userModel.updateMany(
      {
        $or: [
          { role: { $exists: false } },
          { expertise: { $exists: false } },
          { online: { $exists: false } },
          { lastSeen: { $exists: false } }
        ]
      },
      {
        $set: {
          expertise: [],
          online: false,
          lastSeen: new Date(),
          role: "user"
        }
      }
    );

    console.log(`\nUpdated ${result.modifiedCount} users`);

    // Create example user with all new fields
    console.log('\nCreating example user...');
    const exampleUser = new userModel({
      email: "example@smarketing.com",
      password: "password123", // In real app, this should be hashed
      fullName: "Example User",
      role: "expert",
      expertise: ["digital marketing", "social media", "content creation"],
      profilePicture: "https://placehold.co/150x150",
      online: true,
      lastSeen: new Date(),
      favPat: "cat"
    });

    await exampleUser.save();
    console.log('Example user created successfully');

    // Show all users after update and new user creation
    console.log('\nAfter update and new user creation:');
    const afterUsers = await userModel.find({}, { email: 1, role: 1, expertise: 1, online: 1, lastSeen: 1 });
    console.log(afterUsers);

  } catch (error) {
    console.error('Migration failed:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\nDisconnected from MongoDB');
  }
};

migrateUsers(); 