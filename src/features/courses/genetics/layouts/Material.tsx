import "./Material.css";
import Navbar from "../components/Navbar";
import peaImage from "../../../../Assets/A1.avif";
import { Button } from "@radix-ui/themes";

interface MaterialProps {
    onNext: () => void;
}

const Overview: React.FC<MaterialProps> = ({ onNext }) => {
    return (
        <div className="page-container">
            <Navbar activeStep={1} />

            <main className="overview-content">
                {/* 左側：機制圖解區 */}
                <section className="mechanism-section">
                    <div className="image-container">
                        <img
                            src={peaImage}
                            alt="教材"
                            className="pea-main-image"
                        />
                    </div>

                    <div className="mechanism-description">
                        <p>
                            古典遺傳學強調基因型可直接決定表現型，基因在古典遺傳是一個抽象概念。認為顯性基因會表現在個體表徵，若一個體中顯性和隱性基因同時存在，則此隱性基因不會表現。豌豆種皮由一對基因控制，R代表顯性基因，r代表隱性基因。若豌豆具有R基因，則種皮形狀為平滑；若控制豌豆種皮形狀的一對基因均為r，則種皮形狀為皺皮。若R和r同時存在，則隱性性狀不會表現，只有顯性性狀會表現，種皮呈現平滑。
                        </p>
                    </div>
                </section>

                {/* 右側：問題互動區 */}
                <aside className="question-sidebar">
                    <div className="sidebar-header">
                        <span>📝 請根據左圖回答下列問題：</span>
                    </div>

                    <div className="quiz-card">
                        <label className="quiz-label">基因</label>
                        <p>控制豌豆種皮形狀的基因為何？</p>
                        <div className="radio-group type-small">
                            <label>
                                <input type="radio" name="q1" /> R
                            </label>
                            <label>
                                <input type="radio" name="q1" /> r
                            </label>
                        </div>
                    </div>

                    <div className="quiz-card quiz-card-2">
                        <label className="quiz-label">表徵</label>
                        <p>豌豆RR種皮形狀表徵為何？</p>
                        <div className="radio-group type-large">
                            <label>
                                <input type="radio" name="q2" /> 平滑
                            </label>
                            <label>
                                <input type="radio" name="q2" /> 皺皮
                            </label>
                        </div>
                    </div>

                    <div className="quiz-card type-large">
                        <label className="quiz-label">機制</label>
                        <p>R和r基因如何影響豌豆種皮形狀？</p>
                    </div>

                    <footer className="sidebar-footer">
                        <Button
                            className="shadow-button"
                            variant="solid"
                            highContrast
                            onClick={onNext}
                            style={{
                                cursor: "pointer",
                                backgroundColor: "#79c5bc",
                                width: "100%",
                                height: "2.1875rem",
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
                                width: "100%",
                                height: "2.1875rem",
                            }}
                            radius="full"
                        >
                            下一頁
                        </Button>
                    </footer>
                </aside>
            </main>
        </div>
    );
};

export default Overview;
