import React, { useEffect, useState } from 'react';
import { supabase } from '../utils/supabaseClient';

interface AttendanceSummaryProps {
  listaId: string;
}

interface UserCount {
  email: string;
  count: number;
}

const AttendanceSummary: React.FC<AttendanceSummaryProps> = ({ listaId }) => {
  const [total, setTotal] = useState(0);
  const [presentes, setPresentes] = useState(0);
  const [ausentes, setAusentes] = useState(0);
  const [porcentaje, setPorcentaje] = useState(0);
  const [topUsuarios, setTopUsuarios] = useState<UserCount[]>([]);

  const fetchSummary = async () => {
    const { data, error } = await supabase
      .from('lista_estudiantes')
      .select('presente, marcado_por, origen')
      .eq('lista_id', listaId);
    if (!error && data) {
      setTotal(data.length);
      const presentesCount = data.filter((row: any) => row.presente).length;
      setPresentes(presentesCount);
      setAusentes(data.length - presentesCount);
      setPorcentaje(data.length > 0 ? Math.round((presentesCount / data.length) * 1000) / 10 : 0);
      // Top usuarios
      const userMap: Record<string, number> = {};
      data.forEach((row: any) => {
        if (row.marcado_por && row.presente) {
          userMap[row.marcado_por] = (userMap[row.marcado_por] || 0) + 1;
        }
      });
      const top = Object.entries(userMap)
        .map(([email, count]) => ({ email, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5);
      setTopUsuarios(top);
    }
  };

  useEffect(() => {
    fetchSummary();
    // Suscripción en tiempo real
    const channel = supabase
      .channel('realtime-summary-' + listaId)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'lista_estudiantes', filter: `lista_id=eq.${listaId}` },
        () => {
          fetchSummary();
        }
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [listaId]);

  return (
    <div className="w-full overflow-x-auto pb-2">
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-xl p-6 shadow border text-center min-w-[180px]">
          <div className="text-3xl font-bold text-red-700">{total}</div>
          <div className="text-gray-700 mt-2 text-base">Total Estudiantes</div>
        </div>
        <div className="bg-white rounded-xl p-6 shadow border text-center min-w-[180px]">
          <div className="text-3xl font-bold text-green-700">{presentes}</div>
          <div className="text-gray-700 mt-2 text-base">Presentes</div>
        </div>
        <div className="bg-white rounded-xl p-6 shadow border text-center min-w-[180px]">
          <div className="text-3xl font-bold text-red-700">{ausentes}</div>
          <div className="text-gray-700 mt-2 text-base">Ausentes</div>
        </div>
        <div className="bg-white rounded-xl p-6 shadow border text-center min-w-[180px]">
          <div className="text-3xl font-bold text-blue-700">{porcentaje}%</div>
          <div className="text-gray-700 mt-2 text-base">% Asistencia</div>
        </div>
      </div>
      <div className="bg-white rounded-xl p-6 shadow border mt-4 max-w-full overflow-x-auto">
        <div className="font-semibold mb-2 text-gray-800 text-base">Top usuarios que marcaron asistencia:</div>
        <ul className="text-gray-700 text-sm">
          {topUsuarios.length === 0 && <li>No hay registros aún.</li>}
          {topUsuarios.map(u => (
            <li key={u.email}>{u.email}: {u.count} estudiantes</li>
          ))}
        </ul>
      </div>
    </div>
  );
};

export default AttendanceSummary;