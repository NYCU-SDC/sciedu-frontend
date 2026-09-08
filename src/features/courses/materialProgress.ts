export type MaterialStatus = "done" | "in_progress" | "not_started";

type MaterialProgress = {
    status: MaterialStatus;
    totalPages: number;
    completedPage: number;
};

export function getMaterialProgressLabel({
    status,
    totalPages,
    completedPage,
}: MaterialProgress) {
    switch (status) {
        case "done":
            return `共 ${totalPages} 頁．已完成全部`;
        case "in_progress":
            return `共 ${totalPages} 頁．已完成第 ${completedPage} 頁`;
        case "not_started":
            return `共 ${totalPages} 頁．尚未開始`;
    }
}
