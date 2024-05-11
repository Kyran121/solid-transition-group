import { diff } from "@vitest/utils/diff";

const DIFF_OPTIONS = {
  aAnnotation: "__REMOVE_ME__",
  bAnnotation: "__REMOVE_ME__",
  contextLines: 0,
  expand: false
};

export function snapshotDiff(previous: string, current: string): string {
  const cleanedDiff = cleanDiffAnnotations(diff(previous, current, DIFF_OPTIONS)!);
  return indentLines(reindent(cleanedDiff));
}

function cleanDiffAnnotations(diffOutput: string): string {
  return diffOutput
    .replace(/\n+@@([^@@]*)@@/g, "") // Remove top level @@ signs
    .replace(/@@([^@@]*)@@/g, "---") // Replace in-between @@ signs with '---'
    .replace(/[-+] __REMOVE_ME__\n/g, ""); // Remove annotation lines
}

function indentLines(formattedDiff: string): string {
  return formattedDiff
    .split("\n")
    .map(line => `    ${line}`)
    .join("\n");
}

function reindent(diff: string): string {
  const lines = diff.trim().split("\n");
  const minIndentation = findMinimumIndentation(lines);
  return lines.map(line => reindentLine(line, minIndentation)).join("\n");
}

function findMinimumIndentation(lines: string[]): number {
  return lines.reduce((minSpaces, line) => {
    if (line.trim() === "---") return minSpaces;
    const spaces = line.match(/^[+-](\s+)/)?.[1]?.length;
    return spaces ? Math.min(minSpaces, spaces) : minSpaces;
  }, Infinity);
}

function reindentLine(line: string, minSpaces: number): string {
  return line.trim() === "---"
    ? line
    : line.replace(new RegExp(`^([+-])\\s{${minSpaces}}`), `$1  `);
}
