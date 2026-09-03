import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Home from './pages/Home';
import Login from './pages/Login';
import Signup from './pages/Signup';
import Dashboard from './pages/Dashboard';
import FarmCreate from './pages/FarmCreate';
import Studio from './pages/Studio';
import PlanEditor from './pages/PlanEditor';
import MapTest from './pages/MapTest';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/farms/new" element={<FarmCreate />} />
        <Route path="/studio" element={<Studio />} />
        <Route path="/studio/:farmId" element={<Studio />} />
        <Route path="/studio/:farmId/plan/:planId" element={<PlanEditor />} />
        <Route path="/maptest" element={<MapTest />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
