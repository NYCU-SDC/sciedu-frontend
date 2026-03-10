import { Button } from "@radix-ui/themes";
import type { OverviewType } from "../types/types";
import styles from "./Overview.module.css";
import SubmitButtonStyles from "../components/SubmitButton.module.css";

type Props = {
    data: OverviewType;
    onNext: () => void;
};

export default function Overview({ data, onNext }: Props) {
    return (
        <div className={styles.pageContainer}>
            <main className={styles.tableContent}>
                <table className={styles.comparisonTable}>
                    {data.styling?.ratio && (
                        <colgroup>
                            {data.styling.ratio.map((r, i) => (
                                <col key={i} style={{ width: `${r}%` }} />
                            ))}
                        </colgroup>
                    )}
                    <thead>
                        <tr>
                            {data.content.header.map((label, index) => (
                                <th key={index}>{label}</th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {data.content.content.map((row, rowIndex) => {
                            return (
                                <tr key={rowIndex}>
                                    {row.map((cell, cellIndex) => (
                                        <td
                                            key={cellIndex}
                                            className={
                                                cellIndex === 0 &&
                                                data.styling?.titleColumn
                                                    ? styles.tdTitle
                                                    : styles.tdContent
                                            }
                                        >
                                            {cell}
                                        </td>
                                    ))}
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
                <footer className={styles.footerNav}>
                    <Button
                        className={SubmitButtonStyles.shadowButton}
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
