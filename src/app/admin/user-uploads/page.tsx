import { redirect } from "next/navigation";

export default function AdminUserUploadsRedirect() {
  redirect("/admin/user-requests");
}
