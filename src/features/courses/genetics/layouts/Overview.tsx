import styles from "./Overview.module.css";
import { Button } from "@radix-ui/themes";
import type { OverviewType } from "../types/types";
import { type JSX } from "react";

export function Overview({
    data,
    onNext,
}: {
    data: OverviewType;
    onNext: () => void;
}): JSX.Element {
    return (
        <div className={styles["page-container"]}>
            <main className={styles["table-content"]}>
                <table className={styles["comparison-table"]}>
                    <thead>
                        <tr>
                            <th className={styles["th-title"]}></th>
                            <th className={styles["th-classical"]}>
                                {data.content.label[0]}
                            </th>
                            <th className={styles["th-material"]}>
                                {data.content.label[1]}
                            </th>
                        </tr>
                    </thead>
                    <tbody>
                        {data.content.rows.title.map((_, index) => {
                            // get row data by index
                            const rowTitle = data.content.rows.title[index];
                            const rowClassical =
                                data.content.rows.classical[index];
                            const rowMaterial =
                                data.content.rows.material[index];
                            return (
                                <tr key={index}>
                                    <td className={styles["td-title"]}>
                                        {rowTitle}
                                    </td>
                                    <td className={styles["td-content"]}>
                                        {rowClassical}
                                    </td>
                                    <td className={styles["td-content"]}>
                                        {rowMaterial}
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
                <footer className={styles["footer-nav"]}>
                    <Button
                        className={styles["shadow-button"]}
                        variant="solid"
                        highContrast
                        onClick={onNext}
                        radius="full"
                    >
                        下一頁
                    </Button>
                </footer>
            </main>
        </div>
    );
}

export default Overview;
