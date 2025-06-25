import React, { useState } from 'react';
import { UserPlus, Save, X, AlertCircle } from 'lucide-react';
import { Student } from '../types';

interface StudentFormProps {
  onAddStudent: (student: Omit<Student, 'id' | 'fechaCreacion'>) => void;
  existingStudents: Student[];
}

const StudentForm: React.FC<StudentFormProps> = ({ onAddStudent, existingStudents }) => {
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    nombre: '',
    apellido: '',
    dni: '',
    telefono: ''
  });
  const [errors, setErrors] = useState({
    dni: '',
    telefono: ''
  });

  const validateDNI = (dni: string): string => {
    if (!dni.trim()) return ''; // DNI es opcional
    
    // Remover espacios y caracteres no numéricos
    const cleanDNI = dni.replace(/\D/g, '');
    
    if (cleanDNI.length !== 8) {
      return 'El DNI debe tener exactamente 8 dígitos';
    }
    
    return '';
  };

  const validateTelefono = (telefono: string): string => {
    if (!telefono.trim()) return ''; // Teléfono es opcional
    
    // Remover espacios y caracteres no numéricos
    const cleanTelefono = telefono.replace(/\D/g, '');
    
    if (cleanTelefono.length !== 9) {
      return 'El teléfono debe tener exactamente 9 dígitos';
    }
    
    return '';
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData({ ...formData, [field]: value });
    
    // Validar en tiempo real
    if (field === 'dni') {
      const error = validateDNI(value);
      setErrors(prev => ({ ...prev, dni: error }));
    } else if (field === 'telefono') {
      const error = validateTelefono(value);
      setErrors(prev => ({ ...prev, telefono: error }));
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.nombre.trim() || !formData.apellido.trim()) {
      alert('Nombre y apellido son obligatorios');
      return;
    }

    // Validar DNI y teléfono
    const dniError = validateDNI(formData.dni);
    const telefonoError = validateTelefono(formData.telefono);
    
    if (dniError || telefonoError) {
      setErrors({ dni: dniError, telefono: telefonoError });
      return;
    }

    // Check for duplicates
    const normalizedName = formData.nombre.toLowerCase().trim();
    const normalizedSurname = formData.apellido.toLowerCase().trim();
    
    const isDuplicate = existingStudents.some(student =>
      student.nombre.toLowerCase().trim() === normalizedName &&
      student.apellido.toLowerCase().trim() === normalizedSurname
    );

    if (isDuplicate) {
      alert('Este estudiante ya existe en la lista');
      return;
    }

    // Limpiar y formatear los datos
    const cleanDNI = formData.dni.replace(/\D/g, '');
    const cleanTelefono = formData.telefono.replace(/\D/g, '');

    const newStudent: Omit<Student, 'id' | 'fechaCreacion'> = {
      nombre: formData.nombre.trim(),
      apellido: formData.apellido.trim(),
      dni: cleanDNI || undefined,
      telefono: cleanTelefono || undefined,
      presente: true, // Always mark as present when added manually
      esManual: true
    };

    onAddStudent(newStudent);
    setFormData({ nombre: '', apellido: '', dni: '', telefono: '' });
    setErrors({ dni: '', telefono: '' });
    setShowForm(false);
  };

  const handleCancel = () => {
    setFormData({ nombre: '', apellido: '', dni: '', telefono: '' });
    setErrors({ dni: '', telefono: '' });
    setShowForm(false);
  };

  return (
    <div className="bg-white rounded-xl shadow-lg p-6 mb-6 border border-gray-200">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold text-gray-800 flex items-center">
          <UserPlus className="w-6 h-6 mr-2 text-green-600" />
          Agregar Estudiante Manualmente
        </h2>
        {!showForm && (
          <button
            onClick={() => setShowForm(true)}
            className="bg-gradient-to-r from-green-600 to-green-700 text-white px-6 py-2 rounded-lg hover:from-green-700 hover:to-green-800 transition-all duration-200 flex items-center font-medium shadow-lg"
          >
            <UserPlus className="w-4 h-4 mr-2" />
            Agregar Estudiante
          </button>
        )}
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="nombre" className="block text-sm font-medium text-gray-700 mb-1">
                Nombres <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                id="nombre"
                value={formData.nombre}
                onChange={(e) => handleInputChange('nombre', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500"
                required
                placeholder="Ingresa los nombres"
              />
            </div>
            <div>
              <label htmlFor="apellido" className="block text-sm font-medium text-gray-700 mb-1">
                Apellidos <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                id="apellido"
                value={formData.apellido}
                onChange={(e) => handleInputChange('apellido', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500"
                required
                placeholder="Ingresa los apellidos"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="dni" className="block text-sm font-medium text-gray-700 mb-1">
                DNI <span className="text-gray-500">(opcional - 8 dígitos)</span>
              </label>
              <input
                type="text"
                id="dni"
                value={formData.dni}
                onChange={(e) => handleInputChange('dni', e.target.value)}
                className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 ${
                  errors.dni 
                    ? 'border-red-300 focus:ring-red-500 focus:border-red-500' 
                    : 'border-gray-300 focus:ring-green-500 focus:border-green-500'
                }`}
                placeholder="12345678"
                maxLength={8}
              />
              {errors.dni && (
                <div className="flex items-center mt-1 text-red-600 text-sm">
                  <AlertCircle className="w-4 h-4 mr-1" />
                  {errors.dni}
                </div>
              )}
            </div>
            <div>
              <label htmlFor="telefono" className="block text-sm font-medium text-gray-700 mb-1">
                Teléfono <span className="text-gray-500">(opcional - 9 dígitos)</span>
              </label>
              <input
                type="tel"
                id="telefono"
                value={formData.telefono}
                onChange={(e) => handleInputChange('telefono', e.target.value)}
                className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 ${
                  errors.telefono 
                    ? 'border-red-300 focus:ring-red-500 focus:border-red-500' 
                    : 'border-gray-300 focus:ring-green-500 focus:border-green-500'
                }`}
                placeholder="987654321"
                maxLength={9}
              />
              {errors.telefono && (
                <div className="flex items-center mt-1 text-red-600 text-sm">
                  <AlertCircle className="w-4 h-4 mr-1" />
                  {errors.telefono}
                </div>
              )}
            </div>
          </div>

          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <div className="flex items-start">
              <AlertCircle className="w-5 h-5 text-green-600 mt-0.5 mr-2" />
              <div className="text-sm text-green-800">
                <p className="font-semibold mb-1">Información importante:</p>
                <ul className="space-y-1">
                  <li>• El estudiante será marcado automáticamente como <strong>presente</strong></li>
                  <li>• El DNI debe tener exactamente 8 dígitos numéricos</li>
                  <li>• El teléfono debe tener exactamente 9 dígitos numéricos</li>
                  <li>• Ambos campos son opcionales pero deben cumplir el formato si se llenan</li>
                </ul>
              </div>
            </div>
          </div>

          <div className="flex space-x-3 pt-2">
            <button
              type="submit"
              disabled={!!errors.dni || !!errors.telefono}
              className={`flex-1 flex items-center justify-center px-6 py-3 rounded-lg font-medium transition-all duration-200 ${
                errors.dni || errors.telefono
                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  : 'bg-gradient-to-r from-green-600 to-green-700 text-white hover:from-green-700 hover:to-green-800 shadow-lg'
              }`}
            >
              <Save className="w-4 h-4 mr-2" />
              Agregar Estudiante
            </button>
            <button
              type="button"
              onClick={handleCancel}
              className="px-6 py-3 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors flex items-center font-medium"
            >
              <X className="w-4 h-4 mr-2" />
              Cancelar
            </button>
          </div>
        </form>
      )}

      {!showForm && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-start">
            <AlertCircle className="w-5 h-5 text-blue-600 mt-0.5 mr-2" />
            <div className="text-sm text-blue-800">
              <p className="font-semibold mb-1">Agregar estudiantes manualmente:</p>
              <ul className="space-y-1">
                <li>• Ideal para estudiantes que no están en el archivo Excel</li>
                <li>• Se marcan automáticamente como presentes</li>
                <li>• DNI: exactamente 8 dígitos (opcional)</li>
                <li>• Teléfono: exactamente 9 dígitos (opcional)</li>
              </ul>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StudentForm;