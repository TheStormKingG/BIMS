import { SpentItem } from './spentTableDatabase';

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

