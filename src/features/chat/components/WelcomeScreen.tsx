import { Box, Heading } from "@radix-ui/themes";
import { ChatInput } from "./ChatInput";
import "./WelcomeScreen.css";

interface WelcomeScreenProps {
    userName: string;
    onSend: (message: string) => void;
}

export function WelcomeScreen({ userName, onSend }: WelcomeScreenProps) {
    return (
        <Box className="welcome-screen-container">
            <Heading size="7">{userName}，歡迎回來</Heading>
            <ChatInput onSend={onSend} />
        </Box>
    );
}
