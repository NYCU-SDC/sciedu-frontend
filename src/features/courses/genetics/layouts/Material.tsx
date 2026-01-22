import "./Material.css";
import { type JSX } from "react";
import { Button } from "@radix-ui/themes";
import { TextArea } from "@radix-ui/themes";
import type { MaterialType } from "../types/types";

export function Material({
    data,
    onNext,
}: {
    data: MaterialType;
    onNext: () => void;
}): JSX.Element {
    return (
        <div className="page-container">
            <main className="overview-content">
                {/* left section */}
                <section className="course-section">
                    <div className="image-container">
                        <img
                            src={data.content.image}
                            alt="教材"
                            className="pea-main-image"
                        />
                    </div>

                    <div className="course-description">
                        <p>{data.content.description}</p>
                    </div>
                </section>

                {/* right sidebar */}
                <aside className="question-sidebar">
                    <div className="sidebar-header">
                        <span>請根據左圖回答下列問題：</span>
                    </div>

                    <div className="quiz-card">
                        <label className="quiz-label">
                            {data.content.questions.label[0]}
                        </label>
                        <p>{data.content.questions.questions[0]}</p>
                        <div className="radio-group type-small">
                            <label>
                                <input type="radio" name="q1" />{" "}
                                {data.content.questions.options[0][0]}
                            </label>
                            <label>
                                <input type="radio" name="q1" />{" "}
                                {data.content.questions.options[0][1]}
                            </label>
                        </div>
                    </div>

                    <div className="quiz-card quiz-card-2">
                        <label className="quiz-label">
                            {data.content.questions.label[1]}
                        </label>
                        <p>{data.content.questions.questions[1]}</p>
                        <div className="radio-group type-large">
                            <label>
                                <input type="radio" name="q2" />{" "}
                                {data.content.questions.options[1][0]}
                            </label>
                            <label>
                                <input type="radio" name="q2" />{" "}
                                {data.content.questions.options[1][1]}
                            </label>
                        </div>
                    </div>

                    <div className="quiz-card type-large">
                        <label className="quiz-label">
                            {data.content.questions.label[2]}
                        </label>
                        <p>{data.content.questions.questions[2]}</p>
                        <TextArea
                            placeholder="在此輸入答案..."
                            variant="classic"
                            color="indigo"
                        />
                    </div>

                    <footer className="sidebar-footer">
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
                </aside>
            </main>
        </div>
    );
}

export default Material;
