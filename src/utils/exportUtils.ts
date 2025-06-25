import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { Student, AttendanceSummary } from '../types';

export const exportToExcel = (students: Student[], listName: string, summary: AttendanceSummary): void => {
  try {
    // Prepare data for Excel - mantener orden original si existe
    const sortedStudents = [...students].sort((a, b) => {
      if (a.ordenOriginal !== undefined && b.ordenOriginal !== undefined) {
        return a.ordenOriginal - b.ordenOriginal;
      }
      return a.apellido.localeCompare(b.apellido, 'es', { sensitivity: 'base' });
    });

    const excelData = sortedStudents.map((student, index) => ({
      'Nº': index + 1,
      'Apellidos': student.apellido,
      'Nombres': student.nombre,
      'DNI': student.dni || '',
      'Teléfono': student.telefono || '',
      'Asistencia': student.presente ? 'Presente' : 'Ausente',
      'Origen': student.esManual ? 'Manual' : 'Excel',
      'Fecha Creación': student.fechaCreacion.toLocaleDateString('es-ES')
    }));
    
    // Add summary data
    const summaryData = [
      ['RESUMEN DE ASISTENCIA - UNIVERSIDAD TECNOLÓGICA DEL PERÚ'],
      ['Lista:', listName],
      ['Fecha de exportación:', new Date().toLocaleString('es-ES')],
      [''],
      ['ESTADÍSTICAS GENERALES'],
      ['Total de estudiantes', summary.total],
      ['Estudiantes presentes', summary.presentes],
      ['Estudiantes ausentes', summary.ausentes],
      ['Porcentaje de asistencia', `${summary.total > 0 ? (summary.presentes / summary.total * 100).toFixed(1) : 0}%`],
      [''],
      ['DESGLOSE POR ORIGEN'],
      ['Presentes del Excel', summary.presentesExcel],
      ['Presentes agregados manualmente', summary.presentesManuales],
      ['Ausentes del Excel', summary.ausentesExcel],
      ['Ausentes agregados manualmente', summary.ausentesManuales]
    ];
    
    // Create workbook
    const wb = XLSX.utils.book_new();
    
    // Add students sheet
    const wsStudents = XLSX.utils.json_to_sheet(excelData);
    
    // Auto-size columns
    const colWidths = [
      { wch: 5 },  // Nº
      { wch: 20 }, // Apellidos
      { wch: 20 }, // Nombres
      { wch: 12 }, // DNI
      { wch: 15 }, // Teléfono
      { wch: 10 }, // Asistencia
      { wch: 8 },  // Origen
      { wch: 15 }  // Fecha
    ];
    wsStudents['!cols'] = colWidths;
    
    XLSX.utils.book_append_sheet(wb, wsStudents, 'Lista de Estudiantes');
    
    // Add summary sheet
    const wsSummary = XLSX.utils.aoa_to_sheet(summaryData);
    wsSummary['!cols'] = [{ wch: 30 }, { wch: 15 }];
    XLSX.utils.book_append_sheet(wb, wsSummary, 'Resumen');
    
    // Save file
    const fileName = `UTP_${listName.replace(/[^a-zA-Z0-9]/g, '_')}_${new Date().toISOString().split('T')[0]}.xlsx`;
    XLSX.writeFile(wb, fileName);
  } catch (error) {
    console.error('Error exporting to Excel:', error);
    throw new Error('Error al exportar a Excel');
  }
};

export const exportToPDF = async (elementId: string, listName: string): Promise<void> => {
  try {
    const element = document.getElementById(elementId);
    if (!element) {
      throw new Error('Elemento no encontrado para exportar');
    }
    
    // Increase scale for better quality
    const canvas = await html2canvas(element, {
      scale: 2,
      useCORS: true,
      allowTaint: true,
      backgroundColor: '#ffffff',
      logging: false,
      height: element.scrollHeight,
      width: element.scrollWidth
    });
    
    const imgData = canvas.toDataURL('image/png');
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    });
    
    // Add header
    pdf.setFontSize(16);
    pdf.setFont('helvetica', 'bold');
    pdf.text('Universidad Tecnológica del Perú', 105, 15, { align: 'center' });
    
    pdf.setFontSize(14);
    pdf.text('Sistema de Asistencia UTP', 105, 25, { align: 'center' });
    
    pdf.setFontSize(12);
    pdf.setFont('helvetica', 'normal');
    pdf.text(`Lista: ${listName}`, 20, 35);
    pdf.text(`Fecha: ${new Date().toLocaleDateString('es-ES')}`, 20, 42);
    
    // Calculate dimensions to fit the page
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = pdf.internal.pageSize.getHeight();
    
    const canvasWidth = canvas.width;
    const canvasHeight = canvas.height;
    
    // Leave space for header and footer
    const availableHeight = pdfHeight - 60; // 50mm for header, 10mm for footer
    const availableWidth = pdfWidth - 20; // 10mm margins on each side
    
    const ratio = Math.min(availableWidth / canvasWidth, availableHeight / canvasHeight);
    const imgWidth = canvasWidth * ratio;
    const imgHeight = canvasHeight * ratio;
    
    // Center the image
    const x = (pdfWidth - imgWidth) / 2;
    const y = 50; // Start after header
    
    pdf.addImage(imgData, 'PNG', x, y, imgWidth, imgHeight);
    
    // Add footer
    pdf.setFontSize(8);
    pdf.text('Apoyos UTP - Sistema de Asistencia Estudiantil', 105, pdfHeight - 5, { align: 'center' });
    
    // Save file
    const fileName = `UTP_${listName.replace(/[^a-zA-Z0-9]/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`;
    pdf.save(fileName);
  } catch (error) {
    console.error('Error exporting to PDF:', error);
    throw new Error('Error al exportar a PDF');
  }
};