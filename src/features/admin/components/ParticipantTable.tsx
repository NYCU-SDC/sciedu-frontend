import { Table } from "@mantine/core";

import { formatDateTime, roleLabels } from "../formatters";
import type { ExperimentParticipantAssignment } from "../types";
import styles from "../pages/AdminDashboardPage.module.css";
import ParticipantActions from "./ParticipantActions";

type Props = {
    participants: ExperimentParticipantAssignment[];
    showAccountCreatedAt: boolean;
    isRemoving: boolean;
    onRemove: (participantId: string, participantName: string) => void;
};

export default function ParticipantTable({
    participants,
    showAccountCreatedAt,
    isRemoving,
    onRemove,
}: Props) {
    return (
        <Table
            className={`${styles.participantTable} ${
                showAccountCreatedAt ? styles.peopleTable : ""
            }`}
            horizontalSpacing="xl"
            verticalSpacing="sm"
        >
            <Table.Thead>
                <Table.Tr>
                    <Table.Th>姓名</Table.Th>
                    <Table.Th>郵件</Table.Th>
                    <Table.Th>角色</Table.Th>
                    <Table.Th>加入實驗時間</Table.Th>
                    {showAccountCreatedAt && (
                        <>
                            <Table.Th>帳號建立時間</Table.Th>
                            <Table.Th aria-label="操作" />
                        </>
                    )}
                </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
                {participants.map(({ participant, assignedAt }) => (
                    <Table.Tr key={participant.id}>
                        <Table.Td>{participant.name}</Table.Td>
                        <Table.Td>{participant.email}</Table.Td>
                        <Table.Td>
                            {participant.roles
                                .map((role) => roleLabels[role])
                                .join("、")}
                        </Table.Td>
                        <Table.Td>{formatDateTime(assignedAt)}</Table.Td>
                        {showAccountCreatedAt && (
                            <>
                                <Table.Td>
                                    {formatDateTime(participant.createdAt)}
                                </Table.Td>
                                <Table.Td>
                                    <ParticipantActions
                                        participantId={participant.id}
                                        participantName={participant.name}
                                        isRemoving={isRemoving}
                                        onRemove={onRemove}
                                    />
                                </Table.Td>
                            </>
                        )}
                    </Table.Tr>
                ))}
            </Table.Tbody>
        </Table>
    );
}
