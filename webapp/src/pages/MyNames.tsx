import Text from '../components/Text'
import './Page.css'

function MyNames() {
  return (
    <div className="page">
      <div className="page-content">
        <Text as="h1" size="4xl" weight="semibold" color="black">
          My Names
        </Text>
        <Text size="xl" weight="normal" color="black">
          View and manage your registered usernames
        </Text>
        <div className="placeholder-content">
          <Text size="base" weight="normal" color="gray">
            Your registered names will be displayed here
          </Text>
        </div>
      </div>
    </div>
  )
}

export default MyNames
