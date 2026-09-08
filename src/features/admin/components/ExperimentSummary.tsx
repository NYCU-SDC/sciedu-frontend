import { Badge, Card, Select, Text, Title } from "@mantine/core";
import { CalendarDays } from "lucide-react";

import { experimentStatusLabels, formatDateTime } from "../formatters";
import type { Experiment, ExperimentDetail } from "../types";
import styles from "../pages/AdminDashboardPage.module.css";

type Props = {
    experiment: ExperimentDetail;
    experiments: Experiment[];
    activeExperimentId: string;
    onExperimentChange: (experimentId: string) => void;
};

export default function ExperimentSummary({
    experiment,
    experiments,
    activeExperimentId,
    onExperimentChange,
}: Props) {
    const experimentRange = `${formatDateTime(
        experiment.scheduledStartAt
    )}－${formatDateTime(experiment.scheduledEndAt)}`;

    return (
        <Card
            component="section"
            className={styles.experimentCard}
            radius="lg"
            withBorder
        >
            <div className={styles.experimentCardContent}>
                <div className={styles.experimentInfo}>
                    <div className={styles.experimentTitleRow}>
                        <Title order={2}>{experiment.name}</Title>
                        <Badge color="orange" variant="light" radius="xl">
                            {experimentStatusLabels[experiment.status]}
                        </Badge>
                    </div>
                    <Text
                        c="dimmed"
                        size="sm"
                        className={styles.experimentDescription}
                    >
                        {experiment.description || "尚未提供實驗說明"}
                    </Text>
                    <div className={styles.metadata}>
                        <span>
                            <CalendarDays aria-hidden="true" />
                            {experimentRange}
                        </span>
                    </div>
                </div>
                <div className={styles.experimentSelect}>
                    <Select
                        label="切換實驗"
                        value={activeExperimentId}
                        allowDeselect={false}
                        data={experiments.map((item) => ({
                            value: item.id,
                            label: `${formatDateTime(
                                item.scheduledStartAt
                            ).slice(0, 7)}・${item.name}`,
                        }))}
                        onChange={(value) => {
                            if (value) onExperimentChange(value);
                        }}
                        radius="lg"
                        classNames={{
                            input: styles.mantineSelectInput,
                            dropdown: styles.mantineSelectDropdown,
                            option: styles.mantineSelectOption,
                        }}
                    />
                    <Text component="small" c="dimmed" size="xs">
                        切換實驗後，統計資料與下方列表會同步更新。
                    </Text>
                </div>
            </div>
        </Card>
    );
}
