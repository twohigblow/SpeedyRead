# Dynamic Playlist Engine - User Guide

## Overview

The Dynamic Playlist Engine allows you to create sophisticated learning sequences by combining multiple libraries with custom speed loops, sleep mode optimization, and intelligent audio processing.

---

## Key Features

### 🎵 Multi-Library Queue
Stack multiple libraries in sequence:
```
Library A → Library B → Library C
```

Each library plays completely before moving to the next.

### 🔁 Per-Repeat Speed Control
For each library, define multiple loops with different speeds:
```
Loop 1: 1.5x (Challenge mode)
Loop 2: 1.2x (Moderate)
Loop 3: 1.0x (Normal, transitioning to sleep)
```

### 🌙 Sleep Mode
Automatically optimizes audio for bedtime learning:
- **Speed Cap**: Maximum 1.2x to protect sleep quality
- **Auto Pitch Shift**: Gradual -2 semitones per library
- **Volume Decay**: Progressive reduction (80% → 60% → 40%)
- **Warmth Filter**: Low-pass filtering for soothing sound

### ⏱️ Gap Control
Customize silence between:
- **Loops**: 0-10 seconds (default: 2s)
- **Libraries**: Fixed 10 seconds

---

## Getting Started

### 1. Create Libraries First
Before creating playlists, make sure you have libraries with content:
1. Go to **Library** (📚)
2. Create libraries with words or sentences
3. Add at least a few words to each library

### 2. Access Playlist Manager
Tap **播放列表** (🎵) in the bottom navigation bar.

### 3. Add Your First Library
1. Tap **➕ Add Library**
2. Select a library from your collection
3. The library is added with default settings:
   - 1 loop at 1.0x speed
   - 80% volume
   - 0 pitch shift
   - 2000ms gap between loops

### 4. Configure Loops
1. Tap the **✏️** icon on any playlist item
2. Tap **➕ Add Loop** to add more repetitions
3. For each loop, configure:
   - **Speed**: 0.5x - 3.0x (capped at 1.2x in sleep mode)
   - **Volume**: 0-100%
   - **Pitch**: -12 to +12 semitones

### 5. Use Quick Presets
Save time with preset configurations:
- **🏃 Fast → Slow**: 1.5x → 1.2x → 1.0x (learning pattern)
- **🚀 Slow → Fast**: 1.0x → 1.5x → 2.0x (challenge pattern)
- **🌙 Sleep Mode**: 1.0x → 0.9x with volume/pitch decay

### 6. Enable Sleep Mode (Optional)
Toggle **🌙 Sleep Mode** for automatic optimization:
- Speeds are capped at 1.2x
- Pitch automatically decreases by -2 semitones per library
- Volume decays progressively
- Perfect for nighttime learning

### 7. Adjust Gap Between Loops
Use the slider to set pause duration between loop repetitions (0-10 seconds).

### 8. Reorder Libraries
Drag libraries using the **⋮⋮** handle to reorder your sequence.

### 9. Play Your Playlist
Tap **▶️ Play Playlist** to start the sequence.

---

## Playlist Player

### Controls
- **▶️ Start**: Begin playlist from the first library
- **⏸️ Pause**: Pause at current position
- **▶️ Resume**: Continue from paused position
- **⏹️ Stop**: Stop and reset to beginning
- **← Back**: Return to playlist manager

### Progress Display
The player shows:
- **Library Progress**: Current library number (e.g., 2/5)
- **Loop Progress**: Current loop number (e.g., 1/3)
- **Elapsed Time**: Total time since start
- **Word Progress**: Current word and progress bar
- **Queue**: Visual list of all libraries

### Visual Feedback
- **Active library**: Highlighted in green with ▶️ icon
- **Completed libraries**: Greyed out with ✓ checkmark
- **Sleep mode indicator**: 🌙 badge on sleep-optimized libraries

---

## Use Cases

### 1. Progressive Learning (Fast → Slow)
**Goal**: Start with challenge, end with consolidation
```
Library: Vocabulary Basics
Loop 1: 1.5x - Rapid exposure
Loop 2: 1.2x - Moderate review
Loop 3: 1.0x - Deep learning
```

### 2. Bedtime Learning Sequence
**Goal**: Multi-hour nighttime practice
```
Library 1: New Vocabulary (30 min)
  - Loop 1: 1.0x, vol 80%, pitch 0
  - Loop 2: 1.0x, vol 80%, pitch 0
  🌙 Sleep Mode: ON

Library 2: Affirmations (20 min)
  - Loop 1: 0.9x, vol 70%, pitch -2
  🌙 Sleep Mode: ON

Library 3: Gentle Review (10 min)
  - Loop 1: 0.8x, vol 50%, pitch -5
  🌙 Sleep Mode: ON
```

**Result**: 
- Total duration: ~60 minutes
- Progressive relaxation
- Automatic volume/pitch decay
- Gentle transition to sleep

### 3. Intensive Review Session
**Goal**: High-speed repetition for memorization
```
Library: Exam Vocabulary
Loop 1: 1.0x - First exposure
Loop 2: 1.5x - Speed challenge
Loop 3: 2.0x - Maximum speed
Loop 4: 1.0x - Consolidation
```

### 4. Multi-Topic Learning
**Goal**: Cover multiple subjects in one session
```
Library 1: Clothing Spelling (5 min)
Library 2: Food Vocabulary (5 min)
Library 3: Action Verbs (5 min)
Library 4: Positive Affirmations (3 min)
```

**Result**: 18 minutes of varied learning content

---

## Advanced Tips

### Optimization for Sleep Learning

1. **Use Progressive Speed Reduction**
   ```
   Library 1: 1.2x → 1.0x → 0.9x
   Library 2: 1.0x → 0.9x → 0.8x
   Library 3: 0.9x → 0.8x → 0.7x
   ```

2. **Enable Sleep Mode on Later Libraries**
   - First library: Sleep Mode OFF (full attention)
   - Middle libraries: Sleep Mode ON (transition)
   - Last libraries: Sleep Mode ON (deep relaxation)

3. **Increase Gaps Progressively**
   - Library 1: 2000ms gaps
   - Library 2: 3000ms gaps
   - Library 3: 5000ms gaps

### Custom Speed Curves

**The "Slowing Down" Effect** (Recommended for children):
```
Loop 1: 1.2x - Still awake, brain active
Loop 2: 1.0x - Getting sleepy
Loop 3: 0.8x - Drifting off
```

**The "Challenge Ramp"** (For advanced learners):
```
Loop 1: 1.0x - Baseline
Loop 2: 1.5x - Moderate challenge
Loop 3: 2.0x - High challenge
Loop 4: 2.5x - Maximum challenge
Loop 5: 1.0x - Cool down
```

### Optimal Gap Settings

- **Active learning**: 1000-2000ms (keeps engagement)
- **Relaxed learning**: 3000-5000ms (allows processing)
- **Sleep learning**: 5000-10000ms (deep processing)

---

## Technical Details

### Storage
Playlists are saved to localStorage as `SPEEDY_READ_NIGHTLY_FLOW`.

### Data Structure
```javascript
{
  id: "playlist-...",
  libraryId: "lib-123",
  name: "Vocabulary Basics",
  loops: [
    { speed: 1.5, volume: 80, pitch: 0 },
    { speed: 1.2, volume: 80, pitch: 0 },
    { speed: 1.0, volume: 80, pitch: 0 }
  ],
  gapBetweenLoops: 2000,
  sleepMode: false
}
```

### Sleep Mode Processing

When Sleep Mode is enabled:

1. **Speed Cap**:
   ```javascript
   if (speed > 1.2) speed = 1.2;
   ```

2. **Auto Pitch Shift**:
   ```javascript
   libraryPitchShift = libraryIndex * -2;
   loopPitchShift = loopIndex * -0.5;
   finalPitch = originalPitch + libraryPitchShift + loopPitchShift;
   // Capped at -12 semitones
   ```

3. **Volume Decay**:
   ```javascript
   decayFactor = 1 - (libraryIndex / totalLibraries) * 0.5;
   finalVolume = originalVolume * decayFactor;
   ```

### Playback Engine

The playlist runner uses async/await:
```javascript
for (const library of playlist) {
  for (const loop of library.loops) {
    await playWords(loop.speed, loop.volume, loop.pitch);
    await delay(library.gapBetweenLoops);
  }
  await delay(10000); // Gap between libraries
}
```

---

## Troubleshooting

### Playlist Won't Play
- **Cause**: No libraries in playlist
- **Solution**: Add at least one library

### No Sound During Playback
- **Cause**: Library has no words
- **Solution**: Add words to your libraries first

### Sleep Mode Not Working
- **Cause**: Sleep mode only affects later loops
- **Solution**: Add multiple loops to see the effect

### Drag & Drop Not Working
- **Cause**: Trying to drag while editing
- **Solution**: Close the editor (tap ✏️) before dragging

### Duration Estimate Seems Wrong
- **Cause**: Estimation assumes 20 words per library
- **Solution**: This is just an estimate, actual time varies

---

## FAQ

**Q: Can I export my playlist?**  
A: Currently playlists are saved locally. Export/import feature coming soon.

**Q: What's the maximum number of libraries?**  
A: No hard limit, but 5-10 libraries is recommended for management.

**Q: Can I skip to a specific library?**  
A: Not yet. Stop and restart to begin from the first library.

**Q: Does sleep mode really help learning?**  
A: Research shows passive exposure during sleep can reinforce memory, especially for children.

**Q: Can I use this while the app is in background?**  
A: iOS limitations prevent background audio in PWAs. Keep app in foreground.

**Q: How do I delete a playlist?**  
A: Remove all libraries individually, or clear browser data.

---

## Best Practices

1. **Start Simple**: Begin with 2-3 libraries and basic speed loops
2. **Test Before Sleep**: Play through once during the day to verify
3. **Use Consistent Patterns**: Children benefit from predictable structures
4. **Monitor Volume**: Ensure it's comfortable but audible
5. **Combine with Routine**: Play at same time each night for best results

---

## Next Steps

1. Create your first playlist
2. Test with a short sequence during the day
3. Refine based on feedback
4. Use for regular bedtime learning

Happy learning! 🎵✨
