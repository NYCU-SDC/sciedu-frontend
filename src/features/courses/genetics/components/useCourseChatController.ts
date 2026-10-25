import {
    learnerChatConfiguration,
    type DraftAnswer,
    type LearningAction,
    type LearningInput,
} from "../../../../shared/network/learning";
import { useEffect, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { ApiError } from "../../../../shared/utils/api";
import {
    readCourseChat,
    saveCourseChat,
    type CourseChatScope,
} from "../../../../shared/auth/courseChatStorage";
import useChat from "../../../chat/services/useChat";
import { startChat } from "../../../chat/services/startChat";
import { CHAT_HISTORY_QUERY_KEY } from "../../../../shared/network/chat";

export function useCourseChatController(
    scope?: CourseChatScope,
    title = "教材討論",
    active = true,
    learningContext?: {
        draftAnswers: DraftAnswer[];
        simulationState?: { led: boolean; partition: boolean };
    }
) {
    const queryClient = useQueryClient();
    const realScope = Boolean(
        scope &&
        [scope.experimentId, scope.courseId, scope.pageId].every((value) =>
            /^[0-9a-f]{8}-[0-9a-f-]{27}$/i.test(value)
        )
    );
    const configuration = useQuery({
        queryKey: [
            "course-chat-configuration",
            scope?.account,
            scope?.experimentId,
            scope?.courseId,
            scope?.pageId,
        ],
        queryFn: () =>
            learnerChatConfiguration({
                experimentId: scope!.experimentId,
                courseId: scope!.courseId,
                pageId: scope!.pageId,
            }),
        enabled: active && realScope,
        retry: false,
    });
    const configured = configuration.data?.configuration;
    const isArgumentation = configured?.workflow === "argumentation-v1";
    const configurationLoading = active && realScope && configuration.isPending;
    const liveContext = useRef(learningContext);
    useEffect(() => {
        liveContext.current = learningContext;
    }, [learningContext]);

    const [chatID, setChatID] = useState<string | null>(() =>
        readCourseChat(scope)
    );
    const chat = useChat(active ? (chatID ?? "") : "", scope?.account);
    const [draft, setDraft] = useState("");
    const [creating, setCreating] = useState(false);
    const [editingMessageId, setEditingMessageId] = useState<string | null>(
        null
    );
    const [editingDraft, setEditingDraft] = useState("");
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const chatGenerationRef = useRef(0);
    const sendingRef = useRef(false);
    const createdIdRef = useRef<string | null>(null);
    const [startupUncertain, setStartupUncertain] = useState(false);

    useEffect(
        () => () => {
            chatGenerationRef.current += 1;
        },
        []
    );

    useEffect(() => {
        if (chat.error instanceof ApiError && chat.error.status === 404) {
            saveCourseChat(scope, null);
            let current = true;
            queueMicrotask(() => {
                if (!current) return;
                setChatID(null);
                setErrorMessage("原對話已不存在，請重新開始對話。");
            });
            return () => {
                current = false;
            };
        }
    }, [chat.error, scope]);
    useEffect(() => {
        if (!configured || !chat.chat || chat.chat.courseContext) return;
        let current = true;
        queueMicrotask(() => {
            if (current) {
                saveCourseChat(scope, null);
                setChatID(null);
            }
        });
        return () => {
            current = false;
        };
    }, [configured, chat.chat, scope]);
    const messages = chat.messages;
    const lastLearning = [...messages]
        .reverse()
        .find((message) => message.learning)?.learning;
    const teachingState =
        lastLearning?.teachingState ?? lastLearning?.beforeState;

    const baseMessages = messages;
    const busy =
        creating || chat.status === "streaming" || chat.status === "loading";

    const send = async (text: string, action: LearningAction = "message") => {
        const trimmed = text.trim();
        if (
            (!trimmed && action === "message") ||
            busy ||
            sendingRef.current ||
            startupUncertain ||
            configurationLoading ||
            configuration.isError
        )
            return;
        const learning: LearningInput | undefined = configured
            ? {
                  requestId: crypto.randomUUID(),
                  action,
                  draftAnswers: liveContext.current?.draftAnswers ?? [],
                  simulationState: liveContext.current?.simulationState,
              }
            : undefined;
        sendingRef.current = true;

        setDraft("");
        setErrorMessage(null);

        if (!chatID) {
            const generation = chatGenerationRef.current;
            setCreating(true);

            try {
                const { chatID: newID } = await startChat(
                    queryClient,
                    trimmed,
                    {
                        account: scope?.account,
                        courseContext:
                            configured && scope
                                ? {
                                      experimentId: scope.experimentId,
                                      courseId: scope.courseId,
                                      pageId: scope.pageId,
                                  }
                                : undefined,
                        learning,
                        onCreated: (id) => {
                            if (generation !== chatGenerationRef.current)
                                return;
                            createdIdRef.current = id;
                            saveCourseChat(scope, id);
                            setChatID(id);
                        },
                    }
                );
                if (generation !== chatGenerationRef.current) return;

                void queryClient.invalidateQueries({
                    queryKey: CHAT_HISTORY_QUERY_KEY,
                });
                setChatID(newID);
            } catch (error) {
                if (generation !== chatGenerationRef.current) return;

                const message =
                    error instanceof Error ? error.message : String(error);
                const unknown =
                    createdIdRef.current &&
                    (!(error instanceof ApiError) || error.status >= 500);
                setStartupUncertain(Boolean(unknown));
                setErrorMessage(
                    unknown
                        ? "無法確認首次訊息是否已送出，請先重新載入結果。"
                        : message
                );
                setDraft(trimmed);
                toast.error(`建立對話失敗: ${message}`);
            } finally {
                sendingRef.current = false;
                if (generation === chatGenerationRef.current) {
                    setCreating(false);
                }
            }

            return;
        }

        try {
            await chat.sendMessage({ content: trimmed, learning });
        } catch (error) {
            const message =
                error instanceof Error ? error.message : String(error);
            setErrorMessage(message);
            setDraft(trimmed);
            toast.error(`傳送失敗: ${message}`);
        } finally {
            sendingRef.current = false;
        }
    };

    const handleSend = (text: string) => send(text);
    const handleAction = (action: LearningAction) => send("", action);
    const handleEdit = (messageId: string) => {
        const target = baseMessages.find((message) => message.id === messageId);
        if (!target) return;

        setEditingDraft(target.content);
        setEditingMessageId(messageId);
    };

    const handleSubmitEdit = async () => {
        if (!editingMessageId) return;

        try {
            setErrorMessage(null);
            await chat.editAndSend(editingMessageId, editingDraft);
            setEditingMessageId(null);
            setEditingDraft("");
        } catch (error) {
            const message =
                error instanceof Error ? error.message : String(error);
            setErrorMessage(message);
            toast.error(`傳送失敗: ${message}`);
        }
    };

    const handleCancelEdit = () => {
        setEditingMessageId(null);
        setEditingDraft("");
    };

    const handleRegenerate = async (userMessageId: string) => {
        try {
            setErrorMessage(null);
            await chat.resend(userMessageId);
        } catch (error) {
            const message =
                error instanceof Error ? error.message : String(error);
            setErrorMessage(message);
            toast.error(`重新產生失敗: ${message}`);
        }
    };

    const handleRefresh = () => {
        chatGenerationRef.current += 1;
        chat.abort();
        saveCourseChat(scope, null);
        setChatID(null);
        createdIdRef.current = null;
        setStartupUncertain(false);
        setCreating(false);
        setDraft("");
        setEditingMessageId(null);
        setEditingDraft("");
        setErrorMessage(null);
    };

    const handleRecover = async () => {
        if (await chat.reloadResult()) {
            setStartupUncertain(false);
            setErrorMessage(null);
        }
    };
    return {
        isArgumentation,
        teachingState,
        handleAction,
        configurationLoading,
        configurationError: configuration.isError
            ? "無法讀取教材對話設定，請重新整理；本頁不會改用預設角色。"
            : null,
        startupUncertain,
        title,
        handleRecover,
        chat,
        messages,
        busy,
        creating,
        draft,
        setDraft,
        editingMessageId,
        editingDraft,
        setEditingDraft,
        errorMessage: errorMessage ?? chat.error?.message ?? null,
        handleSend,
        handleEdit,
        handleSubmitEdit,
        handleCancelEdit,
        handleRegenerate,
        handleRefresh,
    };
}

export type CourseChatController = ReturnType<typeof useCourseChatController>;
