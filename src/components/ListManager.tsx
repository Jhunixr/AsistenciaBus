import React, { useState } from 'react';
import { Plus, List, Trash2, Calendar, Users } from 'lucide-react';
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

  return (
    <div className="bg-white rounded-lg shadow-md p-4 mb-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold text-gray-800 flex items-center">
          <List className="w-6 h-6 mr-2" />
          Gestión de Listas
        </h2>
        <div className="flex space-x-2">
          <button
            onClick={() => setShowCreateForm(!showCreateForm)}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center text-sm font-medium"
          >
            <Plus className="w-4 h-4 mr-1" />
            Nueva Lista
          </button>
          {lists.length > 0 && (
            <button
              onClick={() => setShowLists(!showLists)}
              className="bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors flex items-center text-sm font-medium"
            >
              <List className="w-4 h-4 mr-1" />
              Ver Listas ({lists.length})
            </button>
          )}
        </div>
      </div>

      {currentList && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
          <h3 className="font-semibold text-blue-800 mb-1">Lista Activa:</h3>
          <p className="text-blue-700">{currentList.nombre}</p>
          <div className="flex items-center text-sm text-blue-600 mt-1 space-x-4">
            <span className="flex items-center">
              <Users className="w-4 h-4 mr-1" />
              {currentList.estudiantes.length} estudiantes
            </span>
            <span className="flex items-center">
              <Calendar className="w-4 h-4 mr-1" />
              {currentList.fechaModificacion.toLocaleDateString('es-ES')}
            </span>
          </div>
        </div>
      )}

      {showCreateForm && (
        <form onSubmit={handleCreateList} className="mb-4">
          <div className="flex space-x-2">
            <input
              type="text"
              value={newListName}
              onChange={(e) => setNewListName(e.target.value)}
              placeholder="Nombre de la nueva lista (ej: Colegio San Juan - 5to A)"
              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
            <button
              type="submit"
              className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors font-medium"
            >
              Crear
            </button>
            <button
              type="button"
              onClick={() => {
                setShowCreateForm(false);
                setNewListName('');
              }}
              className="bg-gray-500 text-white px-4 py-2 rounded-lg hover:bg-gray-600 transition-colors font-medium"
            >
              Cancelar
            </button>
          </div>
        </form>
      )}

      {showLists && lists.length > 0 && (
        <div className="space-y-2">
          <h3 className="font-semibold text-gray-700 mb-2">Listas Guardadas:</h3>
          {lists.map((list) => (
            <div
              key={list.id}
              className={`
                p-3 border rounded-lg cursor-pointer transition-colors
                ${currentList?.id === list.id 
                  ? 'bg-blue-100 border-blue-300' 
                  : 'bg-gray-50 border-gray-200 hover:bg-gray-100'
                }
              `}
              onClick={() => onSelectList(list)}
            >
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <h4 className="font-medium text-gray-800">{list.nombre}</h4>
                  <div className="flex items-center text-sm text-gray-600 mt-1 space-x-4">
                    <span className="flex items-center">
                      <Users className="w-4 h-4 mr-1" />
                      {list.estudiantes.length} estudiantes
                    </span>
                    <span className="flex items-center">
                      <Calendar className="w-4 h-4 mr-1" />
                      {list.fechaModificacion.toLocaleDateString('es-ES')}
                    </span>
                  </div>
                </div>
                <button
                  onClick={(e) => handleDeleteList(list.id, e)}
                  className="text-red-500 hover:text-red-700 transition-colors p-1"
                  title="Eliminar lista"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ListManager;