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
 * Export spending data as PDF
 */
export const exportSpendingToPdf = async (
  spentItems: SpentItem[],
  monthLabel: string
): Promise<void> => {
  try {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 20;
    const tableStartY = 40;
    let yPosition = tableStartY;
    const rowHeight = 8;
    const colWidths = [35, 50, 25, 15, 25, 30, 30, 25];
    const headers = ['Date', 'Item', 'Total', 'Qty', 'Cost', 'Category', 'Method', 'Source'];

    // Helper to format currency
    const formatCurrency = (amount: number) => {
      return `$${amount.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
    };

    // Helper to format date
    const formatDate = (dateString: string) => {
      const date = new Date(dateString);
      return date.toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    };

    // Title
    doc.setFontSize(18);
    doc.setTextColor(16, 185, 129); // emerald-500
    doc.text('Spending Report', margin, 20);
    
    doc.setFontSize(12);
    doc.setTextColor(71, 85, 105); // slate-600
    doc.text(monthLabel, margin, 30);

    // Helper to check page break
    const checkPageBreak = (requiredHeight: number) => {
      if (yPosition + requiredHeight > pageHeight - margin) {
        doc.addPage();
        yPosition = margin + 10;
        // Redraw headers on new page
        doc.setFontSize(10);
        doc.setTextColor(71, 85, 105);
        doc.setFont(undefined, 'bold');
        let xPos = margin;
        headers.forEach((header, i) => {
          doc.text(header, xPos, yPosition);
          xPos += colWidths[i];
        });
        doc.setFont(undefined, 'normal');
        yPosition += rowHeight;
      }
    };

    // Draw table headers
    doc.setFontSize(10);
    doc.setTextColor(71, 85, 105);
    doc.setFont(undefined, 'bold');
    let xPos = margin;
    headers.forEach((header, i) => {
      doc.text(header, xPos, yPosition);
      xPos += colWidths[i];
    });
    doc.setFont(undefined, 'normal');
    yPosition += rowHeight;

    // Draw horizontal line under headers
    doc.setDrawColor(226, 232, 240); // slate-200
    doc.line(margin, yPosition - 2, pageWidth - margin, yPosition - 2);

    // Draw table rows
    doc.setFontSize(9);
    doc.setTextColor(30, 41, 59); // slate-800
    
    spentItems.forEach((item, index) => {
      checkPageBreak(rowHeight + 2);

      const row = [
        formatDate(item.transactionDateTime),
        item.item.length > 25 ? item.item.substring(0, 22) + '...' : item.item,
        formatCurrency(item.itemTotal),
        item.itemQty.toString(),
        formatCurrency(item.itemCost),
        item.category,
        item.paymentMethod || 'N/A',
        item.source
      ];

      xPos = margin;
      row.forEach((cell, i) => {
        doc.text(cell, xPos, yPosition);
        xPos += colWidths[i];
      });

      yPosition += rowHeight;
    });

    // Footer with total
    const total = spentItems.reduce((sum, item) => sum + item.itemTotal, 0);
    checkPageBreak(rowHeight + 5);
    yPosition += 5;
    doc.setDrawColor(226, 232, 240);
    doc.line(margin, yPosition, pageWidth - margin, yPosition);
    yPosition += 8;
    
    doc.setFontSize(11);
    doc.setFont(undefined, 'bold');
    doc.setTextColor(16, 185, 129);
    doc.text(`Total: ${formatCurrency(total)}`, margin, yPosition);

    // Generate filename
    const dateSlug = new Date().toISOString().split('T')[0];
    const filename = `stashway_spending_${dateSlug}.pdf`;
    
    doc.save(filename);
  } catch (err) {
    console.error('Error exporting spending to PDF:', err);
    throw new Error('Failed to export spending to PDF');
  }
};

/**
 * Export Overview/Dashboard as PDF
 */
export const exportOverviewToPdf = async (
  accounts: Account[],
  spentItems: SpentItem[],
  totalBalance: number,
  userEmail?: string,
  userAvatarUrl?: string | null
): Promise<void> => {
  try {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 25; // Increased margin to prevent content from touching edges
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

    // Calculate spending over time for line chart (last 30 days)
    const now = new Date();
    const spendingOverTimeData: Array<{ date: string; amount: number }> = [];
    for (let i = 29; i >= 0; i--) {
      const date = new Date(now);
      date.setDate(date.getDate() - i);
      const dateKey = date.toISOString().split('T')[0];
      const day = date.getDate();
      const month = date.getMonth() + 1;
      const daySpending = spentItems
        .filter(item => {
          const itemDate = new Date(item.transactionDateTime).toISOString().split('T')[0];
          return itemDate === dateKey;
        })
        .reduce((sum, item) => sum + item.itemTotal, 0);
      spendingOverTimeData.push({
        date: `${month}/${day}`,
        amount: daySpending
      });
    }

    // Header - Mobile style header (without settings icon)
    const headerHeight = 18;
    checkPageBreak(headerHeight + 10);
    
    // Header background (light gray, simulating gradient)
    doc.setFillColor(248, 250, 252); // slate-50
    doc.rect(0, 0, pageWidth, headerHeight, 'F');
    
    // Logo and Stashway text on the left
    const logoSize = 14; // PDF units (mm) - increased from 12 for better visibility
    const logoX = margin;
    const logoY = headerHeight / 2;
    
    // Try to load and add logo image
    try {
      const logoUrl = '/stashway-logo.png';
      const logoResponse = await fetch(logoUrl);
      if (logoResponse.ok) {
        const logoBlob = await logoResponse.blob();
        const logoBase64 = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(logoBlob);
        });
        // Use logoSize directly (already increased to 14)
        doc.addImage(logoBase64, 'PNG', logoX, logoY - logoSize / 2, logoSize, logoSize);
      } else {
        throw new Error('Logo not found');
      }
    } catch (e) {
      // Logo loading failed, use placeholder circle with S
      doc.setFillColor(16, 185, 129); // emerald-500
      doc.circle(logoX + logoSize / 2, logoY, logoSize / 2, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(9);
      doc.setFont(undefined, 'bold');
      doc.text('S', logoX + logoSize / 2 - 1.8, logoY + 1.8);
    }
    
    // Stashway text
    doc.setTextColor(15, 23, 42); // slate-900
    doc.setFontSize(12);
    doc.setFont(undefined, 'bold');
    doc.text('Stashway™', logoX + logoSize + 4, logoY + 3);
    
    // User email and profile picture on the right
    const rightMargin = margin;
    let rightX = pageWidth - rightMargin;
    
    // Profile picture (small circle)
    const avatarSize = 8;
    const avatarX = rightX - avatarSize / 2;
    const avatarY = logoY;
    
    // Try to load user avatar image if available
    let avatarLoaded = false;
    if (userAvatarUrl) {
      try {
        const avatarResponse = await fetch(userAvatarUrl);
        if (avatarResponse.ok) {
          const avatarBlob = await avatarResponse.blob();
          const avatarBase64 = await new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result as string);
            reader.onerror = reject;
            reader.readAsDataURL(avatarBlob);
          });
          // Create a circular clipping path for avatar
          doc.setFillColor(255, 255, 255);
          doc.circle(avatarX, avatarY, avatarSize / 2, 'F'); // White background
          doc.addImage(avatarBase64, 'PNG', avatarX - avatarSize / 2, avatarY - avatarSize / 2, avatarSize, avatarSize);
          avatarLoaded = true;
        }
      } catch (e) {
        // Avatar loading failed, use placeholder
      }
    }
    
    // Draw avatar placeholder if image not loaded
    if (!avatarLoaded) {
      doc.setFillColor(226, 232, 240); // slate-300
      doc.circle(avatarX, avatarY, avatarSize / 2, 'F');
      doc.setTextColor(100, 116, 139); // slate-500
      doc.setFontSize(6);
      doc.setFont(undefined, 'normal');
      doc.text('U', avatarX - 1.5, avatarY + 1.5);
    }
    
    // User email to the left of avatar
    if (userEmail) {
      doc.setTextColor(51, 65, 85); // slate-700
      doc.setFontSize(8);
      doc.setFont(undefined, 'normal');
      const emailText = userEmail.length > 30 ? userEmail.substring(0, 27) + '...' : userEmail;
      const emailWidth = doc.getTextWidth(emailText);
      doc.text(emailText, avatarX - emailWidth - 5, avatarY + 3);
    }
    
    // Reset text color
    doc.setTextColor(0, 0, 0);
    
    yPosition = headerHeight + 10;

    // PAGE 1: Charts and Summary
    // Title
    doc.setFontSize(20);
    doc.setFont(undefined, 'bold');
    doc.text('Financial Overview', margin, yPosition);
    yPosition += 8;

    doc.setFontSize(9);
    doc.setFont(undefined, 'normal');
    const reportDate = new Date().toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
    doc.text(`Generated: ${reportDate}`, margin, yPosition);
    yPosition += 12;

    // Total Net Worth (compact)
    doc.setFontSize(12);
    doc.setFont(undefined, 'bold');
    doc.text('Total Net Worth:', margin, yPosition);
    doc.setFontSize(16);
    doc.text(formatCurrency(totalBalance), margin + 35, yPosition);
    yPosition += 12;

    // Helper function to draw a pie/donut chart with proper filled slices
    // Matches Dashboard styling: innerRadius 60, outerRadius 80 (ratio = 0.75)
    const drawPieChart = (x: number, y: number, outerRadius: number, data: Array<{ name: string; value: number }>, colors: string[]) => {
      const total = data.reduce((sum, item) => sum + item.value, 0);
      if (total === 0) return;

      let currentAngle = -90; // Start at top (in degrees)
      const centerX = x;
      const centerY = y;
      const innerRadius = outerRadius * 0.75; // Match Dashboard ratio (60/80 = 0.75)
      const paddingAngle = 2; // Degrees of padding between slices (matches Dashboard paddingAngle={5} scaled)

      // Draw each slice as a filled donut segment
      data.forEach((item, index) => {
        const sliceAngle = (item.value / total) * 360 - paddingAngle;
        const color = colors[index % colors.length];
        
        // Convert hex to RGB
        const r = parseInt(color.slice(1, 3), 16);
        const g = parseInt(color.slice(3, 5), 16);
        const b = parseInt(color.slice(5, 7), 16);
        
        doc.setFillColor(r, g, b);
        doc.setDrawColor(255, 255, 255); // White borders between slices
        
        // Draw filled slice using filled paths (approximated with many radial lines for fill effect)
        const step = Math.max(0.5, sliceAngle / 40); // Fine step for smooth fill
        for (let angle = currentAngle; angle <= currentAngle + sliceAngle; angle += step) {
          const angleRad = (angle * Math.PI) / 180;
          const outerX = centerX + outerRadius * Math.cos(angleRad);
          const outerY = centerY + outerRadius * Math.sin(angleRad);
          const innerX = centerX + innerRadius * Math.cos(angleRad);
          const innerY = centerY + innerRadius * Math.sin(angleRad);
          
          // Draw line from inner to outer to create filled appearance
          doc.setLineWidth(1.2);
          doc.setDrawColor(r, g, b);
          doc.line(innerX, innerY, outerX, outerY);
        }
        
        // Draw slice boundaries (inner and outer arcs, and connecting lines)
        const startAngleRad = (currentAngle * Math.PI) / 180;
        const endAngleRad = ((currentAngle + sliceAngle) * Math.PI) / 180;
        
        // Outer arc endpoints
        const startOuterX = centerX + outerRadius * Math.cos(startAngleRad);
        const startOuterY = centerY + outerRadius * Math.sin(startAngleRad);
        const endOuterX = centerX + outerRadius * Math.cos(endAngleRad);
        const endOuterY = centerY + outerRadius * Math.sin(endAngleRad);
        
        // Inner arc endpoints
        const startInnerX = centerX + innerRadius * Math.cos(startAngleRad);
        const startInnerY = centerY + innerRadius * Math.sin(startAngleRad);
        const endInnerX = centerX + innerRadius * Math.cos(endAngleRad);
        const endInnerY = centerY + innerRadius * Math.sin(endAngleRad);
        
        // Draw connecting lines
        doc.setDrawColor(255, 255, 255);
        doc.setLineWidth(1);
        doc.line(startInnerX, startInnerY, startOuterX, startOuterY);
        doc.line(endInnerX, endInnerY, endOuterX, endOuterY);
        
        currentAngle += sliceAngle + paddingAngle;
      });
    };

    // Helper function to draw a line chart
    const drawLineChart = (startX: number, startY: number, width: number, height: number, data: Array<{ date: string; amount: number }>) => {
      if (data.length === 0) return;

      const maxValue = Math.max(...data.map(d => d.amount), 1);
      const padding = 5;
      const yAxisLabelWidth = 30; // Space for Y-axis labels on the left
      const chartWidth = width - padding * 2 - yAxisLabelWidth; // Reserve space for Y-axis labels
      const chartHeight = height - padding * 2;
      const chartStartX = Math.max(startX + padding + yAxisLabelWidth, margin + yAxisLabelWidth); // Ensure chart respects margin
      const chartStartY = startY + padding;
      const chartEndX = Math.min(chartStartX + chartWidth, pageWidth - margin - padding); // Ensure chart respects right margin
      const chartEndY = chartStartY + chartHeight;

      // Draw axes
      doc.setDrawColor(200, 200, 200);
      doc.setLineWidth(0.3);
      doc.line(chartStartX, chartEndY, chartEndX, chartEndY); // X axis
      doc.line(chartStartX, chartStartY, chartStartX, chartEndY); // Y axis

      // Draw grid lines
      doc.setDrawColor(240, 240, 240);
      for (let i = 0; i <= 4; i++) {
        const y = chartStartY + (chartHeight / 4) * i;
        doc.line(chartStartX, y, chartEndX, y);
      }

      // Draw line
      doc.setDrawColor(5, 150, 105); // emerald-600
      doc.setLineWidth(1.5);
      const pointSpacing = chartWidth / (data.length - 1 || 1);
      
      for (let i = 0; i < data.length - 1; i++) {
        const x1 = chartStartX + pointSpacing * i;
        const y1 = chartEndY - (data[i].amount / maxValue) * chartHeight;
        const x2 = chartStartX + pointSpacing * (i + 1);
        const y2 = chartEndY - (data[i + 1].amount / maxValue) * chartHeight;
        
        doc.line(x1, y1, x2, y2);
        // Draw point
        doc.setFillColor(5, 150, 105);
        doc.circle(x1, y1, 1.5, 'F');
      }
      
      // Draw last point
      if (data.length > 0) {
        const lastX = chartStartX + pointSpacing * (data.length - 1);
        const lastY = chartEndY - (data[data.length - 1].amount / maxValue) * chartHeight;
        doc.circle(lastX, lastY, 1.5, 'F');
      }

      // Draw labels for first, middle, and last dates (ensure they don't violate margins)
      doc.setFontSize(7);
      doc.setTextColor(100, 116, 139);
      doc.setFont(undefined, 'normal');
      if (data.length > 0) {
        const labelY = chartEndY + 4;
        // First date label
        const firstDateWidth = doc.getTextWidth(data[0].date);
        doc.text(data[0].date, Math.max(chartStartX - firstDateWidth / 2, margin), labelY);
        
        if (data.length > 1) {
          const midIndex = Math.floor(data.length / 2);
          const midX = chartStartX + pointSpacing * midIndex;
          const midDateWidth = doc.getTextWidth(data[midIndex].date);
          doc.text(data[midIndex].date, Math.max(midX - midDateWidth / 2, margin), labelY);
        }
        
        if (data.length > 2) {
          const lastX = chartStartX + pointSpacing * (data.length - 1);
          const lastDateWidth = doc.getTextWidth(data[data.length - 1].date);
          const lastDateX = Math.min(lastX - lastDateWidth / 2, pageWidth - margin - lastDateWidth);
          doc.text(data[data.length - 1].date, lastDateX, labelY);
        }
      }
      
      // Draw max value on Y axis (positioned to the left of chart, respecting margin)
      const yAxisLabelX = Math.max(margin, chartStartX - yAxisLabelWidth);
      doc.setTextColor(100, 116, 139);
      const maxValueText = formatCurrency(maxValue);
      const maxValueWidth = doc.getTextWidth(maxValueText);
      doc.text(maxValueText, Math.max(margin, yAxisLabelX - maxValueWidth), chartStartY + 2);
      doc.text('0', Math.max(margin, yAxisLabelX - doc.getTextWidth('0')), chartEndY + 2);
      doc.setTextColor(0, 0, 0);
    };

    // Guyana flag colors: Green (#00A651), Yellow (#FCD116), Red (#CE1126), Black (#000000), White (#FFFFFF)
    // Using flag colors in a visually appealing order for charts
    const chartColors = ['#00A651', '#FCD116', '#CE1126', '#10b981', '#059669', '#FCDD09', '#E31837', '#000000'];

    // Pie Chart - Spending by Category (top left)
    yPosition += 5;
    doc.setFontSize(12);
    doc.setFont(undefined, 'bold');
    doc.setTextColor(0, 0, 0);
    doc.text('Spending by Category', margin, yPosition);
    yPosition += 8;

    const pieChartSize = 45;
    const pieChartX = margin + 20; // Better spacing from left edge (increased from 15)
    const pieChartY = yPosition + pieChartSize / 2;

    if (analytics.spendingByCategory.length > 0) {
      const pieData = analytics.spendingByCategory.slice(0, 8).map(cat => ({
        name: cat.category,
        value: cat.amount
      }));
      drawPieChart(pieChartX, pieChartY, pieChartSize / 2, pieData, chartColors);
      
      // Legend for pie chart (ensure it doesn't violate right margin)
      const maxLegendWidth = pageWidth - margin - (pieChartX + pieChartSize) - 15;
      const legendStartX = Math.min(pieChartX + pieChartSize + 10, pageWidth - margin - 80);
      let legendY = yPosition;
      doc.setFontSize(7);
      doc.setFont(undefined, 'normal');
      
      analytics.spendingByCategory.slice(0, 8).forEach((cat, index) => {
        if (legendY > yPosition + pieChartSize - 8) {
          legendY = yPosition;
          // Would need to wrap to next column, but keeping it simple for now
        }
        const color = chartColors[index % chartColors.length];
        const [r, g, b] = [parseInt(color.slice(1, 3), 16), parseInt(color.slice(3, 5), 16), parseInt(color.slice(5, 7), 16)];
        doc.setFillColor(r, g, b);
        doc.rect(legendStartX, legendY - 2, 3, 3, 'F');
        const label = cat.category.length > 15 ? cat.category.substring(0, 12) + '...' : cat.category;
        const labelText = `${label} (${cat.percentage.toFixed(0)}%)`;
        // Ensure label doesn't exceed right margin
        const labelWidth = doc.getTextWidth(labelText);
        if (legendStartX + 5 + labelWidth > pageWidth - margin) {
          const maxLabelLength = Math.floor((pageWidth - margin - legendStartX - 5) / (doc.getTextWidth('W') / 10));
          const truncatedLabel = label.length > maxLabelLength ? label.substring(0, maxLabelLength - 3) + '...' : label;
          doc.text(`${truncatedLabel} (${cat.percentage.toFixed(0)}%)`, legendStartX + 5, legendY);
        } else {
          doc.setTextColor(0, 0, 0);
          doc.text(labelText, legendStartX + 5, legendY);
        }
        legendY += 5;
      });
    } else {
      doc.setFontSize(9);
      doc.text('No category data', pieChartX, pieChartY);
    }

    yPosition += pieChartSize + 15;

    // Line Chart - Spending Over Time (below pie chart)
    doc.setFontSize(12);
    doc.setFont(undefined, 'bold');
    doc.text('Spending Over Time (Last 30 Days)', margin, yPosition);
    yPosition += 8;

    const lineChartWidth = pageWidth - margin * 2;
    const lineChartHeight = 50;
    drawLineChart(margin, yPosition, lineChartWidth, lineChartHeight, spendingOverTimeData);
    yPosition += lineChartHeight + 15;

    // Summary metrics in compact grid
    doc.setFontSize(12);
    doc.setFont(undefined, 'bold');
    doc.text('Summary Metrics', margin, yPosition);
    yPosition += 10;

    doc.setFontSize(9);
    doc.setFont(undefined, 'normal');
    const summaryMetrics = [
      { label: 'Last 24h', value: analytics.spentLast24Hours },
      { label: 'Last 7 days', value: analytics.spentLast7Days },
      { label: 'Last 30 days', value: analytics.spentLast30Days },
      { label: 'Avg daily', value: analytics.avgDaily },
      { label: 'Avg weekly', value: analytics.avgWeekly },
      { label: 'Avg monthly', value: analytics.avgMonthly },
    ];

    const metricsPerRow = 3;
    const metricBoxWidth = (pageWidth - margin * 2 - 15) / metricsPerRow; // Better spacing
    summaryMetrics.forEach((metric, index) => {
      const col = index % metricsPerRow;
      const row = Math.floor(index / metricsPerRow);
      const x = margin + col * (metricBoxWidth + 5);
      const y = yPosition + row * 12;

      doc.text(`${metric.label}:`, x, y);
      doc.setFont(undefined, 'bold');
      doc.text(formatCurrency(metric.value), x + 28, y); // Adjusted spacing
      doc.setFont(undefined, 'normal');
    });

    yPosition += Math.ceil(summaryMetrics.length / metricsPerRow) * 12 + 10;

    // PAGE 2: Tables
    doc.addPage();
    yPosition = margin;

    // Spending by Category Table
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

      analytics.spendingByCategory.slice(0, 15).forEach(cat => {
        doc.text(cat.category.length > 30 ? cat.category.substring(0, 27) + '...' : cat.category, margin, yPosition);
        doc.text(formatCurrency(cat.amount), pageWidth - margin - 50, yPosition);
        doc.text(`${cat.percentage.toFixed(1)}%`, pageWidth - margin - 20, yPosition);
        yPosition += 7;
      });
    } else {
      doc.setFont(undefined, 'normal');
      doc.setFontSize(9);
      doc.text('No category data available', margin, yPosition);
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
        yPosition += 7; // Reduced row spacing from 8 to 7
      });
    } else {
      doc.setFont(undefined, 'normal');
      doc.text('No recent activity', margin, yPosition);
      yPosition += 8;
    }

    yPosition += 8;

    // Most Money Spent On (Top Category) - Compact version
    checkPageBreak(25); // Reserve space for both sections and footer
    doc.setLineWidth(0.3);
    doc.line(margin, yPosition, pageWidth - margin, yPosition);
    yPosition += 6;

    doc.setFontSize(12);
    doc.setFont(undefined, 'bold');
    if (analytics.topCategory) {
      doc.setTextColor(0, 0, 0);
      doc.text('Most Money Spent On: ', margin, yPosition);
      const categoryNameWidth = doc.getTextWidth('Most Money Spent On: ');
      doc.setTextColor(0, 166, 81); // Guyana green (#00A651)
      doc.text(analytics.topCategory.name, margin + categoryNameWidth, yPosition);
      yPosition += 7;

      doc.setFontSize(14);
      doc.setFont(undefined, 'bold');
      doc.setTextColor(0, 0, 0);
      doc.text(formatCurrency(analytics.topCategory.amount), margin, yPosition);
      yPosition += 5;

      doc.setFontSize(8);
      doc.setFont(undefined, 'normal');
      doc.setTextColor(128, 128, 128);
      doc.text(`Total spent on ${analytics.topCategory.name} category.`, margin, yPosition);
      yPosition += 8;
    } else {
      doc.setTextColor(0, 0, 0);
      doc.text('Most Money Spent On', margin, yPosition);
      yPosition += 6;
      doc.setFontSize(8);
      doc.setFont(undefined, 'normal');
      doc.text('No category data available', margin, yPosition);
      yPosition += 8;
    }

    // Top Spending Item - Compact version
    checkPageBreak(25); // Reserve space for section and footer
    doc.setLineWidth(0.3);
    doc.line(margin, yPosition, pageWidth - margin, yPosition);
    yPosition += 6;

    // Calculate top spending item
    const itemTotals: Record<string, number> = {};
    spentItems.forEach(item => {
      const key = item.item.toLowerCase();
      itemTotals[key] = (itemTotals[key] || 0) + item.itemTotal;
    });
    
    const sortedItems = Object.entries(itemTotals)
      .sort((a, b) => b[1] - a[1]);
    
    const topItem = sortedItems.length > 0 ? {
      name: spentItems.find(item => item.item.toLowerCase() === sortedItems[0][0])?.item || sortedItems[0][0],
      totalSpent: sortedItems[0][1]
    } : null;

    doc.setFontSize(12);
    doc.setFont(undefined, 'bold');
    doc.setTextColor(0, 0, 0);
    
    if (topItem) {
      doc.text('Top Spending Item: ', margin, yPosition);
      const itemLabelWidth = doc.getTextWidth('Top Spending Item: ');
      const itemName = topItem.name.length > 45 ? topItem.name.substring(0, 42) + '...' : topItem.name;
      doc.setTextColor(0, 166, 81); // Guyana green (#00A651)
      doc.text(itemName, margin + itemLabelWidth, yPosition);
      yPosition += 7;

      doc.setFontSize(14);
      doc.setFont(undefined, 'bold');
      doc.setTextColor(0, 0, 0);
      doc.text(formatCurrency(topItem.totalSpent), margin, yPosition);
      yPosition += 5;

      doc.setFontSize(8);
      doc.setFont(undefined, 'normal');
      doc.setTextColor(128, 128, 128);
      const descText = `Total spent on ${topItem.name}.`;
      const descTextFinal = descText.length > 60 ? topItem.name.substring(0, 57) + '...' : descText;
      doc.text(descTextFinal, margin, yPosition);
      yPosition += 8;
    } else {
      doc.text('Top Spending Item', margin, yPosition);
      yPosition += 6;
      doc.setFontSize(8);
      doc.setFont(undefined, 'normal');
      doc.text('No spending data available', margin, yPosition);
      yPosition += 8;
    }

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

      // Increased logo size - accounting for potential empty space that could be cropped
      // If logo is cropped, this will make it appear larger
      const logoHeight = 18; // Increased from 12 to 18 (1.5x, close to 2x when accounting for padding)
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
      doc.setFontSize(9);
      doc.setFont(undefined, 'bold');
      const stashwayText = 'Stashway';
      const stashwayWidth = doc.getTextWidth(stashwayText);
      const stashwayX = (pageWidth - stashwayWidth - 4) / 2;
      doc.text(stashwayText, stashwayX, yPosition);
      doc.setFontSize(6);
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

