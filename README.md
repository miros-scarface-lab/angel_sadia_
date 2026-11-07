# Angel Sadia (secure version)

Mobile chat site with a Gemini-powered girlfriend persona.
The API key and passwords belong in server-side environment variables (such as Vercel), never in the browser or in GitHub.

## Folder layout

```
angel-sadia/
  api/            server functions (hold the secrets)
    _lib.js       helpers (tokens, rate limit)
    auth.js       login for site and admin
    chat.js       sends messages to Gemini
    models.js     lists Gemini models (admin only)
  public/         what visitors download
    index.html
    style.css
    app.js
  vercel.json     security headers
  package.json
  .env.example    names of the secrets (no real values)
  .gitignore
```

## Configuration

No credentials are stored in this repository. Configure the values below in your hosting provider's
server-side environment variables (for example, Vercel > Project > Settings > Environment Variables).
`SITE_PASSWORD` can be empty to allow anyone with the site link to chat; set a unique password to
require sign-in.

## Deploy in 5 steps

1. **Create a new Google API key** in Google AI Studio and revoke any previously hard-coded key.
   In Google Cloud Console you can also limit the key to the Generative Language API.
2. **Create secrets.** Make four values:
   - `GEMINI_API_KEY`: your new Gemini key
   - `SITE_PASSWORD`: the password you type to open the chat
   - `ADMIN_PASSWORD`: a different password for the admin panel
   - `AUTH_SECRET`: a long random string. On Windows run in a terminal:
     `python -c "import secrets; print(secrets.token_hex(32))"`
3. **Upload to GitHub.** Push this project to your repository. Keep credentials out of GitHub,
   including in private repositories.
4. **Import to Vercel.** Add New Project, pick the repo. Before deploying, open
   Environment Variables and add the four values above (optional: `GEMINI_MODEL`).
5. **Deploy.** Open the link, log in with `SITE_PASSWORD`. Use the three-dot menu for the admin panel.

If you add or change an environment variable later, redeploy the project so it takes effect.

## What is protected

- The Gemini key is only on the server. Visitors cannot see it in the page, the code or the network tab.
- When `SITE_PASSWORD` is set, nobody can chat without it, helping protect your quota.
- Admin panel needs a second password, checked on the server.
- Login attempts are limited (8 per 15 minutes per IP) and wrong guesses are slowed down.
- Login tokens are signed and expire (site: 30 days, admin: 30 minutes).
- Strict security headers: blocks injected scripts, embedding in other sites, and leaks.
- Messages are shown as plain text, so pasted HTML or scripts cannot run.

## What is not covered (be aware)

- No site is 100% unhackable. This setup closes the common holes for a personal project.
- Use long, unique passwords. A weak `SITE_PASSWORD` is the easiest way in.
- Name, picture, behaviour, chat file and chat history are saved in each phone's browser.
  Anyone who can unlock your phone can read that chat.
- The rate limiter is best-effort on serverless hosting. For stronger limits, add a store such as
  Upstash Redis.
- Set a spending limit or alerts on your Google Cloud project.
