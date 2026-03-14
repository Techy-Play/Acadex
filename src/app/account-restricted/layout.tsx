import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Account Restricted",
  robots: {
    index: false,
    follow: false,
    googleBot: {
      index: false,
      follow: false,
      "max-image-preview": "none",
      "max-snippet": -1,
    },
  },
};

export default function AccountRestrictedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
