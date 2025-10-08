import { Link, useLocation } from 'react-router-dom'
import { useConnectModal } from '@rainbow-me/rainbowkit'
import './Navigation.css'
import Text from '@components/Text'
import Button from './Button'
import ConnectedWallet from './ConnectedWallet'
import { useAccount } from 'wagmi'

function Navigation() {
  const location = useLocation()
  const {isConnected} = useAccount();
  const { openConnectModal } = useConnectModal()

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
        </div>
        <div className="nav-right">
          {!isConnected ? (
            <Button onClick={() => openConnectModal?.()}>Connect</Button>
          ) : (
            <ConnectedWallet />
          )}
        </div>
      </div>
    </nav>
  )
}

export default Navigation
