import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import { ToastContainer } from 'react-toastify'
import Navigation from '@components/Navigation'
import Register from '@pages/Register'
import MyNames from '@pages/MyNames'
import AllNames from '@pages/AllNames'
import './App.css'
import 'react-toastify/dist/ReactToastify.css'
import '@components/Toast.css'
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
        <ToastContainer
          position="top-right"
          autoClose={5000}
          hideProgressBar={false}
          newestOnTop={false}
          closeOnClick
          rtl={false}
          pauseOnFocusLoss
          draggable
          pauseOnHover
          aria-label="Notification messages"
        />
      </div>
    </Router>
  )
}

export default App
