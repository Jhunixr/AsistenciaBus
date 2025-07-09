import React, { useState } from 'react';
import { Download, FileText, FileSpreadsheet } from 'lucide-react';
import { Student, AttendanceSummary } from '../types';
import { exportToExcel, exportToPDF } from '../utils/exportUtils';

interface ExportControlsProps {
  students: Student[];
  summary: AttendanceSummary;
  listName: string;
}

const ExportControls: React.FC<ExportControlsProps> = ({
  students,
  summary,
  listName
}) => {
  const [isExporting, setIsExporting] = useState(false);

  const handleExportExcel = async () => {
    if (students.length === 0) {
      alert('No hay estudiantes para exportar');
      return;
    }

    setIsExporting(true);
    try {
      exportToExcel(students, listName, summary);
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Error al exportar a Excel');
    } finally {
      setIsExporting(false);
    }
  };

  const handleExportPDF = async () => {
    if (students.length === 0) {
      alert('No hay estudiantes para exportar');
      return;
    }

    setIsExporting(true);
    try {
      // Export both summary and table
      await exportToPDF('attendance-summary', `${listName}_Resumen`);
      // Small delay between exports
      setTimeout(async () => {
        try {
          await exportToPDF('student-table', `${listName}_Lista`);
        } catch (error) {
          alert('Error al exportar la tabla a PDF');
        } finally {
          setIsExporting(false);
        }
      }, 1000);
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Error al exportar a PDF');
      setIsExporting(false);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center">
        <Download className="w-6 h-6 mr-2" />
        Exportar Datos
      </h2>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <button
          onClick={handleExportExcel}
          disabled={isExporting || students.length === 0}
          className={`
            flex items-center justify-center px-6 py-3 rounded-lg font-medium transition-colors
            ${students.length === 0 || isExporting
              ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
              : 'bg-green-600 text-white hover:bg-green-700'
            }
          `}
        >
          {isExporting ? (
            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
          ) : (
            <FileSpreadsheet className="w-5 h-5 mr-2" />
          )}
          Exportar a Excel
        </button>

        <button
          onClick={handleExportPDF}
          disabled={isExporting || students.length === 0}
          className={`
            flex items-center justify-center px-6 py-3 rounded-lg font-medium transition-colors
            ${students.length === 0 || isExporting
              ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
              : 'bg-red-600 text-white hover:bg-red-700'
            }
          `}
        >
          {isExporting ? (
            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
          ) : (
            <FileText className="w-5 h-5 mr-2" />
          )}
          Exportar a PDF
        </button>
      </div>

      <div className="mt-4 text-sm text-gray-600 space-y-1">
        <p><strong>Excel:</strong> Incluye datos completos de estudiantes y resumen en hojas separadas</p>
        <p><strong>PDF:</strong> Genera archivos separados para el resumen y la lista de estudiantes</p>
        {students.length === 0 && (
          <p className="text-red-600"><strong>Nota:</strong> Necesitas tener estudiantes cargados para poder exportar</p>
        )}
      </div>
    </div>
  );
};

export default ExportControls;