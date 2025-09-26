import Text from '../components/Text'
import './Page.css'

function Register() {
  return (
    <div className="page">
      <div className="page-content">
        <Text as="h1" size="4xl" weight="semibold" color="black">
          Register Username
        </Text>
        <Text size="xl" weight="normal" color="black">
          Register your unique username on Celo network
        </Text>
        <div className="placeholder-content">
          <Text size="base" weight="normal" color="gray">
            Registration form will be implemented here
          </Text>
        </div>
      </div>
    </div>
  )
}

export default Register
