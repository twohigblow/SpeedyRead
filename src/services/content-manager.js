/**
 * Content Manager Service
 * 
 * Handles bulk import/export of libraries in multiple formats:
 * - CSV (simple, Excel-compatible)
 * - Excel (.xlsx with multiple sheets)
 * - Text (human-readable pipe format)
 * - JSON (complete package with metadata)
 */

import * as XLSX from 'xlsx';

// ============================================
// IMPORT FUNCTIONS
// ============================================

/**
 * Import from CSV file
 * Format: Chapter,Front,Back,Pronunciation,Type,Tags
 */
export async function importFromCSV(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();

        reader.onload = (e) => {
            try {
                const text = e.target.result;
                const library = parseCSV(text);
                resolve(library);
            } catch (error) {
                reject(error);
            }
        };

        reader.onerror = () => reject(new Error('Failed to read file'));
        reader.readAsText(file);
    });
}

/**
 * Parse CSV text into library structure
 */
function parseCSV(csvText) {
    const lines = csvText.trim().split('\n');

    if (lines.length < 2) {
        throw new Error('CSV file must have at least a header and one data row');
    }

    // Parse header
    const headers = lines[0].split(',').map(h => h.trim().toLowerCase());

    // Validate required columns
    const requiredColumns = ['front'];
    const missingColumns = requiredColumns.filter(col => !headers.includes(col));

    if (missingColumns.length > 0) {
        throw new Error(`Missing required columns: ${missingColumns.join(', ')}`);
    }

    // Get column indices
    const getIndex = (name) => headers.indexOf(name);
    const chapterIdx = getIndex('chapter');
    const frontIdx = getIndex('front');
    const backIdx = getIndex('back');
    const pronunciationIdx = getIndex('pronunciation');
    const typeIdx = getIndex('type');
    const tagsIdx = getIndex('tags');

    // Parse data rows
    const chapters = new Map();

    for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;

        const values = parseCSVLine(line);

        const chapterName = chapterIdx >= 0 ? (values[chapterIdx] || 'Default Chapter') : 'Default Chapter';
        const front = values[frontIdx]?.trim();

        if (!front) continue; // Skip empty rows

        const word = {
            id: `word-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            front,
            back: backIdx >= 0 ? (values[backIdx]?.trim() || '') : '',
            pronunciation: pronunciationIdx >= 0 ? (values[pronunciationIdx]?.trim() || '') : '',
            type: typeIdx >= 0 ? (values[typeIdx]?.trim() || 'word') : 'word',
            tags: tagsIdx >= 0 ? parseTags(values[tagsIdx]) : [],
            audio: null,
            image: null
        };

        if (!chapters.has(chapterName)) {
            chapters.set(chapterName, {
                id: `chapter-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                name: chapterName,
                words: []
            });
        }

        chapters.get(chapterName).words.push(word);
    }

    return {
        chapters: Array.from(chapters.values()),
        totalWords: Array.from(chapters.values()).reduce((sum, ch) => sum + ch.words.length, 0)
    };
}

/**
 * Parse CSV line (handles quoted values with commas)
 */
function parseCSVLine(line) {
    const values = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
        const char = line[i];

        if (char === '"') {
            inQuotes = !inQuotes;
        } else if (char === ',' && !inQuotes) {
            values.push(current);
            current = '';
        } else {
            current += char;
        }
    }

    values.push(current);
    return values.map(v => v.trim());
}

/**
 * Import from Excel file (.xlsx)
 * Each sheet = one chapter
 */
export async function importFromExcel(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();

        reader.onload = (e) => {
            try {
                const data = new Uint8Array(e.target.result);
                const workbook = XLSX.read(data, { type: 'array' });
                const library = parseExcel(workbook);
                resolve(library);
            } catch (error) {
                reject(error);
            }
        };

        reader.onerror = () => reject(new Error('Failed to read file'));
        reader.readAsArrayBuffer(file);
    });
}

/**
 * Parse Excel workbook into library structure
 */
function parseExcel(workbook) {
    const chapters = [];

    workbook.SheetNames.forEach(sheetName => {
        const sheet = workbook.Sheets[sheetName];
        const rows = XLSX.utils.sheet_to_json(sheet, { header: 1 });

        if (rows.length < 2) return; // Skip empty sheets

        const headers = rows[0].map(h => String(h).trim().toLowerCase());

        // Get column indices
        const getIndex = (name) => headers.indexOf(name);
        const frontIdx = Math.max(getIndex('front'), 0); // Default to first column
        const backIdx = getIndex('back');
        const pronunciationIdx = getIndex('pronunciation');
        const typeIdx = getIndex('type');
        const tagsIdx = getIndex('tags');

        const words = [];

        for (let i = 1; i < rows.length; i++) {
            const row = rows[i];
            const front = row[frontIdx];

            if (!front) continue; // Skip empty rows

            const word = {
                id: `word-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                front: String(front).trim(),
                back: backIdx >= 0 && row[backIdx] ? String(row[backIdx]).trim() : '',
                pronunciation: pronunciationIdx >= 0 && row[pronunciationIdx] ? String(row[pronunciationIdx]).trim() : '',
                type: typeIdx >= 0 && row[typeIdx] ? String(row[typeIdx]).trim() : 'word',
                tags: tagsIdx >= 0 && row[tagsIdx] ? parseTags(String(row[tagsIdx])) : [],
                audio: null,
                image: null
            };

            words.push(word);
        }

        if (words.length > 0) {
            chapters.push({
                id: `chapter-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                name: sheetName,
                words
            });
        }
    });

    return {
        chapters,
        totalWords: chapters.reduce((sum, ch) => sum + ch.words.length, 0)
    };
}

/**
 * Import from text format
 * Format:
 * LIBRARY: Name
 * DESCRIPTION: Description
 * CATEGORY: Category
 * TAGS: tag1, tag2
 * 
 * ===CHAPTER: Chapter Name===
 * Front | Back | Pronunciation | Type | Tags
 */
export function importFromText(text) {
    const lines = text.trim().split('\n');

    const metadata = {};
    const chapters = [];
    let currentChapter = null;

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();

        if (!line) continue;

        // Parse metadata
        if (line.startsWith('LIBRARY:')) {
            metadata.name = line.substring(8).trim();
        } else if (line.startsWith('DESCRIPTION:')) {
            metadata.description = line.substring(12).trim();
        } else if (line.startsWith('CATEGORY:')) {
            metadata.category = line.substring(9).trim();
        } else if (line.startsWith('TAGS:')) {
            metadata.tags = parseTags(line.substring(5).trim());
        } else if (line.startsWith('LANGUAGE:')) {
            metadata.language = line.substring(9).trim();
        } else if (line.startsWith('LEVEL:')) {
            metadata.level = line.substring(6).trim();
        } else if (line.startsWith('AUTHOR:')) {
            metadata.author = line.substring(7).trim();
        }
        // Parse chapter header
        else if (line.startsWith('===CHAPTER:')) {
            const chapterName = line.replace(/===CHAPTER:\s*/, '').replace(/===/, '').trim();
            currentChapter = {
                id: `chapter-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                name: chapterName,
                words: []
            };
            chapters.push(currentChapter);
        }
        // Parse word data
        else if (line.includes('|') && currentChapter) {
            const parts = line.split('|').map(p => p.trim());

            if (parts.length >= 1 && parts[0]) {
                const word = {
                    id: `word-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                    front: parts[0],
                    back: parts[1] || '',
                    pronunciation: parts[2] || '',
                    type: parts[3] || 'word',
                    tags: parts[4] ? parseTags(parts[4]) : [],
                    audio: null,
                    image: null
                };

                currentChapter.words.push(word);
            }
        }
    }

    return {
        metadata,
        chapters,
        totalWords: chapters.reduce((sum, ch) => sum + ch.words.length, 0)
    };
}

/**
 * Import from JSON package
 */
export function importFromPackage(jsonText) {
    try {
        const pkg = JSON.parse(jsonText);

        if (!pkg.version || !pkg.chapters) {
            throw new Error('Invalid package format');
        }

        return {
            metadata: pkg.metadata || {},
            chapters: pkg.chapters,
            totalWords: pkg.chapters.reduce((sum, ch) => sum + ch.words.length, 0)
        };
    } catch (error) {
        throw new Error(`Invalid JSON: ${error.message}`);
    }
}

/**
 * Parse tags from comma-separated string
 */
function parseTags(tagString) {
    if (!tagString) return [];
    return tagString.split(',').map(t => t.trim()).filter(t => t);
}

// ============================================
// EXPORT FUNCTIONS
// ============================================

/**
 * Export library to CSV
 */
export function exportToCSV(library) {
    let csv = 'Chapter,Front,Back,Pronunciation,Type,Tags\n';

    for (const chapter of library.chapters) {
        for (const word of chapter.words) {
            const row = [
                escapeCSV(chapter.name),
                escapeCSV(word.front),
                escapeCSV(word.back || ''),
                escapeCSV(word.pronunciation || ''),
                escapeCSV(word.type || 'word'),
                escapeCSV((word.tags || []).join(', '))
            ];

            csv += row.join(',') + '\n';
        }
    }

    return new Blob([csv], { type: 'text/csv' });
}

/**
 * Escape CSV value
 */
function escapeCSV(value) {
    const str = String(value);
    if (str.includes(',') || str.includes('"') || str.includes('\n')) {
        return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
}

/**
 * Export library to Excel (.xlsx)
 */
export function exportToExcel(library) {
    const workbook = XLSX.utils.book_new();

    for (const chapter of library.chapters) {
        // Create sheet data
        const data = [
            ['Front', 'Back', 'Pronunciation', 'Type', 'Tags']
        ];

        for (const word of chapter.words) {
            data.push([
                word.front,
                word.back || '',
                word.pronunciation || '',
                word.type || 'word',
                (word.tags || []).join(', ')
            ]);
        }

        // Create worksheet
        const worksheet = XLSX.utils.aoa_to_sheet(data);

        // Add to workbook (sheet name max 31 chars)
        const sheetName = chapter.name.substring(0, 31);
        XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
    }

    // Write to binary
    const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
    return new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
}

/**
 * Export library to text format
 */
export function exportToText(library) {
    let text = '';

    // Metadata
    if (library.name) text += `LIBRARY: ${library.name}\n`;
    if (library.description) text += `DESCRIPTION: ${library.description}\n`;
    if (library.category) text += `CATEGORY: ${library.category}\n`;
    if (library.tags?.length) text += `TAGS: ${library.tags.join(', ')}\n`;
    if (library.language) text += `LANGUAGE: ${library.language}\n`;
    if (library.level) text += `LEVEL: ${library.level}\n`;
    if (library.author) text += `AUTHOR: ${library.author}\n`;

    text += '\n';

    // Chapters
    for (const chapter of library.chapters) {
        text += `===CHAPTER: ${chapter.name}===\n\n`;

        for (const word of chapter.words) {
            const parts = [
                word.front,
                word.back || '',
                word.pronunciation || '',
                word.type || 'word',
                (word.tags || []).join(', ')
            ];

            text += parts.join(' | ') + '\n';
        }

        text += '\n';
    }

    return text;
}

/**
 * Export library as content package (JSON)
 */
export function exportAsPackage(library) {
    const pkg = {
        version: '1.0',
        exportedAt: new Date().toISOString(),
        metadata: {
            name: library.name,
            description: library.description || '',
            category: library.category || 'Uncategorized',
            tags: library.tags || [],
            author: library.author || 'Unknown',
            language: library.language || 'zh-HK',
            level: library.level || 'beginner'
        },
        chapters: library.chapters.map(chapter => ({
            name: chapter.name,
            words: chapter.words.map(word => ({
                front: word.front,
                back: word.back || '',
                pronunciation: word.pronunciation || '',
                type: word.type || 'word',
                tags: word.tags || []
            }))
        }))
    };

    return JSON.stringify(pkg, null, 2);
}

/**
 * Download file
 */
export function downloadFile(blob, filename) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

/**
 * Validate import data
 */
export function validateImportData(data) {
    const errors = [];

    if (!data.chapters || data.chapters.length === 0) {
        errors.push('No chapters found');
    }

    if (data.totalWords === 0) {
        errors.push('No words found');
    }

    // Validate each chapter
    data.chapters.forEach((chapter, idx) => {
        if (!chapter.name) {
            errors.push(`Chapter ${idx + 1} has no name`);
        }

        if (!chapter.words || chapter.words.length === 0) {
            errors.push(`Chapter "${chapter.name}" has no words`);
        }

        // Validate words
        chapter.words.forEach((word, wordIdx) => {
            if (!word.front) {
                errors.push(`Chapter "${chapter.name}", word ${wordIdx + 1}: Missing front text`);
            }
        });
    });

    return {
        valid: errors.length === 0,
        errors
    };
}

/**
 * Get file extension
 */
export function getFileExtension(filename) {
    return filename.split('.').pop().toLowerCase();
}

/**
 * Detect import format from file
 */
export async function importFromFile(file) {
    const ext = getFileExtension(file.name);

    switch (ext) {
        case 'csv':
            return await importFromCSV(file);

        case 'xlsx':
        case 'xls':
            return await importFromExcel(file);

        case 'txt':
            const text = await file.text();
            return importFromText(text);

        case 'json':
            const json = await file.text();
            return importFromPackage(json);

        default:
            throw new Error(`Unsupported file format: .${ext}`);
    }
}
