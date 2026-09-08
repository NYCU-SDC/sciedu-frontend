import { ActionIcon, Menu } from "@mantine/core";
import { MoreVertical, Trash2 } from "lucide-react";

type Props = {
    participantId: string;
    participantName: string;
    isRemoving: boolean;
    onRemove: (participantId: string, participantName: string) => void;
};

export default function ParticipantActions({
    participantId,
    participantName,
    isRemoving,
    onRemove,
}: Props) {
    return (
        <Menu
            position="bottom-end"
            withinPortal
            hideDetached={false}
            transitionProps={{ duration: 0 }}
            shadow="md"
            radius="md"
        >
            <Menu.Target>
                <ActionIcon
                    variant="subtle"
                    color="brandTeal"
                    aria-label={`開啟 ${participantName} 的操作選單`}
                    radius="md"
                >
                    <MoreVertical size={20} aria-hidden="true" />
                </ActionIcon>
            </Menu.Target>
            <Menu.Dropdown>
                <Menu.Item
                    color="red"
                    leftSection={<Trash2 size={16} aria-hidden="true" />}
                    disabled={isRemoving}
                    onClick={() => onRemove(participantId, participantName)}
                >
                    刪除
                </Menu.Item>
            </Menu.Dropdown>
        </Menu>
    );
}
