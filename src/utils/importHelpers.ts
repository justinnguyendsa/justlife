import * as XLSX from 'xlsx';

export interface RawImportData {
  headers: string[];
  rows: any[];
}

export const readImportFile = async (file: File): Promise<RawImportData> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        const extension = file.name.split('.').pop()?.toLowerCase();

        if (extension === 'json') {
          const json = JSON.parse(data as string);
          if (Array.isArray(json) && json.length > 0) {
            resolve({
              headers: Object.keys(json[0]),
              rows: json
            });
          } else {
             reject(new Error('JSON must be an array of objects'));
          }
          return;
        }

        // Handle XLSX/CSV/TSV via SheetJS
        const workbook = XLSX.read(data, { type: 'binary' });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        const json = XLSX.utils.sheet_to_json(worksheet);

        if (json.length > 0) {
          resolve({
            headers: Object.keys(json[0] as object),
            rows: json
          });
        } else {
          resolve({ headers: [], rows: [] });
        }
      } catch (err) {
        reject(err);
      }
    };

    reader.onerror = () => reject(new Error('File reading failed'));

    if (file.name.endsWith('.json')) {
      reader.readAsText(file);
    } else {
      reader.readAsBinaryString(file);
    }
  });
};

export const parsePastedText = (text: string): RawImportData => {
  const lines = text.split('\n').filter(l => l.trim());
  if (lines.length === 0) return { headers: [], rows: [] };

  const firstLine = lines[0];
  const sep = firstLine.includes('\t') ? '\t' : (firstLine.includes(',') ? ',' : '|');
  
  // Try to detect if the first line is a header
  const parts = firstLine.split(sep).map(p => p.trim());
  const hasHeaders = parts.some(p => /name|tên|code|mã|email|thư/i.test(p));

  let headers: string[] = [];
  let rows: any[] = [];

  if (hasHeaders) {
    headers = parts;
    rows = lines.slice(1).map(line => {
      const rowParts = line.split(sep).map(p => p.trim());
      const obj: any = {};
      headers.forEach((h, i) => {
        obj[h] = rowParts[i] || '';
      });
      return obj;
    });
  } else {
    // Generate generic headers Col 1, Col 2...
    const maxCols = Math.max(...lines.map(l => l.split(sep).length));
    headers = Array.from({ length: maxCols }, (_, i) => `Column ${i + 1}`);
    rows = lines.map(line => {
      const rowParts = line.split(sep).map(p => p.trim());
      const obj: any = {};
      headers.forEach((h, i) => {
        obj[h] = rowParts[i] || '';
      });
      return obj;
    });
  }

  return { headers, rows };
};

export const autoDetectMapping = (headers: string[]) => {
  const mapping: Record<string, string> = {
    name: '',
    studentCode: '',
    email: ''
  };

  headers.forEach(h => {
    const low = h.toLowerCase();
    if (/name|tên|họ|tên/i.test(low) && !mapping.name) mapping.name = h;
    if (/code|mã|id|mssv/i.test(low) && !mapping.studentCode) mapping.studentCode = h;
    if (/email|mail|thư/i.test(low) && !mapping.email) mapping.email = h;
  });

  return mapping;
};
