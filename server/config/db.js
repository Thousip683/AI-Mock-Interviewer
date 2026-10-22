import mongoose from 'mongoose';

const connectDB = async () => {
  const uri = process.env.MONGODB_URI;

  if (!uri) {
    console.warn('[DB] ⚠️ MONGODB_URI is not defined in environment variables. Falling back to local file storage.');
    return;
  }

  // Mask MongoDB URI for logging (mask credentials)
  const maskedUri = uri.replace(/:\/\/([^:]+):([^@]+)@/, '://$1:****@');
  console.log(`[DB] 🔌 Connecting to MongoDB: ${maskedUri}`);

  // Set up connection event listeners for debugging
  mongoose.connection.on('connected', () => {
    console.log('[DB] ✅ Mongoose connected to database');
  });

  mongoose.connection.on('error', (err) => {
    console.error(`[DB] ❌ Mongoose connection error: ${err.message}`);
  });

  mongoose.connection.on('disconnected', () => {
    console.warn('[DB] ⚠️ Mongoose disconnected. Operations will fallback to local storage if unavailable.');
  });

  try {
    const conn = await mongoose.connect(uri);
    console.log(`[DB] ✅ MongoDB Connected successfully to host: ${conn.connection.host}, database: ${conn.connection.name}`);
  } catch (error) {
    console.warn(`[DB] ⚠️ MongoDB connection failed: ${error.message}`);
    console.warn('[DB] 📁 Falling back to local JSON file storage (server/data/interviews.json)');
  }
};

export default connectDB;


