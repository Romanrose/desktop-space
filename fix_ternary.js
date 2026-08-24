const fs = require("fs");
const content = fs.readFileSync("electron/main.ts", "utf-8");

// The bug: I replaced the ternary "?" with ":" 
// Find the pattern ': (\"📝 记忆摘要' and replace with '? (\"📝 记忆摘要'
const idx = content.indexOf(": (\"\uD83D\uDCDD \u8BB0\u5FC6\u6458\u8981");
if (idx > -1) {
    console.log("Found broken ternary at position", idx);
    const fixed = content.substring(0, idx) + "?" + content.substring(idx + 1);
    fs.writeFileSync("electron/main.ts", fixed, "utf-8");
    console.log("Fixed!");
} else {
    console.log("Not found at first pattern, trying alternative...");
    // Maybe the colon is before the parenthesis differently
    const idx2 = content.indexOf("\uD83D\uDCDD \u8BB0\u5FC6\u6458\u8981");
    if (idx2 > -1) {
        const before = content.substring(idx2 - 3, idx2);
        console.log("Chars before emoji:", JSON.stringify(before));
        // Check if there's a : instead of ? 
        if (content[idx2 - 1] === ":") {
            content = content.substring(0, idx2 - 1) + "?" + content.substring(idx2);
            fs.writeFileSync("electron/main.ts", content, "utf-8");
            console.log("Fixed by replacing : before emoji with ?");
        } else if (content[idx2 - 2] === ":") {
            content = content.substring(0, idx2 - 2) + "?" + content.substring(idx2 - 1);
            fs.writeFileSync("electron/main.ts", content, "utf-8");
            console.log("Fixed by replacing : before space with ?");
        }
    }
}
