"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.StorageDriver = void 0;
// utils/storage.ts
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
exports.StorageDriver = {
    // Local disk (development)
    async uploadLocal(fileBuffer, filename, folder = "uploads") {
        const destDir = path_1.default.join(process.cwd(), folder);
        if (!fs_1.default.existsSync(destDir))
            fs_1.default.mkdirSync(destDir, { recursive: true });
        const filePath = path_1.default.join(destDir, `${Date.now()}-${filename}`);
        await fs_1.default.promises.writeFile(filePath, fileBuffer);
        // return file:// or URL path depending on your static hosting
        return { url: `/${path_1.default.basename(filePath)}`, key: filePath };
    },
    // TODO: add S3 upload function for prod (return S3 url + key)
    async uploadS3(_, __) {
        throw new Error("S3 upload not implemented in this example - implement using AWS SDK.");
    },
};
