# Hake's Brain

A calm, editorial-style personal library for essays, books, notes, and everything in between. Every visitor must sign in before the library is shown.

## Temporary local access

The active version uses temporary browser-local accounts so it can work without a hosted service:

- Create an account with a username, password, and short description.
- The first account created in a browser becomes the local owner.
- Later accounts are reader accounts and cannot create, edit, publish, or delete pages.
- Passwords are never stored as plain text; the browser stores a salted Web Crypto hash.
- Documents, images, sessions, account records, and reading history stay in that browser's local storage.
- The owner can use the **Who has been reading** board to see the viewer username, description, document opened, and local date/time.

This is temporary access, not real security. Anyone who can use browser developer tools can inspect, change, or clear local storage and JavaScript. Do not use an important password, and do not store sensitive writing or personal information here. Local accounts and the reading board do not follow a visitor to another browser or device.

## Setup

Serve the folder over a local web server. Opening the HTML file directly can prevent browser features from working consistently.

If Python is installed, run this from the project folder:

```text
python -m http.server 5500
```

Then open `http://localhost:5500` and create the first temporary account. Keep the project files and browser profile private if the writing is private.

## Using the desk

- Sign in before viewing the library.
- The first account on a browser is the owner account.
- Owner accounts can use **New document**, edit pages, publish pages, add images, and delete pages.
- Add a title, short description, category, and comma-separated tags.
- Write in the editor, use the formatting toolbar, and choose **Image** to add a JPEG, PNG, or WebP image.
- Images require alt text and are stored as temporary local data. Local images must be smaller than 2 MB and no larger than 2400px on their longest edge.
- Turn **Publish this page** on when a page should be visible to reader accounts.
- Open the owner board to refresh or clear reading history. Timestamps use the visitor's local browser time when displayed and are recorded as ISO timestamps internally.
- Use the theme button in the header to switch between ink and paper modes.

## Deploying

Upload `index.html`, `css/`, `js/`, and `assets/` to a static host such as Netlify, Vercel, GitHub Pages, or Cloudflare Pages. This local mode still cannot provide trustworthy authentication on a public site. Do not use it to protect sensitive content.

## Future secure hosting

The `supabase/` directory remains as a reference implementation for returning to real hosted authentication and database security later. A secure hosted version should use Supabase Auth, Row Level Security, and Storage with only a public anon key in frontend code. Never put a Supabase service-role key or a real password in `js/config.js` or any frontend file.
