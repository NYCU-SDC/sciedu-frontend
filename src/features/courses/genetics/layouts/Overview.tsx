import "./Overview.css";
import { Button } from "@radix-ui/themes";
import type { CourseContent } from "../types/types";
import { type JSX } from "react";

export function Overview({ onNext }: { onNext: () => void }): JSX.Element {
    const tableData: CourseContent[] = [
        {
            type: "Overview",
            content: {
                title: "基因位置",
                classical: "不清楚基因的位置",
                material:
                    "決定一性狀的一對基因分別位於同一對染色體的相對位置上。故稱之為等位基因。生物細胞內的染色體成雙成對。每種生物有一定的染色體數目，而每一對染色體上有許多對等位基因。",
            },
        },
        {
            type: "Overview",
            content: {
                title: "基因與性狀關係",
                classical: "一個性狀由一對遺傳因子(等位基因)控制。",
                material:
                    "基因經過轉錄、轉譯產生蛋白質，經過蛋白質的作用，而影響性狀。",
            },
        },
        {
            type: "Overview",
            content: {
                title: "基因的分類(顯隱律)",
                classical:
                    "決定一性狀的等位基因依照其對性狀的影響不同，分成兩種：顯性和隱性。當顯性基因與隱性基因組合在一起時，會表現出顯性基因的表徵。",
                material:
                    "並不將基因分類，因為從分子遺傳學角度，所有基因都可以轉錄轉譯。只是當基因的序列不同的時候，蛋白質構造亦隨之改變，可能造成蛋白質的功能不同，因此性狀也隨之改變。",
            },
        },
        {
            type: "Overview",
            content: {
                title: "一對等位基因分配至配子的機制",
                classical:
                    "決定一性狀的等位基因在形成配子時，會分離到不同配子。受精後，受精卵中的等位基因恢復成對。",
                material:
                    "產生配子時，染色體會先複製，再分裂兩次，此過程同源染色體分離至不同配子中。決定一性狀的等位基因在形成配子時，會隨染色體分離到不同配子。受精後，受精卵中的染色體恢復成對，其上的等位基因亦恢復成對。",
            },
        },
        {
            type: "Overview",
            content: {
                title: "兩對等位基因分配至配子的機制",
                classical:
                    "決定兩性狀的兩對等位基因，形成配子的過程為兩個獨立事件，互不影響。",
                material:
                    "若兩等位基因位在同一對染色體，則兩等位基因憶起隨此染色體分離至不同配子中。但有機會發生互換，則配子基因型會有不同組合及比例。若兩等位基因位在不同對染色體，基因隨染色體分配到不同配子中，兩對等位基因形成配子的過程為兩個獨立事件，互不影響。",
            },
        },
        {
            type: "Overview",
            content: {
                title: "中間型遺傳共顯性",
                classical:
                    "違反顯隱律，修正某些狀快下，當顯性基因與隱性基因組合在一起時，會表現出中間型的表徵。在另一些狀況下，則兩者皆表現。",
                material:
                    "皆可以使用上面轉錄轉譯的機制說明。中間型遺傳是因為顯性基因轉錄轉譯出有功能的蛋白質，而隱性基因轉錄轉譯出無功能的蛋白質，因此表現量只有一半。共顯性則是兩種基因皆表現，但表現出不同的蛋白質，所以性狀兩者皆顯現出來。",
            },
        },
    ];

    return (
        <div className="page-container">
            <main className="table-content">
                <table className="comparison-table">
                    <thead>
                        <tr>
                            <th className="th-title"></th>
                            <th className="th-classical">古典遺傳學機制</th>
                            <th className="th-material">分子遺傳學機制</th>
                        </tr>
                    </thead>
                    <tbody>
                        {tableData.map((row, index) => {
                            // 使用 if 或 switch 進行型別縮窄 (Type Narrowing)
                            if (row.type === "Overview") {
                                return (
                                    <tr key={index}>
                                        <td className="td-title">
                                            {row.content.title}
                                        </td>
                                        <td className="td-content">
                                            {row.content.classical}
                                        </td>
                                        <td className="td-content">
                                            {row.content.material}
                                        </td>
                                    </tr>
                                );
                            }

                            // 處理其他型別 (例如 Material 或 Questions)
                            // 如果其他型別不需要顯示在表格，可以回傳 null 或不同的 <tr>
                            return (
                                <tr key={index}>
                                    <td colSpan={3}>
                                        此頁面（{row.type}）不包含概覽資訊
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
                        style={{
                            cursor: "pointer",
                            backgroundColor: "#79c5bc",
                            width: "350px",
                            height: "35px",
                        }}
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
