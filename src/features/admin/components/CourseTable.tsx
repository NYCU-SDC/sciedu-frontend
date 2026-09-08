import { Table } from "@mantine/core";

import { courseStatusLabels, formatDateTime } from "../formatters";
import type { ExperimentCourseAssignment } from "../types";
import styles from "../pages/AdminDashboardPage.module.css";

type Props = {
    courses: ExperimentCourseAssignment[];
};

export default function CourseTable({ courses }: Props) {
    return (
        <Table
            className={styles.materialTable}
            horizontalSpacing="xl"
            verticalSpacing="sm"
        >
            <Table.Thead>
                <Table.Tr>
                    <Table.Th>代碼</Table.Th>
                    <Table.Th>名稱</Table.Th>
                    <Table.Th>狀態</Table.Th>
                    <Table.Th>加入實驗時間</Table.Th>
                </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
                {courses.map(({ course, linkedAt }) => (
                    <Table.Tr key={course.id}>
                        <Table.Td>{course.code}</Table.Td>
                        <Table.Td>
                            <strong>{course.title}</strong>
                            <small>{course.description}</small>
                        </Table.Td>
                        <Table.Td>{courseStatusLabels[course.status]}</Table.Td>
                        <Table.Td>{formatDateTime(linkedAt)}</Table.Td>
                    </Table.Tr>
                ))}
            </Table.Tbody>
        </Table>
    );
}
