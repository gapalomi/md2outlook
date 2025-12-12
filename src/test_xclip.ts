
import * as xclip from "xclip";

async function testClipboard() {
    try {
        const shell = xclip.getShell();
        const cb = shell.getClipboard();
        console.log("Clipboard object keys:", Object.keys(cb));
        console.log("Clipboard prototype keys:", Object.getOwnPropertyNames(Object.getPrototypeOf(cb)));
    } catch (e) {
        console.error(e);
    }
}

testClipboard();
