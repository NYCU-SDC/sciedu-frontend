// Development-only entry. Not included in the production application's routes/build.
import { createRoot } from "react-dom/client";
import { useState } from "react";
import {
    QueryClient,
    QueryClientProvider,
    useQuery,
} from "@tanstack/react-query";
import { MemoryRouter } from "react-router";
import { MantineProvider } from "@mantine/core";
import { Theme } from "@radix-ui/themes";
import { PostHogProvider } from "@posthog/react";
import posthog from "posthog-js";
import "@mantine/core/styles.css";
import "@radix-ui/themes/styles.css";
import "../../src/index.css";
import { theme } from "../../src/mantineTheme";
import CoursePlayer, {
    type CourseCompletion,
} from "../../src/features/courses/player/CoursePlayer";
import { fetchCourseDefinition } from "../../src/features/courses/genetics/services/fetchCourseDefinition";
import { getSession } from "../../src/shared/auth/requests";
import { getCurrentExperiment } from "../../src/features/courses/services/currentExperimentRepository";
const id = new URLSearchParams(location.search).get("course") ?? "preview";
export function Preview() {
    const remoteContext = useQuery({
        queryKey: ["preview-auth-scope", id],
        enabled: id !== "preview",
        queryFn: async () => {
            const [session, current] = await Promise.all([
                getSession(),
                getCurrentExperiment(),
            ]);
            if (
                !current ||
                current.experiment.status !== "ACTIVE" ||
                !current.courses.some((c) => c.id === id)
            ) {
                throw new Error(
                    "此帳號沒有指派這份教材的進行中實驗，無法驗收真實教材聊天。"
                );
            }
            return {
                account: session.email,
                experimentId: current.experiment.id,
                courseId: id,
            };
        },
    });
    const [completion, setCompletion] = useState<CourseCompletion>();
    const { data, error } = useQuery({
        queryKey: ["preview", id],
        queryFn: () =>
            fetchCourseDefinition(id, {
                variant: "stepper",
                mainTitle: "科學論證",
            }),
    });
    if (id !== "preview" && !remoteContext.data)
        return (
            <p>
                {remoteContext.error
                    ? String(remoteContext.error)
                    : "確認真實登入與教材指派…"}
            </p>
        );
    if (completion)
        return (
            <main style={{ padding: "2rem" }}>
                <h1>本機流程驗收完成</h1>
                <p>
                    這是本機測試資料；沒有提交至
                    dev。兩份文字回答的正式結果顯示沿用 Summary。
                </p>
                <pre>{JSON.stringify(completion, null, 2)}</pre>
            </main>
        );
    return data ? (
        <>
            {id !== "preview" && (
                <p role="status">
                    真實後端教材預覽：聊天會保存到目前登入帳號；題目僅供閱讀，不提交答案。
                </p>
            )}
            <CoursePlayer
                definition={data}
                chatScope={
                    remoteContext.data ?? {
                        account: "local-preview",
                        experimentId: "local-preview",
                        courseId: id,
                    }
                }
                reviewMode={id !== "preview"}
                onComplete={setCompletion}
            />
        </>
    ) : (
        <p>{error ? String(error) : "載入教材…"}</p>
    );
}
createRoot(document.getElementById("root")!).render(
    <MantineProvider theme={theme}>
        <Theme>
            <PostHogProvider client={posthog}>
                <QueryClientProvider
                    client={
                        new QueryClient({
                            defaultOptions: { queries: { retry: false } },
                        })
                    }
                >
                    <MemoryRouter>
                        <Preview />
                    </MemoryRouter>
                </QueryClientProvider>
            </PostHogProvider>
        </Theme>
    </MantineProvider>
);
