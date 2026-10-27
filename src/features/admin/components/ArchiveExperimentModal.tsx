import { useExperimentClock } from "../../experience/useExperimentClock";
import { displayStatus } from "../../experience/experimentExperience";
import { Alert, Button, Group, Modal, Stack, Text } from "@mantine/core";
import { archiveActionLabel } from "../formatters";
import type { ExperimentDetail } from "../types";
import type { useExperimentArchive } from "../hooks/useExperimentArchive";

export default function ArchiveExperimentModal({
    experiment,
    opened,
    onClose,
    archive,
}: {
    experiment: ExperimentDetail;
    opened: boolean;
    onClose: () => void;
    archive: ReturnType<typeof useExperimentArchive>;
}) {
    const now = useExperimentClock([experiment]);
    const label = archiveActionLabel(
        experiment.status,
        displayStatus(experiment, now) === "ENDED"
    );
    return (
        <Modal
            opened={opened}
            onClose={() => {
                if (!archive.isPending) onClose();
            }}
            title={experiment.status === "ARCHIVED" ? "實驗封存狀態" : label}
            centered
            radius="lg"
            closeOnClickOutside={!archive.isPending}
            closeOnEscape={!archive.isPending}
            withCloseButton={!archive.isPending}
        >
            <Stack>
                <Text fw={600} style={{ overflowWrap: "anywhere" }}>
                    {experiment.name}
                </Text>
                <Text>
                    封存後，學生將無法繼續進入或作答這場實驗。實驗資料、既有指派與已提交答案會保留，原訂時段不再占用學生排程。
                </Text>
                <Text>
                    你可以再將學生安排至其他無衝突的實驗；系統不會自動啟用下一場實驗。本頁不提供還原操作。
                </Text>
                {archive.error && (
                    <Alert color="red" role="alert">
                        {archive.error}
                    </Alert>
                )}
                <Group justify="flex-end">
                    <Button
                        variant="default"
                        disabled={archive.isPending}
                        onClick={onClose}
                    >
                        {archive.error ? "關閉" : "取消"}
                    </Button>
                    {(experiment.status !== "ARCHIVED" ||
                        archive.needsVerification) && (
                        <Button
                            color="red"
                            loading={archive.isPending}
                            onClick={async () => {
                                if (
                                    await archive.run(archive.needsVerification)
                                )
                                    onClose();
                            }}
                        >
                            {archive.needsVerification
                                ? "重新查核狀態"
                                : `確認${label}`}
                        </Button>
                    )}
                </Group>
            </Stack>
        </Modal>
    );
}
