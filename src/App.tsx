import React, { useEffect, useState, useRef } from 'react';
import ListManager from './components/ListManager';
import StudentTable from './components/StudentTable';
import StudentForm from './components/StudentForm';
import AttendanceSummary from './components/AttendanceSummary';
import ExcelUpload from './components/ExcelUpload';
import { AttendanceList } from './types';
import { supabase } from './utils/supabaseClient';
import Login from './components/Login';
import { Toaster } from 'react-hot-toast';
import { FileSpreadsheet, UserPlus } from 'lucide-react';

function App() {
  const [lists, setLists] = useState<AttendanceList[]>([]);
  const [currentList, setCurrentList] = useState<AttendanceList | null>(null);
  const [user, setUser] = useState<any>(null);
  const [localManualStudents, setLocalManualStudents] = useState<any[]>([]);
  const [lastStudents, setLastStudents] = useState<any[]>([]); // Para comparar cambios
  const [openForm, setOpenForm] = useState<'manual' | 'excel' | null>(null);

  // Calcular totales de origen para la lista seleccionada
  const [excelCount, setExcelCount] = useState(0);
  const [manualCount, setManualCount] = useState(0);
  const fetchCounts = async (listaId?: string) => {
    const id = listaId || currentList?.id;
    if (!id) {
      setExcelCount(0);
      setManualCount(0);
      return;
    }
    const { data } = await supabase
      .from('lista_estudiantes')
      .select('origen')
      .eq('lista_id', id);
    if (data) {
      setExcelCount(data.filter((s: any) => s.origen === 'Excel').length);
      setManualCount(data.filter((s: any) => s.origen === 'Manual').length);
    }
  };
  useEffect(() => {
    fetchCounts();
  }, [currentList]);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUser(data.user));
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });
    return () => {
      listener.subscription.unsubscribe();
    };
  }, []);

  // Leer listas desde Supabase al cargar la app
  useEffect(() => {
    // Intentar restaurar listas desde localStorage primero
    const cachedLists = localStorage.getItem('cachedLists');
    if (cachedLists) {
      try {
        const parsed = JSON.parse(cachedLists);
        if (Array.isArray(parsed)) setLists(parsed);
      } catch {}
    }
    const fetchLists = async () => {
      const { data, error } = await supabase
        .from('listas')
        .select('*')
        .order('fecha', { ascending: false });
      if (!error && data) {
        const listas = data.map((l: any) => ({
          ...l,
          estudiantes: [],
          fechaCreacion: l.fecha ? new Date(l.fecha) : new Date(),
          fechaModificacion: l.fecha ? new Date(l.fecha) : new Date(),
        }));
        setLists(listas);
        localStorage.setItem('cachedLists', JSON.stringify(listas));
      }
    };
    fetchLists();
  }, []);

  // Actualizar caché local cada vez que cambian las listas
  useEffect(() => {
    if (lists.length > 0) {
      localStorage.setItem('cachedLists', JSON.stringify(lists));
    }
  }, [lists]);

  // Guardar y restaurar la lista seleccionada
  useEffect(() => {
    // Al cargar listas, intentar restaurar la lista seleccionada
    const lastListId = localStorage.getItem('lastListId');
    if (lastListId && lists.length > 0) {
      const found = lists.find(l => l.id === lastListId);
      if (found) setCurrentList(found);
    }
  }, [lists]);

  // Limpiar estudiantes optimistas al cambiar de lista
  useEffect(() => {
    setLocalManualStudents([]);
  }, [currentList?.id]);

  // Crear una nueva lista en Supabase
  const handleCreateList = async (name: string) => {
    const fecha = new Date().toISOString().slice(0, 10);
    const { data, error } = await supabase
      .from('listas')
      .insert([{ nombre: name, fecha }])
      .select();
    if (!error && data && data.length > 0) {
      const newList = {
        ...data[0],
      estudiantes: [],
        fechaCreacion: data[0].fecha ? new Date(data[0].fecha) : new Date(),
        fechaModificacion: data[0].fecha ? new Date(data[0].fecha) : new Date(),
    };
      setLists(prev => [newList, ...prev]);
      setCurrentList(newList);
    }
  };

  // Seleccionar una lista
  const handleSelectList = (list: AttendanceList | null) => {
    if (!list) {
      setCurrentList(null);
      localStorage.removeItem('lastListId');
      return;
    }
    setCurrentList(list);
    localStorage.setItem('lastListId', list.id);
  };

  // Eliminar una lista en Supabase y limpiar estudiantes huérfanos
  const handleDeleteList = async (listId: string) => {
    // 1. Obtener todos los estudiantes asociados a la lista antes de eliminarla
    const { data: listaEstudiantes } = await supabase
      .from('lista_estudiantes')
      .select('estudiante_id')
      .eq('lista_id', listId);
    const estudiantesIds = listaEstudiantes?.map((le: any) => le.estudiante_id) || [];
    // 2. Eliminar la lista (esto elimina las relaciones por on delete cascade)
    const { error } = await supabase
      .from('listas')
      .delete()
      .eq('id', listId);
    if (!error) {
      setLists(prev => prev.filter(l => l.id !== listId));
      if (currentList?.id === listId) {
        setCurrentList(null);
        localStorage.removeItem('lastListId');
      }
      // 3. Por cada estudiante, verificar si sigue en alguna lista. Si no, eliminarlo de estudiantes
      for (const estudianteId of estudiantesIds) {
        const { data: relaciones } = await supabase
          .from('lista_estudiantes')
          .select('id')
          .eq('estudiante_id', estudianteId);
        if (!relaciones || relaciones.length === 0) {
          await supabase.from('estudiantes').delete().eq('id', estudianteId);
        }
      }
      // ACTUALIZAR estudiantes en la lista seleccionada si corresponde
      if (currentList && currentList.id !== listId) {
        const { data } = await supabase
          .from('lista_estudiantes')
          .select('id')
          .eq('lista_id', currentList.id);
        setLists(prev => prev.map(l => l.id === currentList.id ? { ...l, estudiantes: data || [] } : l));
      }
    }
  };

  // Callback para agregar estudiante manual localmente
  const handleAddLocalStudent = (student: any) => {
    setLocalManualStudents(prev => {
      // Si ya existe (por nombre y apellido), actualiza el estado
      const idx = prev.findIndex(s => s.nombres === student.nombres && s.apellidos === student.apellidos);
      if (idx !== -1) {
        const updated = [...prev];
        updated[idx] = { ...updated[idx], ...student };
        return updated;
      }
      return [...prev, student];
    });
  };

  // Nueva función para agregar estudiantes optimistas de Excel
  const handleAddExcelStudents = (students: any[]) => {
    const now = Date.now();
    setLocalManualStudents([
      ...students.map((s, idx) => ({
        ...s,
        id: `excel_temp_${now}_${idx}`,
        estudiante_id: `excel_temp_${now}_${idx}`,
        origen: 'Excel',
        presente: false,
        pendiente: true,
        excelTempId: `${now}_${idx}`
      }))
    ]);
  };

  // Limpiar estudiantes locales cuando ya existen en la BD
  const handleStudentsFromDB = (studentsFromDB: any[]) => {
    setLastStudents(studentsFromDB);
    setLocalManualStudents(prev =>
      prev.filter(local =>
        !studentsFromDB.some(db =>
          (
            db.nombres?.trim().toLowerCase() === local.nombres?.trim().toLowerCase() &&
            db.apellidos?.trim().toLowerCase() === local.apellidos?.trim().toLowerCase()
          ) ||
          (local.excelTempId && db.nombres && db.apellidos && local.nombres?.trim().toLowerCase() === db.nombres?.trim().toLowerCase() && local.apellidos?.trim().toLowerCase() === db.apellidos?.trim().toLowerCase())
        )
      )
    );
  };

  // Ref para acceder a la función fetchStudents de StudentTable
  const studentTableRef = useRef<any>(null);

  // Forzar refresco de estudiantes tras importar Excel
  const handleExcelImportComplete = async () => {
    setLocalManualStudents([]); // Limpiar optimistas
    // Forzar fetch inmediato de estudiantes reales
    if (studentTableRef.current && typeof studentTableRef.current.fetchStudents === 'function') {
      studentTableRef.current.fetchStudents();
    }
    fetchCounts(); // Actualizar totales inmediatamente
    // ACTUALIZAR estudiantes en la lista seleccionada
    if (currentList) {
      const { data } = await supabase
        .from('lista_estudiantes')
        .select('id')
        .eq('lista_id', currentList.id);
      setLists(prev => prev.map(l => l.id === currentList.id ? { ...l, estudiantes: data || [] } : l));
    }
  };

  // Forzar refresco tras agregar estudiante manual
  const handleStudentManualAdded = async () => {
    setLocalManualStudents([]);
    if (studentTableRef.current && typeof studentTableRef.current.fetchStudents === 'function') {
      studentTableRef.current.fetchStudents();
    }
    fetchCounts(); // Actualizar totales inmediatamente
    // ACTUALIZAR estudiantes en la lista seleccionada
    if (currentList) {
      const { data } = await supabase
        .from('lista_estudiantes')
        .select('id')
        .eq('lista_id', currentList.id);
      setLists(prev => prev.map(l => l.id === currentList.id ? { ...l, estudiantes: data || [] } : l));
    }
  };

  if (!user) {
    return <Login onLogin={() => supabase.auth.getUser().then(({ data }) => setUser(data.user))} />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 via-white to-red-100">
      <Toaster position="top-right" toastOptions={{
        style: { fontSize: '1rem', borderRadius: '0.75rem' },
        success: { style: { background: '#f0fdf4', color: '#166534' } },
        error: { style: { background: '#fef2f2', color: '#991b1b' } },
      }} />
      {/* Header */}
      <header className="bg-white shadow-lg border-b-4 border-red-800" role="banner">
        <div className="max-w-7xl mx-auto px-2 sm:px-4 lg:px-8 py-4 sm:py-6">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-2 sm:gap-0">
            <div className="flex items-center mb-2 sm:mb-0">
              <img 
                src="https://s3.amazonaws.com/evaluar-test-media-bucket/COMPANY/image/53/COMPANY_a2e27536-28be-4b70-b214-3d1e80bf5453_67c9518f-7304-4b55-b19e-c3fe3e868a7e.jpeg" 
                alt="Logo UTP"
                className="w-12 h-12 sm:w-16 sm:h-16 rounded-xl mr-3 sm:mr-4 shadow-lg border-2 border-white"
              />
              <div>
                <h1 className="text-xl sm:text-3xl font-bold text-red-800" id="main-title">Sistema de Asistencia UTP</h1>
                <p className="text-xs sm:text-sm text-gray-600 mt-1">Universidad Tecnológica del Perú - Gestión de Asistencia Estudiantil</p>
              </div>
            </div>
            <div className="flex items-center space-x-2 sm:space-x-4">
              <span className="text-gray-700 font-medium text-xs sm:text-base" aria-label="Usuario actual">{user?.email}</span>
                <button
                onClick={async () => { await supabase.auth.signOut(); setUser(null); }}
                className="bg-red-700 text-white px-2 py-1 sm:px-3 sm:py-1 rounded hover:bg-red-800 text-xs sm:text-base focus:outline-none focus:ring-2 focus:ring-red-400"
                aria-label="Cerrar sesión"
                >
                Cerrar sesión
                </button>
              </div>
          </div>
        </div>
      </header>
      <main className="max-w-7xl mx-auto px-2 sm:px-4 lg:px-8 py-4 sm:py-8" role="main" aria-labelledby="main-title">
        <ListManager
          lists={lists}
          currentList={currentList}
          onCreateList={handleCreateList}
          onSelectList={handleSelectList}
          onDeleteList={handleDeleteList}
        />
        {!currentList ? (
          <div className="text-center py-8 sm:py-16">
            <img 
              src="https://s3.amazonaws.com/evaluar-test-media-bucket/COMPANY/image/53/COMPANY_a2e27536-28be-4b70-b214-3d1e80bf5453_67c9518f-7304-4b55-b19e-c3fe3e868a7e.jpeg" 
              alt="Logo" 
              className="w-20 h-20 sm:w-32 sm:h-32 rounded-full mx-auto mb-6 sm:mb-8 shadow-xl border-4 border-white"
            />
            <h2 className="text-xl sm:text-3xl font-bold text-gray-800 mb-2 sm:mb-4">
              Bienvenido al Sistema de Asistencia UTP
            </h2>
            <p className="text-gray-600 mb-4 sm:mb-8 max-w-2xl mx-auto text-base sm:text-lg">
              Gestiona la asistencia de estudiantes de manera eficiente. Crea una nueva lista de asistencia 
              o selecciona una existente para comenzar a registrar la presencia de tus estudiantes.
            </p>
            <div className="bg-white rounded-xl p-4 sm:p-6 max-w-md mx-auto shadow-lg border border-gray-200">
              <h3 className="font-semibold text-gray-800 mb-2 sm:mb-3 text-base sm:text-lg">Características principales:</h3>
              <ul className="text-xs sm:text-sm text-gray-600 space-y-1 sm:space-y-2 text-left">
                <li>• Carga masiva desde archivos Excel</li>
                <li>• Registro manual de estudiantes</li>
                <li>• Exportación a PDF y Excel</li>
                <li>• Gestión múltiple de listas</li>
                <li>• Guardado automático</li>
              </ul>
            </div>
          </div>
        ) : (
          <>
            <AttendanceSummary listaId={currentList.id} />
            <div className="flex flex-col sm:flex-row gap-4 mb-6">
              <div className="flex-1 flex flex-col gap-2">
                <div className="flex gap-4 mb-2">
                  <div className="flex-1 bg-green-50 border border-green-200 rounded-xl p-4 flex items-center gap-3 shadow">
                    <FileSpreadsheet className="w-7 h-7 text-green-700" />
                    <div>
                      <div className="text-2xl font-bold text-green-800">{excelCount}</div>
                      <div className="text-sm text-green-700 font-semibold">Por Excel</div>
                    </div>
                  </div>
                  <div className="flex-1 bg-blue-50 border border-blue-200 rounded-xl p-4 flex items-center gap-3 shadow">
                    <UserPlus className="w-7 h-7 text-blue-700" />
                    <div>
                      <div className="text-2xl font-bold text-blue-800">{manualCount}</div>
                      <div className="text-sm text-blue-700 font-semibold">Manual</div>
                    </div>
                  </div>
                </div>
                <button
                  className={`w-full flex items-center justify-center gap-2 bg-red-800 text-white font-semibold py-2 rounded-xl transition-colors text-base shadow hover:bg-red-900 ${openForm === 'manual' ? 'ring-2 ring-red-400' : ''}`}
                  onClick={() => setOpenForm(openForm === 'manual' ? null : 'manual')}
                >
                  <UserPlus className="w-5 h-5" />
                  {openForm === 'manual' ? 'Ocultar formulario manual' : 'Agregar Estudiante'}
                </button>
                <div className={`overflow-hidden transition-all duration-500 bg-white rounded-b-lg shadow ${openForm === 'manual' ? 'max-h-[1000px] p-4' : 'max-h-0 p-0'}`}
                  style={{ minHeight: openForm === 'manual' ? 200 : 0 }}>
                  {openForm === 'manual' && (
                    <StudentForm listaId={currentList.id} onAddLocalStudent={handleAddLocalStudent} onStudentAdded={handleStudentManualAdded} />
                  )}
                </div>
              </div>
              <div className="flex-1">
                <button
                  className={`w-full bg-blue-700 text-white font-semibold py-2 rounded-t-lg transition-colors ${openForm === 'excel' ? 'bg-blue-800' : 'hover:bg-blue-800'}`}
                  onClick={() => setOpenForm(openForm === 'excel' ? null : 'excel')}
                >
                  {openForm === 'excel' ? 'Ocultar carga Excel' : 'Cargar estudiantes desde Excel'}
                </button>
                <div className={`overflow-hidden transition-all duration-500 bg-white rounded-b-lg shadow ${openForm === 'excel' ? 'max-h-[1000px] p-4' : 'max-h-0 p-0'}`}
                  style={{ minHeight: openForm === 'excel' ? 200 : 0 }}>
                  {openForm === 'excel' && (
                    <ExcelUpload listaId={currentList.id} onStudentsLoaded={count => {}} onAddExcelStudents={handleAddExcelStudents} onExcelImportComplete={handleExcelImportComplete} />
                  )}
                </div>
              </div>
            </div>
            <StudentTable
              ref={studentTableRef}
              listaId={currentList.id}
              localManualStudents={localManualStudents}
              onRetryManualStudent={handleAddLocalStudent}
              onStudentsFromDB={handleStudentsFromDB}
            />
          </>
        )}
      </main>
      <footer className="bg-white border-t border-gray-200 mt-8 sm:mt-16" role="contentinfo">
        <div className="max-w-7xl mx-auto px-2 sm:px-4 lg:px-8 py-4 sm:py-8">
          <div className="text-center">
            <div className="flex items-center justify-center mb-2 sm:mb-4">
              <img 
                src="https://s3.amazonaws.com/evaluar-test-media-bucket/COMPANY/image/53/COMPANY_a2e27536-28be-4b70-b214-3d1e80bf5453_67c9518f-7304-4b55-b19e-c3fe3e868a7e.jpeg" 
                alt="Logo UTP pequeño"
                className="w-6 h-6 sm:w-8 sm:h-8 rounded-lg mr-2 sm:mr-3 shadow-md"
              />
              <span className="text-base sm:text-lg font-semibold text-gray-800">Apoyos UTP</span>
            </div>
            <p className="text-xs sm:text-sm text-gray-600">
              Universidad Tecnológica del Perú - Sistema de Asistencia Estudiantil
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default App;