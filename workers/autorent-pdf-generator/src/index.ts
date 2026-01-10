import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import type {
  Env,
  GeneratePDFRequest,
  PDFResponse,
  ContractData,
  ReceiptData,
  InvoiceData,
  InspectionData,
} from './types';
import { generateContract } from './templates/contract';
import { generateReceipt } from './templates/receipt';
import { generateInvoice } from './templates/invoice';
import { generateInspection } from './templates/inspection';

// CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Max-Age': '86400',
};

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    // Handle CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    // Only allow POST
    if (request.method !== 'POST') {
      return jsonResponse({ success: false, error: 'Method not allowed' }, 405);
    }

    const url = new URL(request.url);

    try {
      // Route: /generate
      if (url.pathname === '/generate' || url.pathname === '/') {
        return await handleGenerate(request, env);
      }

      // Route: /health
      if (url.pathname === '/health') {
        return jsonResponse({ status: 'ok', version: '1.0.0' }, 200);
      }

      return jsonResponse({ success: false, error: 'Not found' }, 404);
    } catch (error) {
      console.error('Worker error:', error);
      const message = error instanceof Error ? error.message : 'Internal server error';
      return jsonResponse({ success: false, error: message }, 500);
    }
  },
};

async function handleGenerate(request: Request, env: Env): Promise<Response> {
  // Parse request body
  let body: GeneratePDFRequest;
  try {
    body = await request.json();
  } catch {
    return jsonResponse({ success: false, error: 'Invalid JSON body' }, 400);
  }

  // Validate request
  if (!body.type || !body.data) {
    return jsonResponse({ success: false, error: 'Missing type or data' }, 400);
  }

  const validTypes = ['contract', 'receipt', 'invoice', 'inspection'];
  if (!validTypes.includes(body.type)) {
    return jsonResponse(
      { success: false, error: `Invalid type. Must be one of: ${validTypes.join(', ')}` },
      400
    );
  }

  // Generate PDF based on type
  let pdfBytes: Uint8Array;
  let filename: string;

  const language = body.options?.language || 'es';

  switch (body.type) {
    case 'contract':
      pdfBytes = await generateContract(body.data as ContractData, language);
      filename = `contrato_${(body.data as ContractData).booking_id}.pdf`;
      break;

    case 'receipt':
      pdfBytes = await generateReceipt(body.data as ReceiptData, language);
      filename = `recibo_${(body.data as ReceiptData).receipt_number}.pdf`;
      break;

    case 'invoice':
      pdfBytes = await generateInvoice(body.data as InvoiceData, language);
      filename = `factura_${(body.data as InvoiceData).invoice_number}.pdf`;
      break;

    case 'inspection':
      pdfBytes = await generateInspection(body.data as InspectionData, language);
      filename = `inspeccion_${(body.data as InspectionData).inspection_id}.pdf`;
      break;

    default:
      return jsonResponse({ success: false, error: 'Invalid document type' }, 400);
  }

  // Return PDF as base64
  const base64 = arrayBufferToBase64(pdfBytes);

  const response: PDFResponse = {
    success: true,
    pdf_base64: base64,
    filename,
  };

  return jsonResponse(response, 200);
}

// Helper: JSON response with CORS
function jsonResponse(data: unknown, status: number): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      ...corsHeaders,
    },
  });
}

// Helper: ArrayBuffer to base64
function arrayBufferToBase64(buffer: Uint8Array): string {
  let binary = '';
  const bytes = new Uint8Array(buffer);
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}
