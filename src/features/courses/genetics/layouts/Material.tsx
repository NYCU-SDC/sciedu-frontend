import "./Material.css";
import { type JSX } from "react";
import peaImage from "../../../../Assets/A1.avif";
import type { CourseContent } from "../types/types";
import { Button } from "@radix-ui/themes";
import { TextArea } from "@radix-ui/themes";

export function Material({ onNext }: { onNext: () => void }): JSX.Element {
    const QuestionData: CourseContent[] = [
        {
            type: "Material",
            content: {
                description:
                    "古典遺傳學強調基因型可直接決定表現型，基因在古典遺傳是一個抽象概念。認為顯性基因會表現在個體表徵，若一個體中顯性和隱性基因同時存在，則此隱性基因不會表現。豌豆種皮由一對基因控制，R代表顯性基因，r代表隱性基因。若豌豆具有R基因，則種皮形狀為平滑；若控制豌豆種皮形狀的一對基因均為r，則種皮形狀為皺皮。若R和r同時存在，則隱性性狀不會表現，只有顯性性狀會表現，種皮呈現平滑。",
                questions: [
                    "控制豌豆種皮形狀的基因為何？",
                    "豌豆RR種皮形狀表徵為何？",
                    "R和r基因如何影響豌豆種皮形狀？",
                ],
            },
        },
    ];

    return (
        <div className="page-container">
            <main className="overview-content">
                {/* 左側：機制圖解區 */}
                <section className="course-section">
                    <div className="image-container">
                        <img
                            src={peaImage}
                            alt="教材"
                            className="pea-main-image"
                        />
                    </div>

                    <div className="course-description">
                        <p>
                            {QuestionData[0].type === "Material" &&
                                QuestionData[0].content.description}
                        </p>
                    </div>
                </section>

                {/* 右側：問題互動區 */}
                <aside className="question-sidebar">
                    <div className="sidebar-header">
                        <span>請根據左圖回答下列問題：</span>
                    </div>

                    <div className="quiz-card">
                        <label className="quiz-label">基因</label>
                        <p>
                            {QuestionData[0].type === "Material" &&
                                QuestionData[0].content.questions[0]}
                        </p>
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
                        <p>
                            {QuestionData[0].type === "Material" &&
                                QuestionData[0].content.questions[1]}
                        </p>
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
                        <p>
                            {QuestionData[0].type === "Material" &&
                                QuestionData[0].content.questions[2]}
                        </p>
                        <TextArea
                            placeholder="在此輸入答案..."
                            variant="classic" // 'classic', 'surface', 'outline'
                            color="indigo"
                        />
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
}

export default Material;
