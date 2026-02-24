"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function AddStudentRedirect() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/admin/users");
  }, [router]);

  return (
    <div className="flex items-center justify-center h-64">
      <p className="text-muted-foreground">Redirecting to Manage Users...</p>
    </div>
  );
}
