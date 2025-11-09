import './Footer.css'
import Text from './Text'
import Button from './Button'

function Footer() {
  return (
    <footer className="footer">
      <div className="footer-content">
        <Button
          variant="secondary"
          onClick={() => window.open('https://t.me/+ws37-CaE6zI5YjM6', '_blank', 'noopener,noreferrer')}
          className="feedback-button"
        >
          <Text size="base" weight="medium" color="black">
            Feedback or Bug Report?
          </Text>
        </Button>
      </div>
    </footer>
  )
}

export default Footer

