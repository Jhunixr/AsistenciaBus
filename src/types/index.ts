export interface Student {
  id: string;
  nombre: string;
  apellido: string;
  dni?: string;
  telefono?: string;
  presente: boolean;
  esManual: boolean; // true if added manually, false if from Excel
  fechaCreacion: Date;
  ordenOriginal?: number; // Para mantener el orden original del archivo
}

export interface AttendanceList {
  id: string;
  nombre: string;
  estudiantes: Student[];
  fechaCreacion: Date;
  fechaModificacion: Date;
}

export interface AttendanceSummary {
  total: number;
  presentes: number;
  ausentes: number;
  presentesExcel: number;
  presentesManuales: number;
  ausentesExcel: number;
  ausentesManuales: number;
}

export interface ExcelData {
  nombre: string;
  apellido: string;
  ordenOriginal: number;
}

export interface Notification {
  id: string;
  tipo: 'success' | 'warning' | 'error' | 'info';
  mensaje: string;
  timestamp: Date;
}