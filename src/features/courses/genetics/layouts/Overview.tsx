import { Button, Skeleton } from "@radix-ui/themes";
import { useEffect, useMemo } from "react";
import { useQueries } from "@tanstack/react-query";
import { toast } from "sonner";
import type { CoursePageRequest, OverviewPage } from "../types/types";
import { api } from "../../../../shared/utils/api";
import styles from "./Overview.module.css";
import FooterStyles from "../components/Footer.module.css";

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

    useEffect(() => {
        if (!textQueries.some((q) => q.isError)) return;
        toast.error("部分內容載入失敗");
        if (import.meta.env.DEV) {
            console.warn(
                "Overview content fetching failed with errors: ",
                textQueries
                    .filter((q) => q.isError)
                    .map((q) => q.error)
                    .join(",")
            );
        }
    }, [textQueries]);

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
                                            <Skeleton minHeight="1rem" />
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
                                                <Skeleton minHeight="1rem" />
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
