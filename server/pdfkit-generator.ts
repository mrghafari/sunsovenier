// PDFKit Generator - Clean PDF generation with Vazir fonts
// This approach uses PDFKit library for generating professional PDFs

import PDFDocument from 'pdfkit';
import { vazirRegular, vazirBold } from './vazir-base64';
import fs from 'fs';
import { CompanyStorage } from './company-storage';

// Get company logo from database
async function getCompanyLogo(): Promise<Buffer | null> {
  try {
    const companyStorage = new CompanyStorage();
    const companyInfo = await companyStorage.getCompanyInformation();
    
    if (companyInfo?.logoUrl) {
      console.log('🖼️ [PDF LOGO] Processing logo URL:', companyInfo.logoUrl);
      
      // If logoUrl starts with /uploads/, try local first, then S3
      if (companyInfo.logoUrl.startsWith('/uploads/')) {
        const logoPath = companyInfo.logoUrl.replace('/uploads/', 'uploads/');
        
        // Try local filesystem first
        if (fs.existsSync(logoPath)) {
          const logoBuffer = fs.readFileSync(logoPath);
          console.log('✅ [PDF LOGO] Loaded from local filesystem, size:', logoBuffer.length);
          return logoBuffer;
        }
        
        // Local file not found, try fetching via S3 proxy endpoint
        const filename = companyInfo.logoUrl.split('/').pop();
        if (filename) {
          try {
            // Import the S3 service to fetch directly
            const { getAwsS3Service } = await import('./aws-s3-service');
            const s3Service = getAwsS3Service();
            const s3Key = `company-logos/${filename}`;
            
            console.log('📥 [PDF LOGO] Fetching from S3:', s3Key);
            const logoBuffer = await s3Service.getFile(s3Key);
            
            if (logoBuffer && logoBuffer.length > 0) {
              console.log('✅ [PDF LOGO] Loaded from S3, size:', logoBuffer.length);
              return logoBuffer;
            } else {
              console.warn('⚠️ [PDF LOGO] S3 returned empty or null');
            }
          } catch (s3Error) {
            console.warn('⚠️ [PDF LOGO] S3 fetch error:', s3Error);
          }
        }
      }
      
      // If logoUrl is already base64 data
      if (companyInfo.logoUrl.startsWith('data:image')) {
        const base64Data = companyInfo.logoUrl.split(',')[1];
        const logoBuffer = Buffer.from(base64Data, 'base64');
        console.log('✅ [PDF LOGO] Decoded from base64 data URL, size:', logoBuffer.length);
        return logoBuffer;
      }
      
      // If logoUrl is an S3 or HTTP(S) URL, fetch it
      if (companyInfo.logoUrl.startsWith('http://') || companyInfo.logoUrl.startsWith('https://')) {
        try {
          console.log('📥 [PDF LOGO] Fetching from URL:', companyInfo.logoUrl);
          const response = await fetch(companyInfo.logoUrl);
          if (response.ok) {
            const arrayBuffer = await response.arrayBuffer();
            const logoBuffer = Buffer.from(arrayBuffer);
            console.log('✅ [PDF LOGO] Fetched from URL, size:', logoBuffer.length);
            return logoBuffer;
          } else {
            console.warn('⚠️ [PDF LOGO] URL fetch failed, status:', response.status);
          }
        } catch (fetchError) {
          console.warn('⚠️ [PDF LOGO] URL fetch error:', fetchError);
        }
      }
    }
    
    // Fallback to default logo if exists
    if (fs.existsSync('server/logo-base64.txt')) {
      const base64Data = fs.readFileSync('server/logo-base64.txt', 'utf8');
      console.log('ℹ️ [PDF LOGO] Using fallback logo from file');
      return Buffer.from(base64Data, 'base64');
    }
    
    console.log('ℹ️ [PDF LOGO] No logo available');
    return null;
  } catch (error) {
    console.warn('⚠️ [PDF LOGO] Error loading logo:', error);
    
    // Fallback to default logo if exists
    try {
      if (fs.existsSync('server/logo-base64.txt')) {
        const base64Data = fs.readFileSync('server/logo-base64.txt', 'utf8');
        return Buffer.from(base64Data, 'base64');
      }
    } catch (fallbackError) {
      console.warn('⚠️ [PDF LOGO] Fallback also failed:', fallbackError);
    }
    
    return null;
  }
}

// Invoice generation must not fail when an uploaded/S3 logo is malformed or
// uses an image encoding that PDFKit cannot parse. The bundled logo is known
// to be PDFKit-compatible and remains available when object storage is down.
function getSafeInvoiceLogo(): Buffer | null {
  try {
    if (!fs.existsSync('server/logo-base64.txt')) return null;
    const logo = Buffer.from(fs.readFileSync('server/logo-base64.txt', 'utf8').trim(), 'base64');
    return logo.length > 0 ? logo : null;
  } catch (error) {
    console.warn('⚠️ [PDF LOGO] Safe invoice logo unavailable:', error);
    return null;
  }
}

// Get company information including addresses from database
async function getCompanyInformation(): Promise<any | null> {
  try {
    const companyStorage = new CompanyStorage();
    const companyInfo = await companyStorage.getCompanyInformation();
    
    if (companyInfo) {
      console.log('✅ Company information loaded from database for PDF generation');
      return companyInfo;
    }
    
    console.log('ℹ️ No company information found in database');
    return null;
  } catch (error) {
    console.warn('⚠️ Error getting company information from database:', error);
    return null;
  }
}

// Helper function to format RTL text for proper display
function formatRTLText(text: string, language: 'ar' | 'fa' = 'fa'): string {
  // Check if text contains RTL characters (Persian, Arabic, Kurdish)
  const rtlPattern = /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/;
  
  if (!rtlPattern.test(text)) {
    return text; // Return as-is for non-RTL text
  }
  
  // PDFKit/fontkit performs Arabic shaping and bidi layout. Keep the source in
  // logical Unicode order; manual reversal causes Persian and Arabic text to
  // be rendered backwards.
  return text;
}

// Helper function to format mixed RTL/LTR text with Unicode markers
function formatMixedText(text: string): string {
  // Split text into words
  const words = text.split(' ');
  
  return words.map(word => {
    // Check if word contains RTL characters
    const rtlPattern = /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/;
    
    if (rtlPattern.test(word)) {
      // RTL word - add RTL override markers
      return `\u202E${word}\u202C`;
    } else {
      // LTR word (English/numbers) - add LTR override markers
      return `\u202D${word}\u202C`;
    }
  }).join(' ');
}

// Generate Invoice PDF using PDFKit
async function generateLegacyInvoicePDF(invoiceData: any): Promise<Buffer> {
  return new Promise(async (resolve, reject) => {
    try {
      console.log('📄 Generating invoice PDF with PDFKit...');
      
      // Get company logo and information from database
      const companyLogoBase64 = await getCompanyLogo();
      const companyInfo = await getCompanyInformation();
      
      // Create a PDF document
      const doc = new PDFDocument({
        size: 'A4',
        margin: 50,
        info: {
          Title: `Invoice ${invoiceData.invoiceNumber}`,
          Author: 'Momtaz Chem',
          Subject: 'Invoice PDF'
        }
      });

      const chunks: Buffer[] = [];
      
      doc.on('data', (chunk: Buffer) => {
        chunks.push(chunk);
      });

      doc.on('end', () => {
        const result = Buffer.concat(chunks);
        console.log('✅ Invoice PDF generated successfully, size:', result.length);
        resolve(result);
      });

      doc.on('error', (error: Error) => {
        console.error('❌ PDF generation error:', error);
        reject(error);
      });

      // Add content to PDF with font fallback
      try {
        // Try to register custom fonts
        const vazirRegularBuffer = Buffer.from(vazirRegular, 'base64');
        const vazirBoldBuffer = Buffer.from(vazirBold, 'base64');
        
        doc.registerFont('VazirRegular', vazirRegularBuffer);
        doc.registerFont('VazirBold', vazirBoldBuffer);
        
        console.log('✅ Vazir fonts registered successfully');
        
        // Set font for RTL text
        doc.font('VazirRegular');
        
        // Helper function to detect if text contains RTL characters (Persian, Arabic, Kurdish)
        const isRTLText = (text: string): boolean => {
          const rtlPattern = /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/;
          return rtlPattern.test(text);
        };

        // Helper function to detect if text is purely numbers or English
        const isLTRText = (text: string): boolean => {
          const ltrPattern = /^[0-9A-Za-z\s\.\,\-\+\(\)]*$/;
          return ltrPattern.test(text);
        };

        // Helper function to get text alignment based on content
        const getTextAlignment = (text: string): 'left' | 'right' | 'center' => {
          if (isRTLText(text)) return 'right';
          if (isLTRText(text)) return 'left';
          return 'right'; // Default to right for mixed content
        };

        // Helper function to format mixed RTL/LTR text properly
        const formatMixedText = (text: string): string => {
          if (!text) return text;
          
          // Split text into tokens (words and spaces)
          const tokens = text.split(/(\s+)/);
          const formattedTokens = [];
          
          for (let i = 0; i < tokens.length; i++) {
            const token = tokens[i];
            
            if (token.trim() === '') {
              // Preserve spaces
              formattedTokens.push(token);
            } else if (isRTLText(token)) {
              // Persian/Arabic words - add RTL marker
              formattedTokens.push('\u202E' + token + '\u202C');
            } else {
              // English/numbers - add LTR marker  
              formattedTokens.push('\u202D' + token + '\u202C');
            }
          }
          
          return formattedTokens.join('');
        };
        
        // Helper function to format numbers without commas and decimals
        const formatNumber = (num: number): string => {
          // Convert to integer (remove decimals) and format without commas
          return Math.floor(num).toString();
        };
        
        // Add company logo if available (left side)
        if (companyLogoBase64) {
          try {
            const logoBuffer = companyLogoBase64;
            doc.image(logoBuffer, 50, 30, { width: 80, height: 60 });
            console.log('✅ Company logo added to invoice PDF (left side)');
          } catch (logoError) {
            console.warn('⚠️ Logo embedding failed:', logoError);
          }
        } else {
          console.log('ℹ️ No company logo available for invoice PDF');
        }
        
        // Header layout based on user's Word format
        const isProforma = invoiceData.invoiceType === 'PROFORMA';
        
        // Company name - centered
        doc.fontSize(16)
           .font('VazirBold')
           .text(formatMixedText('شرکت ممتاز شیمی'), 50, 50, { align: 'center', width: 500, features: ['rtla'] });
        
        // Invoice type - centered  
        const invoiceTypeText = isProforma ? 'پیش فاکتور' : 'فاکتور';
        doc.fontSize(14)
           .font('VazirBold')
           .text(formatMixedText(invoiceTypeText), 50, 80, { align: 'center', width: 500, features: ['rtla'] });
        
        // Invoice number - right aligned
        const invoiceNumber = invoiceData.invoiceNumber || invoiceData.orderNumber || 'INV-001';
        doc.fontSize(12)
           .font('VazirRegular')
           .text(formatMixedText(`شماره ${invoiceTypeText}:`), 350, 110, { align: 'right', width: 200, features: ['rtla'] })
           .text(invoiceNumber, 200, 110, { align: 'left' });
        
        // Date - right aligned (DD/MM/YYYY format like Word)
        const currentDate = invoiceData.invoiceDate && !isNaN(new Date(invoiceData.invoiceDate).getTime()) ? new Date(invoiceData.invoiceDate) : new Date();
        const dateValue = `${String(currentDate.getDate()).padStart(2, '0')}/${String(currentDate.getMonth() + 1).padStart(2, '0')}/${currentDate.getFullYear()}`;
        console.log(`📅 [PDF DATE] Generated date value: ${dateValue} for ${isProforma ? 'Proforma' : 'Invoice'}`);
        
        doc.fontSize(12)
           .font('VazirRegular')
           .text(formatMixedText('تاریخ:'), 350, 130, { align: 'right', width: 200, features: ['rtla'] })
           .text(dateValue, 200, 130, { align: 'left' });
        
        // Customer data with proper language detection
        const customer = invoiceData.customer || {};
        const customerName = customer.name || invoiceData.customerName || 'نامشخص';
        const customerPhone = customer.phone || invoiceData.customerPhone || 'نامشخص';
        const customerEmail = customer.email || invoiceData.customerEmail || 'نامشخص';
        const customerAddress = customer.address || invoiceData.customerAddress || 'نامشخص';
        
        // Customer info layout - right aligned labels matching Word format
        doc.fontSize(12)
           .font('VazirRegular')
           .text(formatMixedText('نام مشتری :'), 350, 160, { align: 'right', width: 200, features: ['rtla'] })
           .text(customerName, 200, 160, { align: 'left' })
           
           .text(formatMixedText('شماره تماس:'), 350, 180, { align: 'right', width: 200, features: ['rtla'] })
           .text(customerPhone, 200, 180, { align: 'left' })
           
           .text(formatMixedText('ایمیل:'), 350, 200, { align: 'right', width: 200, features: ['rtla'] })
           .text(customerEmail, 200, 200, { align: 'left' })
           
           .text(formatMixedText('آدرس:'), 350, 220, { align: 'right', width: 200, features: ['rtla'] })
           .text(customerAddress, 50, 240, { align: 'left', width: 400 });
        
        // Add line separator before table (moved down one line)
        doc.moveTo(50, 290)
           .lineTo(500, 290)
           .stroke();
        
        // Create dynamic table structure based on number of items - RTL orientation
        const tableStartY = 310;
        const rowHeight = 30;
        const colWidths = [120, 80, 80, 200]; // مبلغ کل، قیمت واحد، تعداد، شرح کالا (reversed for RTL)
        const colStartX = [50, 170, 250, 330]; // RTL column positions
        const items = invoiceData.items || [];
        const numDataRows = Math.max(1, items.length); // At least 1 row, or match item count
        const totalRows = numDataRows + 1; // +1 for header row
        const tableHeight = totalRows * rowHeight;
        
        // Draw table grid - dynamic height based on item count
        doc.rect(50, tableStartY, 500, tableHeight).stroke();
        
        // Draw vertical lines for columns
        for (let i = 1; i < colStartX.length; i++) {
          doc.moveTo(colStartX[i], tableStartY)
             .lineTo(colStartX[i], tableStartY + tableHeight)
             .stroke();
        }
        
        // Draw horizontal lines for rows - dynamic based on item count
        for (let i = 1; i <= totalRows; i++) {
          doc.moveTo(50, tableStartY + (i * rowHeight))
             .lineTo(550, tableStartY + (i * rowHeight))
             .stroke();
        }
        
        // Table headers - RTL orientation (right to left)
        doc.fontSize(11)
           .font('VazirBold')
           .text(formatMixedText('مبلغ کل'), colStartX[0] + 10, tableStartY + 5, { align: 'center', width: colWidths[0] - 20, features: ['rtla'] })
           .text(formatMixedText('قیمت واحد'), colStartX[1] + 10, tableStartY + 5, { align: 'center', width: colWidths[1] - 20, features: ['rtla'] })
           .text(formatMixedText('تعداد'), colStartX[2] + 10, tableStartY + 5, { align: 'center', width: colWidths[2] - 20, features: ['rtla'] })
           .text(formatMixedText('شرح کالا'), colStartX[3] + 10, tableStartY + 5, { align: 'right', width: colWidths[3] - 20, features: ['rtla'] });
        
        // Fill in product items in the table rows - all items dynamically
        const currency = invoiceData.currency || 'IQD';
        items.forEach((item: any, index: number) => { // All items, no limit
          const rowY = tableStartY + ((index + 1) * rowHeight) + 5;
          
          // Product name - RTL alignment for Persian/Arabic/Kurdish, LTR for English
          const productName = item.name || item.productName || '';
          const productNameAlign = getTextAlignment(productName);
          const formattedProductName = isRTLText(productName) ? formatMixedText(productName) : productName;
          
          // Numbers and currency - always LTR without commas and decimals
          const quantity = formatNumber(item.quantity || 1);
          const unitPrice = formatNumber(item.unitPrice || 0);
          const totalAmount = formatNumber((item.total || item.totalPrice || (item.quantity || 1) * (item.unitPrice || 0)));
          
          doc.fontSize(10)
             .font('VazirRegular')
             // Total amount in first column (RTL order)
             .text(totalAmount, colStartX[0] + 10, rowY, { align: 'center', width: colWidths[0] - 20 })
             // Unit price in second column
             .text(unitPrice, colStartX[1] + 10, rowY, { align: 'center', width: colWidths[1] - 20 })
             // Quantity in third column
             .text(quantity, colStartX[2] + 10, rowY, { align: 'center', width: colWidths[2] - 20 })
             // Product name in fourth column (rightmost)
             .text(formattedProductName, colStartX[3] + 10, rowY, { 
               align: productNameAlign, 
               width: colWidths[3] - 20, 
               features: isRTLText(productName) ? ['rtla'] : undefined 
             });
        });
        
        // Summary section below table - dynamic position based on table height
        const summaryY = tableStartY + tableHeight + 30;
        
        // Calculate totals
        const itemsSubtotal = items.reduce((sum: number, item: any) => {
          return sum + ((item.total || item.totalPrice || (item.quantity || 1) * (item.unitPrice || 0)));
        }, 0);
        
        // Calculate VAT using dynamic tax settings
        const vatAmount = parseFloat(invoiceData.vatAmount || '0');
        const dutiesAmount = parseFloat(invoiceData.dutiesAmount || '0');
        const shippingCost = parseFloat(invoiceData.shippingCost || '0');
        const grandTotal = itemsSubtotal + vatAmount + dutiesAmount + shippingCost;
        
        // Summary table matching Word template exactly
        let currentSummaryY = summaryY;
        
        doc.fontSize(11)
           .font('VazirRegular')
           .text(formatMixedText('مجموع کالاها:'), 350, currentSummaryY, { align: 'right', width: 150, features: ['rtla'] })
           .text(`${formatNumber(itemsSubtotal)}`, 280, currentSummaryY, { align: 'left', width: 60 });
           
        currentSummaryY += 20;
        
        // Show VAT only if amount > 0
        if (vatAmount > 0) {
          doc.text(formatMixedText('مالیات بر ارزش افزوده:'), 350, currentSummaryY, { align: 'right', width: 150, features: ['rtla'] })
             .text(`${formatNumber(vatAmount)}`, 280, currentSummaryY, { align: 'left', width: 60 });
          currentSummaryY += 20;
        }
        
        // Show duties only if amount > 0
        if (dutiesAmount > 0) {
          doc.text(formatMixedText('عوارض بر ارزش افزوده:'), 350, currentSummaryY, { align: 'right', width: 150, features: ['rtla'] })
             .text(`${formatNumber(dutiesAmount)}`, 280, currentSummaryY, { align: 'left', width: 60 });
          currentSummaryY += 20;
        }
        
        // Show shipping cost if > 0
        if (shippingCost > 0) {
          doc.text(formatMixedText('هزینه حمل:'), 350, currentSummaryY, { align: 'right', width: 150, features: ['rtla'] })
             .text(`${formatNumber(shippingCost)}`, 280, currentSummaryY, { align: 'left', width: 60 });
          currentSummaryY += 20;
        }
        
        // Grand total
        doc.font('VazirBold')
           .text(formatMixedText('مجموع کل:'), 350, currentSummaryY, { align: 'right', width: 150, features: ['rtla'] })
           .text(`${formatNumber(grandTotal)}`, 280, currentSummaryY, { align: 'left', width: 60 });
        
        // Footer message - exactly matching Word template  
        const footerMessageY = currentSummaryY + 30;
        const footerMessage = isProforma ? 
          'این پیش فاکتور است و پس تائید مالی، فاکتور نهایی صادر خواهد شد.' : 
          'این فاکتور نهایی است.';
        
        doc.fontSize(10)
           .font('VazirRegular')
           .text(formatMixedText(footerMessage), 50, footerMessageY, { align: 'right', width: 500, features: ['rtla'] });
        
        // Two-column footer layout
        const companyFooterY = footerMessageY + 30;
        const leftColumnX = 50;
        const rightColumnX = 300;
        const columnWidth = 240;
        
        // Simple footer with company names only
        const companyNameAr = companyInfo?.companyNameAr || companyInfo?.companyName || 'شرکت ممتاز شیمی';
        const companyNameEn = companyInfo?.companyNameEn || companyInfo?.companyNameEnglish || 'Momtaz Chemical Solutions Company';
        
        // Center the company names
        doc.fontSize(11)
           .font('VazirBold')
           .text(formatMixedText(`${companyNameAr} - ${companyNameEn}`), 50, companyFooterY, { align: 'center', width: 500, features: ['rtla'] });
        
      } catch (fontError) {
        console.warn('⚠️ Font registration failed, using default font:', fontError);
        
        // Fallback to default font
        doc.fontSize(20)
           .text('Invoice - Momtaz Chem', 50, 50, { align: 'center' });
        
        // Format fallback date in Gregorian calendar (YYYY/MM/DD)
        const fallbackDate = invoiceData.invoiceDate && !isNaN(new Date(invoiceData.invoiceDate).getTime()) ? new Date(invoiceData.invoiceDate) : new Date();
        const fallbackDateValue = `${fallbackDate.getFullYear()}/${String(fallbackDate.getMonth() + 1).padStart(2, '0')}/${String(fallbackDate.getDate()).padStart(2, '0')}`;
        console.log(`📅 [PDF FALLBACK DATE] Generated fallback date value: ${fallbackDateValue}`);
        
        doc.fontSize(12)
           .text(`Invoice Number: ${invoiceData.invoiceNumber || 'INV-001'}`, 50, 100)
           .text(`Date: ${fallbackDateValue}`, 350, 100);
        
        doc.fontSize(14)
           .text('Customer Details:', 50, 150);
        
        doc.fontSize(11)
           .text(`Name: ${invoiceData.customerName || 'Unknown'}`, 50, 180)
           .text(`Phone: ${invoiceData.customerPhone || 'Unknown'}`, 50, 200)
           .text(`Email: ${invoiceData.customerEmail || 'Unknown'}`, 50, 220);
        
        doc.fontSize(14)
           .text('Items:', 50, 260);
        
        const items = invoiceData.items || [];
        let currentY = 290;
        
        items.forEach((item: any, index: number) => {
          const itemY = currentY + (index * 20);
          doc.fontSize(10)
             .text(`${item.name || 'Unknown'} - Qty: ${item.quantity || 1} - Price: ${(item.unitPrice || 0).toLocaleString('en-US')}  IQD`, 50, itemY);
        });
        
        const totalY = currentY + (items.length * 20) + 30;
        doc.fontSize(12)
           .text(`Total: ${(invoiceData.totalAmount || 0).toLocaleString('en-US')}  IQD`, 50, totalY);
      }

      // Finalize the PDF
      doc.end();
      
    } catch (error) {
      console.error('❌ Error in generateInvoicePDF:', error);
      reject(error);
    }
  });
}

// Localized invoice renderer. The legacy renderer above is retained for compatibility
// with any callers that may still reference its historical layout.
export async function generateInvoicePDF(data: any): Promise<Buffer> {
  const lang = ['en', 'ar', 'tr', 'fa'].includes(data.language) ? data.language : 'en';
  const rtl = lang === 'ar' || lang === 'fa';
  const L: Record<string, any> = {
    en: ['Invoice', 'Proforma Invoice', 'Invoice number', 'Order number', 'Invoice date', 'Seller', 'Customer', 'Name', 'Phone', 'Email', 'Address', 'Payment method', 'Payment status', 'Product', 'Quantity', 'Unit price', 'Amount', 'Subtotal', 'VAT', 'Surcharge / duties', 'Shipping', 'Total', 'This is a proforma invoice. The final invoice will be issued after payment confirmation.', 'This is the final invoice.'],
    ar: ['فاتورة', 'فاتورة أولية', 'رقم الفاتورة', 'رقم الطلب', 'تاريخ الفاتورة', 'البائع', 'العميل', 'الاسم', 'الهاتف', 'البريد الإلكتروني', 'العنوان', 'طريقة الدفع', 'حالة الدفع', 'المنتج', 'الكمية', 'سعر الوحدة', 'المبلغ', 'المجموع الفرعي', 'ضريبة القيمة المضافة', 'رسوم إضافية', 'الشحن', 'الإجمالي', 'هذه فاتورة أولية. سيتم إصدار الفاتورة النهائية بعد تأكيد الدفع.', 'هذه هي الفاتورة النهائية.'],
    tr: ['Fatura', 'Proforma Fatura', 'Fatura numarası', 'Sipariş numarası', 'Fatura tarihi', 'Satıcı', 'Müşteri', 'Ad', 'Telefon', 'E-posta', 'Adres', 'Ödeme yöntemi', 'Ödeme durumu', 'Ürün', 'Miktar', 'Birim fiyatı', 'Tutar', 'Ara toplam', 'KDV', 'Ek ücretler / vergiler', 'Kargo', 'Toplam', 'Bu bir proforma faturadır. Ödeme onayından sonra nihai fatura düzenlenir.', 'Bu nihai faturadır.'],
    fa: ['فاکتور', 'پیش‌فاکتور', 'شماره فاکتور', 'شماره سفارش', 'تاریخ فاکتور', 'فروشنده', 'مشتری', 'نام', 'تلفن', 'ایمیل', 'آدرس', 'روش پرداخت', 'وضعیت پرداخت', 'کالا', 'تعداد', 'قیمت واحد', 'مبلغ', 'جمع جزء', 'مالیات بر ارزش افزوده', 'عوارض / هزینه اضافی', 'هزینه ارسال', 'مجموع کل', 'این پیش‌فاکتور است و پس از تأیید پرداخت، فاکتور نهایی صادر می‌شود.', 'این فاکتور نهایی است.']
  }[lang];
  const extra: Record<string, string[]> = {
    en: ['Registration number', 'Tax number', 'Company', 'Postal code', 'Country / city'],
    ar: ['رقم التسجيل', 'الرقم الضريبي', 'الشركة', 'الرمز البريدي', 'الدولة / المدينة'],
    tr: ['Kayıt numarası', 'Vergi numarası', 'Şirket', 'Posta kodu', 'Ülke / şehir'],
    fa: ['شماره ثبت', 'شماره مالیاتی', 'شرکت', 'کد پستی', 'کشور / شهر'],
  }[lang];
  const company = data.companyInfo || await getCompanyInformation() || {};
  const companyLogo = getSafeInvoiceLogo();
  const suffix = lang === 'en' ? 'En' : lang === 'ar' ? 'Ar' : lang === 'tr' ? 'Tr' : 'En';
  const companyName = company[`companyName${suffix}`] || company.companyName || company.companyNameEn || 'Momtaz Chemical Solutions';
  const customer = data.customer || {};
  const str = (v: any) => v === undefined || v === null || v === '' ? '—' : String(v);
  const latinDigits = (v: any) => str(v)
    .replace(/[۰-۹]/g, digit => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(digit)))
    .replace(/[٠-٩]/g, digit => String('٠١٢٣٤٥٦٧٨٩'.indexOf(digit)));
  // PDFKit may reverse Arabic-script digits even inside a bidi isolate. Invoice
  // numeric values therefore use Latin digits, which remain stable in LTR runs.
  const fmt = (v: any) => Math.round(Number(v) || 0).toLocaleString('en-US', { maximumFractionDigits: 0 });
  const date = new Date(data.invoiceDate);
  const dateText = isNaN(date.getTime()) ? '—' : latinDigits(date.toLocaleDateString(lang === 'fa' ? 'fa-IR' : lang));
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', margin: 42, info: { Title: `${data.invoiceType === 'PROFORMA' ? L[1] : L[0]} ${str(data.invoiceNumber)}`, Author: companyName, Subject: L[0], Keywords: lang } });
    const chunks: Buffer[] = []; doc.on('data', (c: Buffer) => chunks.push(c)); doc.on('end', () => resolve(Buffer.concat(chunks))); doc.on('error', reject);
    try { doc.registerFont('VazirRegular', Buffer.from(vazirRegular, 'base64')); doc.registerFont('VazirBold', Buffer.from(vazirBold, 'base64')); doc.font('VazirRegular'); } catch {}
    const tx = (v: any) => rtl ? formatRTLText(str(v), lang as 'ar' | 'fa') : str(v);
    const hasRTL = (v: any) => /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF]/.test(str(v));
    const ltr = (v: any) => `\u2066${str(v)}\u2069`;
    const al = rtl ? 'right' : 'left';
    const pair = (label: string, val: any, x: number, y: number, w = 245) => {
      doc.font('VazirRegular').fontSize(9);
      if (!rtl) {
        doc.text(`${label}: ${str(val)}`, x, y, { width: w, align: 'left' });
        return;
      }

      // Keep the RTL label and its value in separate layout boxes. This avoids
      // bidi reordering across the colon and preserves dates, IDs and amounts.
      const labelWidth = w >= 400 ? 190 : Math.max(94, Math.round(w * 0.42));
      const gap = 5;
      let labelCursor = x + w;
      const wordGap = doc.widthOfString(' ');
      for (const word of label.trim().split(/\s+/)) {
        const wordWidth = doc.widthOfString(word);
        labelCursor -= wordWidth;
        doc.text(tx(word), labelCursor, y, { width: wordWidth + 1, align: 'right', lineBreak: false });
        labelCursor -= wordGap;
      }
      const colonWidth = doc.widthOfString(':');
      labelCursor -= colonWidth;
      doc.text(':', labelCursor, y, { width: colonWidth + 1, align: 'left', lineBreak: false });
      doc.text(hasRTL(val) ? tx(val) : ltr(val), x, y, {
        width: w - labelWidth - gap,
        align: 'right',
        lineBreak: false,
      });
    };
    if (companyLogo) {
      try { doc.image(companyLogo, 42, 32, { fit: [64, 48] }); } catch {}
    }
    doc.font('VazirBold').fontSize(18).text(tx(companyName), 112, 42, { width: 370, align: 'center' });
    doc.fontSize(15).text(tx(data.invoiceType === 'PROFORMA' ? L[1] : L[0]), 42, 68, { width: 510, align: 'center' });
    pair(L[2], data.invoiceNumber, 42, 98, 510); pair(L[3], data.orderNumber, 42, 115, 510); pair(L[4], dateText, 42, 132, 510);
    doc.font('VazirBold').fontSize(11).text(tx(L[5]), 42, 160, { width: 245, align: al }); pair(L[7], companyName, 42, 178); pair(L[8], company.phonePrimary, 42, 194); pair(L[9], company.emailPrimary, 42, 210); pair(L[10], [company.mainAddress, company.city, company.country].filter(Boolean).join(', '), 42, 226); pair(extra[0], company.registrationNumber, 42, 242); pair(extra[1], company.taxNumber, 42, 258);
    doc.font('VazirBold').fontSize(11).text(tx(L[6]), 307, 160, { width: 245, align: al }); pair(L[7], customer.name, 307, 178); pair(extra[2], customer.company, 307, 194); pair(L[8], customer.phone, 307, 210); pair(L[9], customer.email, 307, 226); pair(L[10], customer.address, 307, 242); pair(extra[3], customer.postalCode, 307, 258);
    pair(L[11], data.paymentMethod, 42, 278); pair(L[12], data.paymentStatus, 307, 278);
    let y = 308; const cols = rtl ? [[L[16], 42, 130], [L[15], 172, 110], [L[14], 282, 70], [L[13], 352, 200]] : [[L[13], 42, 200], [L[14], 242, 70], [L[15], 312, 110], [L[16], 422, 130]];
    const header = () => { doc.rect(42, y, 510, 24).fillAndStroke('#eeeeee', '#777777'); doc.fillColor('#000').font('VazirBold').fontSize(9); cols.forEach((c: any) => doc.text(tx(c[0]), c[1] + 3, y + 7, { width: c[2] - 6, align: 'center' })); y += 24; };
    header(); const items = data.items || []; doc.font('VazirRegular').fontSize(8);
    items.forEach((item: any) => {
      if (y > 735) { doc.addPage(); y = 42; header(); }
      const row = [item.name || item.productName, item.quantity, fmt(item.unitPrice), fmt(item.total || item.totalPrice || Number(item.quantity || 0) * Number(item.unitPrice || 0))];
      cols.forEach((c: any, i: number) => {
        const ri = rtl ? [3, 2, 1, 0][i] : i;
        const isProductCell = i === (rtl ? 3 : 0);
        const cellText = isProductCell ? tx(row[ri]) : ltr(row[ri]);
        doc.text(cellText, c[1] + 3, y + 7, {
          width: c[2] - 6,
          height: 16,
          ellipsis: true,
          align: isProductCell ? al : 'center',
          lineBreak: false,
        });
      });
      doc.rect(42, y, 510, 24).stroke('#bbb');
      y += 24;
    });
    const subtotal = Number(data.subtotal ?? items.reduce((s: number, i: any) => s + Number(i.total || i.totalPrice || Number(i.quantity || 0) * Number(i.unitPrice || 0)), 0)); const vat = Number(data.vatAmount || 0), duties = Number(data.dutiesAmount || 0), shipping = Number(data.shippingCost || 0);
    if (y > 650) { doc.addPage(); y = 42; } y += 14; [[L[17], subtotal], [L[18], vat], [L[19], duties], [L[20], shipping], [L[21], subtotal + vat + duties + shipping]].forEach((r: any, i) => { doc.font(i === 4 ? 'VazirBold' : 'VazirRegular').fontSize(i === 4 ? 11 : 9); pair(r[0], `${fmt(r[1])} ${str(data.currency || 'IQD')}`, 42, y, 510); y += 19; });
    doc.font('VazirRegular').fontSize(9).text(tx(data.invoiceType === 'PROFORMA' ? L[22] : L[23]), 42, y + 10, { width: 510, align: al }); doc.end();
  });
}

// Generate Customer Profile PDF using PDFKit
export async function generateCustomerProfilePDF(customerData: any): Promise<Buffer> {
  return new Promise(async (resolve, reject) => {
    try {
      console.log('👤 Generating customer profile PDF with PDFKit...');
      
      // Get company logo and information from database
      const companyLogoBase64 = await getCompanyLogo();
      const companyInfo = await getCompanyInformation();
      
      // Create a PDF document
      const doc = new PDFDocument({
        size: 'A4',
        margin: 50,
        info: {
          Title: `Customer Profile - ${customerData.firstName || ''} ${customerData.lastName || ''}`,
          Author: 'Momtaz Chem',
          Subject: 'Customer Profile Report'
        }
      });

      const chunks: Buffer[] = [];
      
      doc.on('data', (chunk: Buffer) => {
        chunks.push(chunk);
      });

      doc.on('end', () => {
        const result = Buffer.concat(chunks);
        console.log('✅ Customer profile PDF generated successfully, size:', result.length);
        resolve(result);
      });

      doc.on('error', (error: Error) => {
        console.error('❌ PDF generation error:', error);
        reject(error);
      });

      // Add content to PDF
      try {
        // Try to register custom fonts
        const vazirRegularBuffer = Buffer.from(vazirRegular, 'base64');
        const vazirBoldBuffer = Buffer.from(vazirBold, 'base64');
        
        doc.registerFont('VazirRegular', vazirRegularBuffer);
        doc.registerFont('VazirBold', vazirBoldBuffer);
        
        doc.font('VazirBold');
        
        // Add company logo if available (left side)
        if (companyLogoBase64) {
          try {
            const logoBuffer = companyLogoBase64;
            doc.image(logoBuffer, 50, 30, { width: 80, height: 60 });
            console.log('✅ Company logo added to customer profile PDF (left side)');
          } catch (logoError) {
            console.warn('⚠️ Logo embedding failed:', logoError);
          }
        } else {
          console.log('ℹ️ No company logo available for customer profile PDF');
        }
        
        // Title
        doc.fontSize(20)
           .text(formatRTLText('پروفایل مشتری'), 50, 50, { align: 'center' });
        
        doc.font('VazirRegular');
        
        // Date - Gregorian format
        const currentDate = new Date();
        const gregorianDate = `${currentDate.getFullYear()}/${String(currentDate.getMonth() + 1).padStart(2, '0')}/${String(currentDate.getDate()).padStart(2, '0')}`;
        doc.fontSize(12)
           .text(formatRTLText(`تاریخ گزارش: ${gregorianDate}`), 50, 90, { align: 'right' });
        
        let yPosition = 130;
        
        // Personal Information Section
        doc.fontSize(16).font('VazirBold').text(formatRTLText('اطلاعات شخصی'), 50, yPosition, { align: 'right' });
        yPosition += 30;
        doc.fontSize(12).font('VazirRegular');
        
        doc.text(formatRTLText(`نام: ${customerData.firstName || ''} ${customerData.lastName || ''}`), 50, yPosition, { align: 'right' });
        yPosition += 20;
        doc.text(formatRTLText(`ایمیل: ${customerData.email || 'نامشخص'}`), 50, yPosition, { align: 'right' });
        yPosition += 20;
        doc.text(formatRTLText(`شماره تماس: ${customerData.phone || 'نامشخص'}`), 50, yPosition, { align: 'right' });
        yPosition += 20;
        doc.text(formatRTLText(`شرکت: ${customerData.company || 'نامشخص'}`), 50, yPosition, { align: 'right' });
        yPosition += 30;
        
        // Contact Information Section
        doc.fontSize(16).font('VazirBold').text(formatRTLText('اطلاعات تماس'), 50, yPosition, { align: 'right' });
        yPosition += 30;
        doc.fontSize(12).font('VazirRegular');
        
        doc.text(formatRTLText(`کشور: ${customerData.country || 'نامشخص'}`), 50, yPosition, { align: 'right' });
        yPosition += 20;
        doc.text(formatRTLText(`استان: ${customerData.province || 'نامشخص'}`), 50, yPosition, { align: 'right' });
        yPosition += 20;
        doc.text(formatRTLText(`شهر: ${customerData.city || 'نامشخص'}`), 50, yPosition, { align: 'right' });
        yPosition += 20;
        doc.text(formatRTLText(`آدرس: ${customerData.address || 'نامشخص'}`), 50, yPosition, { align: 'right' });
        yPosition += 40; // اضافه کردن فاصله بیشتر بین آدرس و کد پستی
        doc.text(formatRTLText(`کد پستی: ${customerData.postalCode || 'نامشخص'}`), 50, yPosition, { align: 'right' });
        yPosition += 30;
        
        // Business Information Section  
        doc.fontSize(16).font('VazirBold').text(formatRTLText('اطلاعات تجاری'), 50, yPosition, { align: 'right' });
        yPosition += 30;
        doc.fontSize(12).font('VazirRegular');
        
        const customerType = customerData.customerType === 'business' ? 'شرکتی' : 'شخصی';
        doc.text(formatRTLText(`نوع مشتری: ${customerType}`), 50, yPosition, { align: 'right' });
        yPosition += 20;
        doc.text(formatRTLText(`صنعت: ${customerData.industry || 'نامشخص'}`), 50, yPosition, { align: 'right' });
        yPosition += 20;
        doc.text(formatRTLText(`اندازه شرکت: ${customerData.companySize || 'نامشخص'}`), 50, yPosition, { align: 'right' });
        yPosition += 20;
        doc.text(formatRTLText(`منبع ارجاع: ${customerData.leadSource || 'نامشخص'}`), 50, yPosition, { align: 'right' });
        yPosition += 30;
        
        // Communication Preferences Section
        doc.fontSize(16).font('VazirBold').text(formatRTLText('تنظیمات ارتباط'), 50, yPosition, { align: 'right' });
        yPosition += 30;
        doc.fontSize(12).font('VazirRegular');
        
        doc.text(formatRTLText(`زبان ترجیحی: ${customerData.preferredLanguage || 'نامشخص'}`), 50, yPosition, { align: 'right' });
        yPosition += 20;
        doc.text(formatRTLText(`روش ارتباط: ${customerData.communicationPreference || 'نامشخص'}`), 50, yPosition, { align: 'right' });
        yPosition += 20;
        
        const smsStatus = customerData.smsEnabled ? 'فعال' : 'غیرفعال';
        const emailStatus = customerData.emailEnabled ? 'فعال' : 'غیرفعال';
        doc.text(formatRTLText(`پیامک: ${smsStatus}`), 50, yPosition, { align: 'right' });
        yPosition += 20;
        doc.text(formatRTLText(`ایمیل: ${emailStatus}`), 50, yPosition, { align: 'right' });
        yPosition += 30;
        
        // Registration Information
        if (customerData.createdAt) {
          const regDate = new Date(customerData.createdAt);
          const regDateFormatted = `${regDate.getFullYear()}/${String(regDate.getMonth() + 1).padStart(2, '0')}/${String(regDate.getDate()).padStart(2, '0')}`;
          doc.fontSize(16).font('VazirBold').text(formatRTLText('اطلاعات ثبت‌نام'), 50, yPosition, { align: 'right' });
          yPosition += 30;
          doc.fontSize(12).font('VazirRegular');
          doc.text(formatRTLText(`تاریخ ثبت‌نام: ${regDateFormatted}`), 50, yPosition, { align: 'right' });
          yPosition += 20;
        }

      } catch (fontError) {
        console.warn('⚠️ Font loading failed, using fallback approach:', fontError);
        
        // Fallback to default font
        doc.fontSize(20)
           .text('Customer Profile - Momtaz Chem', 50, 50, { align: 'center' });
        
        doc.fontSize(14)
           .text('Personal Information:', 50, 100);
        
        doc.fontSize(12)
           .text(`Name: ${customerData.firstName || ''} ${customerData.lastName || ''}`, 50, 130)
           .text(`Email: ${customerData.email || 'Unknown'}`, 50, 150)
           .text(`Phone: ${customerData.phone || 'Unknown'}`, 50, 170)
           .text(`Company: ${customerData.company || 'Unknown'}`, 50, 190);
           
        doc.fontSize(14)
           .text('Contact Information:', 50, 230);
        
        doc.fontSize(12)
           .text(`Country: ${customerData.country || 'Unknown'}`, 50, 260)
           .text(`Province: ${customerData.province || 'Unknown'}`, 50, 280)
           .text(`City: ${customerData.city || 'Unknown'}`, 50, 300)
           .text(`Address: ${customerData.address || 'Unknown'}`, 50, 320);
      }
      
      // Footer - Simple company names only
      const companyNameFooter = companyInfo?.companyNameAr || companyInfo?.companyName || 'شرکت الانتاج الممتاز';
      const companyNameEnFooter = companyInfo?.companyNameEn || companyInfo?.companyNameEnglish || 'Al-Entaj Al-Momtaz Company';
      
      doc.fontSize(10)
         .text(formatRTLText(`${companyNameFooter} / ${companyNameEnFooter}`), 50, 750, { align: 'center' });

      // Finalize the PDF
      doc.end();
      
    } catch (error) {
      console.error('❌ Error in generateCustomerProfilePDF:', error);
      reject(error);
    }
  });
}

// Generate Customer Report PDF using PDFKit
export async function generateCustomerReportPDF(customerData: any, orders: any[] = [], activities: any[] = []): Promise<Buffer> {
  return new Promise(async (resolve, reject) => {
    try {
      console.log('📄 Generating customer report PDF with PDFKit...');
      
      // Get company logo and information from database
      const companyLogoBase64 = await getCompanyLogo();
      const companyInfo = await getCompanyInformation();
      
      // Create a PDF document
      const doc = new PDFDocument({
        size: 'A4',
        margin: 50,
        info: {
          Title: `Customer Report - ${customerData.customerName || 'Unknown'}`,
          Author: 'Momtaz Chem',
          Subject: 'Customer Report PDF'
        }
      });

      const chunks: Buffer[] = [];
      
      doc.on('data', (chunk: Buffer) => {
        chunks.push(chunk);
      });

      doc.on('end', () => {
        const result = Buffer.concat(chunks);
        console.log('✅ Customer report PDF generated successfully, size:', result.length);
        resolve(result);
      });

      doc.on('error', (error: Error) => {
        console.error('❌ PDF generation error:', error);
        reject(error);
      });

      // Add content to PDF with font fallback
      try {
        // Try to register custom fonts
        const vazirRegularBuffer = Buffer.from(vazirRegular, 'base64');
        const vazirBoldBuffer = Buffer.from(vazirBold, 'base64');
        
        doc.registerFont('VazirRegular', vazirRegularBuffer);
        doc.registerFont('VazirBold', vazirBoldBuffer);
        
        // Set font for RTL text
        doc.font('VazirRegular');
        
        // Header
        doc.fontSize(20)
           .font('VazirBold')
           .text('گزارش مشتری - Momtaz Chem', 50, 50, { align: 'center' });
        
        // Customer info
        doc.fontSize(14)
           .font('VazirBold')
           .text('اطلاعات مشتری:', 50, 100, { align: 'right' });
        
        doc.fontSize(11)
           .font('VazirRegular')
           .text(`نام: ${customerData.customerName || 'نامشخص'}`, 50, 130, { align: 'right' })
           .text(`ایمیل: ${customerData.email || 'نامشخص'}`, 50, 150, { align: 'right' })
           .text(`تلفن: ${customerData.phone || 'نامشخص'}`, 50, 170, { align: 'right' });
        
        // Orders section
        doc.fontSize(14)
           .font('VazirBold')
           .text('سوابق سفارشات:', 50, 210, { align: 'right' });
        
        doc.fontSize(11)
           .font('VazirRegular')
           .text(orders.length > 0 ? `تعداد سفارشات: ${orders.length}` : 'هیچ سفارشی یافت نشد.', 50, 240, { align: 'right' });
        
        // Footer - Simple company names only
        const companyNameReportFooter = companyInfo?.companyNameAr || companyInfo?.companyName || 'شرکت مواد شیمیایی ممتاز';
        const companyNameEnReportFooter = companyInfo?.companyNameEn || companyInfo?.companyNameEnglish || 'Momtaz Chemical Solutions';
        
        doc.fontSize(9)
           .font('VazirRegular')
           .text(`${companyNameReportFooter} - ${companyNameEnReportFooter}`, 50, 750, { align: 'center' });
        
      } catch (fontError) {
        console.warn('⚠️ Font registration failed, using default font:', fontError);
        
        // Fallback to default font
        doc.fontSize(20)
           .text('Customer Report - Momtaz Chem', 50, 50, { align: 'center' });
        
        doc.fontSize(14)
           .text('Customer Information:', 50, 100);
        
        doc.fontSize(11)
           .text(`Name: ${customerData.customerName || 'Unknown'}`, 50, 130)
           .text(`Email: ${customerData.email || 'Unknown'}`, 50, 150)
           .text(`Phone: ${customerData.phone || 'Unknown'}`, 50, 170);
        
        doc.fontSize(14)
           .text('Order History:', 50, 210);
        
        doc.fontSize(11)
           .text(orders.length > 0 ? `Total Orders: ${orders.length}` : 'No orders found.', 50, 240);
      }

      // Finalize the PDF
      doc.end();
      
    } catch (error) {
      console.error('❌ Error in generateCustomerReportPDF:', error);
      reject(error);
    }
  });
}

// Generate Analytics PDF using PDFKit
export async function generateAnalyticsPDF(analyticsData: any, title: string = 'گزارش آمارها'): Promise<Buffer> {
  return new Promise(async (resolve, reject) => {
    try {
      console.log('📊 Generating analytics PDF with PDFKit...');
      
      // Get company logo and information from database
      const companyLogoBase64 = await getCompanyLogo();
      const companyInfo = await getCompanyInformation();
      
      // Create a PDF document
      const doc = new PDFDocument({
        size: 'A4',
        margin: 50,
        info: {
          Title: title,
          Author: 'Momtaz Chem',
          Subject: 'Analytics Report'
        }
      });

      const chunks: Buffer[] = [];
      
      doc.on('data', (chunk: Buffer) => {
        chunks.push(chunk);
      });

      doc.on('end', () => {
        const result = Buffer.concat(chunks);
        console.log('✅ Analytics PDF generated successfully, size:', result.length);
        resolve(result);
      });

      doc.on('error', (error: Error) => {
        console.error('❌ PDF generation error:', error);
        reject(error);
      });

      // Add content to PDF with fallback approach
      try {
        // Try to register custom fonts
        const vazirRegularBuffer = Buffer.from(vazirRegular, 'base64');
        const vazirBoldBuffer = Buffer.from(vazirBold, 'base64');
        
        doc.registerFont('VazirRegular', vazirRegularBuffer);
        doc.registerFont('VazirBold', vazirBoldBuffer);
        
        doc.font('VazirBold');
        
        // Add company logo if available (left side)
        if (companyLogoBase64) {
          try {
            const logoBuffer = companyLogoBase64;
            doc.image(logoBuffer, 50, 30, { width: 80, height: 60 });
            console.log('✅ Company logo added to analytics PDF (left side)');
          } catch (logoError) {
            console.warn('⚠️ Logo embedding failed:', logoError);
          }
        } else {
          console.log('ℹ️ No company logo available for analytics PDF');
        }
        
        // Title
        doc.fontSize(20)
           .text(formatRTLText(title), 50, 50, { align: 'center' });
        
        doc.font('VazirRegular');
        
        // Date - Gregorian format
        const currentDate = new Date();
        const gregorianDate = `${currentDate.getFullYear()}/${String(currentDate.getMonth() + 1).padStart(2, '0')}/${String(currentDate.getDate()).padStart(2, '0')}`;
        doc.fontSize(12)
           .text(formatRTLText(`تاریخ گزارش: ${gregorianDate}`), 50, 90, { align: 'right' });
        
        let yPosition = 130;
        
        // Dashboard Statistics
        doc.fontSize(16)
           .font('VazirBold')
           .text(formatRTLText('آمار داشبورد'), 50, yPosition, { align: 'right' });
        
        yPosition += 30;
        doc.font('VazirRegular').fontSize(11);
        
        // Stats
        if (analyticsData) {
          doc.text(formatRTLText(`کل مشتریان: ${analyticsData.totalCustomers || 0}`), 50, yPosition, { align: 'right' });
          yPosition += 20;
          doc.text(formatRTLText(`مشتریان فعال: ${analyticsData.activeCustomers || 0}`), 50, yPosition, { align: 'right' });
          yPosition += 20;
          doc.text(formatRTLText(`مشتریان جدید این ماه: ${analyticsData.newCustomersThisMonth || 0}`), 50, yPosition, { align: 'right' });
          yPosition += 20;
          doc.text(formatRTLText(`کل درآمد: ${Math.round(analyticsData.totalRevenue || 0)} دینار`), 50, yPosition, { align: 'right' });
          yPosition += 20;
          doc.text(formatRTLText(`متوسط مبلغ سفارش: ${Math.round(analyticsData.averageOrderValue || 0)} دینار`), 50, yPosition, { align: 'right' });
          yPosition += 30;
          
          // Top Customers section
          if (analyticsData.topCustomers && analyticsData.topCustomers.length > 0) {
            doc.fontSize(16).font('VazirBold').text(formatRTLText('برترین مشتریان'), 50, yPosition, { align: 'right' });
            yPosition += 30;
            doc.fontSize(11).font('VazirRegular');
            
            analyticsData.topCustomers.slice(0, 5).forEach((customer: any, index: number) => {
              const customerText = `${index + 1}. ${customer.name} - ${Math.round(customer.totalSpent)} دینار (${customer.totalOrders} سفارش)`;
              doc.text(formatRTLText(customerText), 50, yPosition, { align: 'right' });
              yPosition += 18;
            });
            yPosition += 20;
          }
          
          // Customer Types section
          if (analyticsData.customersByType && analyticsData.customersByType.length > 0) {
            doc.fontSize(16).font('VazirBold').text(formatRTLText('انواع مشتریان'), 50, yPosition, { align: 'right' });
            yPosition += 30;
            doc.fontSize(11).font('VazirRegular');
            
            analyticsData.customersByType.forEach((type: any) => {
              const typeName = type.type === 'business' ? 'شرکتی' : 'شخصی';
              const typeText = `${typeName}: ${type.count} مشتری`;
              doc.text(formatRTLText(typeText), 50, yPosition, { align: 'right' });
              yPosition += 18;
            });
            yPosition += 20;
          }
          
          // Recent Activities section
          if (analyticsData.recentActivities && analyticsData.recentActivities.length > 0) {
            doc.fontSize(16).font('VazirBold').text(formatRTLText('فعالیت‌های اخیر'), 50, yPosition, { align: 'right' });
            yPosition += 30;
            doc.fontSize(11).font('VazirRegular');
            
            analyticsData.recentActivities.slice(0, 3).forEach((activity: any) => {
              const activityText = activity.activityType === 'login' ? 'ورود به سیستم' : 'خروج از سیستم';
              const activityLine = `${activity.customerName}: ${activityText}`;
              doc.text(formatRTLText(activityLine), 50, yPosition, { align: 'right' });
              yPosition += 18;
            });
          }
        }
        
        // Footer - Simple company names only
        const companyNameAnalyticsFooter = companyInfo?.companyNameAr || companyInfo?.companyName || 'شرکت الانتاج الممتاز';
        const companyNameEnAnalyticsFooter = companyInfo?.companyNameEn || companyInfo?.companyNameEnglish || 'Al-Entaj Al-Momtaz Company';
        
        doc.fontSize(10)
           .text(formatRTLText(`${companyNameAnalyticsFooter} / ${companyNameEnAnalyticsFooter}`), 50, 750, { align: 'center' });
        
      } catch (fontError) {
        console.warn('⚠️ Font registration failed, using default font:', fontError);
        
        // Fallback to default font
        // Add company logo if available (left side)
        if (companyLogoBase64) {
          try {
            const logoBuffer = companyLogoBase64;
            doc.image(logoBuffer, 50, 30, { width: 80, height: 60 });
            console.log('✅ Company logo added to analytics PDF fallback (left side)');
          } catch (logoError) {
            console.warn('⚠️ Logo embedding failed in fallback:', logoError);
          }
        } else {
          console.log('ℹ️ No company logo available for analytics PDF (fallback)');
        }
        
        doc.fontSize(20)
           .text('Analytics Report - Al-Entaj Al-Momtaz', 50, 50, { align: 'center' });
        
        doc.fontSize(14)
           .text('Dashboard Statistics:', 50, 100);
        
        let yPos = 130;
        if (analyticsData) {
          doc.fontSize(11)
             .text(`Total Customers: ${analyticsData.totalCustomers || 0}`, 50, yPos);
          yPos += 20;
          doc.text(`Active Orders: ${analyticsData.activeOrders || 0}`, 50, yPos);
          yPos += 20;
          doc.text(`Monthly Sales: ${analyticsData.monthlySales || 0} IQD`, 50, yPos);
          yPos += 20;
          doc.text(`Online Customers: ${analyticsData.onlineCustomers || 0}`, 50, yPos);
        }
      }

      // Finalize the PDF
      doc.end();
      
    } catch (error) {
      console.error('❌ Error in generateAnalyticsPDF:', error);
      reject(error);
    }
  });
}