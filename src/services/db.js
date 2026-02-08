/**
 * IndexedDB Service using Dexie.js
 * Manages all persistent storage for SpeedyRead
 */
import Dexie from 'dexie';

class SpeedyReadDB extends Dexie {
    constructor() {
        super('SpeedyReadDB');

        // Version 1: Original schema
        this.version(1).stores({
            texts: '++id, categoryId, *tags, createdAt, updatedAt',
            categories: '++id, parentId, name, order',
            recordings: '++id, textId, createdAt',
            settings: 'id',
            flashcardPresets: '++id, name, createdAt'
        });

        // Version 2: Add metadata fields for marketplace
        this.version(2).stores({
            texts: '++id, categoryId, *tags, createdAt, updatedAt',
            categories: '++id, parentId, name, order, *tags, language, level',
            recordings: '++id, textId, createdAt',
            settings: 'id',
            flashcardPresets: '++id, name, createdAt'
        }).upgrade(tx => {
            // Add new fields to existing categories
            return tx.table('categories').toCollection().modify(category => {
                category.description = category.description || '';
                category.tags = category.tags || [];
                category.author = category.author || '';
                category.language = category.language || 'zh-HK';
                category.level = category.level || 'beginner';
                category.isPublic = false;
                category.downloads = 0;
                category.rating = 0;
            });
        });
    }
}

export const db = new SpeedyReadDB();

// Category color palette for subconscious learning
export const CATEGORY_COLORS = {
    blue: '#3B82F6',
    green: '#10B981',
    yellow: '#F59E0B',
    purple: '#8B5CF6',
    red: '#EF4444',
    orange: '#F97316',
    cyan: '#06B6D4',
    pink: '#EC4899',
    none: null
};

// Default settings
const DEFAULT_SETTINGS = {
    id: 'user-settings',
    ttsMode: 'offline',       // 'offline' (Web Speech) or 'online' (Google Cloud)
    voiceUri: null,           // Chinese voice (Web Speech)
    englishVoiceUri: null,    // English voice (Web Speech)
    language: 'zh-HK',        // Cantonese default
    geminiApiKey: '',
    googleTtsApiKey: '',      // Google Cloud TTS API key
    googleVoiceType: 'Neural2', // Neural2, WaveNet, Standard
    googleChineseVoice: 'yue-HK-Standard-A',  // Google Chinese voice
    googleEnglishVoice: 'en-US-Neural2-F',    // Google English voice
    defaultSpeed: 1.0,
    loopConfig: [{ speed: 1.0 }],
    theme: 'dark',
    // Flashcard default settings
    flashSpeed: 2.0,          // seconds between cards
    flashTtsSpeed: 1.0,       // TTS playback speed for flashcards
    flashFontSize: 48,        // Font size in pixels (24-200)
    flashFont: 'system',      // 'system' or 'kai' (Free HK Kai)
    flashTtsEnabled: true,    // enable/disable TTS in flashcard mode
    flashAutoPlay: true,      // auto-advance cards
    flashLoops: 1,            // number of times to loop through cards (1-10)
    flashAutoPlayVoice: false, // auto-play voice when manually clicking next/back
    flashDisplayMode: 'flash', // 'flash' (high contrast) or 'sleep' (low stimulation)
    flashShowCategoryColors: true // show category color borders for subconscious learning
};

// ============ Settings Operations ============

export async function getSettings() {
    try {
        const storedSettings = await db.settings.get('user-settings');

        if (!storedSettings) {
            const initialSettings = { ...DEFAULT_SETTINGS };
            await db.settings.put(initialSettings);
            return initialSettings;
        }

        // Merge stored settings with defaults to ensure all fields exist
        // This handles schema migrations and missing fields gracefully
        const mergedSettings = { ...DEFAULT_SETTINGS, ...storedSettings };

        // Check for specific incompatible values and reset if needed
        // e.g. if saved speed is outside valid range
        if (mergedSettings.flashTtsSpeed < 0.1 || mergedSettings.flashTtsSpeed > 8.0) {
            mergedSettings.flashTtsSpeed = DEFAULT_SETTINGS.flashTtsSpeed;
        }

        // If merged settings differ from stored (meaning we added new fields), update DB
        if (JSON.stringify(mergedSettings) !== JSON.stringify(storedSettings)) {
            await db.settings.put(mergedSettings);
        }

        return mergedSettings;
    } catch (err) {
        console.error('Error loading settings, using defaults:', err);
        return { ...DEFAULT_SETTINGS };
    }
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

// ============ Flashcard Preset Operations ============

export async function getFlashcardPresets() {
    return db.flashcardPresets.orderBy('createdAt').reverse().toArray();
}

export async function getFlashcardPreset(id) {
    return db.flashcardPresets.get(id);
}

export async function createFlashcardPreset(preset) {
    const newPreset = {
        ...preset,
        createdAt: Date.now()
    };
    const id = await db.flashcardPresets.add(newPreset);
    return { ...newPreset, id };
}

export async function updateFlashcardPreset(id, updates) {
    await db.flashcardPresets.update(id, updates);
    return db.flashcardPresets.get(id);
}

export async function deleteFlashcardPreset(id) {
    return db.flashcardPresets.delete(id);
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

// ============ Playlist Helper Functions ============

/**
 * Get all libraries (categories) for playlist use
 */
export async function getAllLibraries() {
    const categories = await db.categories.orderBy('order').toArray();
    return categories.map(cat => ({
        id: cat.id,
        name: cat.name,
        description: cat.description || '',
        tags: cat.tags || [],
        category: cat.category || '',
        language: cat.language || 'zh-HK',
        level: cat.level || 'beginner'
    }));
}

/**
 * Get all words/texts from a library (category)
 */
export async function getWordsFromLibrary(libraryId) {
    const texts = await db.texts.where('categoryId').equals(libraryId).toArray();
    return texts.map(text => ({
        id: text.id,
        front: text.title || text.content,
        back: text.back || '',
        pronunciation: text.pronunciation || '',
        content: text.content,
        tags: text.tags || []
    }));
}
