import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import { ToastContainer } from 'react-toastify'
import Navigation from '@components/Navigation'
import RegisterNew from '@pages/RegisterNew'
import MyNames from '@pages/MyNames'
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
          <Route path="/" element={<RegisterNew />} />
          <Route path="/my-names" element={<MyNames />} />
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
