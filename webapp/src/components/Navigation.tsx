import { Link, useLocation } from 'react-router-dom'
import { ConnectButton } from '@rainbow-me/rainbowkit'
import './Navigation.css'
import Text from '@components/Text'
function Navigation() {
  const location = useLocation()

  return (
    <nav className="navigation">
      <div className="nav-content">
        <div className="nav-left">
          <Link to="/">
            <img src="/full-celo-logo.svg" alt="Celo Logo" className="celo-logo" />
          </Link>
        </div>
        <div className="nav-center">
          <Link 
            to="/" 
            className={`nav-link ${location.pathname === '/' ? 'active' : ''}`}
          >
            <Text 
              size="lg" 
              weight={location.pathname === '/' ? 'medium' : 'normal'} 
              color="black"
            >
              Register
            </Text>
          </Link>
          <Link 
            to="/my-names" 
            className={`nav-link ${location.pathname === '/my-names' ? 'active' : ''}`}
          >
            <Text 
              size="lg" 
              weight={location.pathname === '/my-names' ? 'medium' : 'normal'} 
              color="black"
            >
              My Names
            </Text>
          </Link>
          <Link 
            to="/all-names" 
            className={`nav-link ${location.pathname === '/all-names' ? 'active' : ''}`}
          >
            <Text 
              size="lg" 
              weight={location.pathname === '/all-names' ? 'medium' : 'normal'} 
              color="black"
            >
              All Names
            </Text>
          </Link>
        </div>
        <div className="nav-right">
          <ConnectButton />
        </div>
      </div>
    </nav>
  )
}

export default Navigation
