import React, { useState } from 'react';
import { List, Trash2, Calendar, Users, Plus } from 'lucide-react';
import { AttendanceList } from '../types';

interface ListManagerProps {
  lists: AttendanceList[];
  currentList: AttendanceList | null;
  onCreateList: (name: string) => void;
  onSelectList: (list: AttendanceList) => void;
  onDeleteList: (listId: string) => void;
}

const ListManager: React.FC<ListManagerProps> = ({
  lists,
  currentList,
  onCreateList,
  onSelectList,
  onDeleteList
}) => {
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newListName, setNewListName] = useState('');
  const [showLists, setShowLists] = useState(false);

  const handleCreateList = (e: React.FormEvent) => {
    e.preventDefault();
    if (newListName.trim()) {
      onCreateList(newListName.trim());
      setNewListName('');
      setShowCreateForm(false);
    }
  };

  const handleDeleteList = (listId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (window.confirm('¿Estás seguro de que quieres eliminar esta lista?')) {
      onDeleteList(listId);
    }
  };

  // Utilidad para mostrar fecha de forma segura
  const mostrarFecha = (fecha: any) => {
    if (!fecha) return 'Sin fecha';
    let d = fecha;
    if (!(fecha instanceof Date)) {
      d = new Date(fecha);
    }
    if (isNaN(d.getTime())) return 'Sin fecha';
    return d.toLocaleDateString('es-ES');
  };

  return (
    <div className="max-w-3xl mx-auto mt-6 mb-10">
      <div className="bg-white rounded-2xl shadow-xl p-6 border border-gray-200">
        <div className="flex items-center gap-3 mb-6">
          <List className="w-8 h-8 text-red-800" />
          <h2 className="text-2xl font-bold text-red-900 tracking-tight">Gestión de Listas</h2>
        </div>
        <form onSubmit={handleCreateList} className="flex flex-col sm:flex-row items-center gap-3 mb-8">
          <input
            type="text"
            value={newListName}
            onChange={(e) => setNewListName(e.target.value)}
            placeholder="Nombre de la nueva lista (ej: Colegio San Juan - 5to A)"
            className="flex-1 px-5 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-700 text-lg shadow-sm"
            required
            maxLength={60}
          />
          <button
            type="submit"
            className="bg-red-800 text-white px-6 py-3 rounded-lg hover:bg-red-900 transition-all font-semibold flex items-center gap-2 text-lg shadow"
          >
            <Plus className="w-6 h-6" /> Crear
          </button>
        </form>
        <div className="mb-4 flex items-center gap-2">
          <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
            <List className="w-5 h-5 text-red-700" /> Listas creadas
            <span className="bg-red-100 text-red-800 rounded-full px-3 py-1 text-xs font-bold ml-2">{lists.length}</span>
          </h3>
        </div>
        {lists.length === 0 ? (
          <div className="text-center text-gray-500 py-8 text-base">Aún no has creado listas.</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {lists.map((list) => (
              <div
                key={list.id}
                className={`p-5 border-2 rounded-2xl shadow-md cursor-pointer transition-all duration-300 ${currentList?.id === list.id ? 'bg-red-50 border-red-700 scale-105 ring-2 ring-red-300' : 'bg-white border-gray-200 hover:bg-gray-50'}`}
                onClick={() => onSelectList(currentList?.id === list.id ? null : list)}
              >
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-bold text-xl text-red-800 flex items-center gap-2">
                    <List className="w-6 h-6" /> {list.nombre}
                  </h4>
                  <button
                    onClick={(e) => handleDeleteList(list.id, e)}
                    className="text-red-500 hover:text-red-900 transition-colors p-1 rounded-full focus:outline-none focus:ring-2 focus:ring-red-400 bg-red-100 hover:bg-red-200"
                    title="Eliminar lista"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
                <div className="flex items-center text-base text-gray-700 gap-6 mt-2">
                  <span className="flex items-center gap-1">
                    <Users className="w-5 h-5" /> {list.estudiantes.length} estudiantes
                  </span>
                  <span className="flex items-center gap-1">
                    <Calendar className="w-5 h-5" /> {mostrarFecha(list.fechaModificacion)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default ListManager;