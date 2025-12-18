import jsPDF from 'jspdf';
import { SpentItem } from './spentTableDatabase';
import { Account } from '../types';
import { calculateTimeBasedAnalytics, TimeBasedAnalytics } from './analyticsService';

/**
 * Export spending data as CSV
 */
export const exportSpendingToCSV = (spentItems: SpentItem[]): void => {
  // CSV headers
  const headers = [
    'Date',
    'Item',
    'Total',
    'Quantity',
    'Cost',
    'Category',
    'Payment Method',
    'Source',
    'Entered'
  ];

  // Convert items to CSV rows
  const rows = spentItems.map(item => [
    new Date(item.transactionDateTime).toLocaleString(),
    item.item,
    item.itemTotal.toFixed(2),
    item.itemQty.toString(),
    item.itemCost.toFixed(2),
    item.category,
    item.paymentMethod || '',
    item.source,
    new Date(item.entryDate).toLocaleString()
  ]);

  // Combine headers and rows
  const csvContent = [
    headers.join(','),
    ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
  ].join('\n');

  // Create blob and download
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  link.setAttribute('href', url);
  
  // Generate filename with current date
  const dateSlug = new Date().toISOString().split('T')[0];
  link.setAttribute('download', `stashway_spending_${dateSlug}.csv`);
  
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

/**
 * Export spending data as Excel (XLSX)
 */
export const exportSpendingToExcel = async (spentItems: SpentItem[]): Promise<void> => {
  try {
    // Dynamic import to avoid loading xlsx in initial bundle
    const XLSX = await import('xlsx');

  // Prepare data
  const data = spentItems.map(item => ({
    'Date': new Date(item.transactionDateTime).toLocaleString(),
    'Item': item.item,
    'Total': item.itemTotal,
    'Quantity': item.itemQty,
    'Cost': item.itemCost,
    'Category': item.category,
    'Payment Method': item.paymentMethod || '',
    'Source': item.source,
    'Entered': new Date(item.entryDate).toLocaleString()
  }));

  // Create workbook and worksheet
  const worksheet = XLSX.utils.json_to_sheet(data);
  
  // Set column widths
  const columnWidths = [
    { wch: 20 }, // Date
    { wch: 30 }, // Item
    { wch: 12 }, // Total
    { wch: 10 }, // Quantity
    { wch: 12 }, // Cost
    { wch: 15 }, // Category
    { wch: 18 }, // Payment Method
    { wch: 15 }, // Source
    { wch: 20 }  // Entered
  ];
  worksheet['!cols'] = columnWidths;

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Spending');

  // Generate filename with current date
  const dateSlug = new Date().toISOString().split('T')[0];
  const filename = `stashway_spending_${dateSlug}.xlsx`;

  // Download file
  XLSX.writeFile(workbook, filename);
  } catch (err) {
    console.error('Error exporting to Excel:', err);
    throw new Error('Failed to export to Excel. Please try CSV export instead.');
  }
};

/**
 * Export Overview/Dashboard as PDF
 */
export const exportOverviewToPdf = async (
  accounts: Account[],
  spentItems: SpentItem[],
  totalBalance: number
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
      return `GYD ${amount.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
    };

    // Helper to format date
    const formatDate = (dateString: string) => {
      const date = new Date(dateString);
      return date.toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    };

    // Calculate analytics
    const analytics = calculateTimeBasedAnalytics(spentItems);

    // Title
    doc.setFontSize(20);
    doc.setFont(undefined, 'bold');
    doc.text('Financial Overview', margin, yPosition);
    yPosition += 10;

    doc.setFontSize(10);
    doc.setFont(undefined, 'normal');
    const reportDate = new Date().toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
    doc.text(`Generated: ${reportDate}`, margin, yPosition);
    yPosition += 15;

    // Total Net Worth
    checkPageBreak(20);
    doc.setFontSize(14);
    doc.setFont(undefined, 'bold');
    doc.text('Total Net Worth', margin, yPosition);
    yPosition += 8;

    doc.setFontSize(18);
    doc.text(formatCurrency(totalBalance), margin, yPosition);
    yPosition += 10;

    // Account breakdown - filter unique accounts and non-zero balances
    if (accounts.length > 0) {
      // Process accounts: combine Cash Wallets into one, filter zero balances
      const processedAccounts: Array<{ name: string; balance: number }> = [];
      let cashWalletBalance = 0;
      let hasCashWallet = false;

      accounts.forEach(acc => {
        if (acc.type === 'CASH_WALLET') {
          const bal = ((acc as any).denominations && Object.entries((acc as any).denominations).reduce((sum:number, [d, c]: any) => sum + Number(d)*c, 0)) || 0;
          if (bal > 0) {
            cashWalletBalance += bal;
            hasCashWallet = true;
          }
        } else {
          const bal = acc.balance || 0;
          if (bal > 0) {
            processedAccounts.push({ name: acc.name, balance: bal });
          }
        }
      });

      // Add combined Cash Wallet if it has balance
      if (hasCashWallet && cashWalletBalance > 0) {
        processedAccounts.push({ name: 'Cash Wallet', balance: cashWalletBalance });
      }

      // Only show if we have accounts to display
      if (processedAccounts.length > 0) {
        checkPageBreak(15);
        doc.setFontSize(10);
        doc.setFont(undefined, 'normal');
        doc.text('Account Breakdown:', margin, yPosition);
        yPosition += 6;

        processedAccounts.forEach(acc => {
          doc.text(`${acc.name}: ${formatCurrency(acc.balance)}`, margin + 5, yPosition);
          yPosition += 6;
        });
        yPosition += 5;
      }
    }

    // Spending Metrics Section
    checkPageBreak(60);
    doc.setLineWidth(0.3);
    doc.line(margin, yPosition, pageWidth - margin, yPosition);
    yPosition += 10;

    doc.setFontSize(14);
    doc.setFont(undefined, 'bold');
    doc.text('Spending Metrics', margin, yPosition);
    yPosition += 12;

    doc.setFontSize(10);
    doc.setFont(undefined, 'normal');

    // Spending totals
    const metrics = [
      { label: 'Spent Last 24 Hours', value: analytics.spentLast24Hours },
      { label: 'Spent Last 7 Days', value: analytics.spentLast7Days },
      { label: 'Spent Last 30 Days', value: analytics.spentLast30Days },
    ];

    metrics.forEach(metric => {
      checkPageBreak(8);
      doc.text(`${metric.label}:`, margin, yPosition);
      doc.setFont(undefined, 'bold');
      doc.text(formatCurrency(metric.value), pageWidth - margin - 60, yPosition);
      doc.setFont(undefined, 'normal');
      yPosition += 8;
    });

    yPosition += 5;

    // Averages
    doc.setFont(undefined, 'bold');
    doc.text('Averages (Last 30 Days):', margin, yPosition);
    yPosition += 8;
    doc.setFont(undefined, 'normal');

    const averages = [
      { label: 'Average Daily', value: analytics.avgDaily },
      { label: 'Average Weekly', value: analytics.avgWeekly },
      { label: 'Average Monthly', value: analytics.avgMonthly },
    ];

    averages.forEach(avg => {
      checkPageBreak(8);
      doc.text(`${avg.label}:`, margin + 5, yPosition);
      doc.setFont(undefined, 'bold');
      doc.text(formatCurrency(avg.value), pageWidth - margin - 60, yPosition);
      doc.setFont(undefined, 'normal');
      yPosition += 8;
    });

    yPosition += 10;

    // Spending by Category
    checkPageBreak(40);
    doc.setLineWidth(0.3);
    doc.line(margin, yPosition, pageWidth - margin, yPosition);
    yPosition += 10;

    doc.setFontSize(14);
    doc.setFont(undefined, 'bold');
    doc.text('Spending by Category', margin, yPosition);
    yPosition += 10;

    if (analytics.spendingByCategory.length > 0) {
      doc.setFontSize(9);
      doc.setFont(undefined, 'bold');
      doc.text('Category', margin, yPosition);
      doc.text('Amount', pageWidth - margin - 50, yPosition);
      doc.text('%', pageWidth - margin - 20, yPosition);
      yPosition += 6;

      doc.setFont(undefined, 'normal');
      doc.setLineWidth(0.2);
      doc.line(margin, yPosition, pageWidth - margin, yPosition);
      yPosition += 6;

      analytics.spendingByCategory.slice(0, 10).forEach(cat => {
        checkPageBreak(8);
        doc.text(cat.category.length > 25 ? cat.category.substring(0, 22) + '...' : cat.category, margin, yPosition);
        doc.text(formatCurrency(cat.amount), pageWidth - margin - 50, yPosition);
        doc.text(`${cat.percentage.toFixed(1)}%`, pageWidth - margin - 20, yPosition);
        yPosition += 8;
      });
    } else {
      doc.setFont(undefined, 'normal');
      doc.text('No category data available', margin, yPosition);
      yPosition += 8;
    }

    yPosition += 10;

    // Top Merchant/Category
    checkPageBreak(30);
    doc.setLineWidth(0.3);
    doc.line(margin, yPosition, pageWidth - margin, yPosition);
    yPosition += 10;

    doc.setFontSize(14);
    doc.setFont(undefined, 'bold');
    doc.text('Top Spending', margin, yPosition);
    yPosition += 10;

    doc.setFontSize(10);
    doc.setFont(undefined, 'normal');

    if (analytics.topCategory) {
      checkPageBreak(8);
      doc.text('Top Category:', margin, yPosition);
      doc.setFont(undefined, 'bold');
      doc.text(`${analytics.topCategory.name} - ${formatCurrency(analytics.topCategory.amount)}`, margin + 35, yPosition);
      doc.setFont(undefined, 'normal');
      yPosition += 8;
    }

    if (analytics.topMerchant) {
      checkPageBreak(8);
      doc.text('Top Merchant:', margin, yPosition);
      doc.setFont(undefined, 'bold');
      doc.text(`${analytics.topMerchant.name} - ${formatCurrency(analytics.topMerchant.amount)}`, margin + 35, yPosition);
      doc.setFont(undefined, 'normal');
      yPosition += 8;
    }

    yPosition += 10;

    // Recent Activity - ensure table fits on one page
    const recentActivityRows = Math.min(analytics.recentActivity.length, 10);
    const recentActivityTableHeight = recentActivityRows > 0 ? 10 + 10 + 6 + 6 + (recentActivityRows * 8) : 25;
    
    checkPageBreak(recentActivityTableHeight);
    doc.setLineWidth(0.3);
    doc.line(margin, yPosition, pageWidth - margin, yPosition);
    yPosition += 10;

    doc.setFontSize(14);
    doc.setFont(undefined, 'bold');
    doc.text('Recent Activity', margin, yPosition);
    yPosition += 10;

    if (analytics.recentActivity.length > 0) {
      doc.setFontSize(9);
      doc.setFont(undefined, 'bold');
      doc.text('Date', margin, yPosition);
      doc.text('Item', margin + 45, yPosition);
      doc.text('Amount', pageWidth - margin - 40, yPosition);
      yPosition += 6;

      doc.setFont(undefined, 'normal');
      doc.setLineWidth(0.2);
      doc.line(margin, yPosition, pageWidth - margin, yPosition);
      yPosition += 6;

      analytics.recentActivity.slice(0, 10).forEach(item => {
        const dateStr = formatDate(item.transactionDateTime);
        doc.text(dateStr, margin, yPosition);
        
        const itemName = item.item.length > 30 ? item.item.substring(0, 27) + '...' : item.item;
        doc.text(itemName, margin + 45, yPosition);
        
        doc.text(formatCurrency(item.itemTotal), pageWidth - margin - 40, yPosition);
        yPosition += 8;
      });
    } else {
      doc.setFont(undefined, 'normal');
      doc.text('No recent activity', margin, yPosition);
      yPosition += 8;
    }

    yPosition += 10;

    // Footer with branding
    checkPageBreak(40);
    doc.setLineWidth(0.3);
    doc.line(margin, yPosition, pageWidth - margin, yPosition);
    yPosition += 8;

    // Load logo and add branding
    try {
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

      const img = new Image();
      await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve();
        img.onerror = reject;
        img.src = logoBase64;
      });

      const logoHeight = 12;
      const logoWidth = (logoHeight * img.width / img.height);
      const logoX = (pageWidth - logoWidth) / 2;
      doc.addImage(logoBase64, 'PNG', logoX, yPosition, logoWidth, logoHeight);
      yPosition += logoHeight + 5;

      doc.setFontSize(10);
      doc.setFont(undefined, 'bold');
      const stashwayText = 'Stashway';
      const stashwayWidth = doc.getTextWidth(stashwayText);
      const stashwayX = (pageWidth - stashwayWidth - 4) / 2;
      doc.text(stashwayText, stashwayX, yPosition);
      
      doc.setFontSize(7);
      doc.text('™', stashwayX + stashwayWidth + 1, yPosition - 2);
    } catch (err) {
      console.warn('Could not load logo, showing text only:', err);
      doc.setFontSize(10);
      doc.setFont(undefined, 'bold');
      const stashwayText = 'Stashway';
      const stashwayWidth = doc.getTextWidth(stashwayText);
      const stashwayX = (pageWidth - stashwayWidth - 4) / 2;
      doc.text(stashwayText, stashwayX, yPosition);
      doc.setFontSize(7);
      doc.text('™', stashwayX + stashwayWidth + 1, yPosition - 2);
    }

    // Generate filename
    const dateSlug = new Date().toISOString().split('T')[0];
    const filename = `stashway_overview_${dateSlug}.pdf`;

    // Download PDF
    doc.save(filename);
  } catch (err) {
    console.error('Error generating overview PDF:', err);
    throw new Error('Failed to generate overview PDF');
  }
};

