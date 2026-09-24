const fs = require("fs");
const p = "C:/Users/DEVXRDP/Documents/Default Project/dashboard/shared/prompts.js";
let c = fs.readFileSync(p, "utf-8");
c = c.replace('${"Varad Agarwal", founder of Pixel Labs}', "${'Varad Agarwal, founder of Pixel Labs'}");
fs.writeFileSync(p, c);
console.log("done");