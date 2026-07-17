# Table QR ordering setup

The customer interface, secure database functions, and cart are included. Orders cannot go live until a Supabase project is connected.

1. Create a Supabase project and run `supabase/schema.sql` in its SQL editor.
2. Run `powershell -ExecutionPolicy Bypass -File .\supabase\create-table-links.ps1 -TableCount 12` (change 12 if needed).
3. Run the generated `supabase/table-seed.sql` in Supabase. Do not publish that file or `table-links.csv`.
4. Put the project URL and public anon key in `js/supabase-config.js`.
5. Convert each URL in `supabase/table-links.csv` into a QR with your label printer and attach it only to its matching table.
6. Create staff users in Supabase Authentication. Staff orders can be read and updated through the `orders` table in the Supabase dashboard.

## Staff dashboard

Daily order management is available at `https://morethanakiosk.com/staff.html`. Run `supabase/staff-dashboard.sql`, invite staff through Supabase Authentication once, and add each approved user's UUID to `public.staff_members`. The dashboard then shows live orders and table switches without requiring access to the Supabase dashboard.

QR tokens are random and stored as SHA-256 hashes. Scanning creates a two-hour session. A copied QR can still be reused during that time, because a fixed printed QR cannot prove physical presence. Rotate a table by rerunning the generator and replacing its printed QR; disable ordering by setting `restaurant_tables.enabled` to false.

Important: before taking real orders, prices and product availability should move to a server-managed menu. The current implementation reads the displayed menu and the server calculates totals from the submitted values, so it is suitable for staff-assisted ordering but not payments. Never use the total as a trusted payment amount until server-owned products are added.
