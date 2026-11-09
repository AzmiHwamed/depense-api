# Mobile Receipt Extraction API

This document covers only receipt extraction. Mobile applications must call the NestJS API, not the internal FastAPI AI service.

## Endpoints

### Authenticated extraction

```http
POST /receipts/extract
Authorization: Bearer <FIREBASE_ID_TOKEN>
Content-Type: multipart/form-data
```

- Saves the extracted receipt and its items for the authenticated user.
- Form-data field: `image`

### Guest extraction

```http
POST /guest/receipts/extract
Content-Type: multipart/form-data
```

- Extracts the receipt without saving it to the database.
- Limited to 5 requests per 60 seconds.
- Form-data field: `image`

## File requirements

| Rule | Value |
|---|---|
| Field name | `image` |
| Supported formats | JPG, JPEG, PNG, WEBP, PDF |
| Maximum size | 10 MB |

Do not manually set the `Content-Type` header in mobile code. The HTTP client must generate the multipart boundary.

## Success response

Both endpoints use this wrapper:

```ts
type ApiResponse<T> = {
  status_code: number;
  title: string;
  body: string;
  data: T;
};
```

Receipt data:

```ts
type ReceiptItem = {
  id: string;
  name: string;
  description: string | null;
  quantity: number;
  unitPrice: number | null;
  totalPrice: number | null;
  convertedUnitPrice?: number | null;
  convertedTotalPrice?: number | null;
};

type ExtractedReceipt = {
  id: string;
  documentType: string;
  language: string | null;
  country: string | null;
  merchant: string | null;
  address: string | null;
  phone: string | null;
  invoiceNumber?: string | null;
  date?: string | null;
  time?: string | null;
  currency: string | null;
  subtotal: number | null;
  tax: number | null;
  total: number | null;
  convertedSubtotal?: number | null;
  convertedTax?: number | null;
  convertedTotal?: number | null;
  paymentMethod: string | null;
  items: ReceiptItem[];
  otherText?: string[] | null;
};
```

Example:

```json
{
  "status_code": 201,
  "title": "Created successfully",
  "body": "Created successfully",
  "data": {
    "id": "94770557-6a8a-46c6-a042-b560af2ba33d",
    "documentType": "receipt",
    "language": "fr",
    "country": "Tunisia",
    "merchant": "Carrefour",
    "address": "Tunis, Tunisia",
    "phone": null,
    "invoiceNumber": "INV-1024",
    "date": "2026-10-02",
    "time": "14:32",
    "currency": "TND",
    "subtotal": 18.5,
    "tax": 1.5,
    "total": 20,
    "convertedSubtotal": 18.5,
    "convertedTax": 1.5,
    "convertedTotal": 20,
    "paymentMethod": "card",
    "items": [
      {
        "id": "eb88a7cb-12da-4bd2-b838-075f36b7790e",
        "name": "Water",
        "description": null,
        "quantity": 2,
        "unitPrice": 1.5,
        "totalPrice": 3,
        "convertedUnitPrice": 1.5,
        "convertedTotalPrice": 3
      }
    ],
    "otherText": []
  }
}
```

The `converted*` values use the authenticated user's home currency when conversion is available. They may be `null` or absent. A guest receipt has a temporary ID such as `guest-1760000000000` and is not stored.

OCR values are not guaranteed to be present or perfectly accurate. The mobile UI should support `null` fields and let the user review the result.

## Request examples

### cURL

```bash
curl -X POST "$API_BASE_URL/receipts/extract" \
  -H "Authorization: Bearer <FIREBASE_ID_TOKEN>" \
  -F "image=@receipt.jpg"
```

Guest request:

```bash
curl -X POST "$API_BASE_URL/guest/receipts/extract" \
  -F "image=@receipt.jpg"
```

### React Native

```ts
const formData = new FormData();

formData.append("image", {
  uri: imageUri,
  name: "receipt.jpg",
  type: "image/jpeg",
} as any);

const response = await fetch(`${API_BASE_URL}/receipts/extract`, {
  method: "POST",
  headers: {
    Authorization: `Bearer ${firebaseIdToken}`,
  },
  body: formData,
});

const result = await response.json();

if (!response.ok) {
  throw new Error(result.title || result.body || "Receipt extraction failed");
}

const receipt: ExtractedReceipt = result.data;
```

For guest mode, change the URL to `/guest/receipts/extract` and omit the `Authorization` header.

## Error handling

Errors use the same response wrapper, normally with `data: null`:

```json
{
  "status_code": 422,
  "title": "Receipt extraction failed",
  "body": "The uploaded image could not be processed",
  "data": null
}
```

| Status | Meaning |
|---|---|
| 400 / 422 | Missing, invalid, or unreadable upload |
| 401 | Missing or expired Firebase token |
| 413 | File is larger than 10 MB |
| 415 | Unsupported file type |
| 429 | Guest rate limit or AI quota reached |
| 502 / 503 | OCR/AI service is temporarily unavailable |
| 500 | Unexpected server error |

Use the HTTP status or `status_code` for application logic. Display `title` or `body` to the user because the exact message can vary or be localized.
