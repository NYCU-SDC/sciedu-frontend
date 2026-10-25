import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
    availableChatPresets,
    courseChatConfiguration,
    saveCourseChatConfiguration,
    type ChatConfiguration,
} from "../../../shared/network/learning";

type Props = {
    experimentId: string;
    courseId: string;
    courseCode?: string;
    disabled?: boolean;
};
export default function CourseChatSettings(props: Props) {
    const configuration = useQuery({
        queryKey: ["admin", "course-chat", props.experimentId, props.courseId],
        queryFn: () =>
            courseChatConfiguration(props.experimentId, props.courseId),
        retry: false,
    });
    const presets = useQuery({
        queryKey: ["admin", "chat-presets"],
        queryFn: availableChatPresets,
        retry: false,
    });
    if (configuration.isPending || presets.isPending)
        return <p role="status">載入對話設定…</p>;
    if (configuration.isError || presets.isError)
        return (
            <div role="alert">
                無法載入對話設定，尚未變更。
                <button
                    type="button"
                    onClick={() => {
                        void configuration.refetch();
                        void presets.refetch();
                    }}
                >
                    重新載入
                </button>
            </div>
        );
    const saved = configuration.data.configuration;
    return (
        <SettingsForm
            key={JSON.stringify(saved)}
            {...props}
            initial={saved}
            presets={presets.data}
        />
    );
}
function SettingsForm({
    experimentId,
    courseId,
    courseCode,
    disabled,
    initial,
    presets,
}: Props & {
    initial: ChatConfiguration | null;
    presets: { name: string; description: string }[];
}) {
    const suggested = courseCode === "scientific-argumentation-dark-room";
    const [preset, setPreset] = useState(
        initial?.preset ??
            (suggested &&
            presets.some((p) => p.name === "augmentation_teacher_and_peer")
                ? "augmentation_teacher_and_peer"
                : "")
    );
    const [workflow, setWorkflow] = useState<ChatConfiguration["workflow"]>(
        initial?.workflow ?? (suggested ? "argumentation-v1" : "general")
    );
    const client = useQueryClient();
    const mutation = useMutation({
        mutationFn: () =>
            saveCourseChatConfiguration(experimentId, courseId, {
                preset,
                workflow,
            }),
        onSuccess: () =>
            client.invalidateQueries({
                queryKey: ["admin", "course-chat", experimentId, courseId],
            }),
    });
    const locked = Boolean(disabled || initial?.locked);
    const missing = Boolean(preset && !presets.some((p) => p.name === preset));
    return (
        <fieldset
            disabled={locked || mutation.isPending}
            style={{
                minWidth: 0,
                display: "grid",
                gap: 8,
                border: "1px solid #b3ceca",
                borderRadius: 8,
                padding: 12,
            }}
        >
            <legend>教材對話設定</legend>
            <label>
                Preset{" "}
                <select
                    aria-label="教材對話 preset"
                    value={preset}
                    onChange={(e) => setPreset(e.target.value)}
                    style={{ maxWidth: "100%" }}
                >
                    <option value="">
                        選擇 preset（尚未設定時沿用一般聊天）
                    </option>
                    {missing && (
                        <option value={preset}>{preset}（目前不可用）</option>
                    )}
                    {presets.map((p) => (
                        <option key={p.name} value={p.name}>
                            {p.name}
                            {p.description ? ` — ${p.description}` : ""}
                        </option>
                    ))}
                </select>
            </label>
            <label>
                對話流程{" "}
                <select
                    aria-label="教材對話流程"
                    value={workflow}
                    onChange={(e) =>
                        setWorkflow(
                            e.target.value as ChatConfiguration["workflow"]
                        )
                    }
                >
                    <option value="general">一般教材討論</option>
                    <option value="argumentation-v1">
                        科學論證四階段（每頁獨立）
                    </option>
                </select>
            </label>
            <small>
                {initial?.locked
                    ? "已有教材聊天室，設定已鎖定；變更教學條件請使用新實驗。"
                    : initial
                      ? "已保存，可在第一個教材聊天室建立前調整。"
                      : "尚未保存專用對話設定。"}
            </small>
            {missing && (
                <p role="alert">指定 preset 目前不可用，不會改用其他角色。</p>
            )}
            {mutation.isError && <p role="alert">{mutation.error.message}</p>}
            <button
                type="button"
                disabled={locked || !preset || missing || mutation.isPending}
                onClick={() => mutation.mutate()}
            >
                {mutation.isPending ? "儲存中…" : "儲存教材對話設定"}
            </button>
        </fieldset>
    );
}
