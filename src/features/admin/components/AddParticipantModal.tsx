import { useEffect, useId, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Search, X } from "lucide-react";
import { toast } from "sonner";

import {
    addExperimentParticipants,
    listParticipantCandidates,
} from "../services/adminRepository";
import styles from "../pages/AdminDashboardPage.module.css";

type Props = {
    experimentId: string;
    onClose: () => void;
};

export default function AddParticipantModal({ experimentId, onClose }: Props) {
    const titleId = useId();
    const queryClient = useQueryClient();
    const [query, setQuery] = useState("");
    const [selectedIds, setSelectedIds] = useState<ReadonlySet<string>>(
        new Set()
    );

    const candidatesQuery = useQuery({
        queryKey: ["admin", "experiments", experimentId, "candidates", query],
        queryFn: () => listParticipantCandidates(experimentId, query),
    });

    const addMutation = useMutation({
        mutationFn: () =>
            addExperimentParticipants(experimentId, [...selectedIds]),
        onSuccess: async () => {
            await queryClient.invalidateQueries({
                queryKey: ["admin", "experiments", experimentId],
            });
            toast.success(`已加入 ${selectedIds.size} 位學生`);
            onClose();
        },
        onError: () => toast.error("加入學生失敗，請稍後再試"),
    });

    useEffect(() => {
        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === "Escape") onClose();
        };
        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [onClose]);

    const toggleCandidate = (userId: string) => {
        setSelectedIds((previous) => {
            const next = new Set(previous);
            if (next.has(userId)) next.delete(userId);
            else next.add(userId);
            return next;
        });
    };

    return (
        <div className={styles.modalBackdrop} onMouseDown={onClose}>
            <section
                className={styles.modal}
                role="dialog"
                aria-modal="true"
                aria-labelledby={titleId}
                onMouseDown={(event) => event.stopPropagation()}
            >
                <header className={styles.modalHeader}>
                    <h2 id={titleId}>加入學生</h2>
                    <button
                        type="button"
                        className={styles.iconButton}
                        aria-label="關閉加入學生視窗"
                        onClick={onClose}
                    >
                        <X aria-hidden="true" />
                    </button>
                </header>

                <div className={styles.modalBody}>
                    <label className={styles.searchField}>
                        <Search aria-hidden="true" />
                        <input
                            autoFocus
                            type="search"
                            placeholder="搜尋姓名或郵件"
                            value={query}
                            onChange={(event) => setQuery(event.target.value)}
                        />
                    </label>

                    <div className={styles.candidateList}>
                        {candidatesQuery.isPending && (
                            <p className={styles.emptyState}>載入學生中⋯</p>
                        )}
                        {candidatesQuery.isError && (
                            <p className={styles.emptyState}>
                                學生名單載入失敗
                            </p>
                        )}
                        {candidatesQuery.data?.map((candidate) => {
                            const isAvailable =
                                candidate.availability === "AVAILABLE";
                            return (
                                <label
                                    key={candidate.userId}
                                    className={`${styles.candidateRow} ${!isAvailable ? styles.candidateDisabled : ""}`}
                                >
                                    <input
                                        type="checkbox"
                                        checked={selectedIds.has(
                                            candidate.userId
                                        )}
                                        disabled={!isAvailable}
                                        onChange={() =>
                                            toggleCandidate(candidate.userId)
                                        }
                                    />
                                    <span className={styles.candidateName}>
                                        {candidate.name}
                                    </span>
                                    <span className={styles.candidateEmail}>
                                        {candidate.email}
                                    </span>
                                    <span
                                        className={
                                            isAvailable
                                                ? styles.available
                                                : styles.conflict
                                        }
                                    >
                                        {isAvailable
                                            ? "可加入"
                                            : candidate.conflictReason}
                                    </span>
                                </label>
                            );
                        })}
                        {candidatesQuery.data?.length === 0 && (
                            <p className={styles.emptyState}>
                                找不到符合的學生
                            </p>
                        )}
                    </div>
                </div>

                <footer className={styles.modalFooter}>
                    <span>已選擇 {selectedIds.size} 位學生</span>
                    <div className={styles.modalActions}>
                        <button
                            type="button"
                            className={styles.secondaryButton}
                            onClick={onClose}
                        >
                            取消
                        </button>
                        <button
                            type="button"
                            className={styles.primaryButton}
                            disabled={
                                selectedIds.size === 0 || addMutation.isPending
                            }
                            onClick={() => addMutation.mutate()}
                        >
                            {addMutation.isPending ? "加入中⋯" : "加入學生"}
                        </button>
                    </div>
                </footer>
            </section>
        </div>
    );
}
