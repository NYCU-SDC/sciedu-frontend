export function formatQuestionTitle(title: string, index: number): string {
    const trimmed = title.trim();
    const numericTitle = trimmed.match(/^(\d+)[.．、]?$/);
    if (numericTitle) return `題目 ${numericTitle[1]}`;
    if (/^題目\s*\d+/.test(trimmed)) return trimmed;
    return trimmed ? `題目 ${index + 1}｜${trimmed}` : `題目 ${index + 1}`;
}
