# Quick Start: Integrating Gemini TTS into SpeedyRead

## 1. Add Test Route (⏱️ 2 minutes)

Add the test page to your router:

```javascript
// In src/App.jsx or your router config
import GeminiTTSTest from './pages/GeminiTTSTest';

// Add this route
<Route path="/gemini-tts-test" element={<GeminiTTSTest />} />
```

Then visit: `http://localhost:5173/gemini-tts-test`

---

## 2. Get Gemini API Key (⏱️ 5 minutes)

1. Visit: https://ai.google.dev/gemini-api/docs/api-key
2. Click "Get API Key"
3. Create a new project or select existing
4. Copy the API key
5. Paste it in the test page

**Free Tier:**
- 15 requests/minute
- 1,500 requests/day
- Perfect for testing!

---

## 3. Test on iOS Device (⏱️ 10 minutes)

### Option A: Deploy to Vercel
```bash
cd /Users/laguna/Documents/Antigravity/SpeedyRead
git add .
git commit -m "Add Gemini TTS with iOS audio fix"
git push
```

Then open on iPhone: `https://your-app.vercel.app/gemini-tts-test`

### Option B: Use ngrok for local testing
```bash
# In one terminal - run your dev server
npm run dev

# In another terminal - expose it
npx ngrok http 5173
```

Then open the ngrok URL on your iPhone.

---

## 4. Testing Checklist

On your iOS device, tap through these tests:

- [ ] **First Tap Test**: Tap "Play" - audio should work immediately
- [ ] **Speed Test**: Change speed slider, play again - should match speed
- [ ] **Voice Test**: Change voice, play - should sound different
- [ ] **Cache Test**: Play same text twice - second time should be instant
- [ ] **Chinese Test**: Use "Cantonese Sample" - should pronounce correctly
- [ ] **English Test**: Use "English Sample" - should sound natural
- [ ] **Mixed Test**: Use "Mixed Sample" - should handle language switching

---

## 5. Integration into Existing Player (Optional)

If you want to add Gemini TTS to your main player:

### Step 1: Add TTS Engine Setting

```javascript
// In src/services/db.js, add to defaultSettings
const defaultSettings = {
    // ... existing settings
    geminiApiKey: '',
    ttsEngine: 'google', // 'google' or 'gemini'
    geminiVoice: 'Puck',
};
```

### Step 2: Update Settings Page

Add a TTS engine selector in your Settings page:

```javascript
// In src/pages/Settings.jsx

<div className="setting-group">
    <h3>TTS Engine</h3>
    <select
        value={settings.ttsEngine || 'google'}
        onChange={(e) => handleUpdate('ttsEngine', e.target.value)}
    >
        <option value="google">Google Cloud TTS</option>
        <option value="gemini">Gemini TTS (iOS優化)</option>
    </select>
</div>

{settings.ttsEngine === 'gemini' && (
    <div className="setting-group">
        <h3>Gemini Voice</h3>
        <select
            value={settings.geminiVoice || 'Puck'}
            onChange={(e) => handleUpdate('geminiVoice', e.target.value)}
        >
            <option value="Puck">Puck - Warm and friendly</option>
            <option value="Charon">Charon - Deep and authoritative</option>
            <option value="Kore">Kore - Clear and professional</option>
            <option value="Fenrir">Fenrir - Strong and confident</option>
            <option value="Aoede">Aoede - Melodic and expressive</option>
        </select>
    </div>
)}
```

### Step 3: Update Player Component

Modify your player to support both engines:

```javascript
// In your Player component
import { unlockAudioForIOS, playGeminiTTS } from '../services/gemini-tts';
import { playGoogleTTS } from '../services/google-tts';

const handlePlay = async () => {
    const settings = await getSettings();
    
    if (settings.ttsEngine === 'gemini') {
        // Gemini TTS path
        await unlockAudioForIOS();  // Critical!
        
        await playGeminiTTS(text, settings.geminiApiKey, {
            voice: settings.geminiVoice,
            speed: currentSpeed,
            textId: `lesson-${lessonId}-word-${wordIndex}`,
            onStart: () => setPlaying(true),
            onEnd: () => setPlaying(false)
        });
        
    } else {
        // Google Cloud TTS path (existing code)
        await playGoogleTTS(text, settings.googleApiKey, currentSpeed, {
            onStart: () => setPlaying(true),
            onBoundary: handleKaraoke,
            onEnd: () => setPlaying(false)
        });
    }
};
```

---

## 6. Performance Optimization

### Cache Strategy

Gemini TTS automatically caches audio in IndexedDB. To optimize:

```javascript
// Preload common phrases
const commonPhrases = ['你好', 'Hello', 'Thank you', '謝謝'];

for (const phrase of commonPhrases) {
    const textId = `common-${phrase}`;
    
    // Check if cached
    const cached = await getCachedGeminiAudio(textId);
    
    if (!cached) {
        // Preload in background
        const pcmData = await synthesizeGeminiTTS(phrase, apiKey);
        await cacheGeminiAudio(textId, pcmData);
    }
}
```

### Memory Management

Clear old cache entries to prevent bloat:

```javascript
// Clear cache entries older than 30 days
async function cleanOldCache() {
    const db = await indexedDB.open('SpeedyReadDB', 1);
    const transaction = db.transaction(['gemini-tts-cache'], 'readwrite');
    const store = transaction.objectStore('gemini-tts-cache');
    
    const allKeys = await store.getAllKeys();
    const cutoffDate = Date.now() - (30 * 24 * 60 * 60 * 1000);
    
    for (const key of allKeys) {
        const entry = await store.get(key);
        if (entry.metadata.cachedAt < cutoffDate) {
            await store.delete(key);
        }
    }
}
```

---

## 7. Troubleshooting

### Audio Not Playing?

**Check Console:**
```javascript
// Add this to your handlePlay function
console.log('AudioContext state:', getContext().state);
console.log('Sample rate:', getContext().sampleRate);
```

Should show:
```
AudioContext state: running
Sample rate: 48000
```

### Still Not Working?

1. **Make sure you're calling `unlockAudioForIOS()` FIRST**
   ```javascript
   // ✅ CORRECT
   await unlockAudioForIOS();
   const data = await fetch(...);
   
   // ❌ WRONG
   const data = await fetch(...);
   await unlockAudioForIOS();
   ```

2. **Check API Key**
   - Test it in the test page first
   - Make sure it's saved in settings

3. **Check Network**
   - Open DevTools → Network tab
   - Look for 200 response from Gemini API
   - Check response size (should be ~20-50 KB)

4. **Test on Real Device**
   - iOS Simulator doesn't always reproduce audio issues
   - Use real iPhone/iPad for testing

---

## 8. Cost Comparison

| Feature | Google Cloud TTS | Gemini TTS |
|---------|------------------|------------|
| Free tier | 1M chars/month | 1,500 req/day |
| Cost per 1K chars | $4-16 | $0.001 |
| Karaoke support | ✅ Yes | ❌ No |
| iOS compatibility | Good | Excellent ⭐️ |
| Voice options | 100+ | 5 |

**Recommendation:**
- Use **Gemini** for simple playback & iOS users
- Use **Google Cloud** for karaoke mode & advanced features

---

## 9. Known Limitations

### Gemini TTS Does NOT Support:
- ❌ Word-level timestamps (no karaoke)
- ❌ SSML markup
- ❌ Custom pitch control
- ❌ Background playback (iOS PWA limitation)

### Works Great For:
- ✅ Simple text-to-speech playback
- ✅ iOS devices
- ✅ Speed control (0.5x - 3.0x)
- ✅ Multiple languages (auto-detect)
- ✅ Offline playback (after caching)

---

## 10. Next Steps

1. **Test the demo page**: `/gemini-tts-test`
2. **Try on iOS device**: Deploy or use ngrok
3. **Decide on integration**: Standalone or add to main player?
4. **Configure caching**: Set up cache cleanup
5. **Monitor usage**: Track API quota usage

---

## Questions?

**Q: Can I use both Google Cloud TTS and Gemini TTS?**  
A: Yes! Add a setting to let users choose their preferred engine.

**Q: Which is better for my use case?**  
A: If you need karaoke → Google Cloud. If iOS compatibility is critical → Gemini.

**Q: Will this work offline?**  
A: Yes, after first play, audio is cached in IndexedDB.

**Q: How much storage does caching use?**  
A: ~50 KB per sentence. 100 sentences = ~5 MB.

**Q: Can I delete the cache?**  
A: Yes, users can clear it in browser settings, or you can provide a "Clear Cache" button.

---

## Quick Command Reference

```bash
# Start dev server
npm run dev

# Access test page
open http://localhost:5173/gemini-tts-test

# Deploy to Vercel
git push

# Expose local server with ngrok
npx ngrok http 5173

# Check IndexedDB cache (in browser console)
indexedDB.databases()
```

---

## Support

For issues or questions:
1. Check `/docs/iOS-TTS-Fix.md` (technical details)
2. Check `/docs/Gemini-TTS-Implementation.md` (full docs)
3. Review console logs for errors
4. Test in simplest case first (test page)

---

**You're all set! 🚀**

Start by testing the demo page, then integrate when ready.
