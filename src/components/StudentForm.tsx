import React, { useState } from 'react';
import { supabase } from '../utils/supabaseClient';
import toast from 'react-hot-toast';

interface StudentFormProps {
  listaId: string;
  onAddLocalStudent?: (student: any) => void;
  onStudentAdded?: () => void;
}

const StudentForm: React.FC<StudentFormProps> = ({ listaId, onAddLocalStudent, onStudentAdded }) => {
  const [nombre, setNombre] = useState('');
  const [apellido, setApellido] = useState('');
  const [dni, setDni] = useState('');
  const [telefono, setTelefono] = useState('');
  const [mensaje, setMensaje] = useState('');
  const [loading, setLoading] = useState(false);
  const [dniError, setDniError] = useState('');
  const [telefonoError, setTelefonoError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMensaje('');
    setDniError('');
    setTelefonoError('');
    if (!nombre || !apellido) {
      setMensaje('Por favor, completa todos los campos obligatorios.');
      return;
    }
    if (dni && !/^\d{8}$/.test(dni)) {
      setDniError('El DNI debe tener exactamente 8 números.');
      return;
    }
    if (telefono && !/^\d{9}$/.test(telefono)) {
      setTelefonoError('El teléfono debe tener exactamente 9 números.');
      return;
    }
    setLoading(true);
    try {
      const { data: listaEstudiantes } = await supabase
        .from('lista_estudiantes')
        .select('id, estudiante_id, estudiantes:estudiante_id (nombres, apellidos)')
        .eq('lista_id', listaId);
      const existe = listaEstudiantes?.some((le: any) =>
        le.estudiantes?.nombres?.trim().toLowerCase() === nombre.trim().toLowerCase() &&
        le.estudiantes?.apellidos?.trim().toLowerCase() === apellido.trim().toLowerCase()
      );
      if (existe) {
        setMensaje('Este estudiante ya está en la lista.');
        setLoading(false);
        return;
      }
      const user = (await supabase.auth.getUser()).data.user;
      // No agregar optimista, solo insertar en BD
      const { data: existing } = await supabase
        .from('estudiantes')
        .select('id')
        .eq('nombres', nombre)
        .eq('apellidos', apellido)
        .maybeSingle();
      let estudianteId = existing?.id;
      if (!estudianteId) {
        const { data: inserted } = await supabase
          .from('estudiantes')
          .insert({ nombres: nombre, apellidos: apellido, dni, telefono })
          .select()
          .maybeSingle();
        if (inserted) {
          estudianteId = inserted.id;
        }
      }
      if (estudianteId) {
        const { error } = await supabase.from('lista_estudiantes').insert({
          lista_id: listaId,
          estudiante_id: estudianteId,
          origen: 'Manual',
          presente: true,
          marcado_por: user?.email || user?.id
        });
        if (!error) {
          setMensaje('¡Estudiante agregado exitosamente!');
          setNombre('');
          setApellido('');
          setDni('');
          setTelefono('');
          if (onStudentAdded) onStudentAdded(); // Forzar fetch inmediato
        } else {
          setMensaje('Error al asociar el estudiante a la lista. Puedes reintentar desde la lista.');
        }
      } else {
        setMensaje('Error al agregar estudiante. Puedes reintentar desde la lista.');
      }
    } catch (err) {
      setMensaje('Error inesperado. Puedes reintentar desde la lista.');
    }
    setLoading(false);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 max-w-lg mx-auto bg-white rounded-xl shadow-lg p-6 border border-gray-200">
      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-1">Nombres <span className="text-red-600">*</span></label>
        <input
          type="text"
          value={nombre}
          onChange={e => setNombre(e.target.value)}
          className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-red-700 text-base"
          placeholder="Nombres"
          required
        />
      </div>
      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-1">Apellidos <span className="text-red-600">*</span></label>
        <input
          type="text"
          value={apellido}
          onChange={e => setApellido(e.target.value)}
          className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-red-700 text-base"
          placeholder="Apellidos"
          required
        />
      </div>
      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-1">DNI (opcional - 8 dígitos)</label>
        <input
          type="text"
          value={dni}
          onChange={e => {
            const val = e.target.value.replace(/[^0-9]/g, '');
            setDni(val);
            setDniError('');
          }}
          maxLength={8}
          className={`w-full border ${dniError ? 'border-red-500' : 'border-gray-300'} rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-red-700 text-base`}
          placeholder="DNI"
        />
        {dniError && <div className="text-red-600 text-xs mt-1">{dniError}</div>}
      </div>
      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-1">Teléfono (opcional - 9 dígitos)</label>
        <input
          type="text"
          value={telefono}
          onChange={e => {
            const val = e.target.value.replace(/[^0-9]/g, '');
            setTelefono(val);
            setTelefonoError('');
          }}
          maxLength={9}
          className={`w-full border ${telefonoError ? 'border-red-500' : 'border-gray-300'} rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-red-700 text-base`}
          placeholder="Teléfono"
        />
        {telefonoError && <div className="text-red-600 text-xs mt-1">{telefonoError}</div>}
      </div>
      <button
        type="submit"
        className={`bg-red-800 text-white px-4 py-2 rounded-lg hover:bg-red-900 transition-all duration-200 w-full font-semibold flex items-center justify-center gap-2 ${loading ? 'opacity-60 cursor-not-allowed' : ''}`}
        disabled={loading}
      >
        {loading ? 'Agregando...' : 'Agregar estudiante'}
      </button>
      {mensaje && (
        <div className={`text-center mt-2 ${mensaje.includes('exitosamente') ? 'text-green-700 font-semibold' : 'text-red-600'}`}>{mensaje}</div>
      )}
    </form>
  );
};

export default StudentForm;