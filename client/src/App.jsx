import { BrowserRouter, Routes, Route } from 'react-router-dom';
import DonationPage from './pages/DonationPage';
import './App.css';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<DonationPage />} />
        <Route path="/donation" element={<DonationPage />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
