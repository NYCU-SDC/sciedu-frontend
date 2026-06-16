import { useMemo } from "react";
import { useQueries } from "@tanstack/react-query";
import { Button } from "@radix-ui/themes";
import type { CoursePageRequest, OverviewPage } from "../types/types";
import type { CourseChatController } from "../components/useCourseChatController";
import { api } from "../../../../shared/utils/api";
import CourseChat from "../components/CourseChat";
import styles from "./Overview.module.css";
import FooterStyles from "../components/Footer.module.css";
import { Skeleton } from "../../../../shared/components/Skeleton";

type Props = {
    data: CoursePageRequest;
    chat: CourseChatController;
    onNext: () => void;
};

export default function Overview({ data, chat, onNext }: Props) {
    const req = data.request as OverviewPage;

    const allTextIds = useMemo(
        () => [...new Set([...req.headerId, ...req.contentId.flat()])],
        [req.headerId, req.contentId]
    );

    const textQueries = useQueries({
        queries: allTextIds.map((id) => ({
            queryKey: ["content", "text", id],
            queryFn: () => api<{ content: string }>(`/api/content/text/${id}`),
        })),
    });

    const textById = useMemo(
        () => new Map(allTextIds.map((id, i) => [id, textQueries[i]])),
        [allTextIds, textQueries]
    );

    return (
        <div className={styles.pageContainer}>
            <div className={styles.pageBody}>
                <main className={styles.tableContent}>
                    <table className={styles.comparisonTable}>
                        <thead>
                            <tr>
                                {req.headerId.map((id) => {
                                    const query = textById.get(id);

                                    return (
                                        <th key={id}>
                                            {query?.isLoading ? (
                                                <Skeleton
                                                    width="72%"
                                                    height="0.875rem"
                                                    radius="999rem"
                                                />
                                            ) : query?.isError ? (
                                                <span
                                                    className={styles.errorText}
                                                >
                                                    載入失敗
                                                </span>
                                            ) : (
                                                (query?.data?.content ?? "")
                                            )}
                                        </th>
                                    );
                                })}
                            </tr>
                        </thead>
                        <tbody>
                            {req.contentId.map((row, rowIndex) => (
                                <tr key={rowIndex}>
                                    {row.map((id, cellIndex) => {
                                        const query = textById.get(id);

                                        return (
                                            <td
                                                key={`${id}-${cellIndex}`}
                                                className={styles.tdContent}
                                            >
                                                {query?.isLoading ? (
                                                    <div
                                                        className={
                                                            styles.skeletonStack
                                                        }
                                                    >
                                                        <Skeleton
                                                            width="100%"
                                                            height="0.875rem"
                                                            radius="999rem"
                                                        />
                                                        <Skeleton
                                                            width="88%"
                                                            height="0.875rem"
                                                            radius="999rem"
                                                        />
                                                        <Skeleton
                                                            width="56%"
                                                            height="0.875rem"
                                                            radius="999rem"
                                                        />
                                                    </div>
                                                ) : query?.isError ? (
                                                    <span
                                                        className={
                                                            styles.errorText
                                                        }
                                                    >
                                                        載入失敗
                                                    </span>
                                                ) : (
                                                    (query?.data?.content ?? "")
                                                )}
                                            </td>
                                        );
                                    })}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </main>
                <aside className={styles.chatSidebar}>
                    <CourseChat controller={chat} />
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
            </div>
        </div>
    );
}
