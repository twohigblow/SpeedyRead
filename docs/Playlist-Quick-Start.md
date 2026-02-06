# Dynamic Playlist Engine - Quick Start

## What You Created

A powerful multi-library playlist system with:
- ✅ **Multi-library sequencing**: Queue multiple libraries
- ✅ **Per-loop speed control**: Different speed for each repeat
- ✅ **Sleep mode optimization**: Auto pitch/volume decay
- ✅ **Drag & drop reordering**: Easy playlist management
- ✅ **Visual player**: Real-time progress tracking

---

## Files Created

### Core Service
- **`/src/services/playlist.js`** (450 lines)
  - Playlist CRUD operations
  - Playback engine with async/await
  - Sleep mode audio processing
  - Duration estimation

### UI Components
- **`/src/components/LoopConfigurator.jsx`** (350 lines)
  - Speed/volume/pitch controls
  - Sleep mode visualization
  - Quick presets
  - Expandable interface

### Pages
- **`/src/pages/Playlist.jsx`** (400 lines)
  - Playlist manager
  - Library selection dialog
  - Drag & drop reordering
  - Loop configuration

- **`/src/pages/PlaylistPlayer.jsx`** (300 lines)
  - Full-screen player
  - Progress tracking
  - Queue visualization
  - Playback controls

### Integration
- **Updated `App.jsx`**: Added routes
- **Updated `BottomNav.jsx`**: Added playlist nav item

---

## Quick Test

### 1. Start Dev Server
```bash
cd /Users/laguna/Documents/Antigravity/SpeedyRead
npm run dev
```

### 2. Navigate to Playlist
Visit: `http://localhost:5173/playlist`

### 3. Create a Test Playlist

**Step 1**: Add a library
- Tap **➕ Add Library**
- Select any library from your collection

**Step 2**: Configure loops
- Tap **✏️** on the library
- Tap **➕ Add Loop** twice (total 3 loops)
- Set speeds: 1.5x, 1.2x, 1.0x

**Step 3**: Enable sleep mode (optional)
- Toggle **🌙 Sleep Mode**
- Notice the sleep preview showing adjusted values

**Step 4**: Play
- Tap **▶️ Play Playlist**
- Watch the player interface

---

## Example Playlists

### Example 1: Simple Learning Sequence
```javascript
Library: "Basic Vocabulary"
Loops: 
  - 1.0x (normal speed)
  - 1.5x (challenge)
  - 1.0x (consolidation)
Gap: 2000ms
```

### Example 2: Bedtime Learning
```javascript
Library 1: "New Words"
  Loops: [1.2x, 1.0x, 0.9x]
  Gap: 2000ms
  Sleep Mode: ON

Library 2: "Review"
  Loops: [1.0x, 0.8x]
  Gap: 3000ms
  Sleep Mode: ON

Library 3: "Affirmations"
  Loops: [0.8x]
  Gap: 5000ms
  Sleep Mode: ON
```

**Result**: Progressive relaxation with auto pitch/volume decay

---

## Key Code Patterns

### Creating a Playlist Item
```javascript
import { createPlaylistItem, addToPlaylist } from '../services/playlist';

const item = createPlaylistItem(libraryId, libraryName, {
    loops: [
        { speed: 1.5, volume: 80, pitch: 0 },
        { speed: 1.2, volume: 80, pitch: 0 }
    ],
    gapBetweenLoops: 2000,
    sleepMode: true
});

addToPlaylist(item);
```

### Running a Playlist
```javascript
import { runPlaylist } from '../services/playlist';

await runPlaylist(playlist, {
    onItemStart: (index, item) => {
        console.log(`Starting: ${item.name}`);
    },
    onProgress: (itemIdx, loopIdx, wordIdx, total) => {
        console.log(`Progress: ${wordIdx}/${total}`);
    },
    onEnd: () => {
        console.log('Playlist complete!');
    }
});
```

### Applying Sleep Mode
```javascript
// Automatic in playback engine
if (item.sleepMode) {
    // Speed cap
    if (loop.speed > 1.2) loop.speed = 1.2;
    
    // Pitch shift
    loop.pitch += itemIndex * -2;
    
    // Volume decay
    loop.volume *= (1 - itemIndex / totalItems * 0.5);
}
```

---

## Integration Points

### 1. TTS Engine
The playlist uses your existing TTS system:
```javascript
import { playTTSAtSpeed } from './tts-cache.js';

await playTTSAtSpeed(text, loop.speed, {
    volume: loop.volume / 100,
    pitch: loop.pitch
});
```

### 2. Database
Libraries are fetched from your existing database:
```javascript
import { getAllLibraries, getWordsFromLibrary } from './db.js';
```

### 3. Navigation
Bottom nav now includes playlist:
```javascript
{ to: '/playlist', icon: '🎵', label: '播放列表' }
```

---

## Testing Checklist

- [ ] Can add libraries to playlist
- [ ] Can configure loops (speed/volume/pitch)
- [ ] Can drag & drop to reorder
- [ ] Can toggle sleep mode
- [ ] Can adjust gap between loops
- [ ] Can remove libraries
- [ ] Can play playlist
- [ ] Player shows correct progress
- [ ] Can pause/resume/stop
- [ ] Sleep mode affects audio (pitch/volume)
- [ ] Quick presets work
- [ ] Playlist persists after refresh

---

## Troubleshooting

### Import Errors
If you see import errors, make sure:
```javascript
// In playlist.js
import { playTTSAtSpeed } from './tts-cache.js';  // ✅ Has .js extension
import { getAllLibraries } from './db.js';         // ✅ Has .js extension
```

### No Libraries Available
Create libraries first:
1. Go to Library page
2. Create a new library
3. Add words to it
4. Then go to Playlist page

### Player Doesn't Start
Check console for errors. Make sure:
- Libraries have words
- TTS is initialized
- AudioContext is unlocked

---

## Customization Ideas

### 1. Add Voice Selection
```javascript
// In playlist service
{
    loops: [
        { speed: 1.0, volume: 80, pitch: 0, voice: 'zh-HK-Standard-A' }
    ]
}
```

### 2. Add Background Music
```javascript
// Play ambient music during gaps
await delay(gapBetweenLoops, { playAmbient: true });
```

### 3. Add Progress Notifications
```javascript
// In PlaylistPlayer.jsx
onItemEnd: (index, item) => {
    if (index === playlist.length - 1) {
        new Notification('Playlist Complete!');
    }
}
```

### 4. Export/Import Playlists
```javascript
import { exportPlaylist, importPlaylist } from '../services/playlist';

// Export
const json = exportPlaylist(playlist);
downloadAsFile(json, 'my-playlist.json');

// Import
const playlist = importPlaylist(jsonString);
```

---

## Performance Notes

### Memory Usage
- Each playlist item: ~500 bytes
- 10 libraries: ~5 KB
- Negligible memory footprint

### Playback Efficiency
- Uses async/await (non-blocking)
- No setTimeout accumulation
- Clean cleanup on stop

### Storage
- LocalStorage: ~5 KB per 10 playlists
- No IndexedDB usage
- Instant load/save

---

## Next Features (Ideas)

1. **Shuffle mode**: Randomize library order
2. **Repeat mode**: Loop entire playlist
3. **Smart scheduling**: Play at specific times
4. **Analytics**: Track completion rates
5. **Cloud sync**: Share playlists across devices
6. **Templates**: Pre-made playlist templates
7. **Voice selection**: Per-loop voice choice
8. **Background music**: Ambient tracks during gaps

---

## API Reference

### Playlist Service Functions

```javascript
// CRUD
createPlaylistItem(libraryId, name, options)
loadPlaylist() → Array
savePlaylist(playlist)
addToPlaylist(item)
removeFromPlaylist(itemId)
updatePlaylistItem(itemId, updates)
reorderPlaylist(fromIndex, toIndex)
clearPlaylist()

// Playback
runPlaylist(playlist, callbacks) → Promise
stopPlaylist()
pausePlaylist()
resumePlaylist()
getPlaybackState() → Object

// Utilities
previewLoop(libraryId, loop, callbacks) → Promise
estimatePlaylistDuration(playlist) → Number
formatDuration(ms) → String
exportPlaylist(playlist) → String
importPlaylist(jsonString) → Array
```

---

## Support

For issues or questions:
1. Check the User Guide: `/docs/Dynamic-Playlist-Guide.md`
2. Review code comments in `/src/services/playlist.js`
3. Test with simple playlists first
4. Check browser console for errors

---

## Deployment

### Build for Production
```bash
npm run build
```

### Deploy to Vercel
```bash
git add .
git commit -m "Add Dynamic Playlist Engine"
git push
```

### Test on Mobile
1. Deploy to Vercel
2. Open on iPhone/iPad
3. Create test playlist
4. Play and verify audio works

---

**You're all set! 🎵**

Start by creating a simple 2-library playlist with 2-3 loops each, then expand from there.
