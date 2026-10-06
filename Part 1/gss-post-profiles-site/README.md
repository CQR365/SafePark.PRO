# GSS post profiles: review site

A plain static site. No build step and no server. Push the contents of this folder to the repository and serve it (for example with GitHub Pages).

## What is here

- `index.html` : the list of posts. `post/` : one page per post or duty group (42). `ra/` : one page per new risk assessment (19).
- `risk-assessments.html`, `gaps.html`, `downloads.html`, `responses.html`, and `collate.html` (not in the menu).
- `docs/pack/` : every Word and Excel file, in the same layout as the Word pack, so the links inside the Word files still work. `docs/pack/Job_adverts/` holds each job advert on its own. `docs/GSS_Post_Profiles_DRAFT_0610.zip` is the whole pack.
- `assets/site.css` : all styling, in one file. `assets/logo.png`.
- `assets/store.js` : where responses are saved. `assets/review.js` : wires the page controls to the store. `assets/firebase-config.js` : the Firebase project settings and the collection name. `assets/collate.js` : brings all contributors' answers together. `assets/items.js` : the wording of every answerable line (generated).

## Responses

Every Agree box, Comment box and added task saves through `window.Store` in `assets/store.js`.

1. Answers are written to the reader's own browser first, so nothing is lost if the connection drops.
2. They are then copied to Firestore, using the project settings in `assets/firebase-config.js`: one document per contributor in the collection named there (`gss_org_review`).
3. Send my responses marks that document as submitted and, where the Storage rules allow it, saves a copy as a file in Firebase Storage under `gss_org_review/<id>.json`.

If Firebase cannot be reached, the page says so and the contributor can still download their answers as a file to send in.

The Firestore rules must allow read and write on the `gss_org_review` collection, and the Storage rules must allow write under `gss_org_review/`, for this to work. If the rules refuse, answers stay on the device and the page says the central store could not be reached.

## Getting everyone's responses back

Open `collate.html` (it is not in the menu). It is for the Risk and Compliance Manager.

- Load all responses from the central store reads every contributor's document from Firestore.
- Add contributor files does the same from data files people have sent in. Both can be used together; a later set from the same person replaces their earlier one.
- Then download: all responses as a spreadsheet, a summary by line showing who agreed, who did not and every comment, and one combined data file.

The combined data file is the one to use when the documents are updated from the responses.

Anyone who can open `collate.html` can read every contributor's answers, because the page reads them with the same open access the site writes them with.

## Access

There is no access control in this folder. Every page carries `noindex, nofollow`, which asks search engines not to list it, but that is not protection.

A code checked by a script on a public static site does not protect the content: the pages and the Word files can still be fetched directly by anyone who has, or guesses, the address, and a public repository shows every file. If the content needs to be private, serve the pages and the `docs/` files from behind real sign in (for example Firebase Authentication with Storage rules), not only behind a front page.

## Rebuilding

The pages are generated from the same data as the Word files, so the site and the documents cannot drift apart. Regenerate both together when the content changes.
