import ChatInput from "./ChatInput";
import styles from "./WelcomeScreen.module.css";

type Props = {
    onSend: (message: string) => void;
};

export default function WelcomeScreen({ onSend }: Props) {
    return (
        <div className={styles.container}>
            <div className={styles.content}>
                <h1 className={styles.heading}>您好，歡迎回來</h1>
            </div>

            <div className={styles.input}>
                <ChatInput onSend={onSend} />
            </div>
        </div>
    );
}
