# PCI Cables Industries

Standalone public website, product catalogue, and staff inbox for PCI Cables. Built with Next.js, React, and Payload. The PCI recording is the primary visual reference. The four public forms collect contact messages, quote requests, career interest, and vendor registrations. Vendor and applicant accounts are a later phase.

## Run locally

Requires Node.js 24.22.1 or newer in the Node 24 series, and pnpm 11.25.0. In this folder:

    pnpm install --frozen-lockfile
    pnpm setup
    pnpm dev

Open **http://127.0.0.1:3000/**. Open **http://127.0.0.1:3000/admin/** and create the first staff account on the private local machine. There is no shared default password. For the optimized build, run `pnpm build` then `pnpm start`.

On Windows, `start-local.cmd` starts the same development server directly with Node. Run it from your own terminal or double-click it and keep its window open. The first homepage request may take about 20 seconds while Next.js compiles the page and Payload opens the local database; later requests are much faster. A server started inside a temporary Codex command session may stop when that session resets.

`pnpm setup` creates an ignored local secret and SQLite database, then adds missing content records. Running it again preserves edits. Keep .env, .data, and submission exports private.

## Maintain content

- In **Site Content**, edit the title, summary, and body of existing company pages, products, and posts. The published box enables the CMS version; when disabled, the site uses the bundled public copy. The home entry controls the first slide’s title and description. Catalogue data and asset changes go through the source repository.
- **Inquiries** is the private inbox. It records category, product where applicable, status, and notification delivery. The database saves the record before attempting email. Check the inbox directly if email is unconfigured or fails.
- The initial catalogue and content come from PCI’s published WordPress site and its local public media mirror. WordPress is no longer a runtime dependency. The optional import-public script refreshes the bundled source snapshots; review its changes before use.
- Review product specifications, certificates, figures, contact details, imagery and privacy copy before production. Use PCI’s updated material when supplied.

## Verify and back up

    pnpm check
    pnpm build
    pnpm test:production
    node scripts/test-browser.mjs
    pnpm backup:local

The production test starts a separate loopback instance on port 3100 with an isolated SQLite database. It checks public pages and media, redirects, SEO, validation, all four submission categories, and staff access. It sends no real emails. SQLite backups are under the ignored .data/backups directory. To restore one, stop the local server, retain the current database for recovery, and point SQLITE_URL at a copy of the selected backup.

Run the browser checks with the local site running and Chrome or Edge installed. Set CHROME_PATH if the browser is installed elsewhere. These checks cover desktop and mobile layout, keyboard controls, reduced motion and automated accessibility. See [design and reference notes](DESIGN.md).

The Reach globe uses locally hosted geographic data and the existing Three.js dependency. Run `node scripts/test-earth.mjs` for globe interactions, state points, client information, reduced motion, mobile layout and the static fallback. It also runs in the production test suite. Source references and geographic rebuilding instructions are in [GEOGRAPHY.md](GEOGRAPHY.md).

Run `node scripts/test-client-showcase.mjs` with the local site running to check the homepage's rotating client logos, motion controls, mobile layout, no-JavaScript rendering, and the unchanged `/clients/` directory.

## Publish to staging, then production

1. Push the Git history to a **private PCI repository**. Configure a Vercel project with the pinned Node and pnpm versions. Enable access protection for previews. Create separate staging and production PostgreSQL databases; keep staging free of real submission data. Choose a backed-up production database and place server and database in the same region when possible.
2. Set PAYLOAD_SECRET, DATABASE_URL, and NEXT_PUBLIC_SITE_URL per environment. Keep SITE_INDEXABLE=false in staging. Run `pnpm migrate` and `pnpm seed` against the intended database before first deployment. Set temporary process variables PCI_STAFF_EMAIL and PCI_STAFF_PASSWORD, run `pnpm staff:create`, then clear those variables. Vercel blocks browser registration of the first admin.
3. Verify a Resend sending domain and set RESEND_API_KEY, MAIL_FROM, SALES_EMAIL, HR_EMAIL, and PROCUREMENT_EMAIL. Test delivery in staging. Set GOOGLE_SITE_VERIFICATION and optional NEXT_PUBLIC_GA_ID. Analytics loads after the visitor enables it. Verify the production property in Search Console.
4. Back up the old WordPress site and its DNS records. Confirm staging, service costs, redirects, and backup restore. Set NEXT_PUBLIC_SITE_URL=https://pcicablesindustries.com and SITE_INDEXABLE=true on the reviewed production deployment. Point the website records at Vercel while preserving mail DNS records. Verify HTTPS and host redirects, submit the sitemap, and monitor the inbox and Search Console.
5. If cutover fails, restore the previous website DNS target or roll back the deployment. Keep the new inbox data available and export it privately before changing the database.

### Historical submissions

The local WordPress contact-submissions plugin can save records to the private pci_contact_entry post type. Its presence on disk does not show whether it was active on the live site. Use an authenticated WordPress or database export to verify. Check that source first, then WPForms or Lite Connect backups and notification mailboxes. No historical export was found in the checked project folders.

Normalize recoverable entries to a JSON array with legacyId, kind, name, email, optional phone and company, and message. Store it outside this repository and run `pnpm import:inquiries ABSOLUTE_PATH`. It skips existing IDs, marks imported entries as historical, and sends no email.
