import "./Overview.css";
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
        <div className="page-container">
            <main className="table-content">
                <table className="comparison-table">
                    <thead>
                        <tr>
                            <th className="th-title"></th>
                            <th className="th-classical">
                                {data.content.label[0]}
                            </th>
                            <th className="th-material">
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
                                    <td className="td-title">{rowTitle}</td>
                                    <td className="td-content">
                                        {rowClassical}
                                    </td>
                                    <td className="td-content">
                                        {rowMaterial}
                                    </td>
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

export default Overview;
