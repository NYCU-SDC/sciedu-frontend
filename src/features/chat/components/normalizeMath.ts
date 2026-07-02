/**
 * Rewrites LaTeX-style math delimiters into the dollar delimiters that
 * `remark-math` understands:
 *
 * - `\( … \)` → `$ … $`   (inline)
 * - `\[ … \]` → `$$ … $$` (display)
 *
 * Models and the SCIEDU backend commonly emit `\(…\)` / `\[…\]`, which
 * `remark-math` ignores — so those formulas would otherwise render as literal
 * text. Code spans are left untouched (a fenced/inline code block may legitimately
 * contain `\(`), and unterminated opening delimiters are left as-is so a
 * mid-stream partial token doesn't wrap the rest of a message in broken math.
 */

/** A run of text that should be transformed, or a code span left verbatim. */
type Segment = { text: string; code: boolean };

const FENCE = /```[\s\S]*?```|~~~[\s\S]*?~~~/;
const INLINE_CODE = /`+[^`]*`+/;

/**
 * Splits `content` into alternating text / code segments so delimiter rewriting
 * only touches text outside code. Fenced blocks are matched before inline code.
 */
function splitCodeSegments(content: string): Segment[] {
    const segments: Segment[] = [];
    let rest = content;

    while (rest.length > 0) {
        const fence = FENCE.exec(rest);
        const inline = INLINE_CODE.exec(rest);

        // Pick whichever code region appears first (if any).
        const match: RegExpExecArray | null =
            fence && inline
                ? fence.index <= inline.index
                    ? fence
                    : inline
                : (fence ?? inline);

        if (!match) {
            segments.push({ text: rest, code: false });
            break;
        }

        if (match.index > 0) {
            segments.push({ text: rest.slice(0, match.index), code: false });
        }
        segments.push({ text: match[0], code: true });
        rest = rest.slice(match.index + match[0].length);
    }

    return segments;
}

/**
 * Replaces balanced `\(…\)` / `\[…\]` pairs in a non-code text run. An
 * unterminated opening delimiter is left untouched.
 */
function convertDelimiters(text: string): string {
    return text
        .replace(/\\\[([\s\S]*?)\\\]/g, (_match, body: string) => `$$${body}$$`)
        .replace(/\\\(([\s\S]*?)\\\)/g, (_match, body: string) => `$${body}$`);
}

export function normalizeMath(content: string): string {
    if (!content) return content;

    return splitCodeSegments(content)
        .map((segment) =>
            segment.code ? segment.text : convertDelimiters(segment.text)
        )
        .join("");
}
