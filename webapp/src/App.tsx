import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import Navigation from '@components/Navigation'
import Register from '@pages/Register'
import MyNames from '@pages/MyNames'
import AllNames from '@pages/AllNames'
import './App.css'
import "@thenamespace/ens-components/index.css";

function App() {
  return (
    <Router>
      <div className="bg-taupe-100">
        <Navigation />
        <Routes>
          <Route path="/" element={<Register />} />
          <Route path="/my-names" element={<MyNames />} />
          <Route path="/all-names" element={<AllNames />} />
        </Routes>
      </div>
    </Router>
  )
}

export default App
