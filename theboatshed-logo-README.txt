THE BOATSHED — LOGO FOR SAFESYSTEMS.PRO MODULES
================================================

FILES
-----
theboatshed-logo-white.png   Transparent, WHITE line art — for DARK sidebars/headers
                             (SafeTeam, SafeLearn, and most module sidebars use a dark sidebar).
theboatshed-logo-navy.png    Transparent, NAVY line art — for LIGHT/white backgrounds
                             (e.g. a printed report header or a light dashboard card).

ONE-TIME SETUP (do this once)
-----------------------------
Upload BOTH .png files to the ROOT of the repo  CQR365/SafePark.PRO
(the same folder that holds index.html, food-safety.html, safeteam-cafe.html, etc.).
That is all — every module references the file by its plain name, so it is shared
across the whole platform and works for future modules automatically.

ALREADY DONE
------------
The logo has been added to the sidebar header of:
  • safeteam-cafe.html
  • safelearn-cafe.html

TO ADD IT TO ANY FUTURE MODULE
------------------------------
Paste this single line inside the module's sidebar header (just before the
wordmark / title), for a dark sidebar:

  <img src="theboatshed-logo-white.png" alt="The Boatshed, Lochgoilhead" onerror="this.style.display='none'" style="display:block;width:150px;max-width:72%;height:auto;margin:0 auto 14px;">

For a LIGHT background, swap the filename to theboatshed-logo-navy.png.

Notes
-----
• The onerror guard means that if the .png is ever missing the image simply hides
  itself — it will never show a broken-image icon on the live site.
• Adjust width:150px up or down to taste; max-width:72% keeps it tidy on mobile.
• The reference is a plain relative path, so it is additive and safe — it does not
  touch any tenant data or existing logic.
