import { Button, Center, Loader, Stack, Text, Title } from "@mantine/core";
import { useNavigate } from "react-router";

import { ApiError } from "../../../shared/utils/api";

type Props = {
    kind?: "loading" | "no-experiment" | "no-courses";
    error?: unknown;
    onRetry?: () => void;
};

export default function CurrentExperimentState({
    kind,
    error,
    onRetry,
}: Props) {
    const navigate = useNavigate();

    if (kind === "loading") {
        return (
            <Center mih="24rem" role="status" aria-label="教材載入中">
                <Loader color="brandTeal" />
            </Center>
        );
    }

    let title = "目前無法載入教材";
    let description = "請稍後再試一次。";
    let action: React.ReactNode = onRetry ? (
        <Button onClick={onRetry}>重新載入</Button>
    ) : null;

    if (kind === "no-experiment") {
        title = "目前沒有進行中的實驗";
        description = "老師安排新的實驗後，教材會顯示在這裡。";
        action = null;
    } else if (kind === "no-courses") {
        title = "目前實驗尚未指派教材";
        description = "教材發布後會顯示在這裡。";
        action = null;
    } else if (error instanceof ApiError && error.status === 401) {
        title = "登入狀態已失效";
        description = "請重新登入後再查看教材。";
        action = <Button onClick={() => navigate("/login")}>重新登入</Button>;
    } else if (error instanceof ApiError && error.status === 403) {
        title = "無法查看目前實驗";
        description = "你的帳號沒有查看這個實驗的權限。";
        action = null;
    }

    return (
        <Center mih="24rem" role={error ? "alert" : "status"}>
            <Stack align="center" gap="sm" ta="center">
                <Title order={3} c="brandTeal.8">
                    {title}
                </Title>
                <Text c="dimmed">{description}</Text>
                {action}
            </Stack>
        </Center>
    );
}
