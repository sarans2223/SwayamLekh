import { Routes, Route } from 'react-router-dom';
import { StudentProvider } from './context/StudentContext';
import { ExamProvider } from './context/ExamContext';
import { VoiceProvider } from './context/VoiceContext';

import LoginPage from './pages/LoginPage';
import InstructionsPage from './pages/InstructionsPage';
import ExamPage from './pages/ExamPage';
import FinishPage from './pages/FinishPage';

function App() {
  return (
    <StudentProvider>
      <ExamProvider>
        <VoiceProvider>
          <Routes>
            <Route path="/" element={<LoginPage />} />
            <Route path="/instructions" element={<InstructionsPage />} />
            <Route path="/exam" element={<ExamPage />} />
            <Route path="/finish" element={<FinishPage />} />
          </Routes>
        </VoiceProvider>
      </ExamProvider>
    </StudentProvider>
  );
}

export default App;