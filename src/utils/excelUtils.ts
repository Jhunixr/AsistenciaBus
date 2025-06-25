import * as XLSX from 'xlsx';
import { ExcelData, Student } from '../types';

const parseFullName = (fullName: string): { nombre: string; apellido: string } => {
  const parts = fullName.trim().split(/\s+/);
  
  if (parts.length === 1) {
    return { nombre: parts[0], apellido: '' };
  } else if (parts.length === 2) {
    return { nombre: parts[0], apellido: parts[1] };
  } else if (parts.length === 3) {
    // Asumimos: Nombre Apellido1 Apellido2
    return { nombre: parts[0], apellido: `${parts[1]} ${parts[2]}` };
  } else if (parts.length >= 4) {
    // Asumimos: Nombre1 Nombre2 Apellido1 Apellido2
    const middleIndex = Math.floor(parts.length / 2);
    const nombres = parts.slice(0, middleIndex).join(' ');
    const apellidos = parts.slice(middleIndex).join(' ');
    return { nombre: nombres, apellido: apellidos };
  }
  
  return { nombre: fullName, apellido: '' };
};

export const processExcelFile = (file: File): Promise<{ students: Student[], duplicatesFound: number }> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        const workbook = XLSX.read(data, { type: 'binary' });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        
        // Convert sheet to JSON
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][];
        
        // Process data
        const excelData: ExcelData[] = [];
        const seenStudents = new Set<string>();
        let duplicatesFound = 0;
        
        // Skip header row and process data
        for (let i = 1; i < jsonData.length; i++) {
          const row = jsonData[i];
          if (!row || row.length === 0) continue; // Skip empty rows
          
          let nombre = '';
          let apellido = '';
          
          // Detectar el formato del archivo
          if (row.length >= 4) {
            // Formato de 4 columnas: Primer Nombre, Segundo Nombre, Primer Apellido, Segundo Apellido
            const primerNombre = String(row[0] || '').trim();
            const segundoNombre = String(row[1] || '').trim();
            const primerApellido = String(row[2] || '').trim();
            const segundoApellido = String(row[3] || '').trim();
            
            if (!primerNombre || !primerApellido) continue;
            
            nombre = [primerNombre, segundoNombre].filter(n => n).join(' ');
            apellido = [primerApellido, segundoApellido].filter(a => a).join(' ');
          } else if (row.length >= 2) {
            // Formato de 2 columnas: Nombres, Apellidos
            nombre = String(row[0] || '').trim();
            apellido = String(row[1] || '').trim();
            
            if (!nombre || !apellido) continue;
          } else if (row.length === 1) {
            // Formato de 1 columna: Nombre completo
            const fullName = String(row[0] || '').trim();
            if (!fullName) continue;
            
            const parsed = parseFullName(fullName);
            nombre = parsed.nombre;
            apellido = parsed.apellido;
            
            if (!nombre) continue;
          } else {
            continue; // Skip invalid rows
          }
          
          // Create a normalized key for duplicate detection
          const normalizedKey = `${nombre.toLowerCase().replace(/\s+/g, ' ')}|${apellido.toLowerCase().replace(/\s+/g, ' ')}`;
          
          if (seenStudents.has(normalizedKey)) {
            duplicatesFound++;
            continue; // Skip duplicate
          }
          
          seenStudents.add(normalizedKey);
          excelData.push({ 
            nombre, 
            apellido, 
            ordenOriginal: i // Mantener el orden original del archivo
          });
        }
        
        // Convert to Student objects (manteniendo el orden original)
        const students: Student[] = excelData.map((data, index) => ({
          id: `excel_${Date.now()}_${index}`,
          nombre: data.nombre,
          apellido: data.apellido,
          presente: false,
          esManual: false,
          fechaCreacion: new Date(),
          ordenOriginal: data.ordenOriginal
        }));
        
        resolve({ students, duplicatesFound });
      } catch (error) {
        reject(new Error('Error procesando el archivo Excel. Verifique que el formato sea correcto.'));
      }
    };
    
    reader.onerror = () => {
      reject(new Error('Error leyendo el archivo'));
    };
    
    reader.readAsBinaryString(file);
  });
};

export const validateExcelFile = (file: File): string | null => {
  const validTypes = [
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-excel',
    'text/csv'
  ];
  
  if (!validTypes.includes(file.type) && !file.name.endsWith('.csv')) {
    return 'Formato de archivo no válido. Solo se permiten archivos .xlsx, .xls o .csv';
  }
  
  if (file.size > 10 * 1024 * 1024) { // 10MB limit
    return 'El archivo es demasiado grande. Máximo 10MB permitido.';
  }
  
  return null;
};