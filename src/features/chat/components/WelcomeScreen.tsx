import { ChatInput } from "./ChatInput";
import "./WelcomeScreen.css";

interface WelcomeScreenProps {
    onSend: (message: string) => void;
}

export function WelcomeScreen({ onSend }: WelcomeScreenProps) {
    return (
        <div className="welcome-screen-container">
            <div className="welcome-screen-content">
                <h1 className="welcome-heading">您好，歡迎回來</h1>
            </div>

            <div className="welcome-screen-input">
                <ChatInput onSend={onSend} />
            </div>
        </div>
    );
}
