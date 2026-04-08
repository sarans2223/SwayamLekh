import { Routes, Route } from 'react-router-dom';
import { StudentProvider } from './context/StudentContext';
import { ExamProvider } from './context/ExamContext';
import { VoiceProvider } from './context/VoiceContext';

import LoginPage from './pages/LoginPage';
import InstructionsPage from './pages/InstructionsPage';
import ExamPage from './pages/ExamPage';
import FinishPage from './pages/FinishPage';
import VoiceSetupPage from './pages/VoiceSetupPage';
import MathsExamQuickPage from './pages/MathsExamQuickPage';
<<<<<<< HEAD
import ChemistryExamQuickPage from './pages/ChemistryExamQuickPage';
import MathScribeDemo from './pages/MathScribeDemo';
=======
import ProctorDashboard from './pages/ProctorDashboard';
>>>>>>> upstream

function App() {
  return (
    <StudentProvider>
      <ExamProvider>
        <VoiceProvider>
          <Routes>
            <Route path="/" element={<LoginPage />} />
            <Route path="/instructions" element={<InstructionsPage />} />
            <Route path="/voice-setup" element={<VoiceSetupPage />} />
            <Route path="/exam" element={<ExamPage />} />
            <Route path="/exam-maths" element={<MathsExamQuickPage />} />
<<<<<<< HEAD
            <Route path="/exam-chemistry" element={<ChemistryExamQuickPage />} />
            <Route path="/math-scribe" element={<MathScribeDemo />} />
=======
            <Route path="/proctor" element={<ProctorDashboard />} />
>>>>>>> upstream
            <Route path="/finish" element={<FinishPage />} />
          </Routes>
        </VoiceProvider>
      </ExamProvider>
    </StudentProvider>
  );
}

export default App;