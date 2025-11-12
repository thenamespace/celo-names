import { CELO_AVATAR_URL } from "@/constants";
import Text from "./Text";
import Button from "./Button";
import "./ProfileSetBanner.css";

interface ProfileSetBannerProps {
  avatar?: string;
  name?: string;
  onClick: () => void;
}

export const ProfileSetBanner = ({
  avatar,
  onClick,
}: ProfileSetBannerProps) => {
  const getAvatarImage = () => {
    if (avatar && avatar.length > 0 && avatar.startsWith("http")) {
      return avatar;
    }
    return CELO_AVATAR_URL;
  };

  return (
    <div onClick={onClick} className="profile-banner-set-wrapper">
      <div className="profile-banner-content">
        <div className="profile-banner-main">
          <img
            className="banner-avatar"
            src={getAvatarImage()}
            width="50px"
            height="50px"
          ></img>
          <div className="text-align-left ms-2" style={{ textAlign: "left" }}>
            <Text weight="bold">Profile Set!</Text>
            <Text size="sm" color="gray">
              All set! Finish your registration.
            </Text>
          </div>
        </div>
        <div className="profile-banner-button">
          <Button style={{ background: "black", color: "white" }}>Edit</Button>
        </div>
      </div>
    </div>
  );
};
