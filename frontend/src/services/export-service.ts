/**
 * Export Service
 * 
 * Provides functionality to export detailed airport quality reports
 * as PDF or Excel files.
 * 
 * **Validates: Requirements 7.1, 7.2, 7.3, 7.5**
 */

import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import html2canvas from 'html2canvas';

/**
 * Type definitions for report data
 */
interface DetailedAirportReport {
  airportId: string;
  airportName: string;
  timeRange: {
    start: string;
    end: string;
  };
  generatedAt: string;
  summary: {
    totalNodes: number;
    avgAvailability: number;
    avgLatency: number;
    qualityScore: number;
  };
  timeDimension: any;
  regionalDimension: any;
  protocolDimension: any;
  nodes: any[];
  qualityScoring: any;
}

interface ExportOptions {
  includeCharts?: boolean;
  chartElements?: HTMLElement[];
}

/**
 * Export Service Class
 */
class ExportService {
  /**
   * Generate and download PDF report
   * 
   * Includes all charts as images (using html2canvas), data tables with formatting,
   * metadata (timestamp, time range, airport name), and handles multi-page layout.
   * 
   * **Validates: Requirements 7.2, 7.5**
   * 
   * @param reportData - The detailed airport report data
   * @param options - Export options including chart elements
   * @returns Promise that resolves when PDF is generated and downloaded
   */
  async generatePDFReport(
    reportData: DetailedAirportReport,
    options: ExportOptions = {}
  ): Promise<void> {
    const { includeCharts = true, chartElements = [] } = options;

    // Create new PDF document (A4 size)
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    });

    let yPosition = 20;
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 15;
    const contentWidth = pageWidth - 2 * margin;

    // Helper function to add page footer with page number
    const addPageFooter = () => {
      const pageCount = (doc as any).internal.getNumberOfPages();
      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(128, 128, 128);
      doc.text(
        `Page ${pageCount}`,
        pageWidth / 2,
        pageHeight - 10,
        { align: 'center' }
      );
      doc.setTextColor(0, 0, 0);
    };

    // Helper function to check if we need a new page
    const checkPageBreak = (requiredSpace: number) => {
      if (yPosition + requiredSpace > pageHeight - margin - 10) {
        addPageFooter();
        doc.addPage();
        yPosition = 20;
        return true;
      }
      return false;
    };

    // ===== COVER PAGE =====
    // Title
    doc.setFontSize(24);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(79, 70, 229); // Indigo color
    doc.text('Airport Quality Report', pageWidth / 2, yPosition, { align: 'center' });
    yPosition += 15;

    // Airport Name
    doc.setFontSize(18);
    doc.setTextColor(0, 0, 0);
    doc.text(reportData.airportName, pageWidth / 2, yPosition, { align: 'center' });
    yPosition += 20;

    // Metadata box
    doc.setFillColor(249, 250, 251); // Light gray background
    doc.rect(margin, yPosition, contentWidth, 30, 'F');
    
    yPosition += 8;
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text('Report Information', margin + 5, yPosition);
    yPosition += 6;
    
    doc.setFont('helvetica', 'normal');
    doc.text(`Generated: ${new Date(reportData.generatedAt).toLocaleString()}`, margin + 5, yPosition);
    yPosition += 5;
    doc.text(`Time Range Start: ${new Date(reportData.timeRange.start).toLocaleString()}`, margin + 5, yPosition);
    yPosition += 5;
    doc.text(`Time Range End: ${new Date(reportData.timeRange.end).toLocaleString()}`, margin + 5, yPosition);
    yPosition += 5;
    doc.text(`Airport ID: ${reportData.airportId}`, margin + 5, yPosition);
    yPosition += 15;

    // ===== SUMMARY SECTION =====
    checkPageBreak(50);
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(79, 70, 229);
    doc.text('Executive Summary', margin, yPosition);
    yPosition += 10;

    doc.setTextColor(0, 0, 0);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    const summaryData = [
      ['Total Nodes', reportData.summary.totalNodes.toString()],
      ['Average Availability', `${reportData.summary.avgAvailability.toFixed(2)}%`],
      ['Average Latency', `${reportData.summary.avgLatency.toFixed(2)} ms`],
      ['Quality Score', `${reportData.summary.qualityScore.toFixed(2)} / 100`]
    ];

    autoTable(doc, {
      startY: yPosition,
      head: [['Metric', 'Value']],
      body: summaryData,
      theme: 'grid',
      headStyles: { 
        fillColor: [79, 70, 229],
        textColor: [255, 255, 255],
        fontStyle: 'bold'
      },
      margin: { left: margin, right: margin },
      styles: { fontSize: 10 }
    });

    yPosition = (doc as any).lastAutoTable.finalY + 15;

    // ===== CHARTS SECTION =====
    if (includeCharts && chartElements.length > 0) {
      checkPageBreak(20);
      
      doc.setFontSize(16);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(79, 70, 229);
      doc.text('Visual Analysis', margin, yPosition);
      yPosition += 10;
      doc.setTextColor(0, 0, 0);

      for (let i = 0; i < chartElements.length; i++) {
        const chartElement = chartElements[i];
        
        try {
          // Capture chart as image using html2canvas
          const canvas = await html2canvas(chartElement, {
            scale: 2,
            backgroundColor: '#ffffff',
            logging: false,
            useCORS: true
          });
          
          const imgData = canvas.toDataURL('image/png');
          const imgWidth = contentWidth;
          const imgHeight = (canvas.height * imgWidth) / canvas.width;

          // Limit image height to avoid overly tall images
          const maxImgHeight = 120;
          const finalImgHeight = Math.min(imgHeight, maxImgHeight);
          const finalImgWidth = imgHeight > maxImgHeight 
            ? (canvas.width * maxImgHeight) / canvas.height 
            : imgWidth;

          // Check if image fits on current page
          checkPageBreak(finalImgHeight + 15);

          // Add chart title if available (from data-chart-title attribute)
          const chartTitle = chartElement.getAttribute('data-chart-title');
          if (chartTitle) {
            doc.setFontSize(12);
            doc.setFont('helvetica', 'bold');
            doc.text(chartTitle, margin, yPosition);
            yPosition += 7;
          }

          // Center the image if it's smaller than content width
          const xOffset = margin + (contentWidth - finalImgWidth) / 2;
          doc.addImage(imgData, 'PNG', xOffset, yPosition, finalImgWidth, finalImgHeight);
          yPosition += finalImgHeight + 10;
        } catch (error) {
          console.error('Error capturing chart:', error);
          // Add error message in PDF
          doc.setFontSize(10);
          doc.setTextColor(239, 68, 68); // Red color
          doc.text('Chart could not be rendered', margin, yPosition);
          yPosition += 10;
          doc.setTextColor(0, 0, 0);
        }
      }
    }

    // ===== REGIONAL ANALYSIS TABLE =====
    if (reportData.regionalDimension && reportData.regionalDimension.regions && reportData.regionalDimension.regions.length > 0) {
      checkPageBreak(40);
      
      doc.setFontSize(16);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(79, 70, 229);
      doc.text('Regional Analysis', margin, yPosition);
      yPosition += 10;
      doc.setTextColor(0, 0, 0);

      const regionalTableData = reportData.regionalDimension.regions.map((region: any) => [
        region.region,
        region.nodeCount.toString(),
        `${region.avgLatency.toFixed(2)} ms`,
        `${region.avgAvailability.toFixed(2)}%`
      ]);

      autoTable(doc, {
        startY: yPosition,
        head: [['Region', 'Nodes', 'Avg Latency', 'Avg Availability']],
        body: regionalTableData,
        theme: 'striped',
        headStyles: { 
          fillColor: [79, 70, 229],
          textColor: [255, 255, 255],
          fontStyle: 'bold'
        },
        margin: { left: margin, right: margin },
        styles: { fontSize: 9 }
      });

      yPosition = (doc as any).lastAutoTable.finalY + 15;
    }

    // ===== NODE DETAILS TABLE =====
    if (reportData.nodes && reportData.nodes.length > 0) {
      checkPageBreak(40);
      
      doc.setFontSize(16);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(79, 70, 229);
      doc.text('Node Details', margin, yPosition);
      yPosition += 10;
      doc.setTextColor(0, 0, 0);

      const nodeTableData = reportData.nodes.map((node: any) => [
        node.nodeName || node.nodeId,
        node.protocol || 'N/A',
        node.region || 'N/A',
        node.availability?.rate ? `${node.availability.rate.toFixed(2)}%` : 'N/A',
        node.latency?.mean ? `${node.latency.mean.toFixed(2)} ms` : 'N/A',
        node.healthStatus || 'N/A'
      ]);

      autoTable(doc, {
        startY: yPosition,
        head: [['Node', 'Protocol', 'Region', 'Availability', 'Latency', 'Status']],
        body: nodeTableData,
        theme: 'striped',
        headStyles: { 
          fillColor: [79, 70, 229],
          textColor: [255, 255, 255],
          fontStyle: 'bold'
        },
        margin: { left: margin, right: margin },
        styles: { fontSize: 8 },
        columnStyles: {
          0: { cellWidth: 40 },
          1: { cellWidth: 20 },
          2: { cellWidth: 25 },
          3: { cellWidth: 25 },
          4: { cellWidth: 25 },
          5: { cellWidth: 20 }
        }
      });
    }

    // Add footer to last page
    addPageFooter();

    // Generate filename with timestamp
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
    const filename = `airport-report-${reportData.airportName.replace(/\s+/g, '-')}-${timestamp}.pdf`;

    // Save PDF
    doc.save(filename);
  }

  /**
   * Generate and download Excel report
   * 
   * @param reportData - The detailed airport report data
   * @returns Promise that resolves when Excel is generated and downloaded
   */
  async generateExcelReport(reportData: DetailedAirportReport): Promise<void> {
    // Create a new workbook
    const workbook = XLSX.utils.book_new();

    // 1. Metadata Sheet
    const metadataData = [
      ['Airport Quality Report'],
      [],
      ['Airport Name', reportData.airportName],
      ['Airport ID', reportData.airportId],
      ['Generated At', new Date(reportData.generatedAt).toLocaleString()],
      ['Time Range Start', new Date(reportData.timeRange.start).toLocaleString()],
      ['Time Range End', new Date(reportData.timeRange.end).toLocaleString()],
      [],
      ['Summary Metrics'],
      ['Total Nodes', reportData.summary.totalNodes],
      ['Average Availability', `${reportData.summary.avgAvailability.toFixed(2)}%`],
      ['Average Latency', `${reportData.summary.avgLatency.toFixed(2)}ms`],
      ['Quality Score', reportData.summary.qualityScore.toFixed(2)]
    ];

    const metadataSheet = XLSX.utils.aoa_to_sheet(metadataData);
    
    // Style the metadata sheet
    if (!metadataSheet['!cols']) metadataSheet['!cols'] = [];
    metadataSheet['!cols'][0] = { wch: 25 };
    metadataSheet['!cols'][1] = { wch: 40 };

    XLSX.utils.book_append_sheet(workbook, metadataSheet, 'Metadata');

    // 2. Overview Sheet
    const overviewData = [
      ['Metric', 'Value'],
      ['Total Nodes', reportData.summary.totalNodes],
      ['Average Availability', reportData.summary.avgAvailability],
      ['Average Latency (ms)', reportData.summary.avgLatency],
      ['Quality Score', reportData.summary.qualityScore]
    ];

    const overviewSheet = XLSX.utils.aoa_to_sheet(overviewData);
    XLSX.utils.book_append_sheet(workbook, overviewSheet, 'Overview');

    // 3. Time Analysis Sheet
    if (reportData.timeDimension) {
      const timeData: any[][] = [['Time Analysis']];
      
      // Add hourly trend if available
      if (reportData.timeDimension.hourlyTrend && reportData.timeDimension.hourlyTrend.length > 0) {
        timeData.push([]);
        timeData.push(['Hourly Trend']);
        timeData.push(['Hour', 'Avg Latency (ms)', 'P95 Latency (ms)', 'Availability (%)', 'Check Count']);
        
        reportData.timeDimension.hourlyTrend.forEach((item: any) => {
          timeData.push([
            item.hour,
            item.avgLatency,
            item.p95Latency,
            item.availabilityRate,
            item.checkCount
          ]);
        });
      }

      // Add daily trend if available
      if (reportData.timeDimension.dailyTrend && reportData.timeDimension.dailyTrend.length > 0) {
        timeData.push([]);
        timeData.push(['Daily Trend']);
        timeData.push(['Date', 'Avg Latency (ms)', 'P95 Latency (ms)', 'Availability (%)', 'Check Count']);
        
        reportData.timeDimension.dailyTrend.forEach((item: any) => {
          timeData.push([
            item.date,
            item.avgLatency,
            item.p95Latency,
            item.availabilityRate,
            item.checkCount
          ]);
        });
      }

      const timeSheet = XLSX.utils.aoa_to_sheet(timeData);
      XLSX.utils.book_append_sheet(workbook, timeSheet, 'Time Analysis');
    }

    // 4. Regional Analysis Sheet
    if (reportData.regionalDimension && reportData.regionalDimension.regions) {
      const regionalData: any[][] = [
        ['Regional Analysis'],
        [],
        ['Region', 'Node Count', 'Avg Latency (ms)', 'Avg Availability (%)']
      ];

      reportData.regionalDimension.regions.forEach((region: any) => {
        regionalData.push([
          region.region,
          region.nodeCount,
          region.avgLatency,
          region.avgAvailability
        ]);
      });

      const regionalSheet = XLSX.utils.aoa_to_sheet(regionalData);
      XLSX.utils.book_append_sheet(workbook, regionalSheet, 'Regional Analysis');
    }

    // 5. Node Details Sheet
    if (reportData.nodes && reportData.nodes.length > 0) {
      const nodeData: any[][] = [
        ['Node Details'],
        [],
        ['Node Name', 'Node ID', 'Protocol', 'Region', 'Availability (%)', 'Avg Latency (ms)', 'P95 Latency (ms)', 'Stability Score', 'Health Status']
      ];

      reportData.nodes.forEach((node: any) => {
        nodeData.push([
          node.nodeName || 'N/A',
          node.nodeId,
          node.protocol || 'N/A',
          node.region || 'N/A',
          node.availability?.rate || 0,
          node.latency?.mean || 0,
          node.latency?.p95 || 0,
          node.stability?.score || 0,
          node.healthStatus || 'N/A'
        ]);
      });

      const nodeSheet = XLSX.utils.aoa_to_sheet(nodeData);
      
      // Set column widths
      if (!nodeSheet['!cols']) nodeSheet['!cols'] = [];
      nodeSheet['!cols'][0] = { wch: 30 }; // Node Name
      nodeSheet['!cols'][1] = { wch: 20 }; // Node ID
      nodeSheet['!cols'][2] = { wch: 12 }; // Protocol
      nodeSheet['!cols'][3] = { wch: 15 }; // Region
      nodeSheet['!cols'][4] = { wch: 15 }; // Availability
      nodeSheet['!cols'][5] = { wch: 15 }; // Avg Latency
      nodeSheet['!cols'][6] = { wch: 15 }; // P95 Latency
      nodeSheet['!cols'][7] = { wch: 15 }; // Stability
      nodeSheet['!cols'][8] = { wch: 12 }; // Health Status

      XLSX.utils.book_append_sheet(workbook, nodeSheet, 'Node Details');
    }

    // Generate filename
    const filename = `airport-report-${reportData.airportId}-${Date.now()}.xlsx`;

    // Write and download the file
    XLSX.writeFile(workbook, filename);
  }
}

// Export singleton instance
export const exportService = new ExportService();
export default exportService;
