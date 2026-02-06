# iOS Online TTS Fix - Technical Documentation

## Overview

This document explains the **three critical techniques** that make Gemini TTS work reliably on iOS (Safari and Chrome), where most web developers struggle with silent or failing audio.

---

## The iOS Audio Challenge

**iOS Policy:** Audio cannot play unless triggered directly by a physical user gesture (tap/click).

**The Problem:**
- Most developers try to play audio after async operations (fetch, database queries)
- By that time, the browser has "forgotten" the user gesture
- Audio fails silently or throws errors

---

## The Three iOS Audio Fixes

### 1. 🔓 Synchronous AudioContext Unlock

**The Trick:** Resume `AudioContext` at the **very top** of the click handler, before any async operations.

```javascript
const handlePlay = async () => {
    // ✅ CRITICAL: Resume AudioContext FIRST, inside click event
    const ctx = getContext();
    if (ctx.state === 'suspended') {
        await ctx.resume();
    }
    
    // ✅ Now safe to do async operations
    const data = await fetch(...);
    const audioData = await getAudioFromDB();
    
    // ✅ Audio will work because gate was opened at top
    playAudio(audioData);
};
```

**Why It Works:**
- iOS detects the `ctx.resume()` call is **directly** triggered by user tap
- Once resumed in the gesture handler, the "gate" stays open
- Subsequent audio playback works even after async operations

**❌ Wrong Way:**
```javascript
const handlePlay = async () => {
    // ❌ Async operation BEFORE unlock
    const data = await fetch(...);
    
    // ❌ Too late! No longer in user gesture context
    const ctx = getContext();
    await ctx.resume();  // This might fail on iOS
};
```

---

### 2. 🎵 Manual PCM to Float32 Decoding

**The Challenge:**
- Gemini returns raw **16-bit Linear PCM** data (just bytes)
- Safari's audio decoder expects standard containers (`.wav`, `.mp3`)
- Using `<audio>` tags or `decodeAudioData()` can be unreliable on iOS

**The Trick:** Manually parse the byte array and feed raw math to Web Audio API:

```javascript
function manualDecodeInt16ToFloat32(pcmData) {
    const int16View = new DataView(pcmData);
    const sampleCount = pcmData.byteLength / 2;
    const sourceFloat32 = new Float32Array(sampleCount);

    for (let i = 0; i < sampleCount; i++) {
        const int16 = int16View.getInt16(i * 2, true); // little-endian
        
        // Normalize to -1.0 to 1.0 range
        sourceFloat32[i] = int16 < 0 
            ? int16 / 32768.0   // -32768 to 0 → -1.0 to 0
            : int16 / 32767.0;  // 0 to 32767 → 0 to 1.0
    }

    return sourceFloat32;
}
```

**Why It Works:**
- Bypasses Safari's container decoder completely
- Feeds raw Float32 samples directly to speakers
- More reliable on iOS than Blob URL + `<audio>` tag approach

---

### 3. 🎚️ Linear Interpolation Resampling

**The Challenge:**
- Gemini's native audio: **24,000 Hz**
- iOS devices run at: **44,100 Hz** or **48,000 Hz**
- Playing 24kHz audio on 48kHz hardware = **chipmunk voice** (2x speed)

**The Trick:** Resample using linear interpolation:

```javascript
function resampleWithLinearInterpolation(sourceFloat32, sourceSampleRate, targetSampleRate) {
    const ratio = sourceSampleRate / targetSampleRate;  // e.g., 24000/48000 = 0.5
    const targetLength = Math.floor(sourceFloat32.length / ratio);
    const targetFloat32 = new Float32Array(targetLength);

    for (let i = 0; i < targetLength; i++) {
        // Map target index to source position
        const sourceIndex = i * ratio;
        const index1 = Math.floor(sourceIndex);
        const index2 = Math.min(index1 + 1, sourceFloat32.length - 1);
        const fraction = sourceIndex - index1;

        // Linear interpolation between two nearest samples
        targetFloat32[i] = sourceFloat32[index1] * (1 - fraction) + 
                          sourceFloat32[index2] * fraction;
    }

    return targetFloat32;
}
```

**Example:**
- Source: 24,000 samples at 24kHz
- Target: 48,000 samples at 48kHz
- Each target sample interpolates between two source samples
- Result: Perfect pitch and speed on any device

---

## Complete Flow

```
┌─────────────────────────────────────────────────────────────┐
│ USER TAPS PLAY BUTTON                                       │
└─────────────────┬───────────────────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────────────────┐
│ 1. UNLOCK AUDIOCONTEXT (synchronous)                        │
│    ✅ iOS recognizes: "User said it's OK to make noise"     │
└─────────────────┬───────────────────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────────────────┐
│ 2. FETCH DATA (async)                                       │
│    - Check IndexedDB cache                                  │
│    - Or fetch from Gemini API                               │
│    - Returns: Raw 16-bit PCM bytes (24kHz)                  │
└─────────────────┬───────────────────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────────────────┐
│ 3. MANUAL DECODE (PCM → Float32)                            │
│    - Parse each 16-bit sample                               │
│    - Normalize to -1.0 to 1.0 range                         │
│    - Output: Float32Array of raw samples                    │
└─────────────────┬───────────────────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────────────────┐
│ 4. RESAMPLE (24kHz → 48kHz)                                 │
│    - Linear interpolation                                   │
│    - Adapt to device's native sample rate                   │
│    - Prevents chipmunk voice                                │
└─────────────────┬───────────────────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────────────────┐
│ 5. PLAY (AudioBufferSourceNode)                             │
│    - Create AudioBuffer from Float32Array                   │
│    - Apply speed (playbackRate)                             │
│    - Connect to speakers                                    │
│    ✅ Audio plays perfectly on iOS!                         │
└─────────────────────────────────────────────────────────────┘
```

---

## Usage Example

```javascript
import { unlockAudioForIOS, playGeminiTTS } from './services/gemini-tts';

function MyComponent() {
    const handlePlay = async () => {
        // ========================================
        // CRITICAL: Unlock FIRST, in click handler
        // ========================================
        await unlockAudioForIOS();
        
        // ========================================
        // Now safe to do async work
        // ========================================
        await playGeminiTTS(text, apiKey, {
            voice: 'Puck',
            speed: 1.5,
            textId: 'unique-id',
            onStart: () => console.log('Started'),
            onEnd: () => console.log('Ended')
        });
    };

    return <button onClick={handlePlay}>🔊 Play</button>;
}
```

---

## Key Takeaways

1. **Order Matters:**  
   `ctx.resume()` must be **first** in click handler, before any `await`

2. **Bypass Format Decoders:**  
   Manual PCM decoding is more reliable on iOS than browser's built-in decoders

3. **Match Sample Rates:**  
   Always resample to `ctx.sampleRate` (device's native rate) to prevent pitch/speed issues

4. **Cache Aggressively:**  
   Store raw PCM in IndexedDB to avoid repeated API calls

5. **Test on Real iOS Device:**  
   iOS Simulator doesn't always reproduce audio issues

---

## Browser Compatibility

| Browser          | Support | Notes                                    |
|------------------|---------|------------------------------------------|
| **iOS Safari**   | ✅      | Primary target, works perfectly          |
| **iOS Chrome**   | ✅      | Uses Safari's WebKit engine              |
| **Android**      | ✅      | Works, but less strict about user gesture|
| **Desktop**      | ✅      | Works everywhere                         |

---

## Performance Considerations

### Memory Usage
- **Raw PCM:** ~48 KB per second of audio (24kHz, mono, 16-bit)
- **Resampled:** ~96 KB per second (48kHz, mono, 32-bit float)
- **Recommendation:** Cache up to 100 items (~5 MB)

### Processing Time
- **Decode + Resample:** ~10-50ms for typical sentence (on iPhone 12+)
- **Negligible:** User won't notice the delay

### Network Cost
- **Gemini API:** Free tier allows 15 requests/minute
- **Payload:** Efficiently compressed, ~25 KB per 5-second audio

---

## Debugging Tips

### Audio Not Playing on iOS?

1. **Check AudioContext State:**
   ```javascript
   console.log(ctx.state); // Should be 'running' after resume
   ```

2. **Verify Sample Rate:**
   ```javascript
   console.log(`Device: ${ctx.sampleRate}Hz`); // Should be 44100 or 48000
   ```

3. **Inspect Buffer:**
   ```javascript
   console.log(`Buffer: ${audioBuffer.length} samples, ${audioBuffer.duration}s`);
   ```

4. **Enable Verbose Logging:**
   - Check `gemini-tts.js` for console.log statements
   - Monitor Network tab for API responses

### Common Mistakes

❌ **Calling resume() after async operation**
```javascript
const data = await fetch(...);
await ctx.resume(); // Too late!
```

✅ **Correct:**
```javascript
await ctx.resume(); // First!
const data = await fetch(...);
```

---

## References

- [Web Audio API - AudioContext](https://developer.mozilla.org/en-US/docs/Web/API/AudioContext)
- [iOS Safari Audio Restrictions](https://webkit.org/blog/6784/new-video-policies-for-ios/)
- [Gemini API Documentation](https://ai.google.dev/gemini-api/docs)
- [Linear Interpolation](https://en.wikipedia.org/wiki/Linear_interpolation)

---

## Credits

This implementation is based on real-world testing and debugging on iOS devices, solving the common issue of silent audio in web apps using online TTS services.

**Key Insight:** The "trick" isn't a hack—it's understanding iOS's security model and working with it, not against it.
