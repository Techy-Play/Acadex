# Acadex — Centralized Academic Resource & Workflow Platform

> **An open-source, full-stack academic resource management and assignment workflow ecosystem built with Next.js 16 (App Router), TypeScript, Tailwind CSS v4, MongoDB, Google Drive Cloud Storage, Web Push (VAPID), and Trusted Web Activity (TWA) support.**

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Product Vision & Motivation](#2-product-vision--motivation)
3. [Problem Statement](#3-problem-statement)
4. [The Acadex Solution](#4-the-acadex-solution)
5. [System Architecture](#5-system-architecture)
6. [Technology Stack & Dependency Audit](#6-technology-stack--dependency-audit)
7. [Comprehensive Feature Inventory](#7-comprehensive-feature-inventory)
8. [Database Architecture & Data Models](#8-database-architecture--data-models)
9. [Authentication, Sessions & Password Security](#9-authentication-sessions--password-security)
10. [Security Controls & Hardening](#10-security-controls--hardening)
11. [Web Push Notifications & Service Worker Architecture](#11-web-push-notifications--service-worker-architecture)
12. [Cloud Storage & Google Drive Hierarchy](#12-cloud-storage--google-drive-hierarchy)
13. [API Reference & Route Documentation](#13-api-reference--route-documentation)
14. [User Flows & Use Cases](#14-user-flows--use-cases)
15. [Project Structure](#15-project-structure)
16. [End-to-End Data Flows](#16-end-to-end-data-flows)
17. [UI/UX Design Philosophy & Customization](#17-uiux-design-philosophy--customization)
18. [Performance Optimizations](#18-performance-optimizations)
19. [Error Handling & Fault Tolerance](#19-error-handling--fault-tolerance)
20. [Local Development & Setup Guide](#20-local-development--setup-guide)
21. [Deployment & Infrastructure](#21-deployment--infrastructure)
22. [Testing & Quality Assurance](#22-testing--quality-assurance)
23. [Current Limitations & Known Technical Debt](#23-current-limitations--known-technical-debt)
24. [Future Scope & Planned Enhancements](#24-future-scope--planned-enhancements)
25. [Development Story & Engineering Milestones](#25-development-story--engineering-milestones)
26. [Viva & Technical Examination Preparation (Q&A Bank)](#26-viva--technical-examination-preparation-qa-bank)

---

## 1. Executive Summary

**Acadex** is a centralized, secure, multi-tenant academic resource management platform engineered to resolve the fragmentation and inefficiency of student learning workflows. Built specifically for universities, colleges, and academic departments, Acadex consolidates course syllabi, lecture notes, lab manuals, assignments, and submission deadlines into a single, cohesive digital workspace.

By leveraging modern web capabilities—including **Next.js 16 App Router**, **MongoDB Mongoose**, **Google Drive API (5 TB hierarchical storage)**, **VAPID-based Web Push Notifications**, **HTTP-only JWT sessions**, and **PWA/TWA Android integration**—Acadex provides instantaneous, cross-device access to learning materials. It empowers students with personalized assignment completion tracking, real-time deadline push alerts, and community resource submissions, while providing faculty and administrators with granular moderation queues, student roster management, and institutional audit logging.

```
+-------------------------------------------------------------------------+
|                                ACADEX                                   |
|   Centralized Academic Hub • Assignment Tracking • Real-time Web Push   |
|   Google Drive Hierarchical Cloud • Granular Role-Based Access Control  |
+-------------------------------------------------------------------------+
```

---

## 2. Product Vision & Motivation

### What is Acadex?
Acadex is not merely a file repository; it is an **academic workflow engine**. It bridges the gap between passive resource sharing (downloading PDFs) and active academic execution (tracking assignments, submitting practicals, receiving deadline push alerts, and moderating peer-contributed notes).

### Why was Acadex Created?
In typical university environments, academic content is scattered across disparate channels:
* Unofficial WhatsApp/Telegram groups where links and PDF files expire, get buried, or get lost.
* Personal Google Drive folders with broken permissions and disorganized folders.
* Physical notice boards or verbal announcements in lecture halls.
* Complex, heavy, and outdated Learning Management Systems (LMS) that students avoid due to cumbersome interfaces.

Acadex replaces this chaotic workflow with a clean, high-performance, mobile-first web and Android application tailored precisely to the academic structure of university departments (Streams &rarr; Semesters &rarr; Sections &rarr; Subjects).

---

## 3. Problem Statement

### A. The Student Perspective
1. **Resource Fragmentation:** Students waste valuable study time locating lecture notes, past exam papers, and lab manuals scattered across multiple WhatsApp chats and drive links.
2. **Missed Deadlines:** Assignment deadlines and lab submission dates are frequently missed due to a lack of automated, personalized reminders.
3. **Progress Ambiguity:** Students lack a clear, personal dashboard to visualize which assignments or practicals they have finished and which remain pending.
4. **Device Inconvenience:** Many institutional portals are desktop-only and broken on mobile browsers.

### B. The Faculty & Administrator Perspective
1. **Repetitive Resource Distribution:** Teachers repeatedly re-share the same PDFs and syllabus documents every semester.
2. **Roster & Section Chaos:** Managing student accounts, handling section changes, and verifying student enrollment without a dedicated system causes administrative bottlenecks.
3. **Moderation Overhead:** Unverified or outdated study materials circulate among students without quality checks or moderation controls.
4. **Announcement Noise:** Important academic notices get lost in informal chat groups.

### C. The Institutional Perspective
1. **Lack of Institutional Memory:** High-quality student-created notes and practical solutions are lost when senior batches graduate.
2. **Infrastructure Cost:** Hosting gigabytes of student documents directly on web servers is expensive and unscalable.
3. **Accountability & Security:** No audit trail exists for who uploaded what, who approved requests, or when notices were published.

---

## 4. The Acadex Solution

Acadex systematically resolves each of these challenges through purpose-built technical features:

| Academic Problem | Legacy Approach | Acadex Technical Solution |
|---|---|---|
| **Scattered Materials** | WhatsApp chats, Discord, loose Drive links | **Hierarchical Course Library:** Stream &rarr; Semester (1–8) &rarr; Subject &rarr; Resource Type (Notes/Assignments/Practicals). |
| **Missed Assignment Deadlines** | Handwritten diaries, verbal announcements | **Automated Cron Reminders + Web Push:** Background GitHub Actions cron executes every 15 minutes triggering VAPID push alerts to user devices. |
| **Lack of Progress Tracking** | Mental checkmarks, spreadsheets | **Personalized Completion Engine:** `Completion` and `PracticalCompletion` models allow 1-click toggling with real-time progress calculations. |
| **Unmoderated File Sharing** | Uncontrolled group uploads | **Multi-Tier Moderation Queue:** `UserUpload` pipeline requiring Section/Stream Admin verification before public library indexing. |
| **Storage Limitations & Cost** | Local server disks, paid file buckets | **Google Drive Cloud Integration:** Direct chunked streaming to Google Drive with automated subfolder resolution. |
| **Access Control & Security** | Public links, plain passwords | **Role-Based Access Control (RBAC):** HTTP-only JWTs, bcrypt password hashing, and Section/Stream isolation via Edge middleware. |
| **Device Incompatibility** | Desktop-only portals | **Progressive Web App (PWA) & TWA:** Offline-capable service worker, standalone Android app (`com.au_acadex.twa`), and adaptive mobile nav. |

---

## 5. System Architecture

Acadex follows a modern **Decoupled Serverless / Edge Architecture** deployed on Vercel with MongoDB Atlas for persistent metadata, Google Drive for binary blob storage, and the VAPID Web Push protocol for real-time notification delivery.

### High-Level System Architecture Diagram

```
+-------------------------------------------------------------------------------+
|                                CLIENT LAYER                                   |
|   Desktop Browser / Mobile Browser (PWA) / Android Application (TWA APK)      |
|   [Service Worker (sw.js) • Local Storage • Install Banner • Theme Engine]    |
+---------------------------------------+---------------------------------------+
                                        | HTTPS / Secure Cookies
                                        v
+-------------------------------------------------------------------------------+
|                       EDGE ROUTING & SECURITY LAYER                           |
|   Next.js Edge Middleware (src/proxy.ts)                                      |
|   ├── JWT Verification (jose) & Cookie Extraction (acadex-token)              |
|   ├── Role-Based Access Enforcement (/admin vs /user/dashboard)               |
|   ├── Password-Change Enforcement Gate                                        |
|   └── Header Injection: x-user-id, x-user-role, x-user-section, x-user-stream |
+---------------------------------------+---------------------------------------+
                                        | Internal Request Dispatch
                                        v
+-------------------------------------------------------------------------------+
|                          APPLICATION BACKEND (Next.js)                        |
|                                                                               |
|   Frontend (React 19 / Server & Client Components / Tailwind v4)              |
|   ├── Student Dashboard (/user/dashboard/*)                                   |
|   ├── Admin Management Portal (/admin/*)                                      |
|   └── Public Pages (Landing, Login, Apply, About, Privacy, Contact)           |
|                                                                               |
|   API Route Handlers (src/app/api/*)                                          |
|   ├── /api/auth/*          ──> Authentication, bcrypt, OTP generation         |
|   ├── /api/notes/*         ──> Note indexing, filtering, search               |
|   ├── /api/assignments/*   ──> Assignment publishing, deadline tracking       |
|   ├── /api/completions/*   ──> User assignment completion state               |
|   ├── /api/practicals/*    ──> Lab manual & experiment management             |
|   ├── /api/upload/*        ──> Chunked streaming to Google Drive              |
|   ├── /api/push/*          ──> VAPID Web Push subscription broker             |
|   ├── /api/admin/*         ──> Access approval, user roster, activity logs    |
|   └── /api/jobs/*          ──> Deadline cron alerts & temp file cleanup       |
+-------------------+-------------------+-------------------+-------------------+
                    |                   |                   |
                    v                   v                   v
+-----------------------+ +-----------------------+ +-----------------------+
|    DATABASE LAYER     | |    STORAGE LAYER      | |  COMMUNICATION LAYER  |
|     MongoDB Atlas     | |   Google Drive API    | |   Resend / Web Push   |
| (Mongoose Connection  | | (Hierarchical Folders | | (Transactional Emails |
|  Cache for Serverless)| |  Stream/Sem/Subject)  | |  & VAPID Push Relays) |
+-----------------------+ +-----------------------+ +-----------------------+
```

---

## 6. Technology Stack & Dependency Audit

The table below documents every core technology and npm package used in Acadex, its execution environment, and why it was selected.

| Technology / Package | Category | Execution Scope | Purpose & Architectural Rationale |
|---|---|---|---|
| **Next.js 16.1.6** | Web Framework | Hybrid (Server & Client) | React framework utilizing App Router, Server Components, Turbopack builds, and Edge API route handlers. |
| **React 19.2.3 / React DOM** | UI Library | Client & Server | Core rendering engine for component trees, hooks, and suspense boundaries. |
| **TypeScript 5** | Language | Build Time | Ensures end-to-end type safety across API responses, Mongoose schemas, and UI props. |
| **Tailwind CSS v4** | Styling | Client / Build | Utility-first CSS framework delivering ultra-fast styles with native CSS variable color theming. |
| **MongoDB / Mongoose 9.2.2** | Database ODM | Server-Side Only | Schema definition, validation, indexing, and connection caching (`global.mongooseCache`) for serverless environments. |
| **jsonwebtoken (9.0.3)** | Authentication | Server API Routes | Signs and verifies 7-day TTL JWT tokens in Node.js serverless route handlers. |
| **jose** | Authentication | Edge Middleware | Lightweight, Web-Standards-compliant JWT verifier used in `src/proxy.ts` Edge runtime where Node `crypto` is unavailable. |
| **bcryptjs (3.0.3)** | Password Hashing | Server-Side Only | One-way password hashing with automatic salt generation; ensures zero plaintext credentials in DB. |
| **googleapis (174.0.1)** | Cloud Storage | Server-Side Only | Connects to Google Drive API via OAuth2 Refresh Token / Service Account for 5 TB hierarchical file storage. |
| **web-push (3.6.7)** | Push Notifications | Server-Side Only | Implements VAPID protocol to sign and deliver push notification payloads to browser push endpoints. |
| **resend (6.18.1)** | Transactional Email | Server-Side Only | Dispatches HTML emails for OTP verification, access request approvals, and contact inquiries. |
| **zod (4.3.6)** | Input Validation | Hybrid | Strict schema validation for login requests, profile updates, and file metadata before DB persistence. |
| **lucide-react (0.575.0)** | Iconography | Client-Side | Scalable, clean SVG iconography used across the student dashboard and admin panels. |
| **motion (12.34.3)** | UI Animations | Client-Side | Smooth layout transitions, modal animations, and card hover effects. |
| **next-themes (0.4.6)** | Theme Management | Client-Side | Manages light/dark/system theme states with zero layout shift and local storage persistence. |
| **sonner (2.0.7)** | Toast Notifications | Client-Side | High-performance, accessible toast alert notification system for user feedback. |
| **pdfjs-dist (3.11.174)** | PDF Processing | Server / Client | Renders PDF previews and extracts metadata inside the `/user/dashboard/viewer` route. |
| **uuid (13.0.0)** | Utilities | Server-Side Only | Generates unique upload session IDs and tracking tokens. |

---

## 7. Comprehensive Feature Inventory

### A. Student Features
* **Custom Academic Dashboard:** Displays current semester subjects, recent notes, active assignments, lab practicals, and upcoming submission deadlines in one view.
* **Assignment Completion Tracker:** Students can mark assignments as completed with 1 click; status is saved to `Completion` collection and updates progress bars.
* **Practical Lab Tracker:** Tracks written experiments and lab manual progress via `PracticalCompletion` records.
* **Resource Library Browser:** Filter study notes, PPTs, question banks, and reference books by Subject, Semester, and Section.
* **In-App PDF Viewer:** Embedded PDF reader (`/user/dashboard/viewer`) allowing students to study without leaving the platform.
* **Student Upload Submission:** Students can upload notes or assignments (`/user/dashboard/uploads`); submissions enter an admin review queue.
* **Personal Profile & Preferences:**
  * 9 Color Accent Themes (AMOLED, Rose, Ocean, Emerald, Violet, Sunset, Pastel, Contrast, Default).
  * Dark / Light / System Mode toggle.
  * Mobile Navigation Bar position customization (Bottom, Top, Left).
  * Dashboard Layout view options (Grid, List, Detail).
  * Profile Picture cropping and uploading (with Google Drive backing).
* **Notification Opt-In Preferences:** Granular per-user toggles for New Notes, New Assignments, Practicals, Deadline Reminders, and Admin Announcements.

### B. Faculty & Administrator Features
* **Admin Overview Dashboard:** Institutional metrics showing total active students, total notes, pending access requests, and unapproved uploads.
* **Access Request Approval Portal:** Review student registration applications with 1-click Approve (creates user account & sends auto-login email) or Deny (sends reason email).
* **Academic Content Publishing:** Direct publishing tools for Notes, Assignments, Practicals, and Subjects with file attachment streaming to Google Drive.
* **Student Roster Management:** View, search, filter, edit, ban, suspend, or reset passwords for students across Sections and Streams.
* **Upload Moderation Panel:** Review peer-uploaded study notes with preview, approve to publish globally, or deny with feedback notes.
* **System Broadcast Dispatcher:** Send instant web push notifications and in-app alerts to specific Sections, Streams, or all students.
* **Security Activity Audit Log:** Real-time log table of administrative operations, logins, password changes, and resource deletions.

### C. Authentication & Access Features
* **College ID Primary Login:** Clean authentication using Roll Number / College ID + Password.
* **Password Reset with Email OTP:** Self-service password recovery using 6-digit cryptographic OTPs dispatched via Resend.
* **Mandatory First-Time Password Change:** Force flag (`must_change_password`) that routes temporary-credential users to `/change-password` before granting dashboard access.
* **Access Application Portal (`/apply`):** Prospective students submit enrollment details without needing an existing account.

---

## 8. Database Architecture & Data Models

Acadex uses **MongoDB Atlas** managed through **Mongoose 9 schemas** with sparse indexes, compound indexes, and relational references.

### Relational Entity-Relationship Diagram

```
       +-------------------+          +-------------------+
       |      Stream       | 1      N |      Section      |
       |  (e.g., BCA, CSE) +--------->+ (e.g., Sec A, B)  |
       +---------+---------+          +---------+---------+
                 | 1                            | 1
                 |                              |
                 | N                            | N
                 v                              v
       +---------+---------+          +---------+---------+
       |      Subject      |          |       User        |
       | (Code, Semester)  |          | (Student / Admin) |
       +---+-----+-----+---+          +---+-----+-----+---+
           |     |     |                  |     |     |
         1 |   1 |   1 |                1 |   1 |   1 |
           v     v     v                  v     v     v
       +---+--+ +--+--+ +--+----+   +-----+--+ +--+--+ +-----+----+
       | Note | |Asgn | |Prac-  |   |Comple- | |Push | | Activity |
       |      | |ment | |tical  |   |tion    | |Sub  | | Log      |
       +------+ +-----+ +-------+   +--------+ +-----+ +----------+
```

### Complete Data Model Inventory

1. **`User` (`src/models/User.ts`):** Stores user identity (`name`, `college_id`, `email`, `password_hash`), role (`student`, `admin`, `isSuperAdmin`), academic placement (`stream`, `section`, `semester`), UI preferences (`theme`, `accentColor`, `mobileNavPosition`, `dashboardView`), notification flags (`notificationPreferences`), and account status (`active`, `banned`, `suspended`).
2. **`AccessRequest` (`src/models/AccessRequest.ts`):** Stores student enrollment applications (`name`, `college_id`, `email`, `stream`, `section`, `semester`, `reason`, `status`, `admin_note`).
3. **`Stream` (`src/models/Stream.ts`):** Academic branches (e.g., BCA, B.Tech CSE).
4. **`Section` (`src/models/Section.ts`):** Class subdivisions linked to a Stream and Semester.
5. **`Subject` (`src/models/Subject.ts`):** Course subjects linked to Stream and Semester.
6. **`Note` (`src/models/Note.ts`):** Academic notes with Google Drive URL, subject, stream, semester, section, and uploader ID.
7. **`Assignment` (`src/models/Assignment.ts`):** Assignment briefs with submission deadline date, file URL, subject, and section.
8. **`Completion` (`src/models/Completion.ts`):** Tracks individual student completion of assignments (`user` &harr; `assignment` unique compound index).
9. **`Practical` (`src/models/Practical.ts`):** Lab experiment guides, code files, and manuals.
10. **`PracticalCompletion` (`src/models/PracticalCompletion.ts`):** Tracks practical experiment completion per student.
11. **`LibraryResource` (`src/models/LibraryResource.ts`):** Reference textbooks, syllabi, and question papers.
12. **`UserUpload` (`src/models/UserUpload.ts`):** Peer-submitted study resources pending admin moderation.
13. **`UserRequest` (`src/models/UserRequest.ts`):** Student requests for missing notes, section changes, or syllabus updates.
14. **`AdminRequest` (`src/models/AdminRequest.ts`):** Inter-admin workflow requests.
15. **`Notification` (`src/models/Notification.ts`):** In-app notification records with target user arrays and `readBy` user ID tracking.
16. **`PushSubscription` (`src/models/PushSubscription.ts`):** Browser Web Push endpoints, P256DH keys, and Auth secrets per user.
17. **`ActivityLog` (`src/models/ActivityLog.ts`):** Audit trail of admin actions, logins, and moderation decisions.
18. **`ContactMessage` (`src/models/ContactMessage.ts`):** Visitor messages from `/contact` with admin reply tracking.
19. **`OTP` (`src/models/OTP.ts`):** 6-digit verification codes with TTL expiration indexes.
20. **`DeadlineReminderLog` (`src/models/DeadlineReminderLog.ts`):** Deduplication log preventing duplicate cron push alerts for the same deadline.

---

## 9. Authentication, Sessions & Password Security

### A. Password Storage & bcrypt Hashing
Acadex adheres to strict cryptographic standards:
* **Raw Passwords are NEVER Stored:** When a user registers or resets their password, the plaintext password is processed by `bcryptjs` with auto-generated salts.
* **One-Way Mathematical Transformation:** The stored `password_hash` cannot be decrypted or converted back into plaintext by developers, database administrators, or attackers.
* **Verification:** During login, `bcrypt.compare(inputPassword, user.password_hash)` evaluates the hash without revealing the secret.

### B. Session Architecture & HTTP-Only JWT Cookies
* **Stateless JWT Tokens:** On successful login, the server generates a signed JSON Web Token using `jsonwebtoken` with `JWT_SECRET`.
* **Payload Structure:**
  ```json
  {
    "userId": "66b1...",
    "collegeId": "BCA2401",
    "role": "student",
    "name": "Alex Smith",
    "section": "66b2...",
    "semester": 4,
    "exp": 1724000000
  }
  ```
* **Storage in `acadex-token` Cookie:**
  * `httpOnly: true` &rarr; Inaccessible to client-side JavaScript (prevents Cross-Site Scripting / XSS token theft).
  * `secure: true` (in production) &rarr; Transmitted exclusively over encrypted HTTPS.
  * `sameSite: "lax"` &rarr; Protects against Cross-Site Request Forgery (CSRF).
  * `maxAge: 604800` (7 Days) &rarr; Automatic session expiration.

### C. Edge Middleware Enforcement (`src/proxy.ts`)
Before any request reaches a Next.js page or API route, the Edge Middleware validates the session:
1. Reads `acadex-token` cookie.
2. Verifies signature using `jose` (`jwtVerify`).
3. If token is invalid or missing on protected routes (`/user/dashboard/*`, `/admin/*`), immediately redirects to `/login` (or returns 401 for `/api/*`).
4. If role is not `admin` on `/admin/*`, blocks access with 403 Forbidden.
5. Injects verified user context into request headers (`x-user-id`, `x-user-role`, `x-user-section`) for zero-overhead downstream consumption.

---

## 10. Security Controls & Hardening

Acadex implements defense-in-depth across the entire application stack:

```
+-------------------------------------------------------------------------+
|                        ACADEX SECURITY MATRIX                           |
+----------------------+--------------------+-----------------------------+
| Threat Category      | Attack Vector      | Acadex Defense Mechanism    |
+----------------------+--------------------+-----------------------------+
| Session Hijacking    | XSS Cookie Theft   | HTTP-Only, SameSite Cookies |
| Credential Leakage   | DB Dump Exposure   | bcrypt One-Way Salted Hash  |
| Privilege Escalation | Tampered Role API  | Edge Middleware RBAC Checks |
| Injection Attacks    | Malicious Form Data| Zod Schema + Mongoose Types |
| Clickjacking         | Iframe Embedding   | X-Frame-Options: SAMEORIGIN |
| MIME Sniffing        | Executable Uploads | X-Content-Type-Options      |
| MITM Eavesdropping   | HTTP Downgrades    | Strict-Transport-Security   |
| Spam & Vandalism     | Unapproved Uploads | Admin Moderation Queue      |
| Unauthorized Crons   | Public Job Calls   | CRON_SECRET Bearer Token    |
+----------------------+--------------------+-----------------------------+
```

### HTTP Security Headers (Configured in `next.config.ts`)
* `Strict-Transport-Security: max-age=63072000; includeSubDomains; preload`
* `X-Content-Type-Options: nosniff`
* `X-Frame-Options: SAMEORIGIN`
* `Referrer-Policy: strict-origin-when-cross-origin`
* `Permissions-Policy: camera=(), microphone=(), geolocation=(), interest-cohort=()`

---

## 11. Web Push Notifications & Service Worker Architecture

Acadex features an integrated **Web Push & Service Worker System** compliant with the W3C Push API and VAPID standards.

### End-to-End Push Delivery Flow

```
1. Student Browser             2. Acadex Server             3. Push Service (FCM/Apple)
       |                              |                                  |
       |── GET /api/push/public-key ─>|                                  |
       |<─ Returns VAPID Public Key ──|                                  |
       |                              |                                  |
       |── pushManager.subscribe() ──>|                                  |
       |── POST /api/push/subscribe ─>| (Saves endpoint & keys in DB)    |
       |                              |                                  |
       |                        [EVENT OCCURS]                           |
       |                  (e.g., Assignment Posted)                      |
       |                              |                                  |
       |                              |── webpush.sendNotification() ───>|
       |                              |   (Signed with VAPID Private Key)|
       |                                                                 |
       |<────────────────── OS Push Event Dispatched ────────────────────|
       v
4. Service Worker (public/sw.js)
       |── Displays Native OS Notification: self.registration.showNotification()
       |── Broadcasts to Active Tabs: client.postMessage({ type: "NEW_NOTIFICATION" })
       v
5. Dashboard Layout (src/components/dashboard-layout.tsx)
       └── Dynamically increments unread badge & refreshes notifications without page reload!
```

### Key VAPID Configuration Details
* **`VAPID_PUBLIC_KEY`**: Exposed to the browser via `GET /api/push/public-key` for client-side subscription negotiation.
* **`VAPID_PRIVATE_KEY`**: **Strictly server-side.** Used by `web-push` to sign push payload tokens. Never exposed to clients.
* **`VAPID_EMAIL`**: Contact identifier required by push relays (e.g., `mailto:admin@au-acadex.com`).

---

## 12. Cloud Storage & Google Drive Hierarchy

Acadex routes all binary files (PDFs, PPTs, DOCX, Images) to a **5 TB Google Drive Cloud Repository** via `src/lib/gdrive.ts`.

### Automated Subfolder Hierarchy Resolution
When a file is uploaded, Acadex dynamically traverses and creates the required folder structure in Google Drive:

```
[Google Drive Root Folder]
   └── [Stream: BCA]
         └── [Semester 4]
               └── [Subject: Database Management Systems]
                     ├── Notes/
                     ├── Assignments/
                     └── Practicals/
```

### Upload Reliability
* **Chunked Streaming (`/api/upload/chunk`):** Supports large file transfers by breaking uploads into manageable chunks to prevent serverless timeout limits.
* **Duplicate Detection (`/api/upload/check-duplicate`):** Checks existing file hashes/names before uploading to conserve storage space.

---

## 13. API Reference & Route Documentation

### Core Authentication & User APIs
* `POST /api/auth/login` — Authenticate via College ID + Password; sets `acadex-token` cookie.
* `POST /api/auth/logout` — Clears `acadex-token` cookie.
* `GET /api/auth/me` — Fetches current authenticated user session data.
* `POST /api/auth/forgot-password` — Initiates password reset by sending 6-digit OTP to email.
* `POST /api/auth/verify-otp` — Verifies OTP and updates user password.
* `POST /api/auth/change-password` — Authenticated password update endpoint.

### Academic Resource APIs
* `GET /api/notes` — Fetch study notes (filtered by subject, semester, section).
* `POST /api/notes` — Create new study note (Admin / Approved upload).
* `GET /api/assignments` — Fetch assignments with deadline information.
* `POST /api/assignments` — Create new assignment (Admin only).
* `GET /api/practicals` — Fetch lab practicals and experiment manuals.
* `GET /api/library` — Access textbooks, syllabi, and reference materials.

### Completion & Progress APIs
* `GET /api/completions` — Returns list of completed assignment IDs for authenticated user.
* `POST /api/completions` — Toggle assignment completion state (`{ assignmentId }`).
* `GET /api/practical-completions` — Returns list of completed practical experiment IDs.
* `POST /api/practical-completions` — Toggle practical completion state (`{ practicalId }`).

### Push & Notification APIs
* `GET /api/push/public-key` — Returns public VAPID key.
* `POST /api/push/subscribe` — Stores push subscription endpoint and cryptographic keys.
* `GET /api/notifications` — Returns in-app notifications and unread count.
* `POST /api/notifications/[id]/read` — Marks notification as read.

### Scheduled Background Jobs
* `GET /api/jobs/deadline-reminders` — Evaluates upcoming assignment deadlines and sends push notifications to enrolled students. Protected by `Bearer <CRON_SECRET>` or `x-cron-secret`.

---

## 14. User Flows & Use Cases

### Use Case 1: Student Checks & Completes Assignment
1. Student navigates to `/login` and enters College ID + Password.
2. Edge middleware validates credentials and routes to `/user/dashboard`.
3. Student clicks **Assignments** in the navigation bar.
4. Dashboard loads assignments filtered to the student's Stream and Semester.
5. Student reviews assignment instructions, downloads attached PDF note from Google Drive.
6. Student completes the work and clicks the **Mark Complete** checkmark.
7. `POST /api/completions` records the completion in MongoDB; UI progress bar increments immediately.

### Use Case 2: Student Submits Note & Admin Moderates
1. Student navigates to `/user/dashboard/uploads` and selects **Upload New Note**.
2. Selects Subject, Semester, Title, and attaches PDF.
3. System uploads file to Google Drive and creates `UserUpload` record with status `pending`.
4. Section Admin receives real-time Web Push notification: *"New study material submitted for review"*.
5. Admin opens `/admin/user-uploads`, reviews the PDF preview, and clicks **Approve**.
6. The note is indexed into the public `Note` library; a Web Push alert is automatically broadcast to all students in that Section.

---

## 15. Project Structure

```
Acadex/
├── .github/
│   └── workflows/
│       └── deadline-reminders.yml    # GitHub Actions 15-minute cron job
├── public/
│   ├── .well-known/
│   │   └── assetlinks.json          # Android TWA digital asset link verification
│   ├── images/                      # Optimized PWA icons (192x192, 512x512)
│   ├── manifest.json                # PWA manifest (standalone mode, theme color)
│   ├── robots.txt                   # Search crawler directives
│   └── sw.js                        # Service Worker (Push events & client sync)
├── src/
│   ├── app/
│   │   ├── (public)/                # Landing (/), About (/about), Contact (/contact), Apply (/apply)
│   │   ├── about/privacy/           # Audited Plain-English Privacy Policy (/about/privacy)
│   │   ├── admin/                   # Admin portal (Users, Requests, Streams, Uploads)
│   │   ├── api/                     # 21 Serverless API Route domains
│   │   ├── login/                   # Student & Admin authentication portal
│   │   ├── user/dashboard/          # Student workspace (Notes, Assignments, Practicals)
│   │   ├── layout.tsx               # Root layout (Theme provider, Install banner)
│   │   └── not-found.tsx            # 404 page
│   ├── components/
│   │   ├── ui/                      # Radix UI primitives & styled components
│   │   ├── bottom-nav.tsx           # Adaptive mobile bottom navigation bar
│   │   ├── dashboard-layout.tsx     # Authenticated layout with live notification badge listener
│   │   ├── install-banner.tsx       # PWA smart installation prompt banner
│   │   ├── navbar.tsx               # Desktop header & user menu
│   │   ├── sidebar.tsx              # Desktop collapsible sidebar navigation
│   │   └── theme-toggle.tsx         # 9-theme palette switcher
│   ├── context/
│   │   └── user-context.tsx         # Global client-side user state provider
│   ├── lib/
│   │   ├── auth.ts                  # Node.js JWT signing & cookie helpers
│   │   ├── client-auth.ts           # Client-side user cache & profile fetcher
│   │   ├── db.ts                    # Mongoose connection manager with cache
│   │   ├── gdrive.ts                # Google Drive API 5TB hierarchical storage
│   │   ├── mail.ts                  # Resend email templates & dispatcher
│   │   ├── push/                    # Web Push VAPID configuration & send helpers
│   │   └── validations.ts           # Zod schemas for request validation
│   ├── models/                      # 20 Mongoose Data Models
│   └── proxy.ts                     # Edge Middleware (JWT verification & RBAC)
├── next.config.ts                   # Turbopack, headers, and image configuration
├── package.json                     # Dependency manifests & npm scripts
├── tsconfig.json                    # TypeScript compiler configuration
└── vercel.json                      # Vercel deployment configuration
```

---

## 16. End-to-End Data Flows

### Student Login Flow
```
User (Browser) ──> [POST /api/auth/login]
                         │
                         ├──> Zod Input Validation
                         ├──> MongoDB: Find User by college_id
                         ├──> bcrypt.compare(password, password_hash)
                         │       │ (Invalid ──> Return 401)
                         │       v (Valid)
                         ├──> ActivityLog.create("LOGIN")
                         ├──> jwt.sign(payload, JWT_SECRET, { expiresIn: "7d" })
                         └──> Response: Set-Cookie: acadex-token (HttpOnly, Secure)
```

---

## 17. UI/UX Design Philosophy & Customization

1. **Function-Driven Design:** Clean, distraction-free interface prioritizing quick access to academic materials with zero unnecessary fluff.
2. **Mobile-First Responsive Layout:** Full parity between mobile and desktop with a native-feeling bottom navigation bar on mobile and a spacious sidebar on desktop.
3. **9 Theme Customization Palettes:** AMOLED Pure Dark, Rose, Ocean, Emerald, Violet, Sunset, Pastel, High-Contrast, and Default Slate.
4. **Zero Layout Shifts:** CSS variables and Next Themes guarantee instant theme rendering without flashing white screens.

---

## 18. Performance Optimizations

* **Server Components & Streaming:** Heavy pages use React Server Components for minimal client-side JavaScript payloads.
* **Mongoose Serverless Connection Caching:** Global connection pooling (`global.mongooseCache`) prevents database connection exhaustion during traffic spikes.
* **Turbopack Build Optimization:** Sub-second local HMR and ~19-second full production builds across 82 routes.
* **Next.js Image Optimization:** Automatic conversion of images to modern `.webp` and `.avif` formats.
* **Database Indexes:** Compound and sparse indexes on high-frequency queries (`college_id`, `status`, `stream + semester + role`).

---

## 19. Error Handling & Fault Tolerance

* **Push Failure Isolation:** Web Push failures are wrapped in non-blocking try/catch blocks; a temporary browser push failure will **never** interrupt or fail primary database operations.
* **Graceful API Error Responses:** Structured JSON error responses (`{ error: "Meaningful error message" }`) with appropriate HTTP status codes (400, 401, 403, 404, 500).
* **Client Toast Feedback:** Sonner toast alerts provide immediate, non-intrusive feedback for network failures, validation errors, and successes.

---

## 20. Local Development & Setup Guide

### Prerequisites
* **Node.js**: `v20.x` or higher
* **npm**: `v10.x` or higher
* **MongoDB**: A running MongoDB instance or free MongoDB Atlas URI.

### Step 1: Clone Repository & Install Dependencies
```bash
git clone https://github.com/Techy-Play/Acadex.git
cd Acadex
npm install
```

### Step 2: Configure Environment Variables
Create a `.env.local` file in the root directory:

```env
# Database
MONGODB_URI=mongodb+srv://<username>:<password>@cluster.mongodb.net/acadex?retryWrites=true&w=majority

# Authentication
JWT_SECRET=your_super_secret_random_jwt_key_min_32_characters

# Application URL
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Resend Email Delivery
RESEND_API_KEY=re_your_resend_api_key
RESEND_FROM_EMAIL=Acadex <noreply@send.au-acadex.com>

# Web Push (VAPID) — Generate via: npx web-push generate-vapid-keys
VAPID_PUBLIC_KEY=your_generated_public_vapid_key
VAPID_PRIVATE_KEY=your_generated_private_vapid_key
VAPID_EMAIL=mailto:admin@au-acadex.com

# Background Job Secret
CRON_SECRET=your_strong_random_cron_secret

# Google Drive Cloud Storage (Option A: Service Account)
GOOGLE_SERVICE_ACCOUNT_JSON={"type":"service_account",...}
GOOGLE_DRIVE_ROOT_FOLDER_ID=your_google_drive_folder_id

# Google Drive Cloud Storage (Option B: OAuth2 Refresh Token)
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
GOOGLE_REFRESH_TOKEN=your_google_refresh_token
```

### Step 3: Seed Initial Database (Optional)
```bash
npm run seed
```

### Step 4: Run Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 21. Deployment & Infrastructure

Acadex is pre-configured for **Vercel** zero-configuration deployments:

1. **Vercel Build Command:** `next build` (Next.js with Turbopack)
2. **Environment Variables:** Mirror `.env.local` keys into the Vercel Project Settings.
3. **Scheduled Cron Reminders:** Configured via GitHub Actions workflow (`.github/workflows/deadline-reminders.yml`) calling `GET /api/jobs/deadline-reminders` every 15 minutes with `CRON_SECRET`.
4. **Android TWA Integration:** Verified via `public/.well-known/assetlinks.json` mapping to package `com.au_acadex.twa`.

---

## 22. Testing & Quality Assurance

* **TypeScript Type Checking:** `npx tsc --noEmit` verifies strict type correctness across the entire codebase.
* **Production Build Validation:** `npm run build` compiles and verifies all 82 dynamic and static routes.
* **Linting:** ESLint (`npm run lint`) ensures code cleanliness and Next.js best practices.

---

## 23. Current Limitations & Known Technical Debt

1. **In-Memory Upload Buffer:** File uploads pass through the serverless function memory buffer before streaming to Google Drive. Very large files (>50MB) require chunked upload handling.
2. **No Real-Time WebSocket Channel:** Real-time updates rely on Web Push events and polling rather than persistent WebSocket connections.
3. **Google Drive Dependency:** High-volume file serving depends on Google Drive API rate limits.

---

## 24. Future Scope & Planned Enhancements

* [ ] **Institutional Attendance Tracking:** Real-time subject-wise attendance tracking and shortage alerts.
* [ ] **Direct S3 / Cloudflare R2 Storage Adapter:** Optional multi-cloud file storage backend.
* [ ] **Offline PDF Caching:** IndexedDB storage of downloaded lecture notes inside the Service Worker.
* [ ] **Automated Syllabus Analytics:** AI-powered completion forecasts and revision schedules based on semester exam dates.

---

## 25. Development Story & Engineering Milestones

Acadex was conceived and engineered by student developers seeking to solve real academic disorganization in college departments. Key technical milestones achieved during development include:
1. Transitioning from basic relational models to **Mongoose serverless-cached architecture**.
2. Upgrading from standard client-side tokens to **Edge-verified HTTP-Only JWT cookies (`jose`)**.
3. Implementing **Google Drive hierarchical API automation** to replace expensive local storage buckets.
4. Architecting a **zero-overhead Web Push notification engine** that synchronizes unread badges across active browser tabs via Service Worker messaging.

---

## 26. Viva & Technical Examination Preparation (Q&A Bank)

This section provides technically rigorous answers to questions examiners, professors, or evaluators may ask during project presentations.

### Architecture & Framework
**Q: Why did you choose Next.js 16 instead of a standard React SPA + Express.js setup?**
* **Answer:** Next.js 16 provides a unified, full-stack architecture with React Server Components, built-in Edge Middleware, and optimized API Route handlers in a single repository. This eliminates CORS configuration overhead, reduces bundle sizes by rendering static content on the server, and allows zero-configuration deployment on Vercel edge networks.

**Q: How does Mongoose manage database connections in a serverless environment?**
* **Answer:** In serverless functions, each invocation can spawn a new instance. If not managed, this creates thousands of open database connections. Acadex uses a global connection cache (`global.mongooseCache` in `src/lib/db.ts`) that reuses existing connections across hot reloads and serverless function executions.

### Security & Authentication
**Q: Why do you store JWTs in an HTTP-Only cookie rather than localStorage?**
* **Answer:** Storing tokens in `localStorage` makes them vulnerable to theft via Cross-Site Scripting (XSS). An attacker injecting malicious JavaScript could read `localStorage.getItem('token')`. By using `httpOnly: true`, `secure: true`, and `sameSite: "lax"`, the browser forbids JavaScript from accessing the cookie, preventing token exfiltration.

**Q: Explain how passwords are protected in Acadex.**
* **Answer:** Passwords are never saved in plaintext. During registration or password resets, the raw password is processed using `bcryptjs` with a computational cost factor and auto-generated salt. When logging in, `bcrypt.compare()` compares the cryptographic hash without decrypting it.

### Web Push & Notifications
**Q: What is VAPID and why is it necessary for Web Push?**
* **Answer:** VAPID (Voluntary Application Server Identification) allows web push providers (like Google FCM or Apple APNs) to verify that push notifications originate from the authentic Acadex application server. The server signs the push request using its `VAPID_PRIVATE_KEY`, while the push service verifies it using the public key.

**Q: What happens if a user's browser or device is offline when a notification is triggered?**
* **Answer:** The push service queues the message for a Time-To-Live (TTL) duration. When the device reconnects to the network, the push service delivers the payload to the browser's Service Worker (`public/sw.js`). Furthermore, Acadex persists in-app notifications in MongoDB so students can always view their unread history upon logging in.

### Storage & Performance
**Q: Why did you choose Google Drive API for file storage instead of local disk storage?**
* **Answer:** Serverless deployment platforms like Vercel have ephemeral file systems; files written to local disk are destroyed when the serverless container terminates. Google Drive provides durable, high-capacity cloud storage. Acadex automates folder structuring (`Stream -> Semester -> Subject -> Type`) via the Google Drive REST API.

---

## 27. Project Summary

**Acadex** is a modern, full-stack academic resource and workflow management platform engineered to eliminate academic fragmentation in colleges and universities. Built with **Next.js 16**, **TypeScript**, **Tailwind CSS v4**, **MongoDB**, **Google Drive Cloud Storage**, and **VAPID Web Push**, Acadex provides a centralized, secure, and intuitive hub for course syllabi, lecture notes, lab practicals, and assignment deadlines. 

With personalized student completion tracking, automated deadline alerts, peer-upload moderation workflows, and PWA/Android TWA integration, Acadex transforms chaotic academic communication into an efficient, collaborative learning experience.

---

*Engineered with precision for the academic community.*
