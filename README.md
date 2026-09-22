# Sideline, project page

The public page for [Sideline](https://sideline-ermis.web.app), published at
**https://ennui92.github.io/sideline-site/**.

Sideline helps a marathon runner's friends organise race day: who stands where
on the course, what they bring, where the runner is right now, a shared chat and
a photo wall. The app's own code lives in a private repository; this repo is
only the page, so it can be served by GitHub Pages.

The waitlist form posts to the app's Cloudflare worker (`/waitlist`), which
saves the address to a write-only Firestore collection and DMs the owner.
