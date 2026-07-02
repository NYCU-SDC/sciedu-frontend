export async function parseSSE(
    reader: ReadableStreamDefaultReader<Uint8Array>,
    onData: (data: string) => void
) {
    const decoder = new TextDecoder();
    let buffer = "";

    while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder
            .decode(value, { stream: true })
            .replace(/\r\n/g, "\n"); // also normalize CRLF -> LF

        let sepIndex: number;
        while ((sepIndex = buffer.indexOf("\n\n")) != -1) {
            const rawEvent = buffer.slice(0, sepIndex);
            buffer = buffer.slice(sepIndex + 2);

            const lines = rawEvent.split("\n");
            for (const line of lines) {
                if (line.startsWith("data:")) {
                    const data = line.slice(5).trimStart();
                    onData(data);
                }
            }
        }
    }
}
