/**
 * SpeedyRead App
 * Main application with routing
 */
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import BottomNav from './components/BottomNav';
import Home from './pages/Home';
import Library from './pages/Library';
import Add from './pages/Add';
import Edit from './pages/Edit';
import Settings from './pages/Settings';
import Reader from './pages/Reader';
import { useEffect } from 'react';
import { initTTS } from './services/tts';
import { initAudioContext } from './services/audio-processor';

function App() {
  // Initialize services on app load
  useEffect(() => {
    initTTS();

    // Initialize audio context on first user interaction
    const handleInteraction = () => {
      initAudioContext();
      document.removeEventListener('click', handleInteraction);
      document.removeEventListener('touchstart', handleInteraction);
    };

    document.addEventListener('click', handleInteraction);
    document.addEventListener('touchstart', handleInteraction);

    return () => {
      document.removeEventListener('click', handleInteraction);
      document.removeEventListener('touchstart', handleInteraction);
    };
  }, []);

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/library" element={<Library />} />
        <Route path="/add" element={<Add />} />
        <Route path="/edit/:id" element={<Edit />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="/reader/:id" element={<Reader />} />
      </Routes>
      <BottomNav />
    </BrowserRouter>
  );
}

export default App;
