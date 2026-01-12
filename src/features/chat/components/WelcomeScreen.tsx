import { Box, Heading } from "@radix-ui/themes";
import { ChatInput } from "./ChatInput";
import "./WelcomeScreen.css";

interface WelcomeScreenProps {
    onSend: (message: string) => void;
}

export function WelcomeScreen({ onSend }: WelcomeScreenProps) {
    return (
        <Box className="welcome-screen-container">
            <Heading size="7">您好，歡迎回來</Heading>
            <ChatInput onSend={onSend} />
        </Box>
    );
}
