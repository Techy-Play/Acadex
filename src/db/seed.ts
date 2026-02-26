/**
 * Seed script for Acadex
 *
 * Run with: npx tsx src/db/seed.ts
 *
 * Creates:
 * - Default admin user (Mr. Techie / admin / admin123)
 * - 6 semester subjects
 *
 * Idempotent — safe to run multiple times (uses upserts)
 */

import "dotenv/config";
import mongoose from "mongoose";
import bcrypt from "bcrypt";

// dotenv/config loads .env — but we need .env.local for Next.js convention
import { config } from "dotenv";
config({ path: ".env.local", override: true });

const MONGODB_URI = process.env.MONGODB_URI || "mongodb://localhost:27017/acadex";

async function seed() {
  console.log("🔗 Connecting to MongoDB...");
  await mongoose.connect(MONGODB_URI);
  console.log("✅ Connected!\n");

  const db = mongoose.connection.db!;

  // ----- SEED ADMIN USER -----
  const usersCollection = db.collection("users");
  const adminCollegeId = "admin";
  const existingAdmin = await usersCollection.findOne({ college_id: adminCollegeId });

  if (!existingAdmin) {
    const passwordHash = await bcrypt.hash("admin123", 10);
    await usersCollection.insertOne({
      name: "Mr. Techie",
      college_id: adminCollegeId,
      password_hash: passwordHash,
      role: "admin",
      must_change_password: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    console.log("👑 Admin user created:");
    console.log("   College ID: admin");
    console.log("   Password:   admin123");
    console.log("   (Change this after first login!)\n");
  } else {
    console.log("👑 Admin user already exists, skipping.\n");
  }

  // ----- SEED SUBJECTS -----
  const subjectsCollection = db.collection("subjects");
  const subjects = [
    "Artificial Intelligence",
    "DBMS",
    "Digital Marketing",
    "Discrete Mathematics",
    "Theory of Computation",
    "Wireless and Mobile Communication",
  ];

  console.log("📚 Seeding subjects...");
  for (const name of subjects) {
    const result = await subjectsCollection.updateOne(
      { name },
      { $setOnInsert: { name } },
      { upsert: true }
    );
    if (result.upsertedCount > 0) {
      console.log(`   ✅ Created: ${name}`);
    } else {
      console.log(`   ⏭️  Exists:  ${name}`);
    }
  }

  console.log("\n🎉 Seed complete!");
  await mongoose.disconnect();
  process.exit(0);
}

seed().catch((err) => {
  console.error("❌ Seed failed:", err);
  process.exit(1);
});
