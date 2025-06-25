import { AttendanceList } from '../types';

const STORAGE_KEY = 'attendance_lists';

export const saveAttendanceList = (list: AttendanceList): void => {
  try {
    const existingLists = getAttendanceLists();
    const updatedLists = existingLists.filter(l => l.id !== list.id);
    updatedLists.push(list);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedLists));
  } catch (error) {
    console.error('Error saving attendance list:', error);
    throw new Error('No se pudo guardar la lista de asistencia');
  }
};

export const getAttendanceLists = (): AttendanceList[] => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return [];
    
    const lists = JSON.parse(stored);
    return lists.map((list: any) => ({
      ...list,
      fechaCreacion: new Date(list.fechaCreacion),
      fechaModificacion: new Date(list.fechaModificacion),
      estudiantes: list.estudiantes.map((student: any) => ({
        ...student,
        fechaCreacion: new Date(student.fechaCreacion)
      }))
    }));
  } catch (error) {
    console.error('Error loading attendance lists:', error);
    return [];
  }
};

export const deleteAttendanceList = (listId: string): void => {
  try {
    const existingLists = getAttendanceLists();
    const updatedLists = existingLists.filter(l => l.id !== listId);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedLists));
  } catch (error) {
    console.error('Error deleting attendance list:', error);
    throw new Error('No se pudo eliminar la lista de asistencia');
  }
};

export const getAttendanceListById = (listId: string): AttendanceList | null => {
  const lists = getAttendanceLists();
  return lists.find(l => l.id === listId) || null;
};