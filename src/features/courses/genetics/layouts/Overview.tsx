import { Button } from "@radix-ui/themes";
import { useMemo } from "react";
import { useQueries } from "@tanstack/react-query";
import type { CoursePageRequest, OverviewPage } from "../types/types";
import { api } from "../../../../shared/utils/api";
import styles from "./Overview.module.css";
import FooterStyles from "../components/Footer.module.css";
import { SkeletonText } from "../components/CourseSkeleton";

type Props = {
    data: CoursePageRequest;
    onNext: () => void;
};

export default function Overview({ data, onNext }: Props) {
    const req = data.request as OverviewPage;

    const allTextIds = useMemo(
        () => [...req.headerId, ...req.contentId.flat()],
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
            <main className={styles.tableContent}>
                <table className={styles.comparisonTable}>
                    <thead>
                        <tr>
                            {req.headerId.map((id, index) => {
                                const query = textById.get(id);
                                return (
                                    <th key={index}>
                                        {query?.isLoading ? (
                                            <SkeletonText
                                                lines={1}
                                                widths={["72%"]}
                                            />
                                        ) : query?.isError ? (
                                            <span className={styles.errorText}>
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
                                            key={cellIndex}
                                            className={styles.tdContent}
                                        >
                                            {query?.isLoading ? (
                                                <SkeletonText
                                                    lines={3}
                                                    widths={[
                                                        "100%",
                                                        "88%",
                                                        "56%",
                                                    ]}
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
                                        </td>
                                    );
                                })}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </main>
            <footer className={FooterStyles.footerContainer}>
                <div className={FooterStyles.footerActions}>
                    <Button
                        className={FooterStyles.shadowButton}
                        variant="solid"
                        highContrast
                        onClick={onNext}
                        radius="full"
                    >
                        送出並前往下一頁
                    </Button>
                </div>
            </footer>
        </div>
    );
}
