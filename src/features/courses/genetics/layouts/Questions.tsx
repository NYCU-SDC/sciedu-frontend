import "./Questions.css";
import type { QuestionsType } from "../types/types";
import { Button, TextArea } from "@radix-ui/themes";
import { type JSX } from "react";

export function Questions({
    data,
    onNext,
}: {
    data: QuestionsType;
    onNext: () => void;
}): JSX.Element {
    return (
        <div className="page-container">
            <main className="content-wrapper">
                {/* left side*/}
                <section className="column">
                    <div className="column-header">
                        <h2>{data.content.label[0]}：</h2>
                    </div>

                    <div className="question-card">
                        <h3 className="question-title">問題 1-1</h3>
                        <p className="question-text">
                            {data.content.questions.questions[0][0]}
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
                            {data.content.questions.questions[0][1]}
                        </p>
                        <TextArea
                            className="answer-space"
                            placeholder="在此輸入答案..."
                            variant="classic"
                            style={{ width: "100%", minHeight: "100px" }}
                        />
                    </div>
                </section>

                {/*right side */}
                <section className="column">
                    <div className="column-header">
                        <h2>{data.content.label[1]}：</h2>
                    </div>

                    <div className="question-card">
                        <h3 className="question-title">問題 2-1</h3>
                        <p className="question-text">
                            {data.content.questions.questions[1][0]}
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
                            {data.content.questions.questions[1][1]}
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

            {/* button area */}
            <footer className="footer-actions">
                <Button
                    className="shadow-button"
                    variant="solid"
                    highContrast
                    onClick={onNext}
                    radius="full"
                >
                    送出 Send
                </Button>
                <Button
                    className="shadow-button"
                    variant="solid"
                    highContrast
                    onClick={onNext}
                    radius="full"
                >
                    下一頁
                </Button>
            </footer>
        </div>
    );
}

export default Questions;
