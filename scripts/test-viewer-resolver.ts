/**
 * Test Script: Document Viewer Resource Resolver & URL Normalizer
 * 
 * Usage:
 *   npx tsx scripts/test-viewer-resolver.ts
 */
import { resolveResource, extractGoogleDriveId, extractExtension } from "../src/lib/resource-resolver";

async function runTests() {
  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, testName: string) {
    if (condition) {
      console.log(`  ✅ PASS: ${testName}`);
      passed++;
    } else {
      console.error(`  ❌ FAIL: ${testName}`);
      failed++;
    }
  }

  console.log("--- 1. Testing Google Drive ID Extraction ---");
  const id1 = extractGoogleDriveId("https://drive.google.com/file/d/1A2B3C4D5E6F7G8H9I0J/view?usp=sharing");
  assert(id1.id === "1A2B3C4D5E6F7G8H9I0J" && id1.kind === "file", "Extracts ID from /file/d/{id}/view");

  const id2 = extractGoogleDriveId("https://drive.google.com/file/d/1A2B3C4D5E6F7G8H9I0J/preview");
  assert(id2.id === "1A2B3C4D5E6F7G8H9I0J" && id2.kind === "file", "Extracts ID from /file/d/{id}/preview");

  const id3 = extractGoogleDriveId("https://drive.google.com/open?id=1A2B3C4D5E6F7G8H9I0J");
  assert(id3.id === "1A2B3C4D5E6F7G8H9I0J" && id3.kind === "file", "Extracts ID from /open?id={id}");

  const id4 = extractGoogleDriveId("https://drive.google.com/uc?id=1A2B3C4D5E6F7G8H9I0J&export=download");
  assert(id4.id === "1A2B3C4D5E6F7G8H9I0J" && id4.kind === "file", "Extracts ID from /uc?id={id}");

  const idDoc = extractGoogleDriveId("https://docs.google.com/document/d/DOC_12345/edit?tab=t.0");
  assert(idDoc.id === "DOC_12345" && idDoc.kind === "document", "Extracts ID from Google Docs URL");

  const idSheet = extractGoogleDriveId("https://docs.google.com/spreadsheets/d/SHEET_12345/edit#gid=0");
  assert(idSheet.id === "SHEET_12345" && idSheet.kind === "spreadsheets", "Extracts ID from Google Sheets URL");

  const idPres = extractGoogleDriveId("https://docs.google.com/presentation/d/SLIDES_12345/edit#slide=id.p");
  assert(idPres.id === "SLIDES_12345" && idPres.kind === "presentation", "Extracts ID from Google Slides URL");

  console.log("\n--- 2. Testing File Extension Extraction ---");
  assert(extractExtension("lecture-1.pdf") === "pdf", "Extracts 'pdf' from filename");
  assert(extractExtension("notes.final.docx") === "docx", "Extracts 'docx' from multi-dot filename");
  assert(extractExtension("diagram.PNG") === "png", "Lowercases 'png'");
  assert(extractExtension("https://example.com/file.pptx?query=1") === "pptx", "Extracts extension ignoring query params");
  assert(extractExtension("no-extension-title") === "", "Returns empty string when no extension");

  console.log("\n--- 3. Testing Resource Classification & Strategy Selection ---");

  // A. Google Drive PDF
  const pdfRes = resolveResource(
    "https://drive.google.com/file/d/DRIVE_PDF_ID/view",
    "Operating Systems Unit 1.pdf"
  );
  assert(pdfRes.category === "pdf", "Google Drive PDF categorized as 'pdf'");
  assert(pdfRes.viewerKind === "adobe_pdf", "Google Drive PDF routes to 'adobe_pdf' viewer");
  assert(pdfRes.previewUrl.includes("/api/pdf-proxy"), "Google Drive PDF uses authenticated /api/pdf-proxy");
  assert(pdfRes.downloadUrl.includes("export=download"), "Google Drive PDF provides direct download URL");
  assert(pdfRes.canEmbed === true, "Google Drive PDF is embeddable");

  // B. Google Drive Word Document (DOCX)
  const docxRes = resolveResource(
    "https://drive.google.com/file/d/DRIVE_DOCX_ID/view",
    "Assignment 2 Questions.docx"
  );
  assert(docxRes.category === "file_download", "Google Drive DOCX categorized as 'file_download'");
  assert(docxRes.viewerKind === "file_download", "Google Drive DOCX routes to 'file_download' card");
  assert(docxRes.downloadUrl.includes("export=download"), "Google Drive DOCX provides direct download URL");
  assert(docxRes.canEmbed === false, "Google Drive DOCX is marked as not embeddable");

  // C. Google Drive PowerPoint Presentation (PPTX)
  const pptxRes = resolveResource(
    "https://drive.google.com/file/d/DRIVE_PPTX_ID/view",
    "Compiler Design Lecture Slides.pptx"
  );
  assert(pptxRes.category === "file_download", "Google Drive PPTX categorized as 'file_download'");
  assert(pptxRes.viewerKind === "file_download", "Google Drive PPTX routes to 'file_download' card");
  assert(pptxRes.downloadUrl.includes("export=download"), "Google Drive PPTX provides direct download URL");

  // D. Google Drive Image
  const imgRes = resolveResource(
    "https://drive.google.com/file/d/DRIVE_IMG_ID/view",
    "Architecture Diagram.png"
  );
  assert(imgRes.category === "image", "Google Drive image categorized as 'image'");
  assert(imgRes.viewerKind === "image", "Google Drive image routes to 'image' viewer");
  assert(imgRes.previewUrl.includes("/api/pdf-proxy"), "Google Drive image proxies through authenticated route");

  // E. Native Google Docs
  const gdocRes = resolveResource(
    "https://docs.google.com/document/d/GDOC_ID/edit",
    "Lab Syllabus"
  );
  assert(gdocRes.category === "google_workspace", "Native Google Doc categorized as 'google_workspace'");
  assert(gdocRes.viewerKind === "google_iframe", "Native Google Doc routes to 'google_iframe'");
  assert(gdocRes.previewUrl === "https://docs.google.com/document/d/GDOC_ID/preview", "Native Google Doc canonical preview URL");

  // F. External Direct PDF
  const extPdfRes = resolveResource(
    "https://arxiv.org/pdf/2301.00001.pdf",
    "Research Paper"
  );
  assert(extPdfRes.category === "pdf", "External PDF categorized as 'pdf'");
  assert(extPdfRes.viewerKind === "adobe_pdf", "External PDF routes to 'adobe_pdf'");

  // G. External Website
  const extSiteRes = resolveResource(
    "https://developer.mozilla.org/en-US/docs/Web/API",
    "MDN Web Docs"
  );
  assert(extSiteRes.category === "external_website", "External website categorized as 'external_website'");
  assert(extSiteRes.viewerKind === "external_card", "External website routes to 'external_card'");
  assert(extSiteRes.downloadUrl === "", "External website has empty downloadUrl (not downloadable)");
  assert(extSiteRes.canEmbed === false, "External website marked as not embedded (safe fallback)");

  // H. Empty URL
  const emptyRes = resolveResource("", "Empty");
  assert(emptyRes.category === "unknown" && emptyRes.viewerKind === "unsupported", "Empty URL safely marked as unknown/unsupported");

  console.log(`\n================================`);
  console.log(`SUMMARY: ${passed} Passed, ${failed} Failed`);
  console.log(`================================`);

  if (failed > 0) {
    process.exit(1);
  }
}

runTests().catch((err) => {
  console.error("Test execution failed:", err);
  process.exit(1);
});
