import { useEffect, useMemo, useRef, useState } from "react";
import {
    ActionIcon,
    Alert,
    Badge,
    Button,
    Card,
    Checkbox,
    Group,
    Radio,
    Stack,
    Stepper,
    Textarea,
    TextInput,
    Title,
} from "@mantine/core";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Info } from "lucide-react";
import { useNavigate, useParams } from "react-router";

import { useDocumentTitle } from "../../../shared/hooks";
import ExperimentAdminShell from "../components/ExperimentAdminShell";
import {
    fetchExperiment,
    isAdminDemoMode,
    listExperimentCourseCandidates,
    listExperimentCourses,
} from "../services/adminRepository";
import styles from "./ExperimentAdmin.module.css";

type Draft = {
    name: string;
    description: string;
    startsAt: string;
    endsAt: string;
    maxAttempts: string;
    result: "score" | "explanations";
    release: "page" | "course";
    courseIds: string[];
};

const initialDraft: Draft = {
    name: "",
    description: "",
    startsAt: "",
    endsAt: "",
    maxAttempts: "1",
    result: "explanations",
    release: "course",
    courseIds: [],
};

export default function CreateExperimentPage() {
    const navigate = useNavigate();
    const { experimentId } = useParams();
    const isEditing = Boolean(experimentId);
    useDocumentTitle(isEditing ? "編輯實驗" : "新增實驗");
    const initialized = useRef(false);
    const [step, setStep] = useState(0);
    const [draft, setDraft] = useState(initialDraft);
    const [showBasicErrors, setShowBasicErrors] = useState(false);
    const coursesQuery = useQuery({
        queryKey: ["admin", "experiments", "course-candidates"],
        queryFn: listExperimentCourseCandidates,
    });
    const experimentQuery = useQuery({
        queryKey: ["admin", "experiments", experimentId, "edit"],
        queryFn: () => fetchExperiment(experimentId ?? ""),
        enabled: isEditing,
    });
    const assignedCoursesQuery = useQuery({
        queryKey: ["admin", "experiments", experimentId, "edit-courses"],
        queryFn: () => listExperimentCourses(experimentId ?? ""),
        enabled: isEditing,
    });

    useEffect(() => {
        if (
            !experimentQuery.data ||
            initialized.current ||
            (isEditing && !assignedCoursesQuery.data)
        )
            return;
        const experiment = experimentQuery.data;
        setDraft({
            name: experiment.name,
            description: experiment.description ?? "",
            startsAt: experiment.scheduledStartAt.slice(0, 16),
            endsAt: experiment.scheduledEndAt.slice(0, 16),
            maxAttempts: String(
                Math.max(1, experiment.configuration.maxAttempts)
            ),
            result: experiment.configuration.showExplanations
                ? "explanations"
                : "score",
            release:
                experiment.configuration.correctAnswerReleaseMode ===
                "AFTER_PAGE_SUBMISSION"
                    ? "page"
                    : "course",
            courseIds: (assignedCoursesQuery.data ?? []).map(
                ({ course }) => course.id
            ),
        });
        initialized.current = true;
    }, [assignedCoursesQuery.data, experimentQuery.data, isEditing]);

    const courseOptions = useMemo(
        () =>
            isEditing
                ? (assignedCoursesQuery.data ?? []).map(({ course }) => course)
                : (coursesQuery.data ?? []),
        [assignedCoursesQuery.data, coursesQuery.data, isEditing]
    );

    const selectedCourses = useMemo(
        () =>
            courseOptions.filter((course) =>
                draft.courseIds.includes(course.id)
            ),
        [courseOptions, draft.courseIds]
    );
    const canContinueBasic = Boolean(
        draft.name.trim() &&
        draft.startsAt &&
        draft.endsAt &&
        draft.startsAt < draft.endsAt
    );
    const canContinueCourses = draft.courseIds.length > 0;
    const setField = <K extends keyof Draft>(field: K, value: Draft[K]) =>
        setDraft((current) => ({ ...current, [field]: value }));

    const toggleCourse = (courseId: string) => {
        setDraft((current) => ({
            ...current,
            courseIds: current.courseIds.includes(courseId)
                ? current.courseIds.filter((id) => id !== courseId)
                : [...current.courseIds, courseId],
        }));
    };

    return (
        <ExperimentAdminShell activeSection="experiments">
            <div className={styles.contentStack}>
                <header className={styles.pageHeader}>
                    <div className={styles.titleGroup}>
                        <ActionIcon
                            variant="subtle"
                            size="lg"
                            aria-label="返回實驗列表"
                            onClick={() => navigate("/admin/experiments")}
                        >
                            <ArrowLeft aria-hidden="true" />
                        </ActionIcon>
                        <Title order={1}>
                            {isEditing
                                ? "編輯實驗"
                                : step === 3
                                  ? "確認並排程"
                                  : "新增實驗"}
                        </Title>
                    </div>
                </header>

                <Card
                    className={`${styles.card} ${styles.stepper}`}
                    radius="lg"
                >
                    <Stepper
                        active={step}
                        color="teal"
                        size="sm"
                        classNames={{
                            step: styles.step,
                            stepBody: styles.stepBody,
                            stepIcon: styles.stepIcon,
                            stepLabel: styles.stepLabel,
                            stepDescription: styles.stepDescription,
                            separator: styles.stepSeparator,
                        }}
                    >
                        <Stepper.Step
                            label="基本資料"
                            description={step > 0 ? "已完成" : "設定名稱與時段"}
                        />
                        <Stepper.Step
                            label="教學設定"
                            description={step > 1 ? "已完成" : "作答與答案公開"}
                        />
                        <Stepper.Step
                            label="選擇教材"
                            description={
                                step > 2 ? "已完成" : "至少一份已發布教材"
                            }
                        />
                        <Stepper.Step
                            label="學生與確認"
                            description={
                                isEditing ? "確認變更" : "排程前最後確認"
                            }
                        />
                    </Stepper>
                </Card>

                {step === 0 && (
                    <div className={styles.formGrid}>
                        <Card
                            className={`${styles.card} ${styles.formCard}`}
                            radius="lg"
                        >
                            <Title order={2} className={styles.sectionTitle}>
                                基本資料
                            </Title>
                            <p className={styles.muted}>
                                建立實驗草稿後，可以繼續設定教材與學生。
                            </p>
                            <Stack mt="lg">
                                <TextInput
                                    required
                                    label="實驗名稱"
                                    placeholder="請輸入實驗名稱"
                                    maxLength={200}
                                    value={draft.name}
                                    onChange={(event) =>
                                        setField(
                                            "name",
                                            event.currentTarget.value
                                        )
                                    }
                                    description="最多 200 個字元"
                                    error={
                                        showBasicErrors && !draft.name.trim()
                                            ? "請輸入實驗名稱"
                                            : undefined
                                    }
                                />
                                <Textarea
                                    label="實驗說明"
                                    placeholder="說明本次實驗目的與注意事項"
                                    maxLength={4000}
                                    minRows={4}
                                    value={draft.description}
                                    onChange={(event) =>
                                        setField(
                                            "description",
                                            event.currentTarget.value
                                        )
                                    }
                                    description="選填，最多 4,000 個字元"
                                />
                                <div className={styles.fieldGrid}>
                                    <TextInput
                                        required
                                        type="datetime-local"
                                        label="開始時間"
                                        value={draft.startsAt}
                                        onChange={(event) =>
                                            setField(
                                                "startsAt",
                                                event.currentTarget.value
                                            )
                                        }
                                        error={
                                            showBasicErrors && !draft.startsAt
                                                ? "請選擇開始時間"
                                                : undefined
                                        }
                                    />
                                    <TextInput
                                        required
                                        type="datetime-local"
                                        label="結束時間"
                                        value={draft.endsAt}
                                        onChange={(event) =>
                                            setField(
                                                "endsAt",
                                                event.currentTarget.value
                                            )
                                        }
                                        error={
                                            showBasicErrors && !draft.endsAt
                                                ? "請選擇結束時間"
                                                : draft.startsAt &&
                                                    draft.endsAt &&
                                                    draft.startsAt >=
                                                        draft.endsAt
                                                  ? "結束時間必須晚於開始時間"
                                                  : undefined
                                        }
                                    />
                                </div>
                                <Alert color="teal" icon={<Info size={16} />}>
                                    所有時間均以台灣時間（UTC+8）顯示。
                                </Alert>
                            </Stack>
                        </Card>
                        <Card
                            className={`${styles.card} ${styles.helpCard}`}
                            radius="lg"
                        >
                            <Title order={2} className={styles.sectionTitle}>
                                建立流程
                            </Title>
                            <p>
                                完成本步驟並前往下一步時，系統預期建立草稿；目前建立
                                API 尚未提供，所以表單只在本頁暫存。
                            </p>
                            <ul className={styles.noticeList}>
                                <li>草稿不會立即對學生開放</li>
                                <li>排程前至少需要一份已發布教材</li>
                                <li>學生名單可在排程後補上</li>
                            </ul>
                        </Card>
                    </div>
                )}

                {step === 1 && (
                    <div className={styles.formGrid}>
                        <Card
                            className={`${styles.card} ${styles.formCard}`}
                            radius="lg"
                        >
                            <Title order={2} className={styles.sectionTitle}>
                                教學設定
                            </Title>
                            <p className={styles.muted}>
                                設定學生的作答方式，以及完成教材後可以看到的資訊。
                            </p>
                            <Stack mt="lg" gap="lg">
                                <Radio.Group label="評分方式" value="automatic">
                                    <div className={styles.choiceGrid}>
                                        <label className={styles.choice}>
                                            <Radio
                                                value="automatic"
                                                label="自動評分"
                                            />
                                        </label>
                                        <label className={styles.choice}>
                                            <Radio
                                                disabled
                                                value="manual"
                                                label="人工評分（即將推出）"
                                            />
                                        </label>
                                    </div>
                                </Radio.Group>
                                <Radio.Group
                                    label="重新作答"
                                    value={draft.maxAttempts}
                                    onChange={(value) =>
                                        setField("maxAttempts", value)
                                    }
                                >
                                    <div className={styles.choiceGrid}>
                                        <label className={styles.choice}>
                                            <Radio value="1" label="不允許" />
                                        </label>
                                        <label className={styles.choice}>
                                            <Radio
                                                value="2"
                                                label="允許 1 次"
                                            />
                                        </label>
                                        <label className={styles.choice}>
                                            <Radio
                                                value="3"
                                                label="最多 2 次"
                                            />
                                        </label>
                                    </div>
                                </Radio.Group>
                                <Radio.Group
                                    label="結果顯示"
                                    value={draft.result}
                                    onChange={(value) =>
                                        setField(
                                            "result",
                                            value as Draft["result"]
                                        )
                                    }
                                >
                                    <div className={styles.choiceGrid}>
                                        <label className={styles.choice}>
                                            <Radio
                                                value="score"
                                                label="只顯示分數"
                                            />
                                        </label>
                                        <label className={styles.choice}>
                                            <Radio
                                                value="explanations"
                                                label="顯示分數與詳解"
                                            />
                                        </label>
                                    </div>
                                </Radio.Group>
                                <Radio.Group
                                    label="正確答案公開"
                                    value={draft.release}
                                    onChange={(value) =>
                                        setField(
                                            "release",
                                            value as Draft["release"]
                                        )
                                    }
                                >
                                    <div className={styles.choiceGrid}>
                                        <label className={styles.choice}>
                                            <Radio
                                                value="page"
                                                label="每頁完成後公開"
                                            />
                                        </label>
                                        <label className={styles.choice}>
                                            <Radio
                                                value="course"
                                                label="整份教材完成後公開"
                                            />
                                        </label>
                                    </div>
                                </Radio.Group>
                            </Stack>
                        </Card>
                        <Card
                            className={`${styles.card} ${styles.helpCard}`}
                            radius="lg"
                        >
                            <Title order={2} className={styles.sectionTitle}>
                                設定說明
                            </Title>
                            <ul className={styles.noticeList}>
                                <li>評分方式目前固定為自動評分</li>
                                <li>結果顯示與答案公開可分開設定</li>
                                <li>實驗開始後設定會鎖定</li>
                            </ul>
                        </Card>
                    </div>
                )}

                {step === 2 && (
                    <div className={styles.formGrid}>
                        <Card
                            className={`${styles.card} ${styles.formCard}`}
                            radius="lg"
                        >
                            <Title order={2} className={styles.sectionTitle}>
                                選擇教材
                            </Title>
                            <p className={styles.muted}>
                                排程前至少需要一份已發布教材。
                            </p>
                            {!isAdminDemoMode && (
                                <Alert mt="lg" color="orange">
                                    API
                                    尚未提供教材目錄端點，正式環境暫時無法選擇教材。
                                </Alert>
                            )}
                            <div className={styles.coursePicker}>
                                {coursesQuery.isPending && (
                                    <p className={styles.empty}>載入教材中⋯</p>
                                )}
                                {courseOptions.map((course) => {
                                    const available =
                                        course.status === "PUBLISHED";
                                    return (
                                        <label
                                            className={styles.pickerRow}
                                            key={course.id}
                                        >
                                            <Checkbox
                                                checked={draft.courseIds.includes(
                                                    course.id
                                                )}
                                                disabled={!available}
                                                onChange={() =>
                                                    toggleCourse(course.id)
                                                }
                                                aria-label={`選擇 ${course.title}`}
                                            />
                                            <div>
                                                <strong>{course.title}</strong>
                                                <div
                                                    className={
                                                        styles.courseMeta
                                                    }
                                                >
                                                    {course.code}・
                                                    {course.description}
                                                </div>
                                            </div>
                                            <Badge
                                                color={
                                                    available ? "teal" : "gray"
                                                }
                                            >
                                                {available ? "已發布" : "草稿"}
                                            </Badge>
                                        </label>
                                    );
                                })}
                                {courseOptions.length === 0 && (
                                    <p className={styles.empty}>
                                        目前沒有可選教材
                                    </p>
                                )}
                            </div>
                        </Card>
                        <Card
                            className={`${styles.card} ${styles.helpCard}`}
                            radius="lg"
                        >
                            <Title order={2} className={styles.sectionTitle}>
                                已選教材
                            </Title>
                            <Title order={3} mt="md">
                                {selectedCourses.length} 份
                            </Title>
                            <Stack mt="md">
                                {selectedCourses.map((course) => (
                                    <Group
                                        justify="space-between"
                                        key={course.id}
                                    >
                                        <span>{course.title}</span>
                                        <Button
                                            variant="subtle"
                                            size="xs"
                                            onClick={() =>
                                                toggleCourse(course.id)
                                            }
                                        >
                                            移除
                                        </Button>
                                    </Group>
                                ))}
                            </Stack>
                            <div className={styles.warning}>
                                排程後不可更換教材
                            </div>
                        </Card>
                    </div>
                )}

                {step === 3 && (
                    <div className={styles.reviewGrid}>
                        <Stack>
                            <Card
                                className={`${styles.card} ${styles.formCard}`}
                                radius="lg"
                            >
                                <Title
                                    order={2}
                                    className={styles.sectionTitle}
                                >
                                    基本資料
                                </Title>
                                <div className={styles.settingRows}>
                                    <div className={styles.settingRow}>
                                        <span>實驗名稱</span>
                                        <strong>{draft.name}</strong>
                                    </div>
                                    <div className={styles.settingRow}>
                                        <span>實驗時段</span>
                                        <strong>
                                            {draft.startsAt} – {draft.endsAt}
                                        </strong>
                                    </div>
                                    <div className={styles.settingRow}>
                                        <span>時區</span>
                                        <strong>台灣時間（UTC+8）</strong>
                                    </div>
                                </div>
                            </Card>
                            <Card
                                className={`${styles.card} ${styles.formCard}`}
                                radius="lg"
                            >
                                <Title
                                    order={2}
                                    className={styles.sectionTitle}
                                >
                                    教學設定
                                </Title>
                                <div className={styles.settingRows}>
                                    <div className={styles.settingRow}>
                                        <span>評分方式</span>
                                        <strong>自動評分</strong>
                                    </div>
                                    <div className={styles.settingRow}>
                                        <span>重新作答</span>
                                        <strong>
                                            {draft.maxAttempts === "1"
                                                ? "不允許"
                                                : `最多 ${Number(draft.maxAttempts) - 1} 次`}
                                        </strong>
                                    </div>
                                    <div className={styles.settingRow}>
                                        <span>結果顯示</span>
                                        <strong>
                                            {draft.result === "explanations"
                                                ? "顯示分數與詳解"
                                                : "只顯示分數"}
                                        </strong>
                                    </div>
                                    <div className={styles.settingRow}>
                                        <span>正確答案</span>
                                        <strong>
                                            {draft.release === "course"
                                                ? "完成整份教材後公開"
                                                : "每頁完成後公開"}
                                        </strong>
                                    </div>
                                </div>
                            </Card>
                            <Card
                                className={`${styles.card} ${styles.formCard}`}
                                radius="lg"
                            >
                                <Title
                                    order={2}
                                    className={styles.sectionTitle}
                                >
                                    教材
                                </Title>
                                <div className={styles.settingRow}>
                                    <span>已加入</span>
                                    <strong>
                                        {selectedCourses.length} 份已發布教材
                                    </strong>
                                </div>
                            </Card>
                        </Stack>
                        <Card
                            className={`${styles.card} ${styles.helpCard}`}
                            radius="lg"
                        >
                            <Title order={2} className={styles.sectionTitle}>
                                參與學生
                            </Title>
                            <Title order={3} mt="md">
                                0 人
                            </Title>
                            <p>
                                建立草稿 API 尚未提供，取得實驗 ID
                                前無法加入學生。建立 API
                                串接後可直接重用詳細頁的加入學生元件。
                            </p>
                            <Button variant="default" disabled>
                                ＋ 加入學生
                            </Button>
                            <div className={styles.warning}>
                                不會阻擋排程，但目前沒有學生能看到這場實驗。
                            </div>
                        </Card>
                    </div>
                )}

                <footer className={styles.formFooter}>
                    <Group>
                        <Button
                            variant="default"
                            onClick={() =>
                                step === 0
                                    ? navigate(
                                          isEditing
                                              ? `/admin/experiments/${experimentId}`
                                              : "/admin/experiments"
                                      )
                                    : setStep((current) => current - 1)
                            }
                        >
                            {step === 0 ? "取消" : "← 上一步"}
                        </Button>
                        <Button
                            variant="default"
                            disabled
                            title="API 尚未提供建立／更新草稿 mutation"
                        >
                            {isEditing ? "儲存變更" : "儲存草稿並離開"}
                        </Button>
                    </Group>
                    {step < 3 ? (
                        <Button
                            disabled={step === 2 && !canContinueCourses}
                            onClick={() => {
                                if (step === 0 && !canContinueBasic) {
                                    setShowBasicErrors(true);
                                    return;
                                }
                                setStep((current) => current + 1);
                            }}
                        >
                            {step === 0
                                ? "下一步：教學設定 →"
                                : step === 1
                                  ? "下一步：選擇教材 →"
                                  : "下一步：學生與確認 →"}
                        </Button>
                    ) : (
                        <Button
                            disabled
                            title="API 尚未提供建立與排程 mutation"
                        >
                            {isEditing ? "儲存變更" : "排程實驗"}
                        </Button>
                    )}
                </footer>
            </div>
        </ExperimentAdminShell>
    );
}
