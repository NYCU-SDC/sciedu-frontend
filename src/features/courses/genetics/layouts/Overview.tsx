import "./Overview.css";
import { Button } from "@radix-ui/themes";
import type { OverviewType } from "../types/types";

type Props = {
    data: OverviewType;
    onNext: () => void;
};

export default function Overview({ data, onNext }: Props) {
    return (
        <div className="page-container">
            <main className="table-content">
                <table className="comparison-table">
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
                                <th key={index} className="th-title">
                                    {label}
                                </th>
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
                                                    ? "td-title"
                                                    : "td-content"
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
                <footer className="footer-nav">
                    <Button
                        className="shadow-button"
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
