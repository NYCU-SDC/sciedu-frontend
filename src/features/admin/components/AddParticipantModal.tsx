import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
    Button,
    Checkbox,
    Group,
    Modal,
    Stack,
    Text,
    TextInput,
} from "@mantine/core";
import { Search } from "lucide-react";
import { toast } from "sonner";

import { ApiError } from "../../../shared/utils/api";
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
        onError: (error) => {
            if (error instanceof ApiError && error.status === 409) {
                toast.error("選取的學生與其他實驗時間重疊，未加入任何學生");
                return;
            }
            toast.error("加入學生失敗，請稍後再試");
        },
    });

    const toggleCandidate = (userId: string) => {
        setSelectedIds((previous) => {
            const next = new Set(previous);
            if (next.has(userId)) next.delete(userId);
            else next.add(userId);
            return next;
        });
    };

    return (
        <Modal
            opened
            onClose={onClose}
            title="加入學生"
            centered
            size="lg"
            radius="lg"
            overlayProps={{ backgroundOpacity: 0.72, blur: 1 }}
            classNames={{
                content: styles.mantineModal,
                header: styles.mantineModalHeader,
                body: styles.mantineModalBody,
            }}
        >
            <Stack gap="sm">
                <TextInput
                    autoFocus
                    type="search"
                    placeholder="搜尋姓名或郵件"
                    aria-label="搜尋可加入的學生"
                    value={query}
                    onChange={(event) => setQuery(event.currentTarget.value)}
                    leftSection={<Search size={16} aria-hidden="true" />}
                    radius="md"
                    classNames={{ input: styles.mantineTextInput }}
                />

                <Stack gap="sm" className={styles.candidateList}>
                    {candidatesQuery.isPending && (
                        <Text c="dimmed" ta="center" my="lg">
                            載入學生中⋯
                        </Text>
                    )}
                    {candidatesQuery.isError && (
                        <Text c="dimmed" ta="center" my="lg">
                            學生名單載入失敗
                        </Text>
                    )}
                    {candidatesQuery.data?.map((candidate) => {
                        const isAvailable = !candidate.isAssigned;
                        return (
                            <label
                                key={candidate.user.id}
                                className={`${styles.candidateRow} ${
                                    !isAvailable ? styles.candidateDisabled : ""
                                }`}
                            >
                                <Checkbox
                                    checked={selectedIds.has(candidate.user.id)}
                                    disabled={!isAvailable}
                                    onChange={() =>
                                        toggleCandidate(candidate.user.id)
                                    }
                                    aria-label={`選取 ${candidate.user.name}`}
                                    color="brandTeal"
                                />
                                <Text
                                    component="span"
                                    className={styles.candidateName}
                                >
                                    {candidate.user.name}
                                </Text>
                                <Text
                                    component="span"
                                    className={styles.candidateEmail}
                                >
                                    {candidate.user.email}
                                </Text>
                                <Text
                                    component="span"
                                    className={
                                        isAvailable
                                            ? styles.available
                                            : styles.conflict
                                    }
                                >
                                    {isAvailable ? "可加入" : "已加入本實驗"}
                                </Text>
                            </label>
                        );
                    })}
                    {candidatesQuery.data?.length === 0 && (
                        <Text c="dimmed" ta="center" my="lg">
                            找不到符合的學生
                        </Text>
                    )}
                </Stack>

                <Group
                    justify="space-between"
                    align="center"
                    pt="md"
                    className={styles.mantineModalFooter}
                >
                    <Text size="sm" c="dimmed">
                        已選擇 {selectedIds.size} 位學生
                    </Text>
                    <Group gap="sm">
                        <Button variant="default" onClick={onClose}>
                            取消
                        </Button>
                        <Button
                            color="brandTeal"
                            disabled={selectedIds.size === 0}
                            loading={addMutation.isPending}
                            onClick={() => addMutation.mutate()}
                        >
                            加入學生
                        </Button>
                    </Group>
                </Group>
            </Stack>
        </Modal>
    );
}
