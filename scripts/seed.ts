/**
 * Seed Script — Acadex
 *
 * Sets up:
 * 1. Default sections (A, B, C, ME)
 * 2. Super admin flag for Mr. Techie (college_id: "2417003")
 *
 * Usage:
 *   npx tsx scripts/seed.ts
 *
 * Make sure MONGODB_URI is set in .env.local
 */

import dotenv from "dotenv";
import path from "path";
dotenv.config({ path: path.resolve(__dirname, "../.env.local") });
import mongoose from "mongoose";

// ─── Inline models (avoid Next.js runtime deps) ──────────
const SectionSchema = new mongoose.Schema(
  { name: { type: String, required: true, unique: true, maxlength: 50 } },
  { timestamps: true }
);

const UserSchema = new mongoose.Schema({
  name: String,
  college_id: { type: String, unique: true },
  email: String,
  password: String,
  role: { type: String, enum: ["student", "admin"], default: "student" },
  isSuperAdmin: { type: Boolean, default: false },
  adminAlias: { type: String, default: null },
  section: { type: mongoose.Schema.Types.ObjectId, ref: "Section", default: null },
  stream: { type: mongoose.Schema.Types.ObjectId, ref: "Stream", default: null },
});

const Section = mongoose.models.Section || mongoose.model("Section", SectionSchema);
const User = mongoose.models.User || mongoose.model("User", UserSchema);

// ─── Config ──────────────────────────────────────
const DEFAULT_SECTIONS = ["A", "B", "C", "ME"];
const SUPER_ADMIN_COLLEGE_ID = "2417003";

async function seed() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error("❌ MONGODB_URI not set. Add it to .env.local");
    process.exit(1);
  }

  console.log("🔌 Connecting to MongoDB...");
  await mongoose.connect(uri);
  console.log("✅ Connected\n");

  // ─── 1. Create default sections ─────────────────
  console.log("📂 Creating default sections...");
  for (const name of DEFAULT_SECTIONS) {
    const existing = await Section.findOne({ name: { $regex: new RegExp(`^${name}$`, "i") } });
    if (existing) {
      console.log(`   ✓ Section "${name}" already exists`);
    } else {
      await Section.create({ name });
      console.log(`   + Created section "${name}"`);
    }
  }

  // ─── 2. Set super admin ─────────────────────────
  console.log("\n👑 Setting up super admin (Mr. Techie / Lokesh Paneru)...");
  const superAdmin = await User.findOne({ college_id: SUPER_ADMIN_COLLEGE_ID });
  if (!superAdmin) {
    console.log(`   ⚠ User with college_id "${SUPER_ADMIN_COLLEGE_ID}" not found.`);
    console.log("   → They need to register/be approved first, then re-run this script.");
  } else {
    const updates: Record<string, unknown> = {};

    if (!superAdmin.isSuperAdmin) updates.isSuperAdmin = true;
    if (superAdmin.role !== "admin") updates.role = "admin";
    if (superAdmin.name !== "Lokesh Paneru") updates.name = "Lokesh Paneru";
    if (superAdmin.adminAlias !== "Mr. Techie") updates.adminAlias = "Mr. Techie";
    if (superAdmin.email !== "lokeshpaneru20508@gmail.com") updates.email = "lokeshpaneru20508@gmail.com";

    if (Object.keys(updates).length === 0) {
      console.log(`   ✓ ${superAdmin.name} (aka ${superAdmin.adminAlias}) is already fully configured`);
    } else {
      await User.updateOne({ _id: superAdmin._id }, { $set: updates });
      console.log(`   + Updated super admin:`);
      for (const [key, value] of Object.entries(updates)) {
        console.log(`     • ${key} → ${value}`);
      }
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
