/**
 * @page UserNotes (/user/dashboard/notes)
 * @description Lists notes with subject/search filters and download links.
 */
"use client";

import { useEffect, useState, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import { ChevronDown } from "lucide-react";
import { NoteCard } from "@/components/note-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { fetchMeCached } from "@/lib/client-auth";
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
  semester?: number;
}

interface SectionItem {
  _id: string;
  name: string;
}

interface Note {
  _id: string;
  title: string;
  file_url: string;
  uploadedAt: string;
  subject: { _id: string; name: string };
  section?: { _id: string; name: string } | null;
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
  const [sections, setSections] = useState<SectionItem[]>([]);
  const [userSectionId, setUserSectionId] = useState<string | null>(null);
  const [userSectionName, setUserSectionName] = useState<string | null>(null);
  const [selectedSection, setSelectedSection] = useState<string>("my-section");
  const [expandedSubjectIds, setExpandedSubjectIds] = useState<Set<string>>(new Set());

  const toggleExpandSubject = (subjectId: string) => {
    setExpandedSubjectIds((prev) => {
      const next = new Set(prev);
      if (next.has(subjectId)) {
        next.delete(subjectId);
      } else {
        next.add(subjectId);
      }
      return next;
    });
  };

  useEffect(() => {
    async function fetchInit() {
      try {
        const mePromise = fetchMeCached();
        const [subjectsRes, sectionsRes] = await Promise.all([
          fetch("/api/subjects"),
          fetch("/api/sections"),
        ]);
        const subjectsData = await subjectsRes.json();
        const meData = await mePromise;
        const sectionsData = sectionsRes.ok ? await sectionsRes.json() : { sections: [] };

        setSections(sectionsData.sections || []);

        // Set user's section
        if (meData.user?.section?.id) {
          setUserSectionId(meData.user.section.id);
          setUserSectionName(meData.user.section.name);
        }

        const allSubjects: Subject[] = subjectsData.subjects || [];

        // Filter subjects by user's semester (super admin gets all subjects from API)
        const userSemester: number | null = meData.user?.semester || null;
        const semesterSubjects = allSubjects.filter((s) => {
          if (userSemester && s.semester && s.semester !== userSemester) return false;
          return true;
        });

        const visibleSubjectIds = new Set(semesterSubjects.map((s) => s._id));
        setStreamSubjectIds(visibleSubjectIds);
        setSubjects(semesterSubjects);
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
        const params = new URLSearchParams();
        if (selectedSubject !== "all") params.set("subject", selectedSubject);

        // Section filter: "my-section" = default (API auto-filters), "all" = all sections, specific ID = that section
        if (selectedSection === "all") {
          params.set("section", "all");
        } else if (selectedSection !== "my-section" && selectedSection) {
          params.set("section", selectedSection);
        }
        // "my-section" → no section param, API defaults to user's section

        const url = params.toString() ? `/api/notes?${params}` : "/api/notes";
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
  }, [selectedSubject, streamSubjectIds, selectedSection]);

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
    const grouped: Record<
      string,
      { subjectId: string; subjectName: string; notes: Note[] }
    > = {};

    for (const note of sortedNotes) {
      const subjectId = note.subject?._id || "unknown";
      const subjectName = note.subject?.name || "Unknown";

      if (!grouped[subjectId]) {
        grouped[subjectId] = { subjectId, subjectName, notes: [] };
      }
      grouped[subjectId].notes.push(note);
    }

    return Object.values(grouped).sort((a, b) =>
      a.subjectName.localeCompare(b.subjectName)
    );
  }, [sortedNotes]);

  // Auto-expand selected subject when a specific subject filter is applied.
  useEffect(() => {
    if (selectedSubject !== "all") {
      setExpandedSubjectIds(new Set([selectedSubject]));
    }
  }, [selectedSubject]);

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
        <div className="flex flex-wrap gap-2 items-center">
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
          <Select value={selectedSection} onValueChange={setSelectedSection}>
            <SelectTrigger className="w-full sm:w-[180px] rounded-xl">
              <SelectValue placeholder="Filter by section" />
            </SelectTrigger>
            <SelectContent className="rounded-xl">
              <SelectItem value="my-section">
                🏫 {userSectionName || "My Section"}
              </SelectItem>
              <SelectItem value="all">All Sections</SelectItem>
              {sections
                .filter((s) => s._id !== userSectionId)
                .map((s) => (
                  <SelectItem key={s._id} value={s._id}>
                    🏫 {s.name}
                  </SelectItem>
                ))}
            </SelectContent>
          </Select>
          {(sortOrder !== "newest" || selectedSubject !== "all" || selectedSection !== "my-section") && (
            <button
              className="text-xs text-primary hover:underline whitespace-nowrap"
              onClick={() => {
                setSortOrder("newest");
                setSelectedSubject("all");
                setSelectedSection("my-section");
              }}
            >
              Reset filters
            </button>
          )}
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
        <div className="space-y-3">
          {groupedNotes.map((group) => {
            const isExpanded =
              selectedSubject === "all"
                ? expandedSubjectIds.has(group.subjectId)
                : group.subjectId === selectedSubject;

            return (
              <Card
                key={group.subjectId}
                className="rounded-2xl overflow-hidden py-0 gap-0"
              >
                <CardHeader className="p-0">
                  <button
                    type="button"
                    className={`w-full flex items-center justify-between gap-3 px-4 py-3 text-left transition-colors duration-150 hover:bg-muted/50 ${
                      selectedSubject !== "all" ? "cursor-default" : "cursor-pointer"
                    }`}
                    onClick={() => {
                      if (selectedSubject !== "all") return;
                      toggleExpandSubject(group.subjectId);
                    }}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="flex-shrink-0 flex items-center justify-center h-6 w-6 rounded-md bg-muted text-xs">
                        📚
                      </span>
                      <CardTitle className="text-sm font-medium truncate">
                        {group.subjectName}
                      </CardTitle>
                      <Badge
                        variant="secondary"
                        className="rounded-full text-xs flex-shrink-0"
                      >
                        {group.notes.length}
                      </Badge>
                    </div>
                    <ChevronDown
                      className={`flex-shrink-0 h-4 w-4 text-muted-foreground transition-transform duration-300 ease-in-out ${
                        isExpanded ? "rotate-180" : ""
                      }`}
                    />
                  </button>
                </CardHeader>

                <div
                  className={`grid transition-all duration-300 ease-in-out ${
                    isExpanded
                      ? "grid-rows-[1fr] opacity-100"
                      : "grid-rows-[0fr] opacity-0"
                  }`}
                >
                  <div className="overflow-hidden">
                    <CardContent className="pt-2 pb-5">
                      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                        {group.notes.map((note) => (
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
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
