import React, { useRef, useState } from 'react';
import { Upload, FileSpreadsheet, AlertCircle, Info } from 'lucide-react';
import { supabase } from '../utils/supabaseClient';
import { processExcelFile, validateExcelFile } from '../utils/excelUtils';
import toast from 'react-hot-toast';

interface ExcelUploadProps {
  listaId: string;
  onStudentsLoaded?: (count: number) => void;
  disabled?: boolean;
  onAddExcelStudents?: (students: any[]) => void;
  onExcelImportComplete?: () => void;
}

const ExcelUpload: React.FC<ExcelUploadProps> = ({ listaId, onStudentsLoaded, disabled = false, onAddExcelStudents, onExcelImportComplete }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [dragActive, setDragActive] = useState(false);

  const handleFileSelect = async (file: File) => {
    const validationError = validateExcelFile(file);
    if (validationError) {
      toast.error(validationError);
      return;
    }

    setIsProcessing(true);
    try {
      const { students } = await processExcelFile(file);
      // Llamar a onAddExcelStudents para mostrar optimista
      if (onAddExcelStudents) onAddExcelStudents(students);
      // Emitir evento optimista ANTES de cualquier llamada a Supabase
      if (window.dispatchEvent) {
        window.dispatchEvent(new CustomEvent('excel-students-optimistic', { detail: { students } }));
      }
      // Guardar estudiantes optimistas en localStorage
      localStorage.setItem(`optimisticStudents_${listaId}`, JSON.stringify(students));
      if (onStudentsLoaded) onStudentsLoaded(students.length);

      // Buscar todos los estudiantes existentes en un solo query
      const nombres = students.map(s => s.nombres);
      const apellidos = students.map(s => s.apellidos);
      const { data: existentes } = await supabase
        .from('estudiantes')
        .select('id, nombres, apellidos')
        .in('nombres', nombres)
        .in('apellidos', apellidos);
      // Mapear estudiantes existentes
      const estudiantesMap: Record<string, string> = {};
      (existentes || []).forEach((e: any) => {
        estudiantesMap[`${e.nombres}|${e.apellidos}`] = e.id;
      });
      // Insertar solo los nuevos
      const nuevos = students.filter(s => !estudiantesMap[`${s.nombres}|${s.apellidos}`]);
      let nuevosIds: string[] = [];
      if (nuevos.length > 0) {
        const { data: insertados } = await supabase
          .from('estudiantes')
          .insert(nuevos.map(s => ({ nombres: s.nombres, apellidos: s.apellidos })))
          .select();
        if (insertados) {
          insertados.forEach((e: any, idx: number) => {
            estudiantesMap[`${nuevos[idx].nombres}|${nuevos[idx].apellidos}`] = e.id;
          });
        }
      }
      // Insertar relaciones en lote
      const relaciones = students.map((s: any) => ({
        lista_id: listaId,
        estudiante_id: estudiantesMap[`${s.nombres}|${s.apellidos}`],
        origen: 'Excel',
        presente: false
      }));
      await supabase.from('lista_estudiantes').insert(relaciones);
      toast.success(`Se agregaron ${students.length} estudiantes a la lista.`);
      if (onExcelImportComplete) onExcelImportComplete();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Error procesando el archivo');
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
    <form className="space-y-4 max-w-lg mx-auto bg-white rounded-xl shadow-lg p-6 border border-gray-200" onSubmit={e => e.preventDefault()}>
      <div className="flex items-center gap-2 mb-2">
        <FileSpreadsheet className="w-6 h-6 text-green-700" />
        <h2 className="text-lg sm:text-xl font-bold text-gray-800">Cargar estudiantes desde Excel</h2>
      </div>
      <div className="flex flex-col items-center gap-2">
        <input
          type="file"
          accept=".xlsx"
          ref={fileInputRef}
          onChange={handleFileInput}
          className="block w-full text-sm text-gray-700 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-red-800 file:text-white hover:file:bg-red-900 cursor-pointer"
          disabled={isProcessing || disabled}
        />
        <button
          type="button"
          className={`bg-red-800 text-white px-4 py-2 rounded-lg hover:bg-red-900 transition-all duration-200 w-full font-semibold flex items-center justify-center gap-2 ${isProcessing ? 'opacity-60 cursor-not-allowed' : ''}`}
          onClick={() => fileInputRef.current?.click()}
          disabled={isProcessing || disabled}
        >
          <FileSpreadsheet className="w-5 h-5" />
          {isProcessing ? 'Procesando...' : 'Seleccionar archivo Excel'}
        </button>
      </div>
      <div className="text-xs text-gray-500">Solo se aceptan archivos .xlsx. El archivo debe tener columnas de nombres y apellidos.</div>
    </form>
  );
};

export default ExcelUpload;