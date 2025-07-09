import React, { useState, useMemo } from 'react';
import { Search, UserCheck, UserX, FileSpreadsheet, UserPlus, Trash2, ArrowUpDown, RotateCcw, Info } from 'lucide-react';
import { Student } from '../types';

interface StudentTableProps {
  students: Student[];
  onToggleAttendance: (studentId: string) => void;
  onDeleteStudent: (studentId: string) => void;
}

const StudentTable: React.FC<StudentTableProps> = ({
  students,
  onToggleAttendance,
  onDeleteStudent
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<'apellido' | 'nombre' | 'original'>('original');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  const filteredAndSortedStudents = useMemo(() => {
    let filtered = students;
    
    // Apply search filter
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase().trim();
      filtered = students.filter(student =>
        student.nombre.toLowerCase().includes(term) ||
        student.apellido.toLowerCase().includes(term) ||
        (student.dni && student.dni.toLowerCase().includes(term)) ||
        (student.telefono && student.telefono.includes(term))
      );
    }
    
    // Apply sorting
    return filtered.sort((a, b) => {
      let comparison = 0;
      
      if (sortBy === 'original') {
        // Mantener orden original del archivo
        const aOrder = a.ordenOriginal || 0;
        const bOrder = b.ordenOriginal || 0;
        comparison = aOrder - bOrder;
      } else if (sortBy === 'apellido') {
        comparison = a.apellido.localeCompare(b.apellido, 'es', { sensitivity: 'base' });
        if (comparison === 0) {
          comparison = a.nombre.localeCompare(b.nombre, 'es', { sensitivity: 'base' });
        }
      } else {
        comparison = a.nombre.localeCompare(b.nombre, 'es', { sensitivity: 'base' });
        if (comparison === 0) {
          comparison = a.apellido.localeCompare(b.apellido, 'es', { sensitivity: 'base' });
        }
      }
      
      return sortOrder === 'asc' ? comparison : -comparison;
    });
  }, [students, searchTerm, sortBy, sortOrder]);

  const handleSort = (field: 'apellido' | 'nombre' | 'original') => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('asc');
    }
  };

  const handleDeleteConfirm = (student: Student) => {
    const confirmMessage = `¿Estás seguro de que quieres eliminar a ${student.apellido}, ${student.nombre}?`;
    if (window.confirm(confirmMessage)) {
      onDeleteStudent(student.id);
    }
  };

  if (students.length === 0) {
    return (
      <div className="bg-white rounded-xl shadow-lg p-8 text-center border border-gray-200">
        <UserCheck className="w-16 h-16 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-gray-600 mb-2">No hay estudiantes</h3>
        <p className="text-gray-500">Carga un archivo Excel o agrega estudiantes manualmente para comenzar</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-200" id="student-table">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6">
        <h2 className="text-xl font-bold text-gray-800 mb-4 md:mb-0 flex items-center">
          <UserCheck className="w-6 h-6 mr-2 text-red-800" />
          Lista de Asistencia ({filteredAndSortedStudents.length} estudiantes)
        </h2>
        
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative">
            <Search className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
            <input
              type="text"
              placeholder="Buscar estudiante..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 w-full sm:w-64"
            />
          </div>
          
          <div className="flex gap-2">
            <button
              onClick={() => handleSort('original')}
              className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors flex items-center ${
                sortBy === 'original' 
                  ? 'bg-red-100 text-red-700 border border-red-300' 
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
              title="Orden original del archivo"
            >
              <RotateCcw className="w-4 h-4 mr-1" />
              Original
              {sortBy === 'original' && (
                <span className="text-xs ml-1">
                  {sortOrder === 'asc' ? '↑' : '↓'}
                </span>
              )}
            </button>
            
            <button
              onClick={() => handleSort('apellido')}
              className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors flex items-center ${
                sortBy === 'apellido' 
                  ? 'bg-red-100 text-red-700 border border-red-300' 
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              <ArrowUpDown className="w-4 h-4 mr-1" />
              A-Z
              {sortBy === 'apellido' && (
                <span className="text-xs ml-1">
                  {sortOrder === 'asc' ? '↑' : '↓'}
                </span>
              )}
            </button>
          </div>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b-2 border-gray-200 bg-gray-50">
              <th className="text-left py-4 px-3 font-semibold text-gray-700">Nº</th>
              <th className="text-left py-4 px-3 font-semibold text-gray-700">Apellidos</th>
              <th className="text-left py-4 px-3 font-semibold text-gray-700">Nombres</th>
              <th className="text-left py-4 px-3 font-semibold text-gray-700 hidden md:table-cell">DNI</th>
              <th className="text-left py-4 px-3 font-semibold text-gray-700 hidden md:table-cell">Teléfono</th>
              <th className="text-center py-4 px-3 font-semibold text-gray-700">Origen</th>
              <th className="text-center py-4 px-3 font-semibold text-gray-700">Asistencia</th>
              <th className="text-center py-4 px-3 font-semibold text-gray-700">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {filteredAndSortedStudents.map((student, index) => (
              <tr
                key={student.id}
                className={`
                  border-b border-gray-100 hover:bg-gray-50 transition-colors
                  ${student.presente ? 'bg-green-50' : 'bg-red-50'}
                `}
              >
                <td className="py-4 px-3 text-sm text-gray-600 font-medium">{index + 1}</td>
                <td className="py-4 px-3 font-semibold text-gray-800">{student.apellido}</td>
                <td className="py-4 px-3 font-semibold text-gray-800">{student.nombre}</td>
                <td className="py-4 px-3 text-sm text-gray-600 hidden md:table-cell">
                  {student.dni || '-'}
                </td>
                <td className="py-4 px-3 text-sm text-gray-600 hidden md:table-cell">
                  {student.telefono || '-'}
                </td>
                <td className="py-4 px-3 text-center">
                  {student.esManual ? (
                    <div className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
                      <UserPlus className="w-3 h-3 mr-1" />
                      Manual
                    </div>
                  ) : (
                    <div className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                      <FileSpreadsheet className="w-3 h-3 mr-1" />
                      Excel
                    </div>
                  )}
                </td>
                <td className="py-4 px-3 text-center">
                  <button
                    onClick={() => onToggleAttendance(student.id)}
                    className={`
                      inline-flex items-center px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 min-w-[100px] justify-center shadow-sm
                      ${student.presente
                        ? 'bg-green-100 text-green-800 hover:bg-green-200 border border-green-300'
                        : 'bg-red-100 text-red-800 hover:bg-red-200 border border-red-300'
                      }
                    `}
                  >
                    {student.presente ? (
                      <>
                        <UserCheck className="w-4 h-4 mr-1" />
                        Presente
                      </>
                    ) : (
                      <>
                        <UserX className="w-4 h-4 mr-1" />
                        Ausente
                      </>
                    )}
                  </button>
                </td>
                <td className="py-4 px-3 text-center">
                  <button
                    onClick={() => handleDeleteConfirm(student)}
                    className="text-red-500 hover:text-red-700 transition-colors p-2 rounded-lg hover:bg-red-50"
                    title="Eliminar estudiante"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {searchTerm && filteredAndSortedStudents.length === 0 && (
        <div className="text-center py-8">
          <Search className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-500">No se encontraron estudiantes con "{searchTerm}"</p>
        </div>
      )}

      <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
        <div className="flex items-start">
          <Info className="w-5 h-5 text-red-600 mt-0.5 mr-2 flex-shrink-0" />
          <div className="text-sm text-red-800">
            <p className="font-semibold mb-1">Instrucciones:</p>
            <ul className="space-y-1">
              <li>• Haz clic en los botones de asistencia para cambiar entre presente/ausente</li>
              <li>• Usa "Original" para mantener el orden del archivo Excel cargado</li>
              <li>• Usa "A-Z" para ordenar alfabéticamente por apellidos</li>
              <li>• Utiliza el buscador para encontrar estudiantes específicos</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StudentTable;