import { Button } from "@radix-ui/themes";
import { useState } from "react";
import type {
    CoursePageRequest,
    MaterialPage,
    QuestionResponse,
} from "../types/types";
import { useQueries, useQuery } from "@tanstack/react-query";
import styles from "./Material.module.css";
import FooterStyles from "../components/Footer.module.css";
import { api } from "../../../../shared/utils/api";
import QuizCard from "../components/QuizCard";
import CourseChat from "../components/CourseChat";
import { SkeletonMedia, SkeletonText } from "../components/CourseSkeleton";

const BASE_URL = import.meta.env.VITE_BACKEND_BASE_URL as string;

type ImageState = {
    status: "loading" | "loaded" | "error";
    url: string;
};

type Props = {
    data: CoursePageRequest;
    onNext: () => void;
};

export default function Material({ data, onNext }: Props) {
    const req = data.request as MaterialPage;

    const {
        data: description,
        isLoading: descriptionLoading,
        isError: descriptionError,
    } = useQuery({
        queryKey: ["content", "text", req.content.descriptionId],
        queryFn: () =>
            api<{ content: string }>(
                `/api/content/text/${req.content.descriptionId}`
            ),
    });

    const imageUrl = `${BASE_URL}/api/content/media/${req.content.imageId}`;
    const [imageState, setImageState] = useState<ImageState>({
        status: "loading",
        url: imageUrl,
    });
    const imageStatus =
        imageState.url === imageUrl ? imageState.status : "loading";

    const quesTitleQueries = useQueries({
        queries: req.questionSections.map((section) => ({
            queryKey: ["content", "text", section.titleId],
            queryFn: () =>
                api<{ content: string }>(
                    `/api/content/text/${section.titleId}`
                ),
        })),
    });

    const quesContentQueries = useQueries({
        queries: req.questionSections.map((section) => ({
            queryKey: ["question", section.questionId],
            queryFn: () =>
                api<QuestionResponse>(`/api/questions/${section.questionId}`),
        })),
    });

    return (
        <div className={styles.pageContainer}>
            <main className={styles.overviewContent}>
                {/* left section */}
                <section className={styles.courseSection}>
                    <div className={styles.imageContainer}>
                        {imageStatus === "error" ? (
                            <span className={styles.errorText}>
                                圖片載入失敗
                            </span>
                        ) : (
                            <>
                                {imageStatus === "loading" && <SkeletonMedia />}
                                <img
                                    className={
                                        imageStatus === "loading"
                                            ? styles.imageHidden
                                            : ""
                                    }
                                    src={imageUrl}
                                    alt="教材"
                                    onLoad={() =>
                                        setImageState({
                                            status: "loaded",
                                            url: imageUrl,
                                        })
                                    }
                                    onError={() => {
                                        setImageState({
                                            status: "error",
                                            url: imageUrl,
                                        });
                                    }}
                                />
                            </>
                        )}
                    </div>

                    <div className={styles.courseDescriptionWrapper}>
                        <div className={styles.courseDescription}>
                            {descriptionLoading ? (
                                <SkeletonText
                                    lines={5}
                                    widths={[
                                        "96%",
                                        "100%",
                                        "94%",
                                        "88%",
                                        "62%",
                                    ]}
                                    className={styles.descriptionSkeleton}
                                />
                            ) : descriptionError ? (
                                <p className={styles.errorText}>內容載入失敗</p>
                            ) : (
                                <p>{description?.content}</p>
                            )}
                        </div>
                    </div>
                    <div className={styles.questionHeader}>
                        <h2>請根據左圖回答下列問題</h2>
                    </div>
                    <div className={styles.questionList}>
                        {req.questionSections.map((section, i) => {
                            const titleQuery = quesTitleQueries[i];
                            const contentQuery = quesContentQueries[i];
                            return (
                                <QuizCard
                                    key={section.questionId}
                                    question={{
                                        id: section.questionId,
                                        title: titleQuery.data?.content ?? "",
                                        data: contentQuery.data,
                                    }}
                                    isLoading={
                                        titleQuery.isLoading ||
                                        contentQuery.isLoading
                                    }
                                    error={
                                        contentQuery.isError
                                            ? (contentQuery.error?.message ??
                                              "載入失敗")
                                            : null
                                    }
                                />
                            );
                        })}
                    </div>
                </section>
                {/* right sidebar */}
                <aside className={styles.chatSidebar}>
                    <CourseChat />
                    <Button
                        className={FooterStyles.shadowButton}
                        variant="solid"
                        highContrast
                        onClick={onNext}
                        radius="full"
                    >
                        送出並前往下一頁
                    </Button>
                </aside>
            </main>
        </div>
    );
}
