export default class Emojify {
    constructor() {
        throw new Error("Do not instantiate Emojify");
    }

    static emojify(str) {
        return str.toLowerCase()
            .split("")
            .map(c => c.codePointAt(0) >= 97 && c.codePointAt(0) <= 122 ? String.fromCodePoint(127365 + c.codePointAt(0)) + ' ' : c)
            .map(c => c.codePointAt(0) >= 48 && c.codePointAt(0) <= 57 ? c + String.fromCodePoint(8419) : c)
            .join("");
    }
}