/**
 * IndexedDB Service using Dexie.js
 * Manages all persistent storage for SpeedyRead
 */
import Dexie from 'dexie';

class SpeedyReadDB extends Dexie {
    constructor() {
        super('SpeedyReadDB');

        this.version(1).stores({
            // Text entries with category and tags
            texts: '++id, categoryId, *tags, createdAt, updatedAt',

            // Categories (folders) for organization  
            categories: '++id, parentId, name, order',

            // Voice recordings linked to texts
            recordings: '++id, textId, createdAt',

            // User settings (single record)
            settings: 'id'
        });
    }
}

export const db = new SpeedyReadDB();

// Default settings
const DEFAULT_SETTINGS = {
    id: 'user-settings',
    voiceUri: null,           // Chinese voice
    englishVoiceUri: null,    // English voice (separate)
    language: 'zh-HK', // Cantonese default
    geminiApiKey: '',
    defaultSpeed: 1.0,
    loopConfig: [{ speed: 1.0 }], // Default: 1 repetition at 1x
    theme: 'dark'
};

// ============ Settings Operations ============

export async function getSettings() {
    let settings = await db.settings.get('user-settings');
    if (!settings) {
        settings = { ...DEFAULT_SETTINGS };
        await db.settings.put(settings);
    }
    return settings;
}

export async function updateSettings(updates) {
    const settings = await getSettings();
    const newSettings = { ...settings, ...updates };
    await db.settings.put(newSettings);
    return newSettings;
}

// ============ Category Operations ============

export async function getCategories() {
    return db.categories.orderBy('order').toArray();
}

export async function getCategory(id) {
    return db.categories.get(id);
}

export async function createCategory(category) {
    const count = await db.categories.count();
    const newCategory = {
        ...category,
        order: count,
        createdAt: Date.now()
    };
    const id = await db.categories.add(newCategory);
    return { ...newCategory, id };
}

export async function updateCategory(id, updates) {
    await db.categories.update(id, updates);
    return db.categories.get(id);
}

export async function deleteCategory(id) {
    // Also delete all texts in this category
    await db.texts.where('categoryId').equals(id).delete();
    return db.categories.delete(id);
}

// ============ Text Operations ============

export async function getTexts(categoryId = null) {
    if (categoryId) {
        return db.texts.where('categoryId').equals(categoryId).toArray();
    }
    return db.texts.toArray();
}

export async function getText(id) {
    return db.texts.get(id);
}

export async function getRecentTexts(limit = 10) {
    return db.texts.orderBy('updatedAt').reverse().limit(limit).toArray();
}

export async function searchTexts(query, tags = []) {
    let collection = db.texts.toCollection();

    if (tags.length > 0) {
        collection = db.texts.where('tags').anyOf(tags);
    }

    const allTexts = await collection.toArray();

    if (query) {
        const lowerQuery = query.toLowerCase();
        return allTexts.filter(t =>
            t.title.toLowerCase().includes(lowerQuery) ||
            t.content.toLowerCase().includes(lowerQuery)
        );
    }

    return allTexts;
}

export async function createText(text) {
    const now = Date.now();
    const newText = {
        ...text,
        tags: text.tags || [],
        createdAt: now,
        updatedAt: now
    };
    const id = await db.texts.add(newText);
    return { ...newText, id };
}

export async function updateText(id, updates) {
    await db.texts.update(id, { ...updates, updatedAt: Date.now() });
    return db.texts.get(id);
}

export async function deleteText(id) {
    // Also delete associated recordings
    await db.recordings.where('textId').equals(id).delete();
    return db.texts.delete(id);
}

// ============ Recording Operations ============

export async function getRecordings(textId = null) {
    if (textId) {
        return db.recordings.where('textId').equals(textId).toArray();
    }
    return db.recordings.toArray();
}

export async function getRecording(id) {
    return db.recordings.get(id);
}

export async function createRecording(recording) {
    const newRecording = {
        ...recording,
        createdAt: Date.now()
    };
    const id = await db.recordings.add(newRecording);
    return { ...newRecording, id };
}

export async function deleteRecording(id) {
    return db.recordings.delete(id);
}

// ============ Export/Import Operations ============

export async function exportData() {
    const [texts, categories, settings] = await Promise.all([
        db.texts.toArray(),
        db.categories.toArray(),
        getSettings()
    ]);

    // Remove audio blobs from export (too large)
    const textsWithoutBlobs = texts.map(({ audioBlob, ...rest }) => rest);

    return {
        version: 1,
        exportedAt: new Date().toISOString(),
        texts: textsWithoutBlobs,
        categories,
        settings: {
            ...settings,
            geminiApiKey: '' // Don't export API key for security
        }
    };
}

export async function importData(data) {
    if (!data || data.version !== 1) {
        throw new Error('Invalid import file format');
    }

    await db.transaction('rw', db.texts, db.categories, async () => {
        // Clear existing data
        await db.texts.clear();
        await db.categories.clear();

        // Import categories first
        if (data.categories?.length) {
            await db.categories.bulkAdd(data.categories);
        }

        // Import texts
        if (data.texts?.length) {
            await db.texts.bulkAdd(data.texts);
        }
    });

    return {
        textsImported: data.texts?.length || 0,
        categoriesImported: data.categories?.length || 0
    };
}

// ============ Utility ============

export async function clearAllData() {
    await db.transaction('rw', db.texts, db.categories, db.recordings, db.settings, async () => {
        await db.texts.clear();
        await db.categories.clear();
        await db.recordings.clear();
        await db.settings.clear();
    });
}
