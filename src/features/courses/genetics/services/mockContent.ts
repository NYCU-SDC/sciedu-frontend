import peaImage from "../../../../assets/images/A1.avif";

const mockTexts: Record<string, string> = {
    "00000000-0000-0000-0000-000000000002":
        "古典遺傳學強調基因型可直接決定表現型，基因在古典遺傳是一個抽象概念。認為顯性基因會表現在個體表徵，若一個體中顯性和隱性基因同時存在，則此隱性基因不會表現。豌豆種皮由一對基因控制，R代表顯性基因，r代表隱性基因。若豌豆具有R基因，則種皮形狀為平滑；若控制豌豆種皮形狀的一對基因均為r，則種皮形狀為皺皮。若R和r同時存在，則隱性性狀不會表現，只有顯性性狀會表現，種皮呈現平滑。",
};

const mockMedia: Record<string, string> = {
    "00000000-0000-0000-0000-000000000001": peaImage,
};

export async function getText(id: string): Promise<string> {
    return mockTexts[id] ?? "";
}

export function getMediaUrl(id: string): string {
    return mockMedia[id] ?? "";
}
