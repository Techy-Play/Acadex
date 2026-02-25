"use client";

import { useEffect, useState, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import { NoteCard } from "@/components/note-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface Subject {
  _id: string;
  name: string;
}

interface Note {
  _id: string;
  title: string;
  file_url: string;
  uploadedAt: string;
  subject: { _id: string; name: string };
}

export default function NotesPage() {
  const searchParams = useSearchParams();
  const initialSubject = searchParams.get("subject") || "all";

  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [notes, setNotes] = useState<Note[]>([]);
  const [selectedSubject, setSelectedSubject] = useState(initialSubject);
  const [sortOrder, setSortOrder] = useState<string>("newest");
  const [loading, setLoading] = useState(true);
  const [streamSubjectIds, setStreamSubjectIds] = useState<Set<string> | null>(null);

  useEffect(() => {
    async function fetchInit() {
      try {
        const [subjectsRes, meRes] = await Promise.all([
          fetch("/api/subjects"),
          fetch("/api/auth/me"),
        ]);
        const subjectsData = await subjectsRes.json();
        const meData = meRes.ok ? await meRes.json() : { user: {} };

        const allSubjects: Subject[] = subjectsData.subjects || [];

        let ssIds: Set<string> | null = null;
        if (meData.user?.stream?.subjects?.length) {
          ssIds = new Set(meData.user.stream.subjects.map((s: { _id: string }) => s._id));
          setStreamSubjectIds(ssIds);
          setSubjects(allSubjects.filter((s) => ssIds!.has(s._id)));
        } else {
          setSubjects(allSubjects);
        }
      } catch (error) {
        console.error("Failed to fetch subjects:", error);
      }
    }
    fetchInit();
  }, []);

  useEffect(() => {
    async function fetchNotes() {
      setLoading(true);
      try {
        const url =
          selectedSubject === "all"
            ? "/api/notes"
            : `/api/notes?subject=${selectedSubject}`;
        const res = await fetch(url);
        const data = await res.json();
        let allNotes: Note[] = data.notes || [];

        if (selectedSubject === "all" && streamSubjectIds) {
          allNotes = allNotes.filter((n) => n.subject && streamSubjectIds.has(n.subject._id));
        }

        setNotes(allNotes);
      } catch (error) {
        console.error("Failed to fetch notes:", error);
      } finally {
        setLoading(false);
      }
    }
    fetchNotes();
  }, [selectedSubject, streamSubjectIds]);

  // Sort notes
  const sortedNotes = useMemo(() => {
    return [...notes].sort((a, b) => {
      switch (sortOrder) {
        case "newest":
          return new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime();
        case "oldest":
          return new Date(a.uploadedAt).getTime() - new Date(b.uploadedAt).getTime();
        case "name-az":
          return a.title.localeCompare(b.title);
        case "name-za":
          return b.title.localeCompare(a.title);
        default:
          return 0;
      }
    });
  }, [notes, sortOrder]);

  // Group notes by subject
  const groupedNotes = useMemo(() => {
    const grouped: Record<string, Note[]> = {};
    for (const note of sortedNotes) {
      const subjectName = note.subject?.name || "Unknown";
      if (!grouped[subjectName]) grouped[subjectName] = [];
      grouped[subjectName].push(note);
    }
    return Object.entries(grouped).sort(([a], [b]) => a.localeCompare(b));
  }, [sortedNotes]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Notes</h1>
          <p className="text-muted-foreground">
            Browse subject-wise study materials
          </p>
        </div>
        <div className="flex gap-2">
          <Select value={sortOrder} onValueChange={setSortOrder}>
            <SelectTrigger className="w-full sm:w-[160px] rounded-xl">
              <SelectValue placeholder="Sort by" />
            </SelectTrigger>
            <SelectContent className="rounded-xl">
              <SelectItem value="newest">Newest first</SelectItem>
              <SelectItem value="oldest">Oldest first</SelectItem>
              <SelectItem value="name-az">Name A-Z</SelectItem>
              <SelectItem value="name-za">Name Z-A</SelectItem>
            </SelectContent>
          </Select>
          <Select value={selectedSubject} onValueChange={setSelectedSubject}>
            <SelectTrigger className="w-full sm:w-[180px] rounded-xl">
              <SelectValue placeholder="Filter by subject" />
            </SelectTrigger>
            <SelectContent className="rounded-xl">
              <SelectItem value="all">All Subjects</SelectItem>
              {subjects.map((s) => (
                <SelectItem key={s._id} value={s._id}>
                  {s.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Notes Grouped by Subject */}
      {loading ? (
        <div className="space-y-6">
          {[1, 2].map((i) => (
            <Card key={i} className="rounded-2xl animate-pulse">
              <CardHeader className="pb-3">
                <div className="h-5 w-40 bg-muted rounded-lg" />
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {[1, 2, 3].map((j) => (
                    <div key={j} className="h-24 bg-muted rounded-xl" />
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : notes.length === 0 ? (
        <div className="text-center py-12">
          <div className="mx-auto h-16 w-16 rounded-2xl bg-muted flex items-center justify-center text-2xl mb-4">
            📄
          </div>
          <h3 className="font-semibold text-lg">No notes available</h3>
          <p className="text-sm text-muted-foreground mt-1">
            Notes will appear here once they are added by admin.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {groupedNotes.map(([subjectName, subjectNotes]) => (
            <Card key={subjectName} className="rounded-2xl">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base font-semibold flex items-center gap-2">
                    📚 {subjectName}
                    <Badge variant="secondary" className="rounded-full text-xs">
                      {subjectNotes.length}
                    </Badge>
                  </CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {subjectNotes.map((note) => (
                    <NoteCard
                      key={note._id}
                      title={note.title}
                      subjectName={note.subject?.name}
                      fileUrl={note.file_url}
                      uploadedAt={note.uploadedAt}
                    />
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
