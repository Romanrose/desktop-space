import ts from "typescript";

const program = ts.createProgram(["electron/main.ts"], {
    module: ts.ModuleKind.CommonJS,
    target: ts.ScriptTarget.ES2022,
    strict: false,
    noEmit: true,
    skipLibCheck: true,
    esModuleInterop: true,
});

const diagnostics = ts.getPreEmitDiagnostics(program);
let hasErrors = false;
for (const d of diagnostics) {
    const pos = d.file?.getLineAndCharacterOfPosition(d.start!);
    console.log("Error line", (pos?.line ?? 0) + 1 + ":", d.messageText);
    hasErrors = true;
}
if (!hasErrors) console.log("No errors!");
