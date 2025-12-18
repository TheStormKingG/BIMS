import jsPDF from 'jspdf';
import { ReceiptScanResult } from '../types';
import { Receipt } from './receiptsDatabase';

/**
 * Generate and download a PDF of the digitized receipt
 */
export const downloadReceiptPdf = async (
  receipt: Receipt,
  receiptData: ReceiptScanResult | null,
  spentItem?: any
): Promise<void> => {
  try {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 20;
    let yPosition = margin;

    // Helper function to add a new page if needed
    const checkPageBreak = (requiredHeight: number) => {
      if (yPosition + requiredHeight > pageHeight - margin) {
        doc.addPage();
        yPosition = margin;
      }
    };

    // Helper to format currency
    const formatCurrency = (amount: number) => {
      return `GYD ${amount.toLocaleString()}`;
    };

    // Helper to format date
    const formatDate = (dateString: string) => {
      const date = new Date(dateString);
      return date.toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    };

    // Header
    doc.setFontSize(20);
    doc.setFont(undefined, 'bold');
    const merchantName = receiptData?.merchant || receipt.merchant || 'MERCHANT';
    const textWidth = doc.getTextWidth(merchantName);
    doc.text(merchantName, (pageWidth - textWidth) / 2, yPosition);
    yPosition += 10;

    doc.setFontSize(10);
    doc.setFont(undefined, 'normal');
    const dateText = formatDate(receiptData?.date || receipt.scannedAt || new Date().toISOString());
    const dateWidth = doc.getTextWidth(dateText);
    doc.text(dateText, (pageWidth - dateWidth) / 2, yPosition);
    yPosition += 15;

    // Line separator
    doc.setLineWidth(0.5);
    doc.line(margin, yPosition, pageWidth - margin, yPosition);
    yPosition += 10;

    // Items section
    if (receiptData && receiptData.items && receiptData.items.length > 0) {
      doc.setFontSize(12);
      doc.setFont(undefined, 'bold');
      doc.text('Items:', margin, yPosition);
      yPosition += 8;

      doc.setFontSize(10);
      doc.setFont(undefined, 'normal');

      receiptData.items.forEach((item, index) => {
        checkPageBreak(15);

        // Item description
        doc.setFont(undefined, 'bold');
        const description = item.description.length > 50 
          ? item.description.substring(0, 47) + '...' 
          : item.description;
        doc.text(description, margin, yPosition);
        yPosition += 6;

        // Item details
        doc.setFont(undefined, 'normal');
        const details = `Category: ${item.category} • Qty: ${item.quantity}`;
        doc.text(details, margin, yPosition);
        
        // Price on the right
        const priceText = formatCurrency(item.total);
        const priceWidth = doc.getTextWidth(priceText);
        doc.text(priceText, pageWidth - margin - priceWidth, yPosition - 6);
        
        if (item.quantity > 1) {
          const unitPriceText = `${formatCurrency(item.unitPrice)} each`;
          const unitPriceWidth = doc.getTextWidth(unitPriceText);
          doc.text(unitPriceText, pageWidth - margin - unitPriceWidth, yPosition);
        }

        yPosition += 8;

        // Line separator between items
        if (index < receiptData.items.length - 1) {
          doc.setLineWidth(0.2);
          doc.line(margin, yPosition, pageWidth - margin, yPosition);
          yPosition += 5;
        }
      });
    } else if (spentItem) {
      // Fallback to single item
      doc.setFontSize(12);
      doc.setFont(undefined, 'bold');
      doc.text('Item:', margin, yPosition);
      yPosition += 8;

      doc.setFontSize(10);
      doc.setFont(undefined, 'bold');
      doc.text(spentItem.item, margin, yPosition);
      yPosition += 6;

      doc.setFont(undefined, 'normal');
      const details = `Category: ${spentItem.category} • Qty: ${spentItem.itemQty}`;
      doc.text(details, margin, yPosition);
      
      const priceText = formatCurrency(spentItem.itemTotal);
      const priceWidth = doc.getTextWidth(priceText);
      doc.text(priceText, pageWidth - margin - priceWidth, yPosition - 6);

      yPosition += 10;
    }

    // Line separator before totals
    checkPageBreak(20);
    yPosition += 5;
    doc.setLineWidth(0.5);
    doc.line(margin, yPosition, pageWidth - margin, yPosition);
    yPosition += 10;

    // Totals section
    const total = receiptData?.total || receipt.total || (spentItem?.itemTotal || 0);
    
    doc.setFontSize(10);
    doc.setFont(undefined, 'normal');
    doc.text('Subtotal:', margin, yPosition);
    const subtotalText = formatCurrency(total);
    const subtotalWidth = doc.getTextWidth(subtotalText);
    doc.text(subtotalText, pageWidth - margin - subtotalWidth, yPosition);
    yPosition += 8;

    doc.setLineWidth(0.3);
    doc.line(margin, yPosition, pageWidth - margin, yPosition);
    yPosition += 8;

    doc.setFontSize(14);
    doc.setFont(undefined, 'bold');
    doc.text('Total:', margin, yPosition);
    const totalText = formatCurrency(total);
    const totalTextWidth = doc.getTextWidth(totalText);
    doc.text(totalText, pageWidth - margin - totalTextWidth, yPosition);
    yPosition += 15;

    // Payment information
    if (spentItem) {
      checkPageBreak(25);
      doc.setFontSize(8);
      doc.setFont(undefined, 'normal');
      doc.setLineWidth(0.3);
      doc.line(margin, yPosition, pageWidth - margin, yPosition);
      yPosition += 8;

      doc.text(`Payment Method: ${spentItem.paymentMethod || 'N/A'}`, margin, yPosition);
      yPosition += 5;
      doc.text(`Source: ${spentItem.source}`, margin, yPosition);
      if (receipt.scannedAt) {
        yPosition += 5;
        doc.text(`Scanned: ${formatDate(receipt.scannedAt)}`, margin, yPosition);
      }
      yPosition += 10;
    }

    // Footer
    checkPageBreak(40); // Increased height for branding
    doc.setLineWidth(0.3);
    doc.line(margin, yPosition, pageWidth - margin, yPosition);
    yPosition += 8;
    doc.setFontSize(8);
    doc.setTextColor(128, 128, 128);
    const footerText = 'Digitized Receipt - Generated from OCR';
    const footerWidth = doc.getTextWidth(footerText);
    doc.text(footerText, (pageWidth - footerWidth) / 2, yPosition);
    yPosition += 12;
    doc.setTextColor(0, 0, 0); // Reset to black

    // Stashway Branding - Logo and Text
    try {
      // Load logo image (using fetch to get base64)
      const logoUrl = '/stashway-logo.png';
      const logoResponse = await fetch(logoUrl);
      const logoBlob = await logoResponse.blob();
      const logoBase64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          const base64 = reader.result as string;
          resolve(base64);
        };
        reader.onerror = reject;
        reader.readAsDataURL(logoBlob);
      });

      // Add logo image (calculate dimensions to maintain aspect ratio)
      // Load image to get natural dimensions
      const img = new Image();
      await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve();
        img.onerror = reject;
        img.src = logoBase64;
      });
      
      const logoHeight = 15; // mm
      const logoWidth = (logoHeight * img.width / img.height); // Maintain aspect ratio
      const logoX = (pageWidth - logoWidth) / 2;
      doc.addImage(logoBase64, 'PNG', logoX, yPosition, logoWidth, logoHeight);
      yPosition += logoHeight + 5;

      // Add "Stashway™" text with superscript
      doc.setFontSize(12);
      doc.setFont(undefined, 'bold');
      doc.setTextColor(0, 0, 0);
      
      const stashwayText = 'Stashway';
      const stashwayWidth = doc.getTextWidth(stashwayText);
      const stashwayX = (pageWidth - stashwayWidth - 4) / 2; // 4mm for TM symbol
      
      doc.text(stashwayText, stashwayX, yPosition);
      
      // Add ™ superscript (smaller, slightly higher)
      doc.setFontSize(8);
      doc.text('™', stashwayX + stashwayWidth + 1, yPosition - 2);
      
    } catch (err) {
      console.warn('Could not load logo, showing text only:', err);
      // Fallback: Just show text if logo fails to load
      doc.setFontSize(12);
      doc.setFont(undefined, 'bold');
      doc.setTextColor(0, 0, 0);
      const stashwayText = 'Stashway';
      const stashwayWidth = doc.getTextWidth(stashwayText);
      const stashwayX = (pageWidth - stashwayWidth - 4) / 2;
      doc.text(stashwayText, stashwayX, yPosition);
      doc.setFontSize(8);
      doc.text('™', stashwayX + stashwayWidth + 1, yPosition - 2);
    }

    // Generate filename
    const merchantSlug = merchantName.replace(/[^a-z0-9]/gi, '_').toLowerCase();
    const dateSlug = new Date(receipt.scannedAt || new Date()).toISOString().split('T')[0];
    const filename = `receipt_${merchantSlug}_${dateSlug}.pdf`;

    // Download PDF
    doc.save(filename);
  } catch (err) {
    console.error('Error generating PDF:', err);
    throw new Error('Failed to generate PDF');
  }
};

