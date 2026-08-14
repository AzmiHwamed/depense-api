from pathlib import Path
from PIL import Image
from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER, TA_LEFT
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import mm
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, PageBreak, Image as RLImage,
    Table, TableStyle, KeepTogether, Preformatted, HRFlowable,
)
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.pdfbase import pdfmetrics
from reportlab.lib.utils import ImageReader
import html

ROOT = Path(r"C:\Users\akihi\Documents\translate-app")
TMP = ROOT / "tmp" / "pdfs"
OUT = ROOT / "output" / "pdf"
OUT.mkdir(parents=True, exist_ok=True)
TMP.mkdir(parents=True, exist_ok=True)
SOURCE = Path(r"C:\Users\akihi\AppData\Local\Temp\codex-clipboard-ce08fbeb-ba6c-45d5-b0a6-f8e6e5831a3d.png")
PDF = OUT / "SmartTravel_Mobile_API_Implementation_Guide.pdf"

FONT_REG = r"C:\Windows\Fonts\segoeui.ttf"
FONT_BOLD = r"C:\Windows\Fonts\segoeuib.ttf"
FONT_MONO = r"C:\Windows\Fonts\consola.ttf"
pdfmetrics.registerFont(TTFont("UI", FONT_REG))
pdfmetrics.registerFont(TTFont("UI-Bold", FONT_BOLD))
pdfmetrics.registerFont(TTFont("Mono", FONT_MONO))

NAVY = colors.HexColor("#111A3A")
PURPLE = colors.HexColor("#6759E8")
LAVENDER = colors.HexColor("#F0EEFF")
INK = colors.HexColor("#20243A")
MUTED = colors.HexColor("#69708A")
LINE = colors.HexColor("#E3E6F0")
GREEN = colors.HexColor("#197A55")
RED = colors.HexColor("#B43B4A")
PALE = colors.HexColor("#F7F8FC")

# Crops align with the labeled horizontal groups in the supplied design board.
Image.MAX_IMAGE_PIXELS = None
source_full = Image.open(SOURCE).convert("RGB")
preview_width = 1400
preview_height = round(source_full.height * preview_width / source_full.width)
source = source_full.resize((preview_width, preview_height), Image.Resampling.LANCZOS)
preview_source = TMP / "design_board_preview.jpg"
source.save(preview_source, quality=88, optimize=True)
w, h = source.size
crops = {
    "onboarding": (0, 0, w, round(h * .145)),
    "auth": (0, round(h * .135), w, round(h * .285)),
    "core": (0, round(h * .275), w, round(h * .475)),
    "money": (0, round(h * .465), w, round(h * .655)),
    "support": (0, round(h * .645), w, round(h * .825)),
    "account": (0, round(h * .81), w, h),
}
crop_paths = {}
for name, box in crops.items():
    p = TMP / f"design_{name}.png"
    source.crop(box).save(p, quality=95)
    crop_paths[name] = p

styles = getSampleStyleSheet()
styles.add(ParagraphStyle(name="CoverTitle", fontName="UI-Bold", fontSize=29, leading=34, textColor=colors.white, alignment=TA_LEFT, spaceAfter=8))
styles.add(ParagraphStyle(name="CoverSub", fontName="UI", fontSize=12, leading=18, textColor=colors.HexColor("#D9DDF3")))
styles.add(ParagraphStyle(name="H1x", fontName="UI-Bold", fontSize=22, leading=27, textColor=NAVY, spaceAfter=8))
styles.add(ParagraphStyle(name="H2x", fontName="UI-Bold", fontSize=14, leading=18, textColor=NAVY, spaceBefore=8, spaceAfter=5))
styles.add(ParagraphStyle(name="H3x", fontName="UI-Bold", fontSize=10.5, leading=14, textColor=PURPLE, spaceBefore=5, spaceAfter=3))
styles.add(ParagraphStyle(name="Bodyx", fontName="UI", fontSize=9, leading=13.3, textColor=INK, spaceAfter=5))
styles.add(ParagraphStyle(name="Smallx", fontName="UI", fontSize=7.7, leading=11, textColor=MUTED, spaceAfter=3))
styles.add(ParagraphStyle(name="Callout", fontName="UI", fontSize=8.5, leading=12.2, textColor=INK, backColor=LAVENDER, borderColor=colors.HexColor("#D9D4FF"), borderWidth=.5, borderPadding=8, spaceBefore=5, spaceAfter=7))
styles.add(ParagraphStyle(name="Endpoint", fontName="UI-Bold", fontSize=9.2, leading=12, textColor=colors.white))
styles.add(ParagraphStyle(name="TOC", fontName="UI", fontSize=9, leading=13, textColor=INK))

def esc(s): return html.escape(str(s))

def p(text, style="Bodyx"):
    return Paragraph(text, styles[style])

def code(text):
    return Preformatted(text.strip(), ParagraphStyle(
        name="CodeLocal", fontName="Mono", fontSize=6.7, leading=9,
        textColor=colors.HexColor("#252941"), backColor=PALE,
        borderColor=LINE, borderWidth=.5, borderPadding=7,
        leftIndent=0, rightIndent=0, spaceBefore=3, spaceAfter=7,
    ))

def endpoint(method, path, auth=True, purpose=None):
    badge = Table([[p(f"{method}  {esc(path)}", "Endpoint"), p("Bearer token" if auth else "Public", "Smallx")]], colWidths=[135*mm, 34*mm])
    badge.setStyle(TableStyle([
        ("BACKGROUND", (0,0), (0,0), PURPLE),
        ("BACKGROUND", (1,0), (1,0), colors.HexColor("#E8EAF3")),
        ("TEXTCOLOR", (1,0), (1,0), INK),
        ("VALIGN", (0,0), (-1,-1), "MIDDLE"),
        ("LEFTPADDING", (0,0), (-1,-1), 8), ("RIGHTPADDING", (0,0), (-1,-1), 8),
        ("TOPPADDING", (0,0), (-1,-1), 6), ("BOTTOMPADDING", (0,0), (-1,-1), 6),
        ("BOX", (0,0), (-1,-1), .5, LINE),
    ]))
    result = [Spacer(1, 3), badge]
    if purpose: result.append(p(purpose, "Smallx"))
    return result

def response_note():
    return p("All examples below show only the value inside <b>data</b>. The server wraps it in the standard response envelope documented on page 3.", "Smallx")

def design(path, width=172*mm, max_h=55*mm):
    im = Image.open(path)
    ratio = im.height / im.width
    h = min(width * ratio, max_h)
    w = h / ratio
    return RLImage(str(path), width=w, height=h)

def screen_header(title, subtitle, crop=None):
    items = [p(title, "H1x"), p(subtitle, "Bodyx")]
    if crop:
        items += [Spacer(1, 3), design(crop), Spacer(1, 6)]
    return items

def table(rows, widths=None):
    data = [[p(str(c), "Smallx") for c in row] for row in rows]
    t = Table(data, colWidths=widths, repeatRows=1)
    t.setStyle(TableStyle([
        ("BACKGROUND", (0,0), (-1,0), NAVY), ("TEXTCOLOR", (0,0), (-1,0), colors.white),
        ("FONTNAME", (0,0), (-1,0), "UI-Bold"),
        ("GRID", (0,0), (-1,-1), .4, LINE),
        ("VALIGN", (0,0), (-1,-1), "TOP"),
        ("ROWBACKGROUNDS", (0,1), (-1,-1), [colors.white, PALE]),
        ("LEFTPADDING", (0,0), (-1,-1), 5), ("RIGHTPADDING", (0,0), (-1,-1), 5),
        ("TOPPADDING", (0,0), (-1,-1), 5), ("BOTTOMPADDING", (0,0), (-1,-1), 5),
    ]))
    return t

def bullets(items):
    return [p(f"<font color='#6759E8'>•</font> {x}", "Bodyx") for x in items]

story = []

# Cover
cover = Table([[p("SMARTTRAVEL", "Endpoint")]], colWidths=[174*mm], rowHeights=[10*mm])
cover.setStyle(TableStyle([("BACKGROUND", (0,0), (-1,-1), PURPLE), ("LEFTPADDING", (0,0), (-1,-1), 10)]))
story += [cover, Spacer(1, 24*mm), p("Mobile Application\nAPI Implementation Guide", "CoverTitle"),
          p("Screen-by-screen contracts for the SmartTravel mobile developer", "CoverSub"), Spacer(1, 13*mm),
          design(preview_source, width=174*mm, max_h=105*mm), Spacer(1, 8*mm),
          p("Backend: NestJS API  |  Authentication: Firebase  |  Database: SQL", "CoverSub"),
          p("Prepared from the supplied mobile design board and the implemented backend source - 14 August 2026", "CoverSub"), PageBreak()]

# Overview
story += screen_header("1. Design-to-API map", "Use this as the build order and acceptance checklist.", preview_source)
story.append(table([
    ["Screen group", "Primary API responsibilities"],
    ["Splash / onboarding", "Local-only UI. Load reference data before setup."],
    ["Choose", "GET countries, currencies, languages; PATCH users/me after authentication."],
    ["Sign up / login / reset", "Firebase-backed auth endpoints, refresh-token rotation."],
    ["Home", "Profile, expense statistics, recent expenses, notifications."],
    ["Scan", "Multipart receipt OCR, recommendation, expense creation."],
    ["History", "Receipt list/detail and expense list with date/category filters."],
    ["Currency converter", "Currency list plus conversion query."],
    ["Notifications", "FCM device registration, list/read/delete, country-change check."],
    ["Expenses", "Expense CRUD, categories, statistics."],
    ["FAQs / help / service", "Public FAQs and authenticated support chat."],
    ["Account / edit / settings", "GET/PATCH users/me and reference lists."],
    ["Interpreter / subscription", "Audio conversation workflow and payment lifecycle."],
], [44*mm, 125*mm]))
story += [p("Design note", "H2x"), p("The image contains alternative splash/onboarding versions. Choose one visual version; all three are local-only and use the same API behavior after the user taps Get Started.", "Callout"), PageBreak()]

# Global contract
story += screen_header("2. Global API contract", "Rules that apply to every mobile feature.")
story += bullets([
    "Base URL: configure per environment; local default is <b>http://localhost:3000</b>. A physical phone cannot use localhost to reach the developer PC.",
    "Protected request header: <b>Authorization: Bearer &lt;Firebase idToken&gt;</b>.",
    "JSON requests use <b>Content-Type: application/json</b>. Uploads use multipart/form-data and must let the SDK generate the boundary.",
    "Firebase ID tokens expire after about one hour. Store the refresh token securely and call POST /auth/refresh before expiry or after a 401.",
    "Dates are ISO-8601 strings. Database identifiers are UUID strings. Currency/country/language selectors must store the returned database ID, not just the display code.",
])
story += [p("Successful response envelope", "H2x"), code('''{
  "status_code": 200,
  "title": "Loaded successfully",
  "body": "Loaded successfully",
  "data": { ...endpoint-specific payload... }
}'''), p("Error envelope", "H2x"), code('''{
  "status_code": 400,
  "title": "Human-readable error message",
  "body": "Human-readable error message",
  "data": null
}'''),
          p("Mobile client rule", "H2x"), p("Decode <b>data</b> only after checking both the HTTP status and <b>status_code</b>. A 204 delete has no body. Never display raw Firebase/provider error identifiers directly to users.", "Callout"),
          p("Common status handling", "H2x"), table([
              ["Status", "Mobile behavior"], ["200/201", "Render data and update local cache."], ["204", "Remove local row; do not parse JSON."],
              ["400", "Show validation/business message."], ["401", "Refresh once, retry once, then sign out."],
              ["403", "Subscription/admin restriction."], ["404", "Show not found and return safely."], ["502/503", "Provider unavailable; offer retry."],
          ], [28*mm, 141*mm]), PageBreak()]

# Onboarding / choose
story += screen_header("3. Splash, onboarding and Choose", "Screen behavior and reference-data contracts.", crop_paths["onboarding"])
story += [p("Splash and onboarding", "H2x")] + bullets([
    "No backend call is required. Persist an onboardingComplete boolean locally.",
    "On Get Started, navigate to Choose for first-time users or Login for returning users.",
])
story += endpoint("GET", "/countries", False, "Populate Current Country. Optional Bearer token enables translated names.")
story += [code('''[
  {
    "id": "country-uuid", "name": "Tunisia",
    "alpha2Code": "TN", "alpha3Code": "TUN", "flag": "...",
    "region": "Africa", "capital": "Tunis",
    "currencyId": "currency-uuid", "currency": { ... }, "isActive": true
  }
]''')]
story += endpoint("GET", "/currencies", False, "Populate Home Currency.")
story += [code('[{ "id": "currency-uuid", "code": "TND", "name": "Tunisian Dinar", "isActive": true }]')]
story += endpoint("GET", "/languages", False, "Populate app and interpreter language selectors.")
story += [code('[{ "id": "language-uuid", "code": "ar", "name": "Arabic" }]'),
          p("Setup sequencing", "H2x"), p("The current registration body accepts only email/password. Keep setup selections locally, register/login, then send them with PATCH /users/me as documented in Account & Settings.", "Callout"), PageBreak()]

# Signup login
story += screen_header("4. Sign up and Login", "Authentication screens from the supplied design.", crop_paths["auth"])
story += endpoint("POST", "/auth/register", False, "Create an email/password account.")
story += [p("Body", "H3x"), code('''{ "email": "traveler@example.com", "password": "secret123" }'''),
          p("data", "H3x"), code('''{
  "user": { "id": "user-uuid", "email": "traveler@example.com", ... },
  "idToken": "firebase-id-token",
  "refreshToken": "firebase-refresh-token"
}''')]
story += endpoint("POST", "/auth/login", False, "Email/password sign in. Body and response match registration.")
story += endpoint("POST", "/auth/oauth", False, "Google or Facebook sign in after obtaining a token from the native provider SDK.")
story += [code('''{
  "provider": "google.com",
  "token": "provider-id-token-or-access-token"
}'''), p("Allowed provider values: <b>google.com</b>, <b>facebook.com</b>.", "Smallx")]
story += endpoint("POST", "/auth/refresh", False, "Renew the Firebase ID token without asking the user to log in again.")
story += [code('''Request:  { "refreshToken": "stored-refresh-token" }
data: {
  "access_token": "new-id-token",
  "refresh_token": "rotated-refresh-token",
  "expires_in": "3600", "token_type": "Bearer", "user_id": "..."
}'''), p("Secure storage", "H2x"), p("Store tokens in iOS Keychain / Android Keystore-backed secure storage. Do not store them in plain preferences. Replace both tokens when refresh returns a rotated refresh_token.", "Callout"), PageBreak()]

# reset / session
story += screen_header("5. Reset password, session restore and logout", "Three-step reset matching the email, OTP and new-password screens.")
story += endpoint("POST", "/auth/send-reset-mail", False)
story += [code('{ "email": "traveler@example.com" }'), p("Sends a four-digit OTP. OTP validity is five minutes.", "Smallx")]
story += endpoint("POST", "/auth/validate-reset-mail", False)
story += [code('''Request: { "email": "traveler@example.com", "otp": "1234" }
data: { "resetPassToken": "5678" }''')]
story += endpoint("POST", "/auth/reset-password", False)
story += [code('''{
  "email": "traveler@example.com",
  "resetPassToken": "5678",
  "newPassword": "new-secret123"
}'''), p("Session restore", "H2x"), p("On app launch, load secure tokens, refresh if the ID token is near expiry, then call GET /users/me. Route to Login only when refresh fails.", "Bodyx"),
          p("Logout", "H2x"), p("There is no server logout endpoint. Delete the local ID/refresh tokens, unregister the push token with DELETE /notifications/devices/:token, clear cached private data, and return to Login.", "Callout"), PageBreak()]

# Home
story += screen_header("6. Home dashboard", "Data composition for the balance card, trends, rates and recent expenses.", crop_paths["core"])
story += endpoint("GET", "/users/me", True, "Profile, chosen country/currency/language and subscription state.")
story += [code('''{
  "id": "user-uuid", "email": "traveler@example.com",
  "displayName": "Nadia Ali", "photoURL": "https://...",
  "currentCountryId": "...", "currentCountry": { ... },
  "currencyId": "...", "currency": { "code": "TND", ... },
  "languageId": "...", "language": { "code": "en", ... },
  "subscriptionStatus": "trial|active|expired|cancelled",
  "trialEndsAt": "ISO-date", "subscriptionEndsAt": "ISO-date|null"
}''')]
story += endpoint("GET", "/expenses/statistics?groupBy=month&startDate=...&endDate=...", True, "Dashboard total, category chart and time series.")
story += [code('''{
  "total": 1560.60, "count": 18, "currencyId": "home-currency-uuid",
  "groupBy": "month",
  "byCategory": [{ "categoryId": "...", "categoryName": "Food", "categoryColor": "#F59E0B", "total": 620, "count": 7 }],
  "byPeriod": [{ "period": "2026-08-01", "total": 420.50, "count": 5 }]
}''')]
story += endpoint("GET", "/expenses?startDate=...&endDate=...", True, "Recent transactions; sort is newest first.")
story += endpoint("GET", "/notifications/me", True, "Unread badge and recent alerts.")
story += [p("Refresh behavior", "H2x"), p("Load these calls concurrently after GET /users/me succeeds. Pull-to-refresh repeats statistics, expenses and notifications. Do not block the whole home screen if one card fails.", "Callout"), PageBreak()]

# scan
story += screen_header("7. Scan receipt and review result", "Camera/gallery upload, OCR result and save-to-expenses flow.", crop_paths["core"])
story += endpoint("POST", "/receipts/extract", True, "Multipart OCR upload. The file field name must be exactly image.")
story += [code('''Content-Type: multipart/form-data
image: <jpg|jpeg|png|webp|pdf file, maximum 10 MB>'''),
          p("data (representative receipt)", "H3x"), code('''{
  "id": "receipt-uuid", "documentType": "receipt",
  "language": "fr", "country": "Tunisia", "merchant": "Carrefour",
  "address": "...", "phone": "...", "invoiceNumber": "...",
  "date": "2026-08-14", "time": "13:22", "currency": "TND",
  "subtotal": 30.0, "tax": 2.4, "total": 32.4,
  "paymentMethod": "card", "rawText": "...",
  "items": [{ "id": "...", "name": "Water", "quantity": 2, "unitPrice": 1.2, "totalPrice": 2.4 }],
  "convertedTotal": 32.4, "convertedCurrencyId": "home-currency-uuid"
}''')]
story += endpoint("POST", "/receipts/receipt-recommendations/:receiptId", True, "Request category and description suggestions after OCR.")
story += endpoint("PATCH", "/receipts/:id", False, "Edit OCR fields before saving. Current backend route is not guarded; mobile should still send Bearer.")
story += endpoint("POST", "/expenses/from-receipt", True, "Create the expense when Save to History is tapped.")
story += [code('''{
  "receiptId": "receipt-uuid", "categoryId": "category-uuid",
  "description": "Groceries", "amount": 32.4, "date": "2026-08-14",
  "merchantName": "Carrefour", "googlePlaceId": "optional",
  "merchantLatitude": 36.8, "merchantLongitude": 10.18
}'''), p("Important: the receipt recommendation may be absent or low-confidence. Keep category selection editable and require a categoryId before creating an expense.", "Callout"), PageBreak()]

# History
story += screen_header("8. History, search and filters", "The design shows receipt cards plus country/currency/merchant/date filters.", crop_paths["core"])
story += endpoint("GET", "/receipts", True, "Fetch receipt history.")
story += endpoint("GET", "/receipts/:id", True, "Open a receipt detail.")
story += endpoint("DELETE", "/receipts/:id", True, "Delete a saved receipt.")
story += endpoint("GET", "/expenses?categoryId=:uuid&startDate=:iso&endDate=:iso", True, "Filter expense history.")
story += [p("Backend gap to respect", "H2x"), p("The current receipt list controller accepts a query DTO but does not pass it into the service, and receipt rows are not user-owned in the entity. Therefore the country/currency/merchant search shown in the design is <b>not safely supported server-side yet</b>. For the current mobile build, filter the fetched list locally only for small datasets, and schedule backend pagination + per-user ownership before production.", "Callout"),
          p("Client-side search fields", "H2x"), table([["Filter", "Receipt property"], ["Country", "country"], ["Currency", "currency"], ["Merchant", "merchant"], ["Date", "date"], ["Amount", "total"]], [42*mm, 127*mm]),
          p("Empty state", "H2x"), p("Show No Results Found only after a successful fetch and filter. A network error should have its own Retry state.", "Bodyx"), PageBreak()]

# currency
story += screen_header("9. Convert Currency", "Currency selection, amount entry, swap and result.", crop_paths["money"])
story += endpoint("GET", "/currencies", False, "Load and search active currencies. Retain both id and ISO code.")
story += endpoint("GET", "/currencies/convert?amount=100&fromCurrencyId=:uuid&toCurrencyId=:uuid", False)
story += [code('''{
  "from": { "id": "...", "code": "USD", "name": "US Dollar" },
  "to": { "id": "...", "code": "EUR", "name": "Euro" },
  "originalAmount": 100,
  "convertedAmount": 85.71,
  "rate": 0.8571,
  "date": "2026-08-14"
}'''), p("Validation", "H2x"), p("amount must be at least 0.01. Both currency parameters are database UUIDs. Debounce conversion while typing; execute immediately on the Exchange button. Swap exchanges the selected IDs and runs again.", "Callout"), PageBreak()]

# expenses
story += screen_header("10. Expenses", "List, add/edit, category chart and spending trend.", crop_paths["money"])
story += endpoint("GET", "/expense-categories", True)
story += [code('[{ "id": "category-uuid", "name": "Food", "icon": "utensils", "color": "#F59E0B", "description": "..." }]')]
story += endpoint("POST", "/expenses", True)
story += [code('''{
  "amount": 42.5, "description": "Dinner", "shop": "Local Cafe",
  "date": "2026-08-14T19:30:00.000Z",
  "categoryId": "category-uuid", "currencyId": "currency-uuid",
  "googlePlaceId": "optional", "merchantAddress": "optional",
  "merchantLatitude": 36.8, "merchantLongitude": 10.18,
  "googleMapsUri": "https://...", "merchantMatchConfidence": 91
}''')]
story += endpoint("GET", "/expenses", True, "Optional categoryId/startDate/endDate query parameters.")
story += endpoint("GET", "/expenses/:id", True)
story += endpoint("PATCH", "/expenses/:id", True, "Partial body matching POST fields.")
story += endpoint("DELETE", "/expenses/:id", True, "Returns HTTP 204 with no body.")
story += [p("Expense response detail", "H2x"), p("amount is returned as a decimal <b>string</b>. Each item also includes convertedAmount and convertedCurrencyId in the user's home currency. Parse monetary values with a decimal-safe strategy and format only for display.", "Callout"), PageBreak()]

# notifications
story += screen_header("11. Notifications and push registration", "Inbox, empty state, unread badges and native push lifecycle.", crop_paths["money"])
story += endpoint("POST", "/notifications/devices", True, "Register the current FCM token after login and whenever it rotates.")
story += [code('{ "token": "fcm-device-token", "platform": "ios|android" }')]
story += endpoint("GET", "/notifications/me", True)
story += [code('''[{
  "id": "notification-uuid", "title": "Receipt extracted",
  "body": "Your receipt was extracted successfully",
  "data": { "type": "receipt.extracted", "receiptId": "..." },
  "source": "event", "read": false, "pushSent": true,
  "createdAt": "2026-08-14T13:25:00.000Z"
}]''')]
story += endpoint("PATCH", "/notifications/:id/read", True)
story += endpoint("PATCH", "/notifications/me/read-all", True)
story += endpoint("DELETE", "/notifications/:id", True)
story += endpoint("DELETE", "/notifications/devices/:token", True, "Call on logout. URL-encode the token.")
story += [p("Notification tap routing", "H2x"), p("Route from data.type: receipt.* -> receipt detail; expense.* -> expense detail; payment.succeeded -> account/subscription; nearby-place -> maps URI; country_change_suggestion -> country confirmation dialog.", "Callout"), PageBreak()]

# country / nearby
story += screen_header("12. Location-driven notifications", "Country-change prompt and hourly nearby recommendations.")
story += endpoint("POST", "/notifications/check-country", True, "After native location permission, reverse-geocode coordinates to an ISO alpha-2 country code.")
story += [code('''Request: { "detectedCountryCode": "FR" }
data: {
  "matches": false,
  "declaredCountry": { "id": "...", "name": "Tunisia", ... },
  "detectedCountry": { "id": "...", "name": "France", ... },
  "notification": { "id": "...", "data": {
    "type": "country_change_suggestion",
    "detectedCountryId": "...", "detectedCountryName": "France"
  }}
}''')]
story += endpoint("POST", "/explore/check-in", True, "Nearby-place recommendation; call at most once per hour.")
story += [code('''{
  "latitude": 48.8566, "longitude": 2.3522,
  "accuracy": 30, "languageCode": "en"
}'''), p("data: recommended boolean, optional notificationId, and place { id, name, address, googleMapsUri, distanceMeters }.", "Smallx"),
          p("Permission behavior", "H2x"), p("Ask only in context, explain the benefit, and continue normally if denied. Country checks can run on login/foreground with a 12-hour client throttle. Nearby checks use a one-hour frontend and backend cooldown.", "Callout"), PageBreak()]

# FAQ help
story += screen_header("13. FAQs and Help Center", "Public help content and static contact links.", crop_paths["support"])
story += endpoint("GET", "/faqs/categories", False)
story += [code('[{ "id": "category-uuid", "name": "Account", "description": "...", "order": 0, "isActive": true }]')]
story += endpoint("GET", "/faqs?categoryId=:uuid", False, "List FAQs; omit categoryId for all active entries.")
story += [code('[{ "id": "faq-uuid", "question": "How do I reset my password?", "answer": "...", "categoryId": "...", "order": 0 }]')]
story += endpoint("GET", "/faqs/category/:categoryId", False, "Alternative category-specific list.")
story += [p("Help Center contact buttons", "H2x"), p("WhatsApp, website, Facebook and Instagram in the design have no backend endpoint. Configure these URLs in mobile environment/remote config and open them with native deep links. Provide browser fallback when the target app is unavailable.", "Callout"), PageBreak()]

# Chat
story += screen_header("14. Customer Service chat", "Conversation bootstrap, paginated history, sending and live updates.", crop_paths["support"])
story += endpoint("GET", "/chat/conversations/me", True, "Get or create the user's single support conversation.")
story += [code('''{
  "id": "conversation-uuid", "userId": "user-uuid",
  "userDisplayName": "Nadia Ali", "lastMessagePreview": "Hello",
  "lastMessageAt": "ISO-date", "unreadByUser": 1, "unreadByAdmin": 0
}''')]
story += endpoint("GET", "/chat/conversations/:id/messages?before=:iso&limit=30", True)
story += [code('[{ "id": "message-uuid", "conversationId": "...", "senderId": "...", "senderRole": "user|admin", "body": "Hello", "isRead": false, "createdAt": "ISO-date" }]')]
story += endpoint("POST", "/chat/conversations/:id/messages", True)
story += [code('{ "body": "I need help with a scanned receipt." }')]
story += endpoint("PATCH", "/chat/conversations/:id/read", True)
story += [p("Realtime", "H2x"), p("REST remains the source for writes and history. The backend mirrors chat to Firebase Realtime Database. Obtain a custom token with POST /auth/firebase-token, sign into Firebase, then subscribe to the conversation path described by the backend chat integration. Reconnect and re-fetch history after network loss.", "Callout"), PageBreak()]

# account/settings
story += screen_header("15. Account, Edit Profile and Settings", "Profile display, editable choices and app preferences.", crop_paths["account"])
story += endpoint("GET", "/users/me", True)
story += endpoint("PATCH", "/users/me", True, "Multipart form-data; submit only changed fields.")
story += [code('''displayName: "Nadia Ali"              (optional string)
currencyId: "currency-uuid"             (optional UUID)
currentCountryId: "country-uuid"        (optional UUID)
languageId: "language-uuid"             (optional UUID)
image: <binary image>                    (optional; password accounts only)'''),
          p("Reference selectors", "H2x"), p("Use GET /countries, GET /currencies and GET /languages. After a successful update, replace the cached profile with response data and immediately update layout direction for RTL languages.", "Bodyx"),
          p("Settings boundary", "H2x"), p("Theme and most notification toggles shown in the design are currently local device settings. The backend supports device registration and notification records, but it does not persist per-topic preference switches. Do not pretend those switches sync across devices until a preferences endpoint is added.", "Callout"), PageBreak()]

# Interpreter
story += screen_header("16. Live Interpreter", "Implemented feature not shown on the older design board; include it in the mobile build.")
story += endpoint("POST", "/interpreter/conversations", True)
story += [code('{ "travelerLanguage": "ar", "localLanguage": "en", "title": "Hotel check-in" }')]
story += endpoint("GET", "/interpreter/conversations", True)
story += endpoint("GET", "/interpreter/conversations/:id", True, "Returns the conversation with ordered turns.")
story += endpoint("POST", "/interpreter/conversations/:id/turns", True, "Multipart audio upload, maximum 10 MB.")
story += [code('''audio: <audio file>
speaker: "traveler" | "local"
sourceLanguage: "ar"
targetLanguage: "en"'''),
          p("Turn data", "H3x"), code('''{
  "id": "turn-uuid", "speaker": "traveler",
  "sourceLanguage": "ar", "targetLanguage": "en",
  "sourceText": "...", "translatedText": "...",
  "sourceAudioUrl": "/files/interpreter/...",
  "translatedAudioUrl": "/files/interpreter/...",
  "sourceMimeType": "audio/webm", "translatedMimeType": "audio/mpeg"
}''')]
story += endpoint("DELETE", "/interpreter/conversations/:id", True)
story += [p("Audio client rules", "H2x"), p("Verify microphone permission and non-zero audio level before upload. Use a recorder format supported by the platform/backend. Build absolute playback URLs from the API base URL when the server returns /files/... paths. Disable duplicate submissions while STT/translation/TTS is running.", "Callout"), PageBreak()]

# Payment
story += screen_header("17. Subscription and payment", "Plan selection, external checkout, reconciliation and profile refresh.")
story += endpoint("GET", "/payment-plans", True, "Plans are converted to the user's selected currency.")
story += [code('[{ "id": "plan-uuid", "name": "Quarterly", "description": "...", "durationMonths": 3, "price": 29.99, "currency": { "id": "...", "code": "TND", "name": "Tunisian Dinar" }, "isActive": true }]')]
story += endpoint("POST", "/payment/checkout/:planId", True)
story += [code('{ "paymentId": "payment-uuid", "checkoutUrl": "https://provider.example/..." }')]
story += endpoint("POST", "/payment/:paymentId/verify", True, "Poll every three seconds while checkout is visible and briefly after it closes.")
story += [code('''{
  "id": "payment-uuid", "status": "pending|succeeded|failed",
  "provider": "konnect|moyasser", "amount": 29.99,
  "currency": { ... }, "plan": { ... }
}'''), p("Success flow", "H2x")] + bullets([
    "Stop polling when status is succeeded or failed; impose a five-minute upper bound.",
    "On succeeded, call GET /users/me. The backend sets subscriptionStatus=active and subscriptionEndsAt based on plan duration.",
    "Use an in-app browser or provider SDK where possible. Do not infer success merely because the checkout window closed.",
])
story += [p("Environment requirement", "Callout"), p("Production APP_BASE_URL must be a public HTTPS backend URL so Konnect/Moyasar webhooks can reach it. Client verification is the recovery path, not a replacement for a correctly configured webhook.", "Callout"), PageBreak()]

# Checklist / gaps
story += screen_header("18. Mobile implementation checklist", "Definition of done and known backend boundaries.")
story.append(table([
    ["Area", "Acceptance criteria"],
    ["Networking", "Environment base URL; typed envelope decoder; timeout; one refresh retry; multipart support."],
    ["Security", "Keychain/Keystore tokens; no secrets in logs; TLS in production; logout clears private cache."],
    ["Auth", "Register/login/OAuth/reset; automatic refresh; GET users/me after restore."],
    ["Localization", "Persist selected language; RTL layout; send Bearer on translatable public endpoints when available."],
    ["Offline/UX", "Loading, empty, error and retry state for each screen; cancel stale requests."],
    ["Uploads", "Validate type/size; show progress; prevent duplicate submit; preserve review state after failure."],
    ["Push", "Permission prompt; FCM registration/rotation; unregister on logout; deep-link by data.type."],
    ["Payments", "External checkout; provider verification; refresh profile; handle pending/failed/timeout."],
    ["Location", "Contextual permission; reverse geocode; 12-hour country throttle; 1-hour nearby throttle."],
    ["QA", "Test expired token, denied permissions, slow network, 502 AI errors, popup close and duplicate callbacks."],
], [38*mm, 131*mm]))
story += [p("Known backend work before production scale", "H2x")] + bullets([
    "Add receipt ownership by user, server-side history filtering and pagination.",
    "Guard receipt update/delete routes consistently.",
    "Add persisted notification preference endpoints if switches must sync across devices.",
    "Replace localhost URLs in stored file/profile URLs and payment callback configuration with environment-aware public URLs.",
    "Consider a dedicated mobile bootstrap endpoint only after profiling; parallel calls are acceptable initially.",
])
story += [p("Suggested mobile module boundaries", "H2x"), code('''core/network       envelope, auth interceptor, refresh mutex
features/auth      login, register, reset, secure token store
features/profile   profile + reference selectors
features/scan      media capture, OCR upload, receipt review
features/expenses  CRUD, categories, statistics, history
features/notify    FCM, inbox, deep links, location checks
features/chat      REST history + Firebase realtime
features/interpreter recorder, upload, playback, conversation state
features/payment   plans, checkout, verification, entitlement refresh'''), PageBreak()]

# Endpoint quick reference
story += screen_header("19. Endpoint quick reference", "Mobile-facing endpoints grouped by feature.")
quick = [
    ("Auth", "POST /auth/register; POST /auth/login; POST /auth/oauth; POST /auth/refresh; POST /auth/send-reset-mail; POST /auth/validate-reset-mail; POST /auth/reset-password; POST /auth/firebase-token"),
    ("Profile/setup", "GET/PATCH /users/me; GET /countries; GET /currencies; GET /languages"),
    ("Currency", "GET /currencies/convert"),
    ("Receipts", "POST /receipts/extract; POST /receipts/receipt-recommendations/:id; GET /receipts; GET/PATCH/DELETE /receipts/:id"),
    ("Expenses", "GET/POST /expenses; POST /expenses/from-receipt; GET /expenses/statistics; GET/PATCH/DELETE /expenses/:id; GET/POST /expense-categories"),
    ("Notifications", "POST /notifications/devices; GET /notifications/me; PATCH /notifications/:id/read; PATCH /notifications/me/read-all; DELETE /notifications/:id; POST /notifications/check-country; POST /explore/check-in"),
    ("Help/chat", "GET /faqs/categories; GET /faqs; GET /chat/conversations/me; GET/POST /chat/conversations/:id/messages; PATCH /chat/conversations/:id/read"),
    ("Interpreter", "GET/POST /interpreter/conversations; GET/DELETE /interpreter/conversations/:id; POST /interpreter/conversations/:id/turns"),
    ("Payment", "GET /payment-plans; POST /payment/checkout/:planId; POST /payment/:paymentId/verify"),
]
story.append(table([["Feature", "Endpoints"]] + quick, [32*mm, 137*mm]))
story += [Spacer(1, 8*mm), p("Handoff note", "H2x"), p("This guide describes the backend currently implemented in the repository at the preparation date. When the API changes, update the mobile typed models and this handoff document together. Swagger is exposed at <b>/api-docs</b> for interactive inspection.", "Callout")]

def page_decor(canvas, doc):
    canvas.saveState()
    w, h = A4
    if doc.page == 1:
        canvas.setFillColor(NAVY)
        canvas.rect(0, 0, w, h, fill=1, stroke=0)
    else:
        canvas.setStrokeColor(LINE)
        canvas.line(18*mm, 15*mm, w-18*mm, 15*mm)
        canvas.setFont("UI", 7.5)
        canvas.setFillColor(MUTED)
        canvas.drawString(18*mm, 9*mm, "SmartTravel Mobile API Implementation Guide")
        canvas.drawRightString(w-18*mm, 9*mm, f"Page {doc.page}")
        canvas.setFillColor(PURPLE)
        canvas.rect(0, h-5*mm, w, 5*mm, fill=1, stroke=0)
    canvas.restoreState()

doc = SimpleDocTemplate(
    str(PDF), pagesize=A4,
    rightMargin=18*mm, leftMargin=18*mm, topMargin=16*mm, bottomMargin=20*mm,
    title="SmartTravel Mobile API Implementation Guide",
    author="SmartTravel Engineering",
    subject="Screen-by-screen API handoff for mobile development",
)
doc.build(story, onFirstPage=page_decor, onLaterPages=page_decor)
print(PDF)
