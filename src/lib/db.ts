import mongoose from "mongoose";

let isConnected = false;

export async function connectDB() {
  if (isConnected) return;

  const mongoUri = process.env.MONGO_URI;

  if (!mongoUri) {
    throw new Error("MONGO_URI missing");
  }

  // const conn = await mongoose.connect(mongoUri, {
  //   serverSelectionTimeoutMS: 10000,
  //   connectTimeoutMS: 10000,
  // });

  // isConnected = conn.connections[0].readyState === 1;
  
  await mongoose.connect(mongoUri, {
    serverSelectionTimeoutMS: 10000,
    connectTimeoutMS: 10000,
  });

  isConnected = true;

  // 🔧 Clean up orphan indexes immediately after connection
  // const db = mongoose.connection.db;
  // const indexes = await db.collection("forms").indexes();
  // const slugIdx = indexes.find((i: any) => i.name === "slug_1");
  // if (slugIdx) {
  //   await db.collection("forms").dropIndex("slug_1");
  //   console.log("✅ Dropped orphan slug_1 index");
  // }

}
