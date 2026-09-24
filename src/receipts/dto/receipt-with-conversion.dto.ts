import { Receipt } from "../entities/receipt.entity";

// receipt/dto/receipt-with-conversion.dto.ts
export interface ReceiptItemWithConversion {
  id: string;
  name: string;
  description: string | null;
  quantity: number;
  unitPrice: number | null;
  totalPrice: number | null;
  convertedUnitPrice: number | null;
  convertedTotalPrice: number | null;
}

export interface ReceiptWithConversion extends Omit<Receipt, 'items'> {
  convertedSubtotal: number | null;
  convertedTax: number | null;
  convertedTotal: number | null;
  items: ReceiptItemWithConversion[];
  otherText: string[];
}