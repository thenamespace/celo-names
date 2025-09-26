import { useSwitchChain } from 'wagmi'
import { celo, celoAlfajores, mainnet } from 'wagmi/chains'

const chains = [
  { id: celo.id, name: 'Celo Mainnet', symbol: 'CELO' },
  { id: celoAlfajores.id, name: 'Celo Alfajores', symbol: 'CELO' },
  { id: mainnet.id, name: 'Ethereum Mainnet', symbol: 'ETH' },
]

export default function ChainSwitcher() {
  const { switchChain } = useSwitchChain()

  return (
    <div className="chain-switcher">
      <h4>Switch Network:</h4>
      <div className="chain-buttons">
        {chains.map((chain) => (
          <button
            key={chain.id}
            onClick={() => switchChain({ chainId: chain.id })}
            className="chain-button"
          >
            {chain.name}
          </button>
        ))}
      </div>
    </div>
  )
}
