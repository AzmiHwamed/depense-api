// Shape of the JSON returned by the FastAPI "Gemini Receipt OCR API"
// (POST {OCR_SERVICE_URL}{OCR_RECEIPT_ENDPOINT}), matching the sample payload.

export class OcrItemDto {
  name: string;
  description?: string ;
  quantity?: number;
  unit_price?: number ;
  total_price?: number ;
}

export class OcrExtractionResultDto {
  document_type: string | null;
  language?: string ;
  country?: string ;
  merchant?: string ;
  address?: string ;
  phone?: string ;
  invoice_number?: string ;
  date?: string ;
  time?: string ;
  currency?: string ;
  subtotal?: number ;
  tax?: number ;
  total?: number ;
  payment_method?: string ;
  items?: OcrItemDto[];
  raw_text?: string ;
}
