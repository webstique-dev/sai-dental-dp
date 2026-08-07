# Sai Dental Clinic Digital Platform --- Product Requirements Document (PRD)

## 1. Project Overview

Build a modern, responsive dental clinic website and digital
clinic-management platform inspired by the supplied reference workflow
image.

The reference image represents an **end-to-end dental care workflow**:

**Walk-in / Appointment → Registration → Check-in → Doctor Consultation
→ Examination & Tooth Charting → Diagnosis & Treatment Plan →
Prescription / Investigations → Billing & Payment → Pharmacy Dispensing
→ Follow-up → Treatment Execution → Records & History → Reports &
Analytics**

The new application should convert this workflow into a real web
application rather than reproducing the image as a static infographic.

### Primary goals

1.  Provide a professional public-facing dental clinic website.
2.  Allow patients to request/book appointments.
3.  Allow receptionists to manage registrations, appointments, check-ins
    and billing.
4.  Allow doctors to manage consultations, dental examinations, tooth
    charts, diagnoses, prescriptions and treatment plans.
5.  Allow pharmacy/dispensary users to manage prescriptions and medicine
    inventory.
6.  Allow administrators to manage users, clinic settings, permissions,
    reports and backups.
7.  Maintain a unified patient record / EMR.
8.  Provide responsive UI for desktop, tablet and mobile.
9.  Keep the architecture ready for future integrations such as online
    payments, SMS/email reminders, X-ray/document storage and analytics.

------------------------------------------------------------------------

# 2. Product Scope

The product has two major areas.

## A. Public Dental Clinic Website

Visitors can:

-   View clinic information.
-   View dental services.
-   View doctors/team.
-   View clinic facilities.
-   View testimonials.
-   View contact information.
-   View opening hours.
-   Request/book an appointment.
-   Submit an enquiry.
-   Access patient login if enabled.

Suggested public pages:

-   `/`
-   `/about`
-   `/services`
-   `/services/:slug`
-   `/doctors`
-   `/doctors/:id`
-   `/appointments`
-   `/contact`
-   `/faq`
-   `/privacy`
-   `/terms`

## B. Secure Dental Management Portal

Authenticated staff access the clinic workflow.

Suggested portal routes:

-   `/portal/dashboard`
-   `/portal/patients`
-   `/portal/patients/:id`
-   `/portal/appointments`
-   `/portal/check-in`
-   `/portal/consultations`
-   `/portal/tooth-chart`
-   `/portal/treatment-plans`
-   `/portal/prescriptions`
-   `/portal/investigations`
-   `/portal/billing`
-   `/portal/payments`
-   `/portal/pharmacy`
-   `/portal/inventory`
-   `/portal/follow-ups`
-   `/portal/documents`
-   `/portal/reports`
-   `/portal/users`
-   `/portal/settings`

------------------------------------------------------------------------

# 3. Design Direction

The supplied image should be treated as a **workflow and
information-architecture reference**, not as a pixel-perfect website
design.

Do not copy the image literally.

The actual website should feel like a premium modern dental SaaS/clinic
platform.

## Visual style

-   Clean healthcare aesthetic.
-   White/light background.
-   Teal/blue primary branding.
-   Soft green accents for positive/success states.
-   Subtle purple/orange accents for different workflow categories.
-   Rounded cards.
-   Soft borders.
-   Minimal shadows.
-   High readability.
-   Professional typography.
-   Plenty of whitespace.
-   Clear visual hierarchy.
-   Accessible contrast.
-   Avoid excessive gradients.
-   Avoid overly animated UI.

## Suggested visual language

Primary: - Deep teal / dental blue.

Secondary: - Soft mint. - Light blue. - Neutral gray. - White.

Status colors: - Available: green. - Pending: amber. - Checked-in:
blue. - In treatment: purple. - Completed: green. - Cancelled: red. -
Blocked: dark gray.

## Responsive requirements

The application MUST work at:

-   320px
-   360px
-   375px
-   390px
-   414px
-   480px
-   768px
-   1024px
-   1280px
-   1440px+

No horizontal scrolling should occur on normal pages.

Forms, cards, tables, navigation and dashboard widgets must adapt to
small screens.

On mobile:

-   Sidebar becomes a drawer.
-   Large tables become cards or horizontally scrollable data regions
    where appropriate.
-   Dashboard cards become a single-column or 2-column grid depending on
    available width.
-   Multi-column forms collapse into one column.
-   Action buttons must remain usable with touch.
-   Modals must fit inside the viewport.

------------------------------------------------------------------------

# 4. User Roles

## 4.1 Receptionist

Responsibilities:

-   Register patients.
-   Search patients.
-   Create appointments.
-   Manage walk-ins.
-   Check patients in.
-   Manage appointment queue.
-   Collect billing information.
-   Record payments.
-   Generate basic reports.

Permissions:

-   Patient create/read/update.
-   Appointment create/read/update.
-   Check-in.
-   Billing/payment access.
-   Limited patient medical information.
-   No system administration.

------------------------------------------------------------------------

## 4.2 Doctor

Responsibilities:

-   View patient history.
-   Conduct consultation.
-   Record chief complaint.
-   Record examination findings.
-   Update tooth chart.
-   Add diagnosis.
-   Create treatment plan.
-   Create prescriptions.
-   Request investigations.
-   Add clinical notes.
-   Schedule follow-ups.

Permissions:

-   Full clinical access for assigned patients.
-   Read patient history.
-   Create/update consultations.
-   Create treatment plans.
-   Create prescriptions.
-   View relevant billing information where required.

------------------------------------------------------------------------

## 4.3 Pharmacy / Dispensary

Responsibilities:

-   View prescriptions.
-   Dispense medicines.
-   Update dispensing status.
-   Manage medicine stock.
-   Monitor low-stock items.
-   View pharmacy reports.

Permissions:

-   Prescription read.
-   Dispensing create/update.
-   Inventory read/write.
-   Pharmacy reports.

------------------------------------------------------------------------

## 4.4 Admin

Responsibilities:

-   User management.
-   Role management.
-   Clinic settings.
-   Access control.
-   Reports.
-   Analytics.
-   Backup configuration.
-   Audit logs.

Permissions:

-   Full system access.

------------------------------------------------------------------------

## 4.5 Optional Patient Role

Future/MVP+ role.

Patients can:

-   View appointments.
-   Request appointments.
-   View prescriptions.
-   View treatment plans.
-   View invoices.
-   View documents.
-   View follow-up dates.
-   Update limited profile information.

------------------------------------------------------------------------

# 5. Core Patient Journey

The application should visually and logically support this workflow.

## Step 1 --- Walk-in / Appointment

Sources:

-   Phone.
-   Walk-in.
-   Website.
-   Online booking.
-   Existing patient.

Create appointment with:

-   Patient.
-   Doctor.
-   Date.
-   Time.
-   Appointment type.
-   Reason.
-   Notes.
-   Status.

Statuses:

-   Requested.
-   Scheduled.
-   Confirmed.
-   Checked-in.
-   In consultation.
-   Completed.
-   Cancelled.
-   No-show.

------------------------------------------------------------------------

# 6. Patient Registration

Patient fields:

### Basic information

-   Patient ID.
-   First name.
-   Last name.
-   Date of birth.
-   Gender.
-   Phone.
-   Email.
-   Address.
-   City.
-   Emergency contact.

### Optional information

-   Blood group.
-   Allergies.
-   Existing medical conditions.
-   Current medications.
-   Dental history.
-   Insurance details.

System should generate a unique patient ID.

Example:

`PAT-2026-000001`

------------------------------------------------------------------------

# 7. Check-in & Appointment Queue

Receptionist can:

-   Search today's appointments.
-   Search patient.
-   Check patient in.
-   Assign queue/token number.
-   Change appointment status.
-   View waiting time.
-   Mark no-show.
-   Move appointment if necessary.

Dashboard should show:

-   Waiting.
-   With doctor.
-   Completed.
-   Delayed.
-   Cancelled.

------------------------------------------------------------------------

# 8. Doctor Consultation

Consultation screen should contain:

### Patient header

-   Patient name.
-   Patient ID.
-   Age.
-   Gender.
-   Contact.
-   Allergies.
-   Important alerts.

### Clinical information

-   Chief complaint.
-   History of present illness.
-   Medical history.
-   Dental history.
-   Examination findings.
-   Clinical notes.

### Consultation actions

-   Save draft.
-   Complete consultation.
-   Create diagnosis.
-   Create treatment plan.
-   Add prescription.
-   Request investigation.
-   Schedule follow-up.

------------------------------------------------------------------------

# 9. Digital Tooth Chart

This is one of the most important modules.

Create an interactive adult dental chart based on standard tooth
numbering.

Support:

-   Tooth selection.
-   Tooth status.
-   Notes per tooth.
-   Diagnosis per tooth.
-   Treatment per tooth.

Possible tooth statuses:

-   Healthy.
-   Cavity.
-   Filled.
-   Root Canal.
-   Missing.
-   Implant.
-   Crown.
-   Extraction required.
-   Other.

The chart should visually distinguish statuses.

Clicking a tooth should open a small panel containing:

-   Tooth number.
-   Current status.
-   Diagnosis.
-   Notes.
-   Treatment.
-   Save button.

The tooth chart should be reusable in:

-   Consultation.
-   Treatment plan.
-   Patient history.

------------------------------------------------------------------------

# 10. Diagnosis & Treatment Plan

Doctor can create:

### Diagnosis

-   Diagnosis name.
-   Tooth number(s).
-   Description.
-   Severity.
-   Notes.

### Treatment plan

-   Treatment name.
-   Tooth number(s).
-   Estimated cost.
-   Duration.
-   Priority.
-   Number of visits.
-   Notes.
-   Status.

Treatment statuses:

-   Proposed.
-   Accepted.
-   Scheduled.
-   In progress.
-   Completed.
-   Cancelled.

Example:

``` text
Root Canal Treatment
Tooth: 16
Estimated Cost: ₹8,000
Visits: 3
Status: Proposed
```

------------------------------------------------------------------------

# 11. Prescription Module

Doctor can create prescriptions containing:

-   Medicine.
-   Dosage.
-   Frequency.
-   Duration.
-   Route.
-   Instructions.
-   Quantity.
-   Notes.

Example:

``` text
Medicine: Amoxicillin
Dosage: 500mg
Frequency: 3 times/day
Duration: 5 days
Instructions: After food
```

Prescription status:

-   Draft.
-   Issued.
-   Partially dispensed.
-   Dispensed.
-   Cancelled.

------------------------------------------------------------------------

# 12. Investigations

Support investigation requests such as:

-   X-ray.
-   OPG.
-   CBCT.
-   Blood test.
-   Other dental investigations.

Each investigation should contain:

-   Investigation type.
-   Reason.
-   Requested by.
-   Date.
-   Status.
-   Result.
-   Attached document/image.

Statuses:

-   Requested.
-   Scheduled.
-   Completed.
-   Result available.
-   Cancelled.

------------------------------------------------------------------------

# 13. Billing & Payments

Receptionist/admin can create invoices.

Invoice fields:

-   Invoice number.
-   Patient.
-   Consultation.
-   Treatment.
-   Medicine.
-   Investigation.
-   Discount.
-   Tax.
-   Total.
-   Amount paid.
-   Balance.
-   Payment status.

Payment methods:

-   Cash.
-   UPI.
-   Card.
-   Bank transfer.
-   Other.

Payment status:

-   Unpaid.
-   Partially paid.
-   Paid.
-   Refunded.

Invoice example:

``` text
Consultation        ₹500
Dental Cleaning    ₹1,500
Medicine             ₹300
-------------------------
Subtotal           ₹2,300
Discount             ₹100
Total              ₹2,200
Paid               ₹2,000
Balance              ₹200
```

------------------------------------------------------------------------

# 14. Pharmacy / Dispensary

Pharmacy dashboard:

-   Pending prescriptions.
-   Dispensed today.
-   Low-stock medicines.
-   Out-of-stock medicines.
-   Recent dispensing.

Medicine inventory:

-   Medicine name.
-   Generic name.
-   Category.
-   Batch number.
-   Expiry date.
-   Quantity.
-   Reorder level.
-   Purchase price.
-   Selling price.
-   Supplier.

Inventory alerts:

-   Low stock.
-   Expiring soon.
-   Expired.
-   Out of stock.

------------------------------------------------------------------------

# 15. Follow-up Management

Doctors/receptionists can schedule follow-ups.

Fields:

-   Patient.
-   Doctor.
-   Date.
-   Time.
-   Reason.
-   Treatment.
-   Notes.

Reminder statuses:

-   Pending.
-   Reminder sent.
-   Confirmed.
-   Completed.
-   Missed.

Future integrations:

-   Email.
-   SMS.
-   WhatsApp.

Do not require external messaging integration for the initial MVP unless
credentials/services are available.

------------------------------------------------------------------------

# 16. Treatment Execution

During treatment:

-   Open treatment plan.
-   Select treatment.
-   Select tooth.
-   Record procedure performed.
-   Add clinical notes.
-   Add materials if required.
-   Add cost.
-   Upload documents/images.
-   Mark treatment progress.

Treatment execution should update the treatment plan automatically.

------------------------------------------------------------------------

# 17. Patient Records & History

Patient profile should act as the central EMR.

Tabs:

1.  Overview
2.  Appointments
3.  Consultations
4.  Tooth Chart
5.  Diagnoses
6.  Treatment Plans
7.  Prescriptions
8.  Investigations
9.  Billing
10. Payments
11. Documents
12. Follow-ups
13. Activity History

Every important clinical action should include:

-   Date/time.
-   User.
-   Action.
-   Related record.

------------------------------------------------------------------------

# 18. Reports & Analytics

Dashboard should show useful operational metrics.

## Admin dashboard

-   Total patients.
-   New patients.
-   Today's appointments.
-   Completed appointments.
-   Cancelled appointments.
-   Pending payments.
-   Revenue.
-   Outstanding balance.
-   Active treatment plans.
-   Pharmacy low-stock count.

## Doctor dashboard

-   Today's appointments.
-   Waiting patients.
-   Active consultations.
-   Pending follow-ups.
-   Active treatment plans.

## Pharmacy dashboard

-   Pending prescriptions.
-   Dispensed today.
-   Low stock.
-   Expiring medicines.

## Reports

-   Daily revenue.
-   Monthly revenue.
-   Appointment report.
-   Patient registration report.
-   Doctor performance.
-   Treatment report.
-   Prescription report.
-   Pharmacy inventory report.
-   Outstanding payments.
-   Follow-up report.

Reports should support:

-   Date range.
-   Doctor.
-   Status.
-   Export CSV/PDF where practical.

------------------------------------------------------------------------

# 19. Admin Management

Admin pages:

## Users

-   Create user.
-   Edit user.
-   Disable user.
-   Reset password.
-   Assign role.

## Roles

Roles:

-   Admin.
-   Doctor.
-   Receptionist.
-   Pharmacy.

Use role-based permissions rather than hardcoding permissions into UI
components.

## Clinic settings

-   Clinic name.
-   Logo.
-   Address.
-   Phone.
-   Email.
-   Opening hours.
-   Invoice prefix.
-   Currency.
-   Tax configuration.
-   Appointment settings.

------------------------------------------------------------------------

# 20. Audit Log

Every sensitive action should be recorded.

Examples:

-   Patient created.
-   Patient updated.
-   Appointment changed.
-   Consultation created.
-   Prescription issued.
-   Invoice created.
-   Payment recorded.
-   User permissions changed.
-   Record deleted/archived.

Audit fields:

-   User.
-   Action.
-   Entity.
-   Entity ID.
-   Timestamp.
-   IP/device information where appropriate.

Use soft-delete/archive for important medical and financial records
instead of permanently deleting them.

------------------------------------------------------------------------

# 21. Authentication & Security

Backend must implement:

-   Login.
-   Logout.
-   Password hashing.
-   Access tokens.
-   Refresh tokens if appropriate.
-   Role-based authorization.
-   Protected API routes.
-   Input validation.
-   Rate limiting for authentication endpoints.
-   Secure HTTP headers.
-   CORS configuration.
-   Environment variables.
-   Audit logging.

Never store:

-   Passwords in plain text.
-   API keys in frontend source.
-   Database credentials in Git.

Sensitive values must be stored in `.env`.

Example:

``` env
PORT=5000
MONGO_URI=
JWT_SECRET=
JWT_REFRESH_SECRET=
CLIENT_URL=
```

------------------------------------------------------------------------

# 22. Backend Architecture

Assume the existing project uses:

-   React + Vite for client.
-   Node.js + Express for server.
-   MongoDB/Mongoose.
-   REST API.

Recommended server structure:

``` text
server/
├── src/
│   ├── config/
│   ├── controllers/
│   ├── middleware/
│   ├── models/
│   ├── routes/
│   ├── services/
│   ├── validators/
│   ├── utils/
│   ├── app.js
│   └── server.js
├── .env
└── package.json
```

Recommended client structure:

``` text
client/
├── src/
│   ├── assets/
│   ├── components/
│   ├── layouts/
│   ├── pages/
│   ├── features/
│   │   ├── auth/
│   │   ├── patients/
│   │   ├── appointments/
│   │   ├── consultations/
│   │   ├── tooth-chart/
│   │   ├── treatments/
│   │   ├── prescriptions/
│   │   ├── pharmacy/
│   │   ├── billing/
│   │   ├── reports/
│   │   └── admin/
│   ├── services/
│   ├── hooks/
│   ├── context/
│   ├── utils/
│   ├── App.jsx
│   └── main.jsx
└── package.json
```

------------------------------------------------------------------------

# 23. Recommended Database Models

Create models for:

-   User
-   Role / Permission
-   Patient
-   Appointment
-   CheckIn
-   Consultation
-   ToothRecord
-   Diagnosis
-   TreatmentPlan
-   TreatmentProcedure
-   Prescription
-   PrescriptionItem
-   Investigation
-   Document
-   Invoice
-   Payment
-   Medicine
-   InventoryTransaction
-   FollowUp
-   Notification
-   AuditLog
-   ClinicSetting

Do not create every model unnecessarily on day one. Build the MVP in
workflow order.

------------------------------------------------------------------------

# 24. API Design

Use REST endpoints.

## Authentication

``` text
POST /api/auth/login
POST /api/auth/logout
POST /api/auth/refresh
GET  /api/auth/me
```

## Patients

``` text
GET    /api/patients
POST   /api/patients
GET    /api/patients/:id
PATCH  /api/patients/:id
DELETE /api/patients/:id
GET    /api/patients/:id/history
```

## Appointments

``` text
GET    /api/appointments
POST   /api/appointments
GET    /api/appointments/:id
PATCH  /api/appointments/:id
DELETE /api/appointments/:id
POST   /api/appointments/:id/check-in
```

## Consultations

``` text
POST  /api/consultations
GET   /api/consultations/:id
PATCH /api/consultations/:id
```

## Tooth chart

``` text
GET   /api/patients/:patientId/tooth-chart
POST  /api/patients/:patientId/tooth-chart
PATCH /api/tooth-records/:id
```

## Treatments

``` text
GET   /api/treatment-plans
POST  /api/treatment-plans
GET   /api/treatment-plans/:id
PATCH /api/treatment-plans/:id
POST  /api/treatment-plans/:id/procedures
```

## Prescriptions

``` text
GET   /api/prescriptions
POST  /api/prescriptions
GET   /api/prescriptions/:id
PATCH /api/prescriptions/:id
POST  /api/prescriptions/:id/dispense
```

## Billing

``` text
GET  /api/invoices
POST /api/invoices
GET  /api/invoices/:id
POST /api/invoices/:id/payments
```

## Reports

``` text
GET /api/reports/dashboard
GET /api/reports/revenue
GET /api/reports/appointments
GET /api/reports/patients
GET /api/reports/treatments
GET /api/reports/inventory
```

------------------------------------------------------------------------

# 25. Public Appointment Booking

Public booking form:

### Step 1

Patient details:

-   Name.
-   Phone.
-   Email.

### Step 2

Appointment:

-   Service.
-   Doctor.
-   Preferred date.
-   Preferred time.

### Step 3

Confirmation:

-   Booking reference.
-   Appointment details.

The public form should NOT directly create unrestricted internal
appointments without validation.

Recommended initial state:

`Requested`

Receptionist/admin confirms the appointment.

------------------------------------------------------------------------

# 26. Dashboard UX

The main portal dashboard should communicate the workflow shown in the
reference image.

Top section:

-   Welcome message.
-   Current date.
-   User role.
-   Quick actions.

Quick actions:

-   Register Patient.
-   New Appointment.
-   Check-in Patient.
-   Start Consultation.
-   Create Invoice.

Metrics:

-   Today's Appointments.
-   Waiting Patients.
-   Active Treatments.
-   Revenue.
-   Pending Payments.

Main content:

-   Today's appointment queue.
-   Recent patients.
-   Pending follow-ups.
-   Alerts.

------------------------------------------------------------------------

# 27. Navigation

Desktop sidebar:

``` text
Dashboard

Patients
Appointments
Check-in

Clinical
  Consultations
  Tooth Chart
  Diagnoses
  Treatment Plans
  Prescriptions
  Investigations
  Documents

Operations
  Billing
  Payments
  Pharmacy
  Inventory
  Follow-ups

Reports

Administration
  Users
  Roles & Permissions
  Clinic Settings
  Audit Logs
```

Navigation must change based on user role.

A receptionist should not see administration or advanced clinical
controls.

------------------------------------------------------------------------

# 28. UI Components

Create reusable components:

-   Button
-   Input
-   Select
-   DatePicker
-   TimePicker
-   Modal
-   Drawer
-   Dropdown
-   Tabs
-   Badge
-   Card
-   DataTable
-   Pagination
-   SearchInput
-   EmptyState
-   LoadingState
-   ErrorState
-   ConfirmationDialog
-   Toast
-   PatientCard
-   AppointmentCard
-   StatusBadge
-   StatCard
-   Timeline
-   FileUploader
-   ToothChart

Avoid duplicated UI code.

------------------------------------------------------------------------

# 29. Loading / Error / Empty States

Every data-driven page must support:

### Loading

Use skeleton loaders where appropriate.

### Empty

Example:

> No appointments found for today.

### Error

Example:

> Unable to load appointments. Please try again.

### Success

Use toast notifications for actions such as:

> Patient registered successfully.

------------------------------------------------------------------------

# 30. Accessibility

Requirements:

-   Keyboard navigable.
-   Proper form labels.
-   Accessible buttons.
-   Visible focus states.
-   Semantic HTML.
-   Appropriate ARIA attributes.
-   Do not rely only on color for statuses.
-   Adequate contrast.
-   Touch-friendly controls.

------------------------------------------------------------------------

# 31. Performance

Requirements:

-   Lazy-load large portal modules.
-   Optimize images.
-   Avoid unnecessary API requests.
-   Paginate large tables.
-   Debounce patient search.
-   Avoid loading entire patient history on initial page load.
-   Use reusable API services.
-   Keep bundle size reasonable.

------------------------------------------------------------------------

# 32. SEO --- Public Website

Public pages should include:

-   Page titles.
-   Meta descriptions.
-   Open Graph metadata.
-   Semantic headings.
-   Image alt text.
-   Local business information.
-   Structured data where appropriate.

The authenticated portal does not need public SEO.

------------------------------------------------------------------------

# 33. Initial MVP

Do NOT attempt to build every feature at once.

Build the MVP in this order.

## Phase 1 --- Foundation

-   Project cleanup.
-   Client/server connection.
-   Environment configuration.
-   MongoDB connection.
-   Authentication.
-   User roles.
-   Protected routes.
-   Base layout.
-   Responsive sidebar.
-   Toast/error handling.

## Phase 2 --- Patient + Appointment Workflow

-   Patient registration.
-   Patient search.
-   Patient profile.
-   Appointment creation.
-   Appointment list.
-   Appointment status.
-   Check-in.
-   Queue.

## Phase 3 --- Doctor Workflow

-   Consultation.
-   Patient history.
-   Tooth chart.
-   Diagnosis.
-   Treatment plan.
-   Follow-up.
-   Prescription.

## Phase 4 --- Billing + Pharmacy

-   Invoice.
-   Payment.
-   Prescription dispensing.
-   Medicine inventory.
-   Stock alerts.

## Phase 5 --- Records + Reports

-   Patient timeline.
-   Documents.
-   Audit log.
-   Dashboard analytics.
-   Reports.

## Phase 6 --- Public Website

-   Home.
-   About.
-   Services.
-   Doctors.
-   Appointment request.
-   Contact.
-   FAQ.

------------------------------------------------------------------------

# 34. Important Development Rule

The agent must NOT rebuild the entire project blindly.

Before making changes:

1.  Inspect the existing `client` folder.
2.  Inspect the existing `server` folder.
3.  Inspect `package.json` files.
4.  Identify the current framework and dependencies.
5.  Identify existing components.
6.  Identify existing API structure.
7.  Identify existing database configuration.
8.  Reuse working code where possible.
9.  Do not replace existing functionality without understanding it.
10. Make incremental changes.

------------------------------------------------------------------------

# 35. OpenCode Agent Workflow

When using this PRD with OpenCode, instruct the agent to work in stages.

### Stage 1

Analyze the existing repository.

Do not write code yet.

Return:

-   Current architecture.
-   Existing dependencies.
-   Existing routes.
-   Existing components.
-   Missing functionality.
-   Potential conflicts.
-   Recommended implementation plan.

### Stage 2

Implement the application foundation.

### Stage 3

Implement patient and appointment workflow.

### Stage 4

Implement doctor workflow.

### Stage 5

Implement billing/pharmacy.

### Stage 6

Implement reporting/admin.

### Stage 7

Implement public website.

### Stage 8

Perform responsive QA and bug fixing.

------------------------------------------------------------------------

# 36. Agent Coding Rules

The agent must:

-   Follow the existing project architecture when practical.
-   Use reusable components.
-   Keep frontend and backend responsibilities separated.
-   Validate data on both frontend and backend.
-   Protect API endpoints using authentication and authorization.
-   Never expose secrets.
-   Never hardcode production credentials.
-   Use environment variables.
-   Avoid unnecessary dependencies.
-   Avoid giant components.
-   Keep controllers/services focused.
-   Handle API errors consistently.
-   Use meaningful names.
-   Remove unused imports.
-   Avoid console errors/warnings.
-   Test important workflows after implementation.

------------------------------------------------------------------------

# 37. Definition of Done

A feature is NOT complete until:

-   UI is implemented.
-   API is implemented.
-   Database model is implemented where needed.
-   Validation exists.
-   Authorization exists.
-   Loading state exists.
-   Empty state exists.
-   Error state exists.
-   Success feedback exists.
-   Responsive layout works.
-   Browser console has no avoidable errors.
-   API returns appropriate status codes.
-   Existing features are not broken.

------------------------------------------------------------------------

# 38. First Task for the Agent

The first OpenCode task should be:

> Read `PRD.md` completely. Inspect the existing `client` and `server`
> directories before changing anything. Do not start implementing all
> modules immediately. First analyze the existing codebase and create a
> detailed implementation plan mapping the PRD requirements to the
> current project structure. Identify what already exists, what needs to
> be created, dependency gaps, database/model requirements, API
> requirements, frontend routes, reusable components, authentication
> requirements, and risks. Do not delete or rewrite working code. After
> the analysis, implement only Phase 1 --- Foundation --- and verify it
> before proceeding.

------------------------------------------------------------------------

# 39. Suggested Folder-Level Documentation

Keep these files at the repository root:

``` text
/
├── client/
├── server/
├── PRD.md
├── AGENTS.md
└── README.md
```

`PRD.md` = complete product requirements.

`AGENTS.md` = coding rules and instructions for OpenCode.

`README.md` = setup and developer documentation.

------------------------------------------------------------------------

# 40. Final Product Vision

The final system should feel like one integrated dental-care platform
rather than a collection of unrelated CRUD pages.

The patient should move naturally through:

**Appointment → Registration → Check-in → Consultation → Tooth Chart →
Diagnosis → Treatment Plan → Prescription/Investigation → Billing →
Pharmacy → Follow-up → Treatment → History → Reports**

The UI should make this journey obvious while still allowing staff to
jump directly to any module.

The supplied reference image is the conceptual workflow map for the
entire product.


# 41. Clinical OP Record — Required Fields From Physical Dental Record

The handwritten Dental OP Record supplied by the clinic is a direct source of requirements and must be incorporated into the digital patient record.

The physical record contains more detailed clinical fields than the original workflow reference image. These fields are mandatory for the clinical/OP module.

## 41.1 Basic Details

The digital OP record must contain:

- OP Number
- OP Date
- Patient first name
- Patient last name
- Age
- Sex
- Date of birth
- Occupation
- Address
- Phone number

The system should automatically generate the OP number, while still allowing authorized staff to search by OP number.

Recommended distinction:

- `Patient ID` = permanent patient identifier.
- `OP Number` = identifier for a particular OP/visit record.

A patient can therefore have multiple OP records over time.

Example:

```text
Patient ID: PAT-2026-000123
OP No: OP-2026-000845
Visit Date: 07-Aug-2026
```

---

# 42. Medical History

The supplied physical record explicitly captures the following medical history.

Provide selectable Yes / No / Unknown fields for:

- Diabetes Mellitus
- Hypertension
- Asthma
- Allergy
- Pregnancy
- Cardiac Disease
- Epilepsy
- Thyroid Disorder
- Hepatitis
- Bleeding Disorder
- Other medical condition

For `Other`, provide a free-text field.

## Current Medication

Provide:

- Taking medication? Yes / No
- Medication name
- Dosage
- Frequency
- Duration
- Notes

The system should support multiple current medications.

## Vital Information

The physical record mentions:

- BP
- RBS

Store these as visit-specific clinical observations rather than permanent patient profile fields.

Example:

```text
BP: 120/80 mmHg
RBS: 98 mg/dL
Recorded by: Doctor
Recorded at: Visit date/time
```

The system should not automatically diagnose or interpret these values. They are clinical records entered by authorized staff.

---

# 43. Habits

The physical OP record specifically lists:

- Smoking
- Tobacco
- Alcohol
- Pan

Each should support:

- Yes / No
- Frequency
- Duration
- Quantity where relevant
- Notes

Example:

```text
Smoking: Yes
Frequency: 5 cigarettes/day
Duration: 4 years
```

Do not assume a clinical diagnosis from habit data.

---

# 44. Dental History

Provide a dedicated free-text and structured dental history section.

Possible fields:

- Previous dental treatment
- Previous extraction
- Previous RCT
- Previous crown/bridge
- Previous implant
- Previous orthodontic treatment
- Previous dental complaints
- Last dental visit
- Other relevant history

The doctor should be able to add narrative notes.

---

# 45. Clinical Examination

The supplied record divides examination into:

1. Extraoral Examination
2. Intraoral Examination
3. Soft Tissue Examination
4. Hard Tissue Examination

These should remain separate sections in the digital OP record.

---

# 46. Extraoral Examination

Required assessment fields:

- Facial symmetry
- TMJ
- Lymph nodes
- Swelling

Each field should support:

- Normal
- Abnormal
- Not examined

and an optional notes field.

Example:

```text
Facial symmetry: Normal
TMJ: Normal
Lymph nodes: Normal
Swelling: None
```

---

# 47. Intraoral / Soft Tissue Examination

The physical record lists:

- Labial / Buccal mucosa
- Tongue
- Floor of mouth
- Gingiva
- Hard palate
- Soft palate

These should be individual clinical examination sections.

## Gingival assessment

The record specifically includes:

- Healthy
- Gingivitis
- Periodontitis
- Enlargement
- Recession
- Bleeding on probing

The UI should allow multiple findings where clinically applicable.

For example:

```text
Gingiva:
[x] Recession
[x] Bleeding on probing
```

Each finding should optionally support:

- Location
- Tooth/region
- Severity
- Notes

---

# 48. Hard Tissue Examination / Tooth Chart

This requirement is especially important.

The physical record contains a two-row FDI tooth chart:

```text
Upper:
18 17 16 15 14 13 12 11 | 21 22 23 24 25 26 27 28

Lower:
48 47 46 45 44 43 42 41 | 31 32 33 34 35 36 37 38
```

The digital application must use this same FDI numbering system for the initial dental chart.

## Tooth chart requirements

Every tooth must be individually selectable.

Selecting a tooth should show:

- Tooth number
- Current condition
- Previous treatment
- Latest treatment
- Treatment history
- Diagnosis
- Planned treatment
- Notes
- Date of last treatment
- Next planned treatment

---

# 49. Tooth Status / Clinical Codes

The handwritten record defines these codes:

| Code | Meaning |
|---|---|
| D | Caries |
| M | Missing |
| F | Filling |
| RCT | Root Canal Treatment |
| Cr | Crown |
| Br | Bridge |
| I | Implant |

The application should display the full meaning in the UI while optionally showing the short code.

Example:

```text
16 — RCT
26 — F
36 — Cr
46 — M
```

Do not make users memorize codes.

Use a visual status legend.

---

# 50. Tooth Treatment History — Critical Requirement

The handwritten note specifically requests that the chart:

1. Reflect the last treatment done for the particular tooth.
2. Show treatment in chronological order when a tooth is selected.

This should be implemented as a tooth-specific timeline.

Example:

```text
TOOTH 16

Current Status
RCT + Crown

Treatment History

10-Jan-2025
Caries detected
Diagnosis recorded

18-Jan-2025
Root Canal Treatment
₹5,000

25-Jan-2025
RCT completed
₹3,000

05-Feb-2025
Crown placed
₹6,000
```

The tooth chart should show a concise current state.

Clicking the tooth should open the full historical timeline.

The latest completed treatment should be visually identified as:

`Latest Treatment`

The next planned treatment should be separately identified as:

`Next Planned Treatment`

This distinction is important because the last completed procedure and next planned procedure are not necessarily the same.

---

# 51. Tooth Selection → Treatment Workflow

When a doctor selects a tooth:

```text
Select Tooth 16
       ↓
Show Current Status
       ↓
Show Previous Treatment
       ↓
Show Treatment History
       ↓
Show Diagnosis
       ↓
Show Existing Treatment Plan
       ↓
Show Next Planned Treatment
       ↓
Add New Treatment
```

Adding a new treatment should automatically append it to the tooth's treatment history after it is saved/completed.

The UI must preserve chronological order.

---

# 52. Investigation Requirements

The supplied record explicitly includes:

- RVG / IOPA
- OPG
- CBCT
- Other

The investigation module should therefore provide these as predefined options.

## Investigation fields

- Investigation type
- Tooth/region
- Requested by
- Date requested
- Reason
- Findings
- Result
- Status
- Attachment/document
- Notes

Possible statuses:

- Requested
- Pending
- Completed
- Result available
- Cancelled

## Findings

The handwritten record contains a separate `Findings` section.

Provide a prominent clinical findings area after investigations.

This should support rich text/narrative notes.

---

# 53. Diagnosis

The physical record has a dedicated:

`Diagnosis`

section.

The digital OP record should provide:

- Diagnosis
- Tooth/region
- Diagnosis notes
- Date
- Doctor
- Status

Support multiple diagnoses per OP visit.

---

# 54. Treatment Plan

The physical record contains a separate:

`Treatment Plan`

section.

A treatment plan should contain multiple planned procedures.

Each treatment item should support:

- Tooth number
- Procedure
- Description
- Priority
- Estimated charge
- Number of visits
- Planned date
- Status
- Notes

Statuses:

- Proposed
- Accepted
- Scheduled
- In Progress
- Completed
- Cancelled

---

# 55. Treatment Record

The physical record contains this table:

| Date | Tooth No | Procedure | Charges | Next Appointment |
|---|---|---|---:|---|

The digital system must reproduce this information in a structured treatment record.

Required fields:

- Date
- Tooth number
- Procedure
- Charges
- Next appointment
- Doctor
- Notes
- Status

The treatment record must be connected to:

- Patient
- OP visit
- Tooth
- Treatment plan
- Invoice where applicable

---

# 56. Prescription

The physical OP record includes a dedicated:

`Prescription`

section.

The digital prescription must support:

- Medicine
- Strength
- Dosage
- Frequency
- Duration
- Quantity
- Route
- Instructions
- Notes

Multiple medicines can be included in one prescription.

Prescription should be linked to:

- Patient
- OP visit
- Doctor
- Date
- Consultation

---

# 57. Billing & Payment

The physical record includes:

| Date | Procedure | Charges | Payment | Balance |
|---|---|---:|---:|---:|

The digital billing module must preserve these concepts.

Required transaction fields:

- Date
- Procedure/service
- Charges
- Payment
- Balance
- Payment method
- Invoice/reference number
- Notes

Payment methods:

- Cash
- UPI
- Card
- Bank Transfer
- Other

The system should calculate balance automatically:

```text
Balance = Total Charges - Total Payments
```

Do not allow the frontend alone to calculate financial totals. The backend must validate and calculate authoritative totals.

---

# 58. OP Visit Structure

The complete digital OP record should be organized approximately as:

```text
OP VISIT
│
├── Basic Details
│
├── Medical History
│   ├── Medical Conditions
│   ├── Current Medications
│   ├── BP
│   └── RBS
│
├── Habits
│   ├── Smoking
│   ├── Tobacco
│   ├── Alcohol
│   └── Pan
│
├── Dental History
│
├── Clinical Examination
│   ├── Extraoral
│   │   ├── Facial Symmetry
│   │   ├── TMJ
│   │   ├── Lymph Nodes
│   │   └── Swelling
│   │
│   ├── Intraoral
│   └── Soft Tissue
│       ├── Labial/Buccal Mucosa
│       ├── Tongue
│       ├── Floor of Mouth
│       ├── Gingiva
│       ├── Hard Palate
│       └── Soft Palate
│
├── Hard Tissue / Tooth Chart
│
├── Investigations
│   ├── RVG / IOPA
│   ├── OPG
│   ├── CBCT
│   └── Other
│
├── Findings
│
├── Diagnosis
│
├── Treatment Plan
│
├── Treatment Record
│
├── Prescription
│
└── Billing & Payment
```

This structure should be reflected in both the database and the clinical UI.

---

# 59. Clinical Record UI Recommendation

Do not put every field into one extremely long form.

Use a tabbed or sectioned clinical record.

Recommended desktop layout:

```text
┌──────────────────────────────────────────────────────────────┐
│ Patient Header                                               │
│ Name | Patient ID | OP No | Age | Phone | Alerts            │
├──────────────────────────────────────────────────────────────┤
│ Overview | Medical | Examination | Tooth Chart | Diagnosis  │
│ Treatment | Investigations | Prescription | Billing | History│
├──────────────────────────────────────────────────────────────┤
│                                                              │
│                    ACTIVE SECTION                            │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

For the doctor consultation workflow, also provide a compact clinical navigation/sidebar so the doctor can move quickly between sections.

On mobile, tabs should become horizontally scrollable or a dropdown/section navigation.

---

# 60. Patient Clinical Timeline

The application should provide a chronological timeline.

Example:

```text
07 Aug 2026
OP Visit
│
├── Examination completed
├── Tooth 16 diagnosed
├── OPG requested
├── RCT planned
└── Prescription issued

14 Aug 2026
Treatment
│
└── RCT - Tooth 16

21 Aug 2026
Treatment
│
└── Crown preparation - Tooth 16
```

This timeline should combine relevant clinical events without losing the structured records behind them.

---

# 61. Data Relationships

The core clinical relationships should follow:

```text
Patient
  │
  ├── OP Visits
  │     │
  │     ├── Medical History
  │     ├── Examination
  │     ├── Tooth Records
  │     ├── Investigations
  │     ├── Findings
  │     ├── Diagnoses
  │     ├── Treatment Plan
  │     ├── Treatment Records
  │     ├── Prescriptions
  │     └── Billing Transactions
  │
  └── Long-term Tooth History
```

A tooth's treatment history must persist across OP visits.

For example, tooth 16 may be examined in January and again in August. The August visit must still be able to show the earlier January treatment.

---

# 62. Important Implementation Rule for Tooth History

Do not store only the current tooth status.

The system needs both:

1. Current tooth state.
2. Historical treatment events.

For example:

```text
Tooth 16
Current Status: Crown

History:
- Caries
- RCT
- Crown
```

This allows the application to satisfy the clinic's requirement that selecting a tooth should reveal what was done previously and in what order.

---

# 63. Updated MVP Clinical Scope

The first clinical MVP must include:

- Patient registration
- OP number
- OP visit
- Medical history
- Current medication
- BP
- RBS
- Habits
- Dental history
- Extraoral examination
- Intraoral/soft-tissue examination
- Gingival findings
- FDI tooth chart
- Tooth status codes
- Tooth treatment history
- Investigation types
- Findings
- Diagnosis
- Treatment plan
- Treatment record
- Prescription
- Billing/payment
- Next appointment

These are not optional UI details. They come directly from the physical dental OP record supplied by the clinic.
