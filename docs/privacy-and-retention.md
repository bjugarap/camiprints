# Privacy and retention — photo converter

The product promise, verbatim from the UI: *"Your photo is deleted after
you leave. Nothing is published."* This document is the precise version.

## What we tell users

- Only use images you own or have permission to use.
- Do not convert copyrighted characters, artwork or images without
  permission. (The rights confirmation is required on every path,
  including the Chrome extension.)
- The photo is never published and never added to the public library.
- The temporary transfer used by the extension is deleted per the policy
  below.
- Photos are not used for advertising or model training by CamiPrints.

## Where photo data lives, and for how long

**Normal upload / drag-and-drop (LocalProvider)**
- The photo is processed entirely in the user's browser. It is never
  transmitted to CamiPrints servers.
- Browser copies: wizard session state in `sessionStorage` (dies with the
  tab session) and the photo/result blobs in IndexedDB (overwritten by the
  next session; wiped by "Start Over" / "Make another").

**Chrome-extension handoff**
- The image transits `TemporaryPhotoStore` on the server, private, keyed
  by a cryptographically random single-use token.
- Deleted: **immediately on redemption** (the read is a destructive
  read); on token expiry (**10 minutes**, swept opportunistically on
  subsequent requests); and any expired record is burned even by a failed
  redemption attempt. "Start Over" on the website clears the browser-side
  copies; the server-side record is already gone by then.
- No public URL to the stored object ever exists.

**Source page URL**: not collected. The extension sends image bytes only;
the handoff record stores bytes, MIME type, a sanitized filename and
timestamps — nothing about the page the image came from.

**Logging & analytics**: no photo bytes, no filenames-with-paths, no image
contents in logs or analytics. Handoff endpoints return generic error
messages and log nothing about image content.

**Future accounts**: saved creations will be an explicit opt-in, stored in
a private bucket behind the same repository/storage seams (ADR 004), with
admin access audit-logged. Nothing in the current architecture needs to
change shape for that — a `saved-creation` intake adapter and a storage
implementation slot into existing interfaces.
