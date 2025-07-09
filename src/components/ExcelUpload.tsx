import React, { useRef, useState } from 'react';
import { Upload, FileSpreadsheet, AlertCircle, Info } from 'lucide-react';
import { Student } from '../types';
import { processExcelFile, validateExcelFile } from '../utils/excelUtils';

interface ExcelUploadProps {
  onStudentsLoaded: (students: Student[], duplicatesFound: number) => void;
  disabled?: boolean;
}

const ExcelUpload: React.FC<ExcelUploadProps> = ({ onStudentsLoaded, disabled = false }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [dragActive, setDragActive] = useState(false);

  const handleFileSelect = async (file: File) => {
    const validationError = validateExcelFile(file);
    if (validationError) {
      alert(validationError);
      return;
    }

    setIsProcessing(true);
    try {
      const { students, duplicatesFound } = await processExcelFile(file);
      onStudentsLoaded(students, duplicatesFound);
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Error procesando el archivo');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    const file = e.dataTransfer.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-lg p-6 mb-6 border border-gray-200">
      <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center">
        <FileSpreadsheet className="w-6 h-6 mr-2 text-red-800" />
        Cargar Estudiantes desde Excel
      </h2>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
        <div className="lg:col-span-2">
          <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-start">
              <Info className="w-5 h-5 text-blue-600 mt-0.5 mr-2 flex-shrink-0" />
              <div className="text-sm text-blue-800">
                <p className="font-semibold mb-2">Formatos soportados:</p>
                <div className="space-y-2">
                  <div>
                    <strong>Opción 1 - Una columna:</strong> Nombre completo (ej: "Juan Pérez García")
                  </div>
                  <div>
                    <strong>Opción 2 - Dos columnas:</strong> Nombres | Apellidos
                  </div>
                  <div>
                    <strong>Opción 3 - Cuatro columnas:</strong> Primer Nombre | Segundo Nombre | Primer Apellido | Segundo Apellido
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        <div className="p-4 bg-orange-50 border border-orange-200 rounded-lg">
          <div className="flex items-start">
            <AlertCircle className="w-5 h-5 text-orange-600 mt-0.5 mr-2 flex-shrink-0" />
            <div className="text-sm text-orange-800">
              <p className="font-semibold mb-1">Importante:</p>
              <ul className="space-y-1">
                <li>• Se mantiene el orden original del archivo</li>
                <li>• Los duplicados se eliminan automáticamente</li>
                <li>• Se ignoran las filas vacías</li>
                <li>• Estudiantes marcados como ausentes por defecto</li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      <div
        className={`
          border-2 border-dashed rounded-xl p-8 text-center transition-all duration-200
          ${dragActive ? 'border-red-500 bg-red-50 scale-105' : 'border-gray-300'}
          ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:border-red-400 hover:bg-red-50 hover:scale-105'}
        `}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        onClick={() => !disabled && !isProcessing && fileInputRef.current?.click()}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".xlsx,.xls,.csv"
          onChange={handleFileInput}
          className="hidden"
          disabled={disabled || isProcessing}
        />

        {isProcessing ? (
          <div className="flex flex-col items-center">
            <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-red-800 mb-4"></div>
            <p className="text-lg font-medium text-gray-700">Procesando archivo...</p>
            <p className="text-sm text-gray-500 mt-1">Analizando formato y cargando estudiantes</p>
          </div>
        ) : (
          <div className="flex flex-col items-center">
            <div className="bg-gradient-to-br from-red-800 to-red-600 p-4 rounded-full mb-4">
              <Upload className="w-12 h-12 text-white" />
            </div>
            <p className="text-xl font-semibold text-gray-700 mb-2">
              Arrastra tu archivo aquí o haz clic para seleccionar
            </p>
            <p className="text-sm text-gray-500 mb-4">
              Formatos soportados: .xlsx, .xls, .csv (máximo 10MB)
            </p>
            <div className="flex items-center space-x-4 text-xs text-gray-400">
              <span>📊 Excel</span>
              <span>📋 CSV</span>
              <span>🔄 Auto-detección de formato</span>
            </div>
          </div>
        )}
      </div>

      <div className="mt-4 text-xs text-gray-500 bg-gray-50 p-3 rounded-lg">
        <p><strong>Ejemplos de formatos válidos:</strong></p>
        <ul className="mt-1 space-y-1">
          <li>• <strong>1 columna:</strong> "María García López" → Nombre: María, Apellido: García López</li>
          <li>• <strong>2 columnas:</strong> "María José" | "García López" → Nombre: María José, Apellido: García López</li>
          <li>• <strong>4 columnas:</strong> "María" | "José" | "García" | "López" → Nombre: María José, Apellido: García López</li>
        </ul>
      </div>
    </div>
  );
};

export default ExcelUpload;