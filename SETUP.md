# PropFirm Africa — setup guide

This is a starter website for a worldwide prop-firm comparison directory. It includes:
- Public searchable firm directory
- Firm cards with challenge data, offers and affiliate destinations
- Private email/password administrator sign-in
- Admin tools to add, edit, feature, hide and delete firms
- Affiliate click counting
- Trader review submission (pending moderation)
- Supabase database schema and row-level security policies

## 1. What you need

Create free accounts:
- Supabase: https://supabase.com/
- GitHub: https://github.com/
- Cloudflare Pages: https://pages.cloudflare.com/

You can develop locally on a computer. A phone-only workflow is possible using browser-based development tools, but initial setup is easier on a computer.

## 2. Create the database

1. Create a Supabase project.
2. Open **SQL Editor** in the Supabase dashboard.
3. Open `supabase/schema.sql` from this project, copy all its contents, and run it.
4. In Supabase, go to **Authentication → Users** and create your own user with your email and a strong password.
5. Copy the user's UUID.
6. In SQL Editor, run the following, replacing the UUID with your own user ID:

```sql
insert into public.user_roles (id, role)
values ('PASTE-YOUR-USER-UUID-HERE', 'admin');
```

Do not make the admin role self-service. Never expose a Supabase service-role key in this website.

## 3. Connect the website

1. In Supabase, open **Project Settings → API** (or API Keys).
2. Copy the Project URL.
3. Copy the anon/public key (or publishable key). Never use the `service_role` or secret key in the browser.
4. Duplicate `.env.example` and name the copy `.env`.
5. Add your values:

```env
VITE_SUPABASE_URL=https://YOUR-PROJECT.supabase.co
VITE_SUPABASE_ANON_KEY=YOUR_PUBLIC_OR_ANON_KEY
```

## 4. Run locally

Install Node.js (18+ recommended), then in this project folder run:

```bash
npm install
npm run dev
```

Vite prints a local address, usually `http://localhost:5173`. Open it in your browser.

To check the production build:

```bash
npm run build
```

The deployable site is created in the `dist` folder.

## 5. Publish free with Cloudflare Pages

A simple route is to push this project to a GitHub repository, then:
1. In Cloudflare Pages, choose **Create a project → Connect to Git**.
2. Select your GitHub repository.
3. Build command: `npm run build`
4. Build output directory: `dist`
5. Add the two environment variables from your `.env` file in the Cloudflare Pages project settings.
6. Deploy.

Do not commit `.env` to GitHub. Add `.env` to `.gitignore` before pushing.

## 6. Use the admin dashboard

Open your published website and select **Admin**:
- Sign in using the Supabase user you created.
- The user must have the `admin` role in `public.user_roles`.
- Add prop firms and their public comparison information.
- Paste your own affiliate tracking URL and discount code in the relevant fields.
- Choose **Active / visible** to publish a firm or **Draft / hidden** to keep it private.
- Mark a firm as featured to move it to the top of the directory.

Affiliate URLs are visible to site visitors because they are the destination of the offer buttons. Commission arrangements are not collected or displayed by this starter.

## 7. Important notes before launch

- Verify every firm's fees, drawdown rules, payout terms and promotions directly with the firm. Add a date-checked process before publishing data.
- Disclose affiliate links and paid placements clearly. Do not imply that an affiliate relationship is an independent endorsement.
- Do not claim that a click is a sale. This starter counts clicks only. Confirm purchases and commissions in each firm's affiliate portal.
- Reviews are submitted as pending. This starter does not yet include an admin moderation screen; review moderation can be added in a next version. The database does enforce that public submissions start as pending.
- The current public page shows firm information and discount codes. Add your own privacy policy, terms of use, contact details and cookie/privacy notices appropriate to your audience before launch.
- This is a starter implementation, not a guarantee of security or legal compliance. Have the deployment and database policies reviewed before collecting personal information or accepting paid listings.

## 8. Current scope / next upgrades

Recommended next improvements:
1. Admin review moderation screen.
2. Firm detail pages and side-by-side comparison selection.
3. Country, challenge type, platform and account-size filters.
4. Affiliate reporting imports / conversion tracking integrations.
5. CSV import/export and change history.
6. User accounts, saved firms and watchlists.

## Brand

The starter name is **PropFirm Africa** and can be changed in `index.html` and `src/App.jsx`. Check domain and trademark availability before committing to the name.
