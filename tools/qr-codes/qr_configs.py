"""Single source of truth for every ELATŌ QR code destination.

To change an existing QR's destination: edit its URL constant below, then
rerun its script (e.g. `python generate_menu_qr.py`). Nothing else needs
to change.

To add a new QR (Stay, Events, Website, Instagram, WhatsApp, ...): add a
URL + QRConfig pair below, and a one-line generate_<name>_qr.py script
that calls generate_qr() with it — see generate_menu_qr.py for the pattern.
"""

from pathlib import Path

from qr_generator import QRConfig

REPO_ROOT = Path(__file__).resolve().parents[2]
QR_OUTPUT_DIR = REPO_ROOT / "assets" / "qr"

# The Menu URL lives here and nowhere else. Points straight at the
# Celebré page's #menu section — same destination as the site's own
# "Our Menu" nav button — so it opens directly with no intermediate
# redirect hop.
#
# www, not the bare apex: Vercel 308-redirects elatogroups.in ->
# www.elatogroups.in (same reasoning as SITE_URL in
# elato-web/src/lib/seoConfig.ts), so the QR must point straight at the
# final URL rather than one that itself redirects.
MENU_URL = "https://www.elatogroups.in/elato-celebre#menu"

MENU_QR = QRConfig(
    url=MENU_URL,
    output_path=QR_OUTPUT_DIR / "menu-qr.png",
)

# Future destinations, e.g.:
# STAY_URL = "https://www.elatogroups.in/elato-stay"
# STAY_QR = QRConfig(url=STAY_URL, output_path=QR_OUTPUT_DIR / "stay-qr.png")
