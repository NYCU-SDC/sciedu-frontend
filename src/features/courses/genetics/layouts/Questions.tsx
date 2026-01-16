import "./Questions.css";
import type { CourseContent } from "../types/types";
import { Button, TextArea } from "@radix-ui/themes";
import { type JSX } from "react";

export function Questions({ onNext }: { onNext: () => void }): JSX.Element {
    const tableData: CourseContent[] = [
        {
            type: "Questions",
            content: {
                questions: ["請說明在古典遺傳學，顯性和隱性基因的意義。"],
            },
        },
        {
            type: "Questions",
            content: {
                questions: [
                    "在古典遺傳學，當同時具有一個顯性基因和一個隱性基因時，其表現型為何，請說明原因？",
                ],
            },
        },
        {
            type: "Questions",
            content: {
                questions: ["在分子遺傳學，是否強調顯性和隱性基因？理由？"],
            },
        },
        {
            type: "Questions",
            content: {
                questions: [
                    "在分子遺傳學，當同源染色體上的等位基因不同時，表現型會受什麼因素影響？與古典遺傳學不同點為何？",
                ],
            },
        },
    ];

    return (
        <div className="page-container">
            <main className="content-wrapper">
                {/* 左側 */}
                <section className="column">
                    <div className="column-header">
                        <h2>古典遺傳學：</h2>
                    </div>

                    <div className="question-card">
                        <h3 className="question-title">問題 1-1</h3>
                        <p className="question-text">
                            {tableData[0].type === "Questions" &&
                                tableData[0].content.questions[0]}
                        </p>
                        <TextArea
                            className="answer-space"
                            placeholder="在此輸入答案..."
                            variant="classic"
                            style={{ width: "100%", minHeight: "100px" }}
                        />
                    </div>

                    <div className="question-card">
                        <h3 className="question-title">問題 1-2</h3>
                        <p className="question-text">
                            {tableData[1].type === "Questions" &&
                                tableData[1].content.questions[0]}
                        </p>
                        <TextArea
                            className="answer-space"
                            placeholder="在此輸入答案..."
                            variant="classic"
                            style={{ width: "100%", minHeight: "100px" }}
                        />
                    </div>
                </section>

                {/* 右側 */}
                <section className="column">
                    <div className="column-header">
                        <h2>分子遺傳學：</h2>
                    </div>

                    <div className="question-card">
                        <h3 className="question-title">問題 2-1</h3>
                        <p className="question-text">
                            {tableData[2].type === "Questions" &&
                                tableData[2].content.questions[0]}
                        </p>
                        <TextArea
                            className="answer-space"
                            placeholder="在此輸入答案..."
                            variant="classic"
                            style={{ width: "100%", minHeight: "100px" }}
                        />
                    </div>

                    <div className="question-card">
                        <h3 className="question-title">問題 2-2</h3>
                        <p className="question-text">
                            {tableData[3].type === "Questions" &&
                                tableData[3].content.questions[0]}
                        </p>
                        <TextArea
                            className="answer-space"
                            placeholder="在此輸入答案..."
                            variant="classic"
                            style={{ width: "100%", minHeight: "100px" }}
                        />
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
}

export default Questions;
