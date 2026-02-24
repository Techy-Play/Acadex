import { NextResponse } from "next/server";
import bcrypt from "bcrypt";
import { connectDB } from "@/lib/db";
import { addStudentSchema } from "@/lib/validations";
import User from "@/models/User";
import Stream from "@/models/Stream";
import ActivityLog from "@/models/ActivityLog";

// GET /api/admin/students - List all students
export async function GET(request: Request) {
  try {
    const userRole = request.headers.get("x-user-role");
    if (userRole !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    await connectDB();

    // Fetch users first, then manually attach stream data
    // (avoids Mongoose populate issues with model registration timing)
    const users = await User.find()
      .select("-password_hash")
      .sort({ createdAt: -1 })
      .lean();

    // Collect unique stream IDs
    const streamIds = [
      ...new Set(
        users
          .map((u) => u.stream?.toString())
          .filter((id): id is string => !!id)
      ),
    ];

    // Fetch streams in one query if any exist
    let streamMap: Record<string, { _id: string; name: string }> = {};
    if (streamIds.length > 0) {
      const streams = await Stream.find({ _id: { $in: streamIds } })
        .select("_id name")
        .lean();
      for (const s of streams) {
        streamMap[s._id.toString()] = { _id: s._id.toString(), name: s.name };
      }
    }

    // Attach stream object to each user
    const students = users.map((u) => ({
      ...u,
      stream: u.stream ? streamMap[u.stream.toString()] || null : null,
    }));

    return NextResponse.json({ students });
  } catch (error) {
    console.error("List students error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// POST /api/admin/students - Add a new student
export async function POST(request: Request) {
  try {
    const userRole = request.headers.get("x-user-role");
    const adminId = request.headers.get("x-user-id");

    if (userRole !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();

    // Validate input
    const parsed = addStudentSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0].message },
        { status: 400 }
      );
    }

    const { name, college_id, password, role } = parsed.data;
    const stream = body.stream || null;

    await connectDB();

    // Check if college_id already exists
    const existingUser = await User.findOne({ college_id });
    if (existingUser) {
      return NextResponse.json(
        { error: "A user with this college ID already exists" },
        { status: 409 }
      );
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 10);

    // Create user
    const user = await User.create({
      name,
      college_id,
      password_hash: passwordHash,
      role,
      stream,
      must_change_password: true,
    });

    // Log activity
    await ActivityLog.create({
      user: adminId!,
      action: "STUDENT_ADDED",
      details: `Added ${role}: ${name} (${college_id})`,
    });

    return NextResponse.json(
      {
        success: true,
        student: {
          id: user._id,
          name: user.name,
          college_id: user.college_id,
          role: user.role,
          must_change_password: user.must_change_password,
          createdAt: user.createdAt,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Add student error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
