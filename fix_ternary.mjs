import fs from "fs";
let content = fs.readFileSync("electron/main.ts", "utf-8");

const idx = content.indexOf(": (\"\uD83D\uDCDD");
if (idx > -1) {
    console.log("Found at", idx, "char before:", JSON.stringify(content[idx-1]), "char at:", content[idx]);
    content = content.substring(0, idx) + "?" + content.substring(idx + 1);
    fs.writeFileSync("electron/main.ts", content, "utf-8");
    console.log("Fixed!");
} else {
    const idx2 = content.indexOf("\uD83D\uDCDD");
    if (idx2 > -1) {
        console.log("Found emoji at", idx2, "context:", JSON.stringify(content.substring(idx2-5, idx2+10)));
    } else {
        console.log("Emoji not found");
    }
}
