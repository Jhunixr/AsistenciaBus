import React, { useEffect, useState, useImperativeHandle, forwardRef } from 'react';
import { supabase } from '../utils/supabaseClient';
import * as XLSX from 'xlsx';
import toast from 'react-hot-toast';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface StudentTableProps {
  listaId: string;
  localManualStudents?: any[];
  onRetryManualStudent?: (student: any) => void;
  onStudentsFromDB?: (students: any[]) => void;
}

interface StudentRow {
  id: string;
  nombres: string;
  apellidos: string;
  dni?: string;
  telefono?: string;
  origen: string;
  presente: boolean;
  marcado_por?: string;
  estudiante_id: string;
  pendiente?: boolean;
  error?: boolean;
  ordenOriginal?: number; // Nuevo campo para el orden original
}

const StudentTable = forwardRef<any, StudentTableProps>(({ listaId, localManualStudents = [], onRetryManualStudent, onStudentsFromDB }, ref) => {
  console.log('localManualStudents prop:', localManualStudents);
  const [students, setStudents] = useState<StudentRow[]>([]);
  const [search, setSearch] = useState('');
  const [filtroAsistencia, setFiltroAsistencia] = useState<'todos' | 'presentes' | 'ausentes'>('todos');
  const [editStudent, setEditStudent] = useState<StudentRow | null>(null);
  const [editForm, setEditForm] = useState({ nombres: '', apellidos: '', dni: '', telefono: '' });
  const [savingEdit, setSavingEdit] = useState(false);
  const [listaNombre, setListaNombre] = useState('');
  const [orden, setOrden] = useState<'original' | 'alfabetico'>('original');

  const fetchStudents = async () => {
    const { data, error } = await supabase
      .from('lista_estudiantes')
      .select(`id, origen, presente, marcado_por, estudiante_id, estudiantes:estudiante_id (nombres, apellidos, dni, telefono)`) 
      .eq('lista_id', listaId);
    if (!error && data) {
      setStudents(
        data.map((row: any) => ({
          id: row.id,
          estudiante_id: row.estudiante_id,
          nombres: row.estudiantes?.nombres || '',
          apellidos: row.estudiantes?.apellidos || '',
          dni: row.estudiantes?.dni || '',
          telefono: row.estudiantes?.telefono || '',
          origen: row.origen,
          presente: row.presente,
          marcado_por: row.marcado_por || '',
          ordenOriginal: row.orden_original, // Asignar el campo de orden original
        }))
      );
    }
  };

  // Obtener nombre de la lista
  useEffect(() => {
    const fetchNombre = async () => {
      const { data } = await supabase.from('listas').select('nombre').eq('id', listaId).maybeSingle();
      setListaNombre(data?.nombre || '');
    };
    if (listaId) fetchNombre();
  }, [listaId]);

  // Al montar, cargar estudiantes optimistas de localStorage
  useEffect(() => {
    const key = `optimisticStudents_${listaId}`;
    const cached = localStorage.getItem(key);
    if (cached) {
      try {
        const optimistas = JSON.parse(cached);
        if (Array.isArray(optimistas) && optimistas.length > 0) {
          setStudents(prev => [
            ...prev,
            ...optimistas.map((s: any, idx: number) => ({
              id: `excel_temp_${Date.now()}_${idx}`,
              estudiante_id: `excel_temp_${Date.now()}_${idx}`,
              nombres: s.nombres,
              apellidos: s.apellidos,
              dni: s.dni || '',
              telefono: s.telefono || '',
              origen: 'Excel',
              presente: false,
              marcado_por: '',
              ordenOriginal: s.ordenOriginal !== undefined ? s.ordenOriginal : idx,
              pendiente: true
            }))
          ]);
        }
      } catch {}
    }
  }, [listaId]);

  useEffect(() => {
    fetchStudents();
    // Suscripción en tiempo real a lista_estudiantes
    const channel = supabase
      .channel('realtime-lista-estudiantes-' + listaId)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'lista_estudiantes', filter: `lista_id=eq.${listaId}` },
        () => {
          fetchStudents();
        }
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [listaId]);

  // Llamar a onStudentsFromDB cuando cambian los estudiantes de la BD
  useEffect(() => {
    if (onStudentsFromDB) onStudentsFromDB(students);
  }, [students, listaId]);

  // Cambiar asistencia y registrar usuario (Optimistic UI)
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const toggleAsistencia = async (id: string, presente: boolean) => {
    const user = (await supabase.auth.getUser()).data.user;
    // Optimistic UI: actualiza el estado local inmediatamente
    setStudents(prev => prev.map(s => s.id === id ? { ...s, presente: !presente, marcado_por: user?.email || user?.id } : s));
    setUpdatingId(id);
    const { error } = await supabase
      .from('lista_estudiantes')
      .update({ 
        presente: !presente,
        marcado_por: user?.email || user?.id
      })
      .eq('id', id);
    setUpdatingId(null);
    if (error) {
      // Si hay error, revierte el cambio
      setStudents(prev => prev.map(s => s.id === id ? { ...s, presente, marcado_por: s.marcado_por } : s));
      alert('Error al actualizar la asistencia. Intenta de nuevo.');
    }
    // La suscripción en tiempo real actualizará la tabla automáticamente
  };

  // Eliminar estudiante de la lista (Optimistic UI)
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const eliminarEstudiante = async (id: string, nombre: string, apellido: string) => {
    if (!window.confirm(`¿Seguro que deseas eliminar a ${nombre} ${apellido} de la lista?`)) return;
    setDeletingId(id);
    // Optimistic UI: eliminar de inmediato
    const prevStudents = students; // Changed from allStudents to students
    setStudents(prev => prev.filter(s => s.id !== id));
    try {
      // Buscar el estudiante_id antes de eliminar
      const estudiante = students.find(s => s.id === id); // Changed from allStudents to students
      const estudianteId = estudiante?.estudiante_id;
      const { error } = await supabase
        .from('lista_estudiantes')
        .delete()
        .eq('id', id);
      if (!error && estudianteId) {
        // Verificar si el estudiante está en otra lista
        const { data: relaciones } = await supabase
          .from('lista_estudiantes')
          .select('id')
          .eq('estudiante_id', estudianteId);
        if (!relaciones || relaciones.length === 0) {
          await supabase.from('estudiantes').delete().eq('id', estudianteId);
        }
      }
      setDeletingId(null);
      if (error) {
        setStudents(prev => prev.concat(prevStudents.find(s => s.id === id)!));
        toast.error('Error al eliminar. Intenta de nuevo.');
    } else {
        toast.success('Estudiante eliminado correctamente.');
      }
    } catch {
      setDeletingId(null);
      setStudents(prev => prev.concat(prevStudents.find(s => s.id === id)!));
      toast.error('Error inesperado al eliminar.');
    }
  };

  // Filtrado y búsqueda
  // Unificar estudiantes de la BD y optimistas, sin duplicados
  const allStudents = [
    ...students,
    ...localManualStudents.filter(local =>
      !students.some(db =>
        db.nombres?.trim().toLowerCase() === local.nombres?.trim().toLowerCase() &&
        db.apellidos?.trim().toLowerCase() === local.apellidos?.trim().toLowerCase()
      )
    )
  ];
  const filtered = allStudents.filter(s => {
    const term = search.trim().toLowerCase();
    const match =
      s.nombres.toLowerCase().includes(term) ||
      s.apellidos.toLowerCase().includes(term) ||
      (s.dni || '').toLowerCase().includes(term);
    const matchAsistencia =
      filtroAsistencia === 'todos' ||
      (filtroAsistencia === 'presentes' && s.presente) ||
      (filtroAsistencia === 'ausentes' && !s.presente);
    return match && matchAsistencia;
  });

  // Ordenar estudiantes según selección
  let sorted = [...filtered];
  if (orden === 'alfabetico') {
    sorted.sort((a, b) => {
      const apA = a.apellidos?.toLowerCase() || '';
      const apB = b.apellidos?.toLowerCase() || '';
      if (apA !== apB) return apA.localeCompare(apB);
      return (a.nombres?.toLowerCase() || '').localeCompare(b.nombres?.toLowerCase() || '');
    });
  } else {
    // Orden original: si hay campo ordenOriginal, usarlo; si no, usar el idx del mapeo
    sorted.sort((a, b) => {
      if (a.ordenOriginal !== undefined && b.ordenOriginal !== undefined) {
        return a.ordenOriginal - b.ordenOriginal;
      }
      return 0;
    });
  }

  // Exportar a Excel con resumen
  const exportarExcel = () => {
    // Hoja 1: Lista de Estudiantes
    const data = filtered.map((s, idx) => ({
      N: idx + 1,
      Apellidos: s.apellidos,
      Nombres: s.nombres,
      DNI: s.dni || '-',
      Teléfono: s.telefono || '-',
      Origen: s.origen,
      Asistencia: s.presente ? 'Presente' : 'Ausente',
      'Marcado por': s.marcado_por || '-',
    }));
    const ws1 = XLSX.utils.json_to_sheet(data);

    // Hoja 2: Resumen
    const total = students.length;
    const presentes = students.filter(s => s.presente).length;
    const ausentes = total - presentes;
    const porcentaje = total > 0 ? (presentes / total * 100).toFixed(1) : '0';
    // Por origen
    const presentesExcel = students.filter(s => s.presente && s.origen === 'Excel').length;
    const presentesManual = students.filter(s => s.presente && s.origen === 'Manual').length;
    const ausentesExcel = students.filter(s => !s.presente && s.origen === 'Excel').length;
    const ausentesManual = students.filter(s => !s.presente && s.origen === 'Manual').length;
    // Por usuario
    const userMap: Record<string, number> = {};
    students.forEach(s => {
      if (s.presente && s.marcado_por) {
        userMap[s.marcado_por] = (userMap[s.marcado_por] || 0) + 1;
      }
    });
    const topUsuarios = Object.entries(userMap)
      .map(([email, count]) => ({ email, count }))
      .sort((a, b) => b.count - a.count);
    const now = new Date();
    const resumen = [
      [`RESUMEN DE ASISTENCIA - UNIVERSIDAD TECNOLÓGICA DEL PERÚ`],
      [`Lista:`, listaNombre],
      [`Fecha de exportación:`, now.toLocaleString()],
      [],
      [`ESTADÍSTICAS GENERALES`],
      [`Total de estudiantes`, total],
      [`Estudiantes presentes`, presentes],
      [`Estudiantes ausentes`, ausentes],
      [`Porcentaje de asistencia`, `${porcentaje}%`],
      [],
      [`DESGLOSE POR ORIGEN`],
      [`Presentes del Excel`, presentesExcel],
      [`Presentes agregados manualmente`, presentesManual],
      [`Ausentes del Excel`, ausentesExcel],
      [`Ausentes agregados manualmente`, ausentesManual],
      [],
      [`DESGLOSE POR USUARIO (presentes)`],
      ...(
        topUsuarios.length > 0
          ? topUsuarios.map(u => [`${u.email}`, u.count])
          : [['No hay registros', '']]
      )
    ];
    const ws2 = XLSX.utils.aoa_to_sheet(resumen);

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws1, 'Lista de Estudiantes');
    XLSX.utils.book_append_sheet(wb, ws2, 'Resumen');
    XLSX.writeFile(wb, `asistencia_${listaNombre || 'lista'}.xlsx`);
  };

  // Exportar a PDF con resumen
  const exportarPDF = () => {
    const doc = new jsPDF();
    // Título
    doc.setFontSize(16);
    doc.text('RESUMEN DE ASISTENCIA - UNIVERSIDAD TECNOLÓGICA DEL PERÚ', 14, 15);
    doc.setFontSize(12);
    doc.text(`Lista: ${listaNombre}`, 14, 25);
    doc.text(`Fecha de exportación: ${new Date().toLocaleString()}`, 14, 32);
    // Resumen
    const total = students.length;
    const presentes = students.filter(s => s.presente).length;
    const ausentes = total - presentes;
    const porcentaje = total > 0 ? (presentes / total * 100).toFixed(1) : '0';
    const presentesExcel = students.filter(s => s.presente && s.origen === 'Excel').length;
    const presentesManual = students.filter(s => s.presente && s.origen === 'Manual').length;
    const ausentesExcel = students.filter(s => !s.presente && s.origen === 'Excel').length;
    const ausentesManual = students.filter(s => !s.presente && s.origen === 'Manual').length;
    const userMap: Record<string, number> = {};
    students.forEach(s => {
      if (s.presente && s.marcado_por) {
        userMap[s.marcado_por] = (userMap[s.marcado_por] || 0) + 1;
      }
    });
    const topUsuarios = Object.entries(userMap)
      .map(([email, count]) => ({ email, count }))
      .sort((a, b) => b.count - a.count);
    let resumenY = 40;
    autoTable(doc, {
      startY: resumenY,
      head: [['Estadística', 'Valor']],
      body: [
        ['Total de estudiantes', total],
        ['Estudiantes presentes', presentes],
        ['Estudiantes ausentes', ausentes],
        ['Porcentaje de asistencia', `${porcentaje}%`],
        ['Presentes del Excel', presentesExcel],
        ['Presentes agregados manualmente', presentesManual],
        ['Ausentes del Excel', ausentesExcel],
        ['Ausentes agregados manualmente', ausentesManual],
      ],
      theme: 'grid',
      styles: { fontSize: 10 },
      headStyles: { fillColor: [220, 38, 38] },
    });
    resumenY = doc.lastAutoTable.finalY + 8;
    doc.setFontSize(12);
    doc.text('Desglose por usuario (presentes):', 14, resumenY);
    resumenY += 4;
    autoTable(doc, {
      startY: resumenY,
      head: [['Usuario', 'Cantidad']],
      body: topUsuarios.length > 0 ? topUsuarios.map(u => [u.email, u.count]) : [['No hay registros', '']],
      theme: 'grid',
      styles: { fontSize: 10 },
      headStyles: { fillColor: [220, 38, 38] },
    });
    // Lista de estudiantes
    let listaY = doc.lastAutoTable.finalY + 12;
    doc.setFontSize(14);
    doc.text('Lista de Estudiantes', 14, listaY);
    listaY += 4;
    autoTable(doc, {
      startY: listaY,
      head: [['N', 'Apellidos', 'Nombres', 'DNI', 'Teléfono', 'Origen', 'Asistencia', 'Marcado por']],
      body: filtered.map((s, idx) => [
        idx + 1,
        s.apellidos,
        s.nombres,
        s.dni || '-',
        s.telefono || '-',
        s.origen,
        s.presente ? 'Presente' : 'Ausente',
        s.marcado_por || '-',
      ]),
      theme: 'grid',
      styles: { fontSize: 9 },
      headStyles: { fillColor: [220, 38, 38] },
    });
    doc.save(`asistencia_${listaNombre || 'lista'}.pdf`);
  };

  // Editar estudiante (Optimistic UI)
  const [editingId, setEditingId] = useState<string | null>(null);
  const abrirEditar = (s: StudentRow) => {
    setEditStudent(s);
    setEditForm({ nombres: s.nombres, apellidos: s.apellidos, dni: s.dni || '', telefono: s.telefono || '' });
  };

  const guardarEdicion = async () => {
    if (!editStudent) return;
    setSavingEdit(true);
    setEditingId(editStudent.id);
    // Optimistic UI: actualizar de inmediato
    const prevStudents = allStudents;
    setStudents(prev => prev.map(s => s.id === editStudent.id ? { ...s, ...editForm } : s));
    try {
      await supabase
        .from('estudiantes')
        .update({
          nombres: editForm.nombres,
          apellidos: editForm.apellidos,
          dni: editForm.dni,
          telefono: editForm.telefono,
        })
        .eq('id', editStudent.estudiante_id);
      setSavingEdit(false);
      setEditingId(null);
      setEditStudent(null);
      toast.success('Estudiante editado correctamente.');
      // La suscripción actualizará la tabla
    } catch {
      setSavingEdit(false);
      setEditingId(null);
      setEditStudent(null);
      setStudents(prev => prev.map(s => s.id === editStudent.id ? prevStudents.find(ps => ps.id === s.id) || s : s));
      toast.error('Error al editar. Intenta de nuevo.');
    }
  };

  useEffect(() => {
    const handler = (e: any) => {
      if (e.detail && Array.isArray(e.detail.students)) {
        setStudents(prev => [
          ...prev,
          ...e.detail.students.map((s: any, idx: number) => ({
            id: `excel_temp_${Date.now()}_${idx}`,
            estudiante_id: `excel_temp_${Date.now()}_${idx}`,
            nombres: s.nombres,
            apellidos: s.apellidos,
            dni: s.dni || '',
            telefono: s.telefono || '',
            origen: 'Excel',
            presente: false,
            marcado_por: '',
            ordenOriginal: s.ordenOriginal !== undefined ? s.ordenOriginal : idx,
            pendiente: true
          }))
        ]);
      }
    };
    window.addEventListener('excel-students-optimistic', handler);
    return () => window.removeEventListener('excel-students-optimistic', handler);
  }, []);

  useImperativeHandle(ref, () => ({
    fetchStudents
  }));

  return (
    <div className="overflow-x-auto pb-4">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-4 gap-2">
            <input
              type="text"
          placeholder="Buscar por nombre, apellido o DNI..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="border px-4 py-2 rounded w-full md:w-64 text-sm md:text-base"
        />
        <div className="flex flex-col sm:flex-row gap-2 mt-2 md:mt-0 flex-wrap w-full md:w-auto">
          <select
            value={orden}
            onChange={e => setOrden(e.target.value as 'original' | 'alfabetico')}
            className="border rounded px-3 py-2 text-sm md:text-base w-full sm:w-auto focus:outline-none focus:ring-2 focus:ring-red-400"
            aria-label="Ordenar estudiantes"
          >
            <option value="original">Orden original (Excel)</option>
            <option value="alfabetico">Orden alfabético</option>
          </select>
          <button
            className={`px-3 py-2 rounded ${filtroAsistencia === 'todos' ? 'bg-red-700 text-white' : 'bg-gray-200'} text-sm md:text-base w-full sm:w-auto`}
            onClick={() => setFiltroAsistencia('todos')}
          >
            Todos
          </button>
          <button
            className={`px-3 py-2 rounded ${filtroAsistencia === 'presentes' ? 'bg-green-700 text-white' : 'bg-gray-200'} text-sm md:text-base w-full sm:w-auto`}
            onClick={() => setFiltroAsistencia('presentes')}
          >
            Presentes
          </button>
          <button
            className={`px-3 py-2 rounded ${filtroAsistencia === 'ausentes' ? 'bg-red-700 text-white' : 'bg-gray-200'} text-sm md:text-base w-full sm:w-auto`}
            onClick={() => setFiltroAsistencia('ausentes')}
          >
            Ausentes
          </button>
            <button
            className="px-3 py-2 rounded bg-blue-700 text-white text-sm md:text-base w-full sm:w-auto"
            onClick={exportarExcel}
            title="Exportar a Excel"
          >
            Exportar Excel
            </button>
            <button
            className="px-3 py-2 rounded bg-green-700 text-white text-sm md:text-base w-full sm:w-auto"
            onClick={exportarPDF}
            title="Exportar a PDF"
          >
            Exportar PDF
            </button>
        </div>
      </div>
      <div className="w-full overflow-x-auto rounded-xl shadow-lg bg-white">
        <table className="min-w-[700px] w-full border border-gray-200 rounded-xl text-xs md:text-base">
          <thead className="bg-red-800 text-white sticky top-0 z-10">
            <tr>
              <th className="border-b px-2 py-3">Nº</th>
              <th className="border-b px-2 py-3">Apellidos</th>
              <th className="border-b px-2 py-3">Nombres</th>
              <th className="border-b px-2 py-3">DNI</th>
              <th className="border-b px-2 py-3">Teléfono</th>
              <th className="border-b px-2 py-3">Origen</th>
              <th className="border-b px-2 py-3">Asistencia</th>
              <th className="border-b px-2 py-3">Marcado por</th>
              <th className="border-b px-2 py-3">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {sorted.length === 0 && (
              <tr>
                <td colSpan={9} className="text-center py-8 text-gray-500">No se encontraron estudiantes.</td>
              </tr>
            )}
            {sorted.map((s, idx) => (
              <tr key={s.id}
                className={
                  (s.pendiente ? 'animate-pulse bg-yellow-50' : idx % 2 === 0 ? 'bg-gray-50' : 'bg-white') +
                  ' transition-colors duration-200'
                }
                style={{ transition: 'background-color 0.3s' }}>
                <td className="border-b px-2 py-2 text-center font-semibold">{idx + 1}</td>
                <td className="border-b px-2 py-2">{s.apellidos}</td>
                <td className="border-b px-2 py-2">{s.nombres}</td>
                <td className="border-b px-2 py-2">{s.dni || '-'}</td>
                <td className="border-b px-2 py-2">{s.telefono || '-'}</td>
                <td className="border-b px-2 py-2">{s.origen === 'Manual' ? '👤 Manual' : '📄 Excel'}
                  {s.pendiente && (
                    <span className="ml-2 inline-block bg-yellow-400 text-yellow-900 text-xs font-bold px-2 py-1 rounded animate-pulse">Guardando...</span>
                  )}
                </td>
                <td className="border-b px-2 py-2 text-center">
                  <button
                    onClick={() => toggleAsistencia(s.id, s.presente)}
                    className={
                      (s.presente
                        ? 'bg-green-600 text-white'
                        : 'bg-red-700 text-white') +
                      ' px-2 py-1 rounded transition-colors duration-200 hover:scale-105 hover:shadow-md text-xs md:text-base focus:outline-none focus:ring-2 focus:ring-red-400'
                    }
                    disabled={updatingId === s.id}
                    aria-label={s.presente ? 'Marcar como ausente' : 'Marcar como presente'}
                  >
                    {updatingId === s.id ? '...' : (s.presente ? 'Presente' : 'Ausente')}
                  </button>
                </td>
                <td className="border-b px-2 py-2">{s.marcado_por || '-'}</td>
                <td className="border-b px-2 py-2 flex gap-1 md:gap-2 flex-wrap justify-center">
                  <button
                    onClick={() => eliminarEstudiante(s.id, s.nombres, s.apellidos)}
                    className="bg-red-700 text-white px-2 py-1 rounded hover:bg-red-800 hover:scale-105 hover:shadow-md transition-all duration-200 text-xs md:text-base focus:outline-none focus:ring-2 focus:ring-red-400"
                    title="Eliminar estudiante de la lista"
                    disabled={s.pendiente || deletingId === s.id}
                    aria-label="Eliminar estudiante"
                  >
                    {deletingId === s.id ? 'Eliminando...' : 'Eliminar'}
                  </button>
                  <button
                    onClick={() => abrirEditar(s)}
                    className="bg-yellow-600 text-white px-2 py-1 rounded hover:bg-yellow-700 hover:scale-105 hover:shadow-md transition-all duration-200 text-xs md:text-base focus:outline-none focus:ring-2 focus:ring-yellow-400"
                    title="Editar estudiante"
                    disabled={s.pendiente || editingId === s.id}
                    aria-label="Editar estudiante"
                  >
                    Editar
                  </button>
                  {s.pendiente && !s.error && (
                    <span className="text-yellow-600 font-semibold text-xs animate-pulse">Guardando...</span>
                  )}
                  {s.error && (
                    <button
                      onClick={() => onRetryManualStudent && onRetryManualStudent({ ...s, pendiente: true, error: false })}
                      className="bg-orange-600 text-white px-2 py-1 rounded hover:bg-orange-700 hover:scale-105 hover:shadow-md transition-all duration-200 text-xs focus:outline-none focus:ring-2 focus:ring-orange-400"
                      title="Reintentar guardar"
                      aria-label="Reintentar guardar estudiante"
                    >
                      Reintentar
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {filtered.length === 0 && (
        <div className="text-center text-gray-500 py-8">No se encontraron estudiantes.</div>
      )}
      {/* Modal de edición */}
      {editStudent && (
        <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50 px-2">
          <div className="bg-white rounded-lg p-4 sm:p-6 shadow-lg w-full max-w-md">
            <h2 className="text-lg font-bold mb-4">Editar Estudiante</h2>
            <div className="mb-2">
              <input
                type="text"
                placeholder="Nombres"
                value={editForm.nombres}
                onChange={e => setEditForm(f => ({ ...f, nombres: e.target.value }))}
                className="border px-4 py-3 rounded w-full text-base"
              />
            </div>
            <div className="mb-2">
              <input
                type="text"
                placeholder="Apellidos"
                value={editForm.apellidos}
                onChange={e => setEditForm(f => ({ ...f, apellidos: e.target.value }))}
                className="border px-4 py-3 rounded w-full text-base"
              />
            </div>
            <div className="mb-2">
              <input
                type="text"
                placeholder="DNI"
                value={editForm.dni}
                onChange={e => setEditForm(f => ({ ...f, dni: e.target.value }))}
                className="border px-4 py-3 rounded w-full text-base"
              />
            </div>
            <div className="mb-2">
              <input
                type="text"
                placeholder="Teléfono"
                value={editForm.telefono}
                onChange={e => setEditForm(f => ({ ...f, telefono: e.target.value }))}
                className="border px-4 py-3 rounded w-full text-base"
              />
            </div>
            <div className="flex gap-2 mt-4 flex-wrap">
              <button
                onClick={guardarEdicion}
                className="bg-green-700 text-white px-4 py-2 rounded hover:bg-green-800 text-base"
                disabled={savingEdit}
              >
                Guardar
              </button>
              <button
                onClick={() => setEditStudent(null)}
                className="bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600 text-base"
                disabled={savingEdit}
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
});

export default StudentTable;