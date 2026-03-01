import { redirect } from "next/navigation";

export default function UploadsRedirect() {
  redirect("/user/dashboard/requests");
}
