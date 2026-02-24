"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface Stats {
  totalStudents: number;
  totalNotes: number;
  totalAssignments: number;
  totalSubjects: number;
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<Stats>({
    totalStudents: 0,
    totalNotes: 0,
    totalAssignments: 0,
    totalSubjects: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchStats() {
      try {
        const [studentsRes, notesRes, assignmentsRes, subjectsRes] =
          await Promise.all([
            fetch("/api/admin/students"),
            fetch("/api/notes"),
            fetch("/api/assignments"),
            fetch("/api/subjects"),
          ]);

        const studentsData = await studentsRes.json();
        const notesData = await notesRes.json();
        const assignmentsData = await assignmentsRes.json();
        const subjectsData = await subjectsRes.json();

        setStats({
          totalStudents: studentsData.students?.filter(
            (s: { role: string }) => s.role === "student"
          ).length || 0,
          totalNotes: notesData.notes?.length || 0,
          totalAssignments: assignmentsData.assignments?.length || 0,
          totalSubjects: subjectsData.subjects?.length || 0,
        });
      } catch (error) {
        console.error("Failed to fetch stats:", error);
      } finally {
        setLoading(false);
      }
    }
    fetchStats();
  }, []);

  const statCards = [
    {
      title: "Total Students",
      value: stats.totalStudents,
      icon: "👥",
      color: "from-blue-500 to-blue-600",
    },
    {
      title: "Total Notes",
      value: stats.totalNotes,
      icon: "📄",
      color: "from-indigo-500 to-indigo-600",
    },
    {
      title: "Assignments",
      value: stats.totalAssignments,
      icon: "📝",
      color: "from-purple-500 to-purple-600",
    },
    {
      title: "Subjects",
      value: stats.totalSubjects,
      icon: "📚",
      color: "from-pink-500 to-pink-600",
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Admin Dashboard</h1>
        <p className="text-muted-foreground">
          Overview of Section C Hub
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {statCards.map((stat) => (
          <Card key={stat.title} className="rounded-2xl">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center justify-between">
                {stat.title}
                <span className="text-lg">{stat.icon}</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">
                {loading ? (
                  <span className="inline-block h-8 w-16 bg-muted rounded animate-pulse" />
                ) : (
                  stat.value
                )}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Quick Actions */}
      <div>
        <h2 className="text-lg font-semibold mb-4">Quick Actions</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Link href="/admin/add-student">
            <Card className="rounded-2xl cursor-pointer hover:shadow-lg transition-all hover:-translate-y-0.5">
              <CardContent className="p-5 flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-blue-100 dark:bg-blue-900/50 flex items-center justify-center">
                  <svg className="h-5 w-5 text-blue-600 dark:text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                  </svg>
                </div>
                <div>
                  <p className="font-medium text-sm">Add Student</p>
                  <p className="text-xs text-muted-foreground">Register new</p>
                </div>
              </CardContent>
            </Card>
          </Link>

          <Link href="/admin/notes">
            <Card className="rounded-2xl cursor-pointer hover:shadow-lg transition-all hover:-translate-y-0.5">
              <CardContent className="p-5 flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-indigo-100 dark:bg-indigo-900/50 flex items-center justify-center">
                  <svg className="h-5 w-5 text-indigo-600 dark:text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <div>
                  <p className="font-medium text-sm">Notes</p>
                  <p className="text-xs text-muted-foreground">Add & manage</p>
                </div>
              </CardContent>
            </Card>
          </Link>

          <Link href="/admin/assignments">
            <Card className="rounded-2xl cursor-pointer hover:shadow-lg transition-all hover:-translate-y-0.5">
              <CardContent className="p-5 flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-purple-100 dark:bg-purple-900/50 flex items-center justify-center">
                  <svg className="h-5 w-5 text-purple-600 dark:text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                  </svg>
                </div>
                <div>
                  <p className="font-medium text-sm">Assignments</p>
                  <p className="text-xs text-muted-foreground">Add & manage</p>
                </div>
              </CardContent>
            </Card>
          </Link>

          <Link href="/admin/subjects">
            <Card className="rounded-2xl cursor-pointer hover:shadow-lg transition-all hover:-translate-y-0.5">
              <CardContent className="p-5 flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-pink-100 dark:bg-pink-900/50 flex items-center justify-center">
                  <svg className="h-5 w-5 text-pink-600 dark:text-pink-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                  </svg>
                </div>
                <div>
                  <p className="font-medium text-sm">Subjects</p>
                  <p className="text-xs text-muted-foreground">Add & remove</p>
                </div>
              </CardContent>
            </Card>
          </Link>
        </div>
      </div>
    </div>
  );
}
