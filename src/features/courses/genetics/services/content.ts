import { api } from "../../../../shared/utils/api";

const BASE_URL = import.meta.env.VITE_BACKEND_BASE_URL as string;

export async function getText(id: string): Promise<string> {
    const res = await api<{ id: string; type: "TEXT"; content: string }>(
        `/api/content/text/${id}`
    );
    return res.content;
}

export function getMediaUrl(id: string): string {
    return `${BASE_URL}/api/content/media/${id}`;
}
