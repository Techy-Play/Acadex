"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { NoteCard } from "@/components/note-card";
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

  useEffect(() => {
    async function fetchSubjects() {
      try {
        const res = await fetch("/api/subjects");
        const data = await res.json();
        setSubjects(data.subjects || []);
      } catch (error) {
        console.error("Failed to fetch subjects:", error);
      }
    }
    fetchSubjects();
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
        setNotes(data.notes || []);
      } catch (error) {
        console.error("Failed to fetch notes:", error);
      } finally {
        setLoading(false);
      }
    }
    fetchNotes();
  }, [selectedSubject]);

  // Sort notes
  const sortedNotes = [...notes].sort((a, b) => {
    if (sortOrder === "newest") {
      return new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime();
    }
    return new Date(a.uploadedAt).getTime() - new Date(b.uploadedAt).getTime();
  });

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

      {/* Notes Grid */}
      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="rounded-2xl border p-6 animate-pulse"
            >
              <div className="h-16 bg-muted rounded-xl" />
            </div>
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
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {sortedNotes.map((note) => (
            <NoteCard
              key={note._id}
              title={note.title}
              subjectName={note.subject?.name}
              fileUrl={note.file_url}
              uploadedAt={note.uploadedAt}
            />
          ))}
        </div>
      )}
    </div>
  );
}
