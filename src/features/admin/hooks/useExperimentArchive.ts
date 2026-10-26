import { useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ApiError } from "../../../shared/utils/api";
import {
    fetchExperiment,
    updateExperimentStatus,
} from "../services/adminRepository";
import type { ExperimentDetail } from "../types";

const rejectionMessages: Record<number, string> = {
    401: "登入已失效，請重新登入後查核實驗狀態。",
    403: "你沒有封存這場實驗的權限。",
    404: "找不到這場實驗，請返回列表重新確認。",
    409: "實驗狀態發生衝突，請確認最新狀態後再操作。",
};

export function useExperimentArchive(experimentId: string) {
    const queryClient = useQueryClient();
    const running = useRef(false);
    const [isPending, setPending] = useState(false);
    const [needsVerification, setNeedsVerification] = useState(false);
    const [error, setError] = useState<string | null>(null);

    async function refresh(record: ExperimentDetail) {
        const detailKey = ["admin", "experiments", experimentId, "detail"];
        await queryClient.cancelQueries({ queryKey: detailKey });
        queryClient.setQueryData(detailKey, record);
        // The server response already confirms detail; background list refreshes
        // must not hold the confirmation dialog open if another request stalls.
        void Promise.all([
            queryClient.invalidateQueries({
                queryKey: ["admin", "experiments"],
                predicate: (query) =>
                    query.queryKey[2] !== experimentId ||
                    query.queryKey[3] !== "detail",
            }),
            queryClient.invalidateQueries({
                queryKey: ["student", "current-experiment"],
            }),
        ]);
    }

    async function confirmArchived(record: ExperimentDetail) {
        await refresh(record);
        setNeedsVerification(false);
        setError(null);
        toast.success("實驗已封存，學生可安排至其他無衝突的實驗");
        return true;
    }

    async function readStatus() {
        return fetchExperiment(experimentId, AbortSignal.timeout(15_000));
    }

    async function run(verifyOnly = false): Promise<boolean> {
        if (running.current || (needsVerification && !verifyOnly)) return false;
        running.current = true;
        setPending(true);
        setError(null);
        try {
            if (verifyOnly) {
                const record = await readStatus();
                if (record.status === "ARCHIVED")
                    return await confirmArchived(record);
                await refresh(record);
                setNeedsVerification(false);
                setError("已確認實驗尚未封存，可重新確認後再試一次。");
                return false;
            }
            let record: ExperimentDetail;
            try {
                record = await updateExperimentStatus(
                    experimentId,
                    "ARCHIVED",
                    AbortSignal.timeout(15_000)
                );
            } catch (cause) {
                const rejected =
                    cause instanceof ApiError &&
                    cause.status >= 400 &&
                    cause.status < 500;
                const message = rejected
                    ? (rejectionMessages[cause.status] ??
                      "封存請求遭拒絕，請確認資料後再試。")
                    : "封存回覆未確認。";
                try {
                    const latest = await readStatus();
                    if (!rejected && latest.status === "ARCHIVED")
                        return await confirmArchived(latest);
                    await refresh(latest);
                    setNeedsVerification(false);
                    setError(
                        rejected
                            ? message
                            : "已確認實驗尚未封存，可重新確認後再試一次。"
                    );
                } catch {
                    setNeedsVerification(true);
                    setError(
                        `${message} 無法確認最新狀態，請先重新查核；系統不會自動重送。`
                    );
                }
                return false;
            }
            if (record.status !== "ARCHIVED") {
                await refresh(record);
                setNeedsVerification(true);
                setError("伺服器未回傳已封存狀態，請先重新查核。");
                return false;
            }
            return await confirmArchived(record);
        } catch {
            setNeedsVerification(true);
            setError("無法確認最新狀態，請先重新查核；系統不會自動重送。");
            return false;
        } finally {
            running.current = false;
            setPending(false);
        }
    }

    return { isPending, needsVerification, error, run };
}
