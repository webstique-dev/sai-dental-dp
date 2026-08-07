# OpenCode Agent Instructions

## Primary instruction

Build the dental clinic platform according to `PRD.md`.

Do not blindly generate the entire application in one pass.

## Before coding

Inspect:

-   `client/`
-   `server/`
-   both `package.json` files
-   existing routes
-   existing API services
-   existing components
-   database configuration
-   authentication
-   environment configuration

Do not delete working code before understanding it.

## Implementation order

1.  Foundation
2.  Patients
3.  Appointments/check-in
4.  Doctor consultation
5.  Tooth chart
6.  Diagnosis/treatment
7.  Prescription/investigation
8.  Billing/payment
9.  Pharmacy/inventory
10. Follow-ups
11. Records/documents
12. Reports
13. Admin
14. Public website
15. Responsive QA

## Development behavior

-   Work incrementally.
-   After each major module, verify the application.
-   Reuse existing components where appropriate.
-   Create reusable components instead of duplicating markup.
-   Keep API calls in service modules.
-   Keep business logic out of UI components where practical.
-   Validate all user input.
-   Protect all private APIs.
-   Apply role-based authorization.
-   Never expose secrets in client code.
-   Use `.env` for credentials.
-   Avoid unnecessary packages.
-   Do not introduce a new UI library if the project already has a
    usable design system unless there is a strong reason.

## UI rules

-   Premium modern dental/healthcare aesthetic.
-   White/light interface.
-   Teal/blue primary visual language.
-   Rounded cards.
-   Subtle borders and shadows.
-   Strong typography hierarchy.
-   Responsive from 320px upward.
-   No horizontal overflow.
-   Sidebar becomes a mobile drawer.
-   Tables must have a usable mobile representation.
-   Forms collapse cleanly on small screens.
-   Provide loading, empty, error and success states.

## Code quality

Before considering a task complete:

-   Run the relevant build.
-   Check browser console.
-   Check server logs.
-   Check API responses.
-   Fix avoidable warnings/errors.
-   Verify responsive behavior.
-   Verify authorization.
-   Verify that existing features still work.

## Important

The reference image is a workflow/information architecture reference.

Do not copy the image as a static page.

Convert the workflow into a real, usable application.

## First command/task

Start by analyzing the repository and producing an implementation plan.

Do not implement the full PRD immediately.

After the analysis, implement only the foundation phase and verify it.
