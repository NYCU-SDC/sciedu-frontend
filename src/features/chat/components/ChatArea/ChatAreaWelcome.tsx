import styles from "./ChatAreaWelcome.module.css";

export default function WelcomeScreen() {
    return (
        <div className={styles.container}>
            <div className={styles.content}>
                <h1 className={styles.heading}>您好，歡迎回來</h1>
            </div>
        </div>
    );
}
