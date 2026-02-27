import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Apply for Access",
  description: "Request access to Acadex. Fill in your details and get approved to start using the academic resource platform.",
};

export default function ApplyLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
