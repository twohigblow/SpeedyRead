/**
 * OCR Service
 * Handles text extraction from images using Tesseract.js (offline) and Gemini API (online)
 */

import Tesseract from 'tesseract.js';

let tesseractWorker = null;

/**
 * Initialize Tesseract worker for offline OCR
 * Languages: chi_tra (Traditional Chinese), chi_sim (Simplified Chinese), eng (English)
 */
async function initTesseractWorker(languages = ['chi_tra', 'eng']) {
    if (!tesseractWorker) {
        tesseractWorker = await Tesseract.createWorker(languages.join('+'), 1, {
            logger: (m) => {
                if (m.status === 'recognizing text') {
                    // Progress callback could be added here
                }
            }
        });
    }
    return tesseractWorker;
}

/**
 * Perform OCR using Tesseract.js (offline)
 * @param {File|Blob|string} image - Image file, blob, or base64 string
 * @param {object} options - OCR options
 * @returns {Promise<string>} - Extracted text
 */
export async function ocrOffline(image, options = {}) {
    const {
        languages = ['chi_tra', 'eng'],
        onProgress = null
    } = options;

    try {
        const worker = await initTesseractWorker(languages);

        const result = await worker.recognize(image, {
            // PSM 6: Assume a single uniform block of text
            tessedit_pageseg_mode: Tesseract.PSM.SINGLE_BLOCK
        }, {
            rectangle: options.rect || undefined
        });

        if (onProgress) {
            onProgress(1.0);
        }

        return result.data.text.trim();
    } catch (error) {
        console.error('Tesseract OCR error:', error);
        throw new Error(`OCR failed: ${error.message}`);
    }
}

/**
 * Perform OCR using Google Gemini API (online)
 * @param {File|Blob} image - Image file or blob
 * @param {string} apiKey - Gemini API key
 * @param {object} options - OCR options
 * @returns {Promise<string>} - Extracted text
 */
export async function ocrOnline(image, apiKey, options = {}) {
    const { language = 'auto' } = options;

    if (!apiKey) {
        throw new Error('Gemini API key is required for online OCR');
    }

    try {
        // Convert image to base64
        const base64 = await imageToBase64(image);

        // Determine prompt based on language preference
        let prompt = 'Perform OCR on this image and return only the raw text, preserving line breaks.';
        if (language === 'zh-HK') {
            prompt = '請對此圖片進行OCR識別，只返回原始文字，保留換行格式。使用繁體中文。';
        } else if (language === 'zh-CN') {
            prompt = '请对此图片进行OCR识别，只返回原始文字，保留换行格式。使用简体中文。';
        }

        // Call Gemini API
        const response = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
            {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    contents: [{
                        parts: [
                            { text: prompt },
                            {
                                inline_data: {
                                    mime_type: image.type || 'image/jpeg',
                                    data: base64.split(',')[1] // Remove data URL prefix
                                }
                            }
                        ]
                    }],
                    generationConfig: {
                        temperature: 0.1,
                        maxOutputTokens: 4096
                    }
                })
            }
        );

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error?.message || 'Gemini API request failed');
        }

        const data = await response.json();
        const text = data.candidates?.[0]?.content?.parts?.[0]?.text;

        if (!text) {
            throw new Error('No text found in image');
        }

        return text.trim();
    } catch (error) {
        console.error('Gemini OCR error:', error);
        throw error;
    }
}

/**
 * Convert image to base64 data URL
 * @param {File|Blob} image - Image file or blob
 * @returns {Promise<string>} - Base64 data URL
 */
async function imageToBase64(image) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(image);
    });
}

/**
 * Perform OCR with automatic fallback
 * Tries online first (if API key available), then falls back to offline
 * @param {File|Blob} image - Image to process
 * @param {object} options - OCR options including apiKey
 * @returns {Promise<{text: string, method: string}>} - Extracted text and method used
 */
export async function performOCR(image, options = {}) {
    const { apiKey, preferOnline = true, ...restOptions } = options;

    if (preferOnline && apiKey) {
        try {
            const text = await ocrOnline(image, apiKey, restOptions);
            return { text, method: 'gemini' };
        } catch (error) {
            console.warn('Online OCR failed, falling back to offline:', error.message);
            // Fall through to offline
            const text = await ocrOffline(image, restOptions);
            return { text, method: 'local-fallback' };
        }
    }

    const text = await ocrOffline(image, restOptions);
    return { text, method: 'local' };
}

/**
 * Test Gemini API key validity
 * @param {string} apiKey - Gemini API key to test
 * @returns {Promise<{valid: boolean, error?: string}>}
 */
export async function testGeminiApiKey(apiKey) {
    if (!apiKey) {
        return { valid: false, error: 'API key is required' };
    }

    try {
        // Make a simple test request with minimal text
        const response = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
            {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    contents: [{
                        parts: [{ text: 'Hello' }]
                    }],
                    generationConfig: {
                        maxOutputTokens: 10
                    }
                })
            }
        );

        if (!response.ok) {
            const error = await response.json();
            return {
                valid: false,
                error: error.error?.message || `HTTP ${response.status}: ${response.statusText}`
            };
        }

        const data = await response.json();
        if (data.candidates?.[0]?.content) {
            return { valid: true };
        }

        return { valid: false, error: 'Unexpected response format' };
    } catch (error) {
        return {
            valid: false,
            error: error.message || 'Network error'
        };
    }
}

/**
 * Clean up Tesseract worker
 */
export async function terminateWorker() {
    if (tesseractWorker) {
        await tesseractWorker.terminate();
        tesseractWorker = null;
    }
}

/**
 * Preprocess image for better OCR results
 * Returns a canvas element with the processed image
 */
export async function preprocessImage(image, options = {}) {
    const {
        maxWidth = 2000,
        maxHeight = 2000,
        grayscale = true,
        contrast = 1.2
    } = options;

    return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');

            // Calculate new dimensions
            let { width, height } = img;
            if (width > maxWidth) {
                height = (height * maxWidth) / width;
                width = maxWidth;
            }
            if (height > maxHeight) {
                width = (width * maxHeight) / height;
                height = maxHeight;
            }

            canvas.width = width;
            canvas.height = height;

            // Draw image
            ctx.drawImage(img, 0, 0, width, height);

            // Apply filters
            if (grayscale || contrast !== 1) {
                const imageData = ctx.getImageData(0, 0, width, height);
                const data = imageData.data;

                for (let i = 0; i < data.length; i += 4) {
                    if (grayscale) {
                        // Convert to grayscale
                        const gray = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
                        data[i] = data[i + 1] = data[i + 2] = gray;
                    }

                    if (contrast !== 1) {
                        // Apply contrast
                        for (let j = 0; j < 3; j++) {
                            data[i + j] = ((data[i + j] / 255 - 0.5) * contrast + 0.5) * 255;
                            data[i + j] = Math.max(0, Math.min(255, data[i + j]));
                        }
                    }
                }

                ctx.putImageData(imageData, 0, 0);
            }

            resolve(canvas);
        };

        img.onerror = reject;

        // Load image from blob/file
        if (image instanceof Blob) {
            img.src = URL.createObjectURL(image);
        } else {
            img.src = image;
        }
    });
}
