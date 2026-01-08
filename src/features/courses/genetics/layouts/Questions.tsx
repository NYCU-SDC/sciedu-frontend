import "./Questions.css";
import Navbar from "../components/Navbar";
import { Button } from "@radix-ui/themes";

interface QuestionsProps {
    onNext: () => void;
}

const Questions: React.FC<QuestionsProps> = ({ onNext }) => {
    return (
        <div className="page-container">
            <Navbar activeStep={1} />
            <main className="content-wrapper">
                {/* 左側：古典遺傳學 */}
                <section className="column">
                    <div className="column-header">
                        <span className="icon-edit">📝</span>
                        <h2>古典遺傳學：</h2>
                    </div>

                    <div className="question-card">
                        <h3 className="question-title">問題 1-1</h3>
                        <p className="question-text">
                            請說明在古典遺傳學，顯性和隱性基因的意義。
                        </p>
                        <div className="answer-space"></div>
                    </div>

                    <div className="question-card">
                        <h3 className="question-title">問題 1-2</h3>
                        <p className="question-text">
                            在古典遺傳學，當同時具有一個顯性基因和一個隱性基因時，其表現型為何，請說明原因？
                        </p>
                        <div className="answer-space"></div>
                    </div>
                </section>

                {/* 右側：分子遺傳學 */}
                <section className="column">
                    <div className="column-header">
                        <span className="icon-edit">📝</span>
                        <h2>分子遺傳學：</h2>
                    </div>

                    <div className="question-card">
                        <h3 className="question-title">問題 2-1</h3>
                        <p className="question-text">
                            在分子遺傳學，是否強調顯性和隱性基因？理由？
                        </p>
                        <div className="answer-space"></div>
                    </div>

                    <div className="question-card">
                        <h3 className="question-title">問題 2-2</h3>
                        <p className="question-text">
                            在分子遺傳學，當同源染色體上的等位基因不同時，表現型會受什麼因素影響？與古典遺傳學不同點為何？
                        </p>
                        <div className="answer-space"></div>
                    </div>
                </section>
            </main>

            {/* 右下角按鈕區 */}
            <footer className="footer-actions">
                <Button
                    className="shadow-button"
                    variant="solid"
                    highContrast
                    onClick={onNext}
                    style={{
                        cursor: "pointer",
                        backgroundColor: "#79c5bc",
                        width: "350px",
                        height: "35px",
                    }}
                    radius="full"
                >
                    送出 Send
                </Button>
                <Button
                    className="shadow-button"
                    variant="solid"
                    highContrast
                    onClick={onNext}
                    style={{
                        cursor: "pointer",
                        backgroundColor: "#79c5bc",
                        width: "350px",
                        height: "35px",
                    }}
                    radius="full"
                >
                    下一頁
                </Button>
            </footer>
        </div>
    );
};

export default Questions;
