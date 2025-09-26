import Text from '../components/Text'
import './Page.css'

function AllNames() {
  return (
    <div className="page">
      <div className="page-content">
        <Text as="h1" size="4xl" weight="semibold" color="black">
          All Names
        </Text>
        <Text size="xl" weight="normal" color="black">
          Browse all registered usernames on Celo
        </Text>
        <div className="placeholder-content">
          <Text size="base" weight="normal" color="gray">
            Directory of all registered names will be shown here
          </Text>
        </div>
      </div>
    </div>
  )
}

export default AllNames
