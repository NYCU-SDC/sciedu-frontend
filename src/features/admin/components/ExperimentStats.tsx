import { Card } from "@mantine/core";

import { formatDateTime, gradingModeLabels } from "../formatters";
import type { ExperimentDetail } from "../types";
import styles from "../pages/AdminDashboardPage.module.css";

type Props = {
    experiment: ExperimentDetail;
    remainingDays: number;
};

export default function ExperimentStats({ experiment, remainingDays }: Props) {
    return (
        <section className={styles.stats} aria-label="實驗統計">
            <Card component="article" radius="lg" withBorder>
                <h3>參與人員</h3>
                <strong>{experiment.participantCount} 人</strong>
                <p>本場次目前指派人數</p>
            </Card>
            <Card component="article" radius="lg" withBorder>
                <h3>使用教材</h3>
                <strong>{experiment.courseCount} 份</strong>
                <p>本場次目前指派教材數量</p>
            </Card>
            <Card component="article" radius="lg" withBorder>
                <h3>剩餘時間</h3>
                <strong>
                    {remainingDays > 0 ? `約 ${remainingDays} 天` : "已結束"}
                </strong>
                <p>{formatDateTime(experiment.scheduledEndAt)} 結束</p>
            </Card>
            <Card component="article" radius="lg" withBorder>
                <h3>評分模式</h3>
                <strong>
                    {gradingModeLabels[experiment.configuration.gradingMode]}
                </strong>
                <p>依本場實驗設定顯示</p>
            </Card>
        </section>
    );
}
