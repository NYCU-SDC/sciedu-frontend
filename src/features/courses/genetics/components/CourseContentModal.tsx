import { Modal } from "@mantine/core";
import type { ReactNode } from "react";

import styles from "./CourseContentModal.module.css";

type Props = {
    opened: boolean;
    title: string;
    children: ReactNode;
    onClose: () => void;
};

export default function CourseContentModal({
    opened,
    title,
    children,
    onClose,
}: Props) {
    return (
        <Modal
            opened={opened}
            onClose={onClose}
            title={title}
            centered
            size="xl"
            radius="lg"
            overlayProps={{ backgroundOpacity: 0.42, blur: 2 }}
            classNames={{
                content: styles.content,
                header: styles.header,
                title: styles.title,
                body: styles.body,
            }}
        >
            {children}
        </Modal>
    );
}
