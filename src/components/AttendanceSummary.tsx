import React from 'react';
import { Users, UserCheck, UserX, FileSpreadsheet, UserPlus } from 'lucide-react';
import { AttendanceSummary } from '../types';

interface AttendanceSummaryProps {
  summary: AttendanceSummary;
}

const AttendanceSummaryComponent: React.FC<AttendanceSummaryProps> = ({ summary }) => {
  const attendanceRate = summary.total > 0 ? (summary.presentes / summary.total * 100).toFixed(1) : '0';

  return (
    <div className="bg-white rounded-lg shadow-md p-6 mb-6" id="attendance-summary">
      <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center">
        <Users className="w-6 h-6 mr-2" />
        Resumen de Asistencia
      </h2>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-center">
          <div className="flex items-center justify-center mb-2">
            <Users className="w-8 h-8 text-blue-600" />
          </div>
          <p className="text-2xl font-bold text-blue-800">{summary.total}</p>
          <p className="text-sm text-blue-600">Total Estudiantes</p>
        </div>

        <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-center">
          <div className="flex items-center justify-center mb-2">
            <UserCheck className="w-8 h-8 text-green-600" />
          </div>
          <p className="text-2xl font-bold text-green-800">{summary.presentes}</p>
          <p className="text-sm text-green-600">Presentes</p>
        </div>

        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-center">
          <div className="flex items-center justify-center mb-2">
            <UserX className="w-8 h-8 text-red-600" />
          </div>
          <p className="text-2xl font-bold text-red-800">{summary.ausentes}</p>
          <p className="text-sm text-red-600">Ausentes</p>
        </div>

        <div className="bg-purple-50 border border-purple-200 rounded-lg p-4 text-center">
          <div className="flex items-center justify-center mb-2">
            <div className="text-2xl font-bold text-purple-600">%</div>
          </div>
          <p className="text-2xl font-bold text-purple-800">{attendanceRate}%</p>
          <p className="text-sm text-purple-600">Asistencia</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-gray-50 rounded-lg p-4">
          <h3 className="font-semibold text-gray-800 mb-3 flex items-center">
            <FileSpreadsheet className="w-5 h-5 mr-2" />
            Desde Excel
          </h3>
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Presentes:</span>
              <span className="font-semibold text-green-600">{summary.presentesExcel}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Ausentes:</span>
              <span className="font-semibold text-red-600">{summary.ausentesExcel}</span>
            </div>
          </div>
        </div>

        <div className="bg-gray-50 rounded-lg p-4">
          <h3 className="font-semibold text-gray-800 mb-3 flex items-center">
            <UserPlus className="w-5 h-5 mr-2" />
            Agregados Manualmente
          </h3>
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Presentes:</span>
              <span className="font-semibold text-green-600">{summary.presentesManuales}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Ausentes:</span>
              <span className="font-semibold text-red-600">{summary.ausentesManuales}</span>
            </div>
          </div>
        </div>
      </div>

      {summary.total === 0 && (
        <div className="text-center py-8">
          <Users className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-500">No hay estudiantes cargados aún</p>
          <p className="text-sm text-gray-400">Carga un archivo Excel o agrega estudiantes manualmente</p>
        </div>
      )}
    </div>
  );
};

export default AttendanceSummaryComponent;