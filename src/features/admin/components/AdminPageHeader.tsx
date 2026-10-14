import type { ReactNode } from "react";
import { ActionIcon, Card, Title } from "@mantine/core";
import { ArrowLeft } from "lucide-react";

import styles from "./AdminPageHeader.module.css";

type Props = {
    title: ReactNode;
    afterTitle?: ReactNode;
    actions?: ReactNode;
    backLabel?: string;
    onBack?: () => void;
};

export default function AdminPageHeader({
    title,
    afterTitle,
    actions,
    backLabel = "返回",
    onBack,
}: Props) {
    return (
        <Card
            component="header"
            className={styles.header}
            radius="lg"
            withBorder
        >
            <div className={styles.titleGroup}>
                {onBack && (
                    <ActionIcon
                        className={styles.backButton}
                        variant="subtle"
                        size={24}
                        aria-label={backLabel}
                        onClick={onBack}
                    >
                        <ArrowLeft aria-hidden="true" />
                    </ActionIcon>
                )}
                <Title order={1} className={styles.title}>
                    {title}
                </Title>
                {afterTitle && (
                    <div className={styles.afterTitle}>{afterTitle}</div>
                )}
            </div>
            {actions && <div className={styles.actions}>{actions}</div>}
        </Card>
    );
}
