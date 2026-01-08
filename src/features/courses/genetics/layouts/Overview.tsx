import "./Overview.css";
import Navbar from "../components/Navbar";
import { Button } from "@radix-ui/themes";

interface OverviewProps {
    onNext: () => void;
}

const Overview: React.FC<OverviewProps> = ({ onNext }) => {
    const tableData = [
        {
            title: "基因位置",
            classical: "不清楚基因的位置",
            molecular:
                "決定一性狀的一對基因分別位於同一對染色體的相對位置上。故稱之為等位基因。生物細胞內的染色體成雙成對。每種生物有一定的染色體數目，而每一對染色體上有許多對等位基因。",
        },
        {
            title: "基因與性狀關係",
            classical: "一個性狀由一對遺傳因子(等位基因)控制。",
            molecular:
                "基因經過轉錄、轉譯產生蛋白質，經過蛋白質的作用，而影響性狀。",
        },
        {
            title: "基因的分類(顯隱律)",
            classical:
                "決定一性狀的等位基因依照其對性狀的影響不同，分成兩種：顯性和隱性。當顯性基因與隱性基因組合在一起時，會表現出顯性基因的表徵。",
            molecular:
                "並不將基因分類，因為從分子遺傳學角度，所有基因都可以轉錄轉譯。只是當基因的序列不同的時候，蛋白質構造亦隨之改變，可能造成蛋白質的功能不同，因此性狀也隨之改變。",
        },
        {
            title: "一對等位基因分配至配子的機制",
            classical:
                "決定一性狀的等位基因在形成配子時，會分離到不同配子。受精後，受精卵中的等位基因恢復成對。",
            molecular:
                "產生配子時，染色體會先複製，再分裂兩次，此過程同源染色體分離至不同配子中。決定一性狀的等位基因在形成配子時，會隨染色體分離到不同配子。受精後，受精卵中的染色體恢復成對，其上的等位基因亦恢復成對。",
        },
        {
            title: "一對等位基因分配至配子的機制",
            classical:
                "決定一性狀的等位基因在形成配子時，會分離到不同配子。受精後，受精卵中的等位基因恢復成對。",
            molecular:
                "產生配子時，染色體會先複製，再分裂兩次，此過程同源染色體分離至不同配子中。決定一性狀的等位基因在形成配子時，會隨染色體分離到不同配子。受精後，受精卵中的染色體恢復成對，其上的等位基因亦恢復成對。",
        },
        {
            title: "一對等位基因分配至配子的機制",
            classical:
                "決定一性狀的等位基因在形成配子時，會分離到不同配子。受精後，受精卵中的等位基因恢復成對。",
            molecular:
                "產生配子時，染色體會先複製，再分裂兩次，此過程同源染色體分離至不同配子中。決定一性狀的等位基因在形成配子時，會隨染色體分離到不同配子。受精後，受精卵中的染色體恢復成對，其上的等位基因亦恢復成對。",
        },
    ];

    return (
        <div className="page-container">
            <Navbar activeStep={3} />
            <main className="table-content">
                <table className="comparison-table">
                    <thead>
                        <tr>
                            <th className="th-title"></th>
                            <th className="th-classical">古典遺傳學機制</th>
                            <th className="th-molecular">分子遺傳學機制</th>
                        </tr>
                    </thead>
                    <tbody>
                        {tableData.map((row, index) => (
                            <tr key={index}>
                                <td className="td-title">{row.title}</td>
                                <td className="td-content">{row.classical}</td>
                                <td className="td-content">{row.molecular}</td>
                            </tr>
                        ))}
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
};

export default Overview;
