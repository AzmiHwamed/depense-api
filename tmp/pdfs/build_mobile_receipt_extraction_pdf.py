from pathlib import Path

from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER, TA_LEFT
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import mm
from reportlab.platypus import (
    BaseDocTemplate,
    Frame,
    KeepTogether,
    PageTemplate,
    Paragraph,
    Spacer,
    Table,
    TableStyle,
)


ROOT = Path(__file__).resolve().parents[2]
OUTPUT = ROOT / "output" / "pdf" / "mobile-receipt-extraction-api.pdf"

PAGE_W, PAGE_H = A4
MARGIN_X = 18 * mm
MARGIN_TOP = 20 * mm
MARGIN_BOTTOM = 18 * mm

INK = colors.HexColor("#182033")
MUTED = colors.HexColor("#667085")
PURPLE = colors.HexColor("#7357E8")
PURPLE_DARK = colors.HexColor("#4C35B8")
PURPLE_PALE = colors.HexColor("#F3F0FF")
BLUE_PALE = colors.HexColor("#EEF7FF")
GREEN_PALE = colors.HexColor("#ECFDF3")
BORDER = colors.HexColor("#DCE1EA")
CODE_BG = colors.HexColor("#151A2A")
WHITE = colors.white


class NumberedDocTemplate(BaseDocTemplate):
    def __init__(self, filename: str):
        super().__init__(
            filename,
            pagesize=A4,
            leftMargin=MARGIN_X,
            rightMargin=MARGIN_X,
            topMargin=MARGIN_TOP,
            bottomMargin=MARGIN_BOTTOM,
            title="Mobile Receipt Extraction API",
            author="SmartTravel",
            subject="Mobile integration contract for receipt extraction",
        )
        frame = Frame(
            self.leftMargin,
            self.bottomMargin,
            self.width,
            self.height,
            leftPadding=0,
            rightPadding=0,
            topPadding=0,
            bottomPadding=0,
            id="content",
        )
        self.addPageTemplates(PageTemplate(id="main", frames=[frame], onPage=self._decorate))

    def _decorate(self, canvas, doc):
        canvas.saveState()
        canvas.setStrokeColor(PURPLE)
        canvas.setLineWidth(1.2)
        canvas.line(MARGIN_X, PAGE_H - 7 * mm, PAGE_W - MARGIN_X, PAGE_H - 7 * mm)
        canvas.setFont("Helvetica-Bold", 8.5)
        canvas.setFillColor(PURPLE_DARK)
        canvas.drawString(MARGIN_X, PAGE_H - 4.5 * mm, "SMARTTRAVEL  /  MOBILE API")
        canvas.setFont("Helvetica", 8)
        canvas.setFillColor(MUTED)
        canvas.drawRightString(PAGE_W - MARGIN_X, 9 * mm, f"Receipt Extraction  |  {doc.page}")
        canvas.restoreState()


styles = getSampleStyleSheet()
styles.add(
    ParagraphStyle(
        name="CoverTitle",
        parent=styles["Title"],
        fontName="Helvetica-Bold",
        fontSize=27,
        leading=32,
        textColor=INK,
        alignment=TA_LEFT,
        spaceAfter=8,
    )
)
styles.add(
    ParagraphStyle(
        name="CoverSub",
        parent=styles["Normal"],
        fontName="Helvetica",
        fontSize=11.5,
        leading=17,
        textColor=MUTED,
        spaceAfter=12,
    )
)
styles.add(
    ParagraphStyle(
        name="H1X",
        parent=styles["Heading1"],
        fontName="Helvetica-Bold",
        fontSize=17,
        leading=21,
        textColor=INK,
        spaceBefore=13,
        spaceAfter=7,
    )
)
styles.add(
    ParagraphStyle(
        name="H2X",
        parent=styles["Heading2"],
        fontName="Helvetica-Bold",
        fontSize=12.5,
        leading=16,
        textColor=PURPLE_DARK,
        spaceBefore=9,
        spaceAfter=5,
    )
)
styles.add(
    ParagraphStyle(
        name="BodyX",
        parent=styles["BodyText"],
        fontName="Helvetica",
        fontSize=9.4,
        leading=14,
        textColor=INK,
        spaceAfter=6,
    )
)
styles.add(
    ParagraphStyle(
        name="SmallX",
        parent=styles["BodyText"],
        fontName="Helvetica",
        fontSize=8.2,
        leading=12,
        textColor=MUTED,
    )
)
styles.add(
    ParagraphStyle(
        name="CodeX",
        parent=styles["Code"],
        fontName="Courier",
        fontSize=7.3,
        leading=10.2,
        textColor=colors.HexColor("#F3F4F6"),
        leftIndent=0,
        rightIndent=0,
        spaceAfter=0,
    )
)
styles.add(
    ParagraphStyle(
        name="TableHead",
        parent=styles["BodyText"],
        fontName="Helvetica-Bold",
        fontSize=8.6,
        leading=11,
        textColor=WHITE,
        alignment=TA_LEFT,
    )
)
styles.add(
    ParagraphStyle(
        name="TableCell",
        parent=styles["BodyText"],
        fontName="Helvetica",
        fontSize=8.3,
        leading=11,
        textColor=INK,
    )
)


def esc(text: str) -> str:
    return (
        text.replace("&", "&amp;")
        .replace("<", "&lt;")
        .replace(">", "&gt;")
        .replace("\n", "<br/>")
        .replace(" ", "&nbsp;")
    )


def code_block(text: str, width: float | None = None):
    usable = width or (PAGE_W - 2 * MARGIN_X)
    table = Table([[Paragraph(esc(text.strip()), styles["CodeX"])]], colWidths=[usable])
    table.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, -1), CODE_BG),
                ("BOX", (0, 0), (-1, -1), 0.6, colors.HexColor("#252C41")),
                ("LEFTPADDING", (0, 0), (-1, -1), 9),
                ("RIGHTPADDING", (0, 0), (-1, -1), 9),
                ("TOPPADDING", (0, 0), (-1, -1), 8),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 8),
            ]
        )
    )
    return table


def info_box(title: str, text: str, color=PURPLE_PALE):
    data = [[Paragraph(f"<b>{title}</b><br/>{text}", styles["BodyX"])]]
    table = Table(data, colWidths=[PAGE_W - 2 * MARGIN_X])
    table.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, -1), color),
                ("BOX", (0, 0), (-1, -1), 0.8, BORDER),
                ("LEFTPADDING", (0, 0), (-1, -1), 11),
                ("RIGHTPADDING", (0, 0), (-1, -1), 11),
                ("TOPPADDING", (0, 0), (-1, -1), 9),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
            ]
        )
    )
    return table


def table(rows, widths):
    formatted = []
    for row_idx, row in enumerate(rows):
        style = styles["TableHead"] if row_idx == 0 else styles["TableCell"]
        formatted.append([Paragraph(str(cell), style) for cell in row])
    result = Table(formatted, colWidths=widths, repeatRows=1, hAlign="LEFT")
    result.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, 0), PURPLE_DARK),
                ("ROWBACKGROUNDS", (0, 1), (-1, -1), [WHITE, colors.HexColor("#F8F9FC")]),
                ("GRID", (0, 0), (-1, -1), 0.5, BORDER),
                ("VALIGN", (0, 0), (-1, -1), "TOP"),
                ("LEFTPADDING", (0, 0), (-1, -1), 7),
                ("RIGHTPADDING", (0, 0), (-1, -1), 7),
                ("TOPPADDING", (0, 0), (-1, -1), 6),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
            ]
        )
    )
    return result


story = []
story.extend(
    [
        Spacer(1, 19 * mm),
        Paragraph("Mobile Receipt<br/>Extraction API", styles["CoverTitle"]),
        Paragraph(
            "A focused integration guide for mobile developers: endpoints, multipart upload, response data, and error handling.",
            styles["CoverSub"],
        ),
        Spacer(1, 5 * mm),
        info_box(
            "Integration boundary",
            "The mobile application calls the NestJS API. The internal FastAPI AI service is not exposed directly to mobile clients.",
            BLUE_PALE,
        ),
        Spacer(1, 8 * mm),
        table(
            [
                ["Mode", "Endpoint", "Authentication", "Persistence"],
                ["Signed in", "POST /receipts/extract", "Firebase ID token", "Receipt and items saved"],
                ["Guest", "POST /guest/receipts/extract", "None", "Not saved"],
            ],
            [27 * mm, 58 * mm, 42 * mm, 47 * mm],
        ),
        Spacer(1, 7 * mm),
        Paragraph("1. Request contract", styles["H1X"]),
        table(
            [
                ["Rule", "Value"],
                ["HTTP format", "multipart/form-data"],
                ["File field", "image"],
                ["Formats", "JPG, JPEG, PNG, WEBP, PDF"],
                ["Maximum size", "10 MB"],
                ["Guest limit", "5 requests per 60 seconds"],
            ],
            [48 * mm, 126 * mm],
        ),
        Spacer(1, 4 * mm),
        info_box(
            "Important multipart rule",
            "Do not manually set the Content-Type header. Let the HTTP client generate it with the correct multipart boundary.",
        ),
        Paragraph("Authenticated request", styles["H2X"]),
        code_block(
            "POST /receipts/extract\n"
            "Authorization: Bearer <FIREBASE_ID_TOKEN>\n"
            "Content-Type: multipart/form-data\n\n"
            "image: <binary file>"
        ),
        Paragraph("Guest request", styles["H2X"]),
        code_block(
            "POST /guest/receipts/extract\n"
            "Content-Type: multipart/form-data\n\n"
            "image: <binary file>"
        ),
        Paragraph("2. Response envelope", styles["H1X"]),
        Paragraph("Every success response uses the same top-level shape:", styles["BodyX"]),
        code_block(
            "type ApiResponse<T> = {\n"
            "  status_code: number;\n"
            "  title: string;\n"
            "  body: string;\n"
            "  data: T;\n"
            "};"
        ),
        Spacer(1, 4 * mm),
        Paragraph("Receipt fields", styles["H2X"]),
        table(
            [
                ["Field", "Type", "Meaning"],
                ["id", "string", "Saved UUID or temporary guest ID"],
                ["documentType", "string", "Detected document category"],
                ["language", "string | null", "Detected receipt language"],
                ["country", "string | null", "Detected country"],
                ["merchant", "string | null", "Merchant or business name"],
                ["address", "string | null", "Merchant address"],
                ["phone", "string | null", "Merchant phone number"],
                ["invoiceNumber", "string | null", "Receipt or invoice reference"],
                ["date", "string | null", "Detected transaction date"],
                ["time", "string | null", "Detected transaction time"],
                ["currency", "string | null", "Detected ISO currency code"],
                ["subtotal", "number | null", "Original subtotal"],
                ["tax", "number | null", "Original tax amount"],
                ["total", "number | null", "Original total"],
                ["convertedSubtotal", "number | null", "Subtotal in user's home currency"],
                ["convertedTax", "number | null", "Tax in user's home currency"],
                ["convertedTotal", "number | null", "Total in user's home currency"],
                ["paymentMethod", "string | null", "Detected payment method"],
                ["items", "ReceiptItem[]", "Extracted line items"],
                ["otherText", "string[] | null", "Additional OCR text"],
            ],
            [43 * mm, 37 * mm, 94 * mm],
        ),
        Paragraph("Item fields", styles["H2X"]),
        table(
            [
                ["Field", "Type", "Meaning"],
                ["id", "string", "Saved or temporary item identifier"],
                ["name", "string", "Detected item name"],
                ["description", "string | null", "Optional item details"],
                ["quantity", "number", "Detected quantity"],
                ["unitPrice", "number | null", "Original unit price"],
                ["totalPrice", "number | null", "Original line total"],
                ["convertedUnitPrice", "number | null", "Unit price in home currency"],
                ["convertedTotalPrice", "number | null", "Line total in home currency"],
            ],
            [43 * mm, 37 * mm, 94 * mm],
        ),
        Paragraph("3. Example success response", styles["H1X"]),
        code_block(
            '{\n'
            '  "status_code": 201,\n'
            '  "title": "Created successfully",\n'
            '  "body": "Created successfully",\n'
            '  "data": {\n'
            '    "id": "94770557-6a8a-46c6-a042-b560af2ba33d",\n'
            '    "documentType": "receipt",\n'
            '    "language": "fr",\n'
            '    "country": "Tunisia",\n'
            '    "merchant": "Carrefour",\n'
            '    "address": "Tunis, Tunisia",\n'
            '    "phone": null,\n'
            '    "invoiceNumber": "INV-1024",\n'
            '    "date": "2026-10-02",\n'
            '    "time": "14:32",\n'
            '    "currency": "TND",\n'
            '    "subtotal": 18.5,\n'
            '    "tax": 1.5,\n'
            '    "total": 20,\n'
            '    "convertedSubtotal": 18.5,\n'
            '    "convertedTax": 1.5,\n'
            '    "convertedTotal": 20,\n'
            '    "paymentMethod": "card",\n'
            '    "items": [{\n'
            '      "id": "eb88a7cb-12da-4bd2-b838-075f36b7790e",\n'
            '      "name": "Water",\n'
            '      "description": null,\n'
            '      "quantity": 2,\n'
            '      "unitPrice": 1.5,\n'
            '      "totalPrice": 3,\n'
            '      "convertedUnitPrice": 1.5,\n'
            '      "convertedTotalPrice": 3\n'
            '    }],\n'
            '    "otherText": []\n'
            '  }\n'
            '}'
        ),
        Spacer(1, 4 * mm),
        info_box(
            "Nullability and OCR review",
            "OCR fields can be missing or imperfect. The mobile UI must accept null values and should let the user review the extracted data. Converted values may be null or absent when conversion is unavailable.",
            GREEN_PALE,
        ),
        Paragraph("4. React Native example", styles["H1X"]),
        code_block(
            'const formData = new FormData();\n\n'
            'formData.append("image", {\n'
            '  uri: imageUri,\n'
            '  name: "receipt.jpg",\n'
            '  type: "image/jpeg",\n'
            '} as any);\n\n'
            'const response = await fetch(\n'
            '  `${API_BASE_URL}/receipts/extract`,\n'
            '  {\n'
            '    method: "POST",\n'
            '    headers: {\n'
            '      Authorization: `Bearer ${firebaseIdToken}`,\n'
            '    },\n'
            '    body: formData,\n'
            '  }\n'
            ');\n\n'
            'const result = await response.json();\n\n'
            'if (!response.ok) {\n'
            '  throw new Error(\n'
            '    result.title || result.body || "Receipt extraction failed"\n'
            '  );\n'
            '}\n\n'
            'const receipt = result.data;'
        ),
        Spacer(1, 4 * mm),
        Paragraph(
            "For guest mode, use /guest/receipts/extract and omit the Authorization header.",
            styles["BodyX"],
        ),
        Paragraph("5. Error handling", styles["H1X"]),
        code_block(
            '{\n'
            '  "status_code": 422,\n'
            '  "title": "Receipt extraction failed",\n'
            '  "body": "The uploaded image could not be processed",\n'
            '  "data": null\n'
            '}'
        ),
        Spacer(1, 4 * mm),
        table(
            [
                ["Status", "Mobile handling"],
                ["400 / 422", "Missing, invalid, or unreadable upload"],
                ["401", "Missing or expired Firebase token; request sign-in again"],
                ["413", "File exceeds the 10 MB limit"],
                ["415", "Unsupported file type"],
                ["429", "Guest rate limit or AI quota reached; retry later"],
                ["502 / 503", "OCR/AI service temporarily unavailable"],
                ["500", "Unexpected server error"],
            ],
            [32 * mm, 142 * mm],
        ),
    ]
)


OUTPUT.parent.mkdir(parents=True, exist_ok=True)
doc = NumberedDocTemplate(str(OUTPUT))
doc.build(story)
print(OUTPUT)
