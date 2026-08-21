# DFNS reaction system setup

The reaction UI is already installed on `item.html` and works locally with a browser fallback. To make votes global for every DFNS visitor, connect the free Supabase backend once.

## 1. Create a Supabase project

Go to https://supabase.com/ and create a free project.

## 2. Create the table

Open **SQL Editor** in Supabase and paste the contents of `reactions-setup.sql`, then run it.

## 3. Copy the two browser-safe values

In Supabase open **Project Settings → API** and copy:

- **Project URL**
- **Publishable/anon key** (the public browser key)

Do **not** use or publish the `service_role` key.

## 4. Put them in `js/reactions-config.js`

Replace the two empty strings:

```js
window.DFNS_REACTIONS_CONFIG = {
  url: "YOUR_SUPABASE_PROJECT_URL",
  anonKey: "YOUR_SUPABASE_ANON_KEY"
};
```

After that, every cosmetic page will share the same 🔥 / 💩 vote totals and visitors can change their vote without creating an account.

If the backend is not configured yet, DFNS automatically falls back to local browser storage instead of breaking the cosmetic page.
