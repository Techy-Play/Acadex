import type { Metadata } from "next";
import { AdobePdfTestClient } from "./adobe-pdf-test-client";

export const metadata: Metadata = {
  title: "Adobe PDF Reader — Test Lab | Acadex",
  description: "Isolated experiment evaluating the Adobe PDF Embed API for Acadex academic platform.",
  robots: {
    index: false,
    follow: false,
  },
};

export default function AdobePdfTestPage() {
  return <AdobePdfTestClient />;
}
