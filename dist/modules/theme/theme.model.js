"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = __importStar(require("mongoose"));
const ColorsSchema = new mongoose_1.Schema({
    primary: { type: String, default: "#0177fb" },
    secondary: { type: String, default: "#0156c7" },
    accent: { type: String, default: "#f59e0b" },
    background: { type: String, default: "#ffffff" },
    text: { type: String, default: "#101828" },
    heading: { type: String, default: "#101828" },
}, { _id: false, strict: false });
const FontsSchema = new mongoose_1.Schema({
    heading: { type: String, default: "Inter" },
    body: { type: String, default: "Inter" },
}, { _id: false, strict: false });
const GlobalStylesSchema = new mongoose_1.Schema({
    colors: { type: ColorsSchema, default: () => ({}) },
    fonts: { type: FontsSchema, default: () => ({}) },
    borderRadius: { type: String, default: "0.5rem" },
    spacing: { type: String, default: "1rem" },
    customCSS: { type: String, default: "" },
}, { _id: false });
const ThemeSchema = new mongoose_1.Schema({
    name: { type: String, required: true, trim: true },
    slug: { type: String, unique: true, lowercase: true, trim: true, index: true },
    description: { type: String, default: "" },
    thumbnail: { type: String, default: "" },
    category: { type: mongoose_1.Schema.Types.ObjectId, ref: "ThemeCategory" },
    tags: [{ type: String, trim: true }],
    isActive: { type: Boolean, default: true, index: true },
    sortOrder: { type: Number, default: 0, index: true },
    globalStyles: { type: GlobalStylesSchema, default: () => ({}) },
    pages: [{ type: mongoose_1.Schema.Types.ObjectId, ref: "PageTemplate" }],
    modules: [{ type: mongoose_1.Schema.Types.ObjectId, ref: "ModulePreset" }],
    version: { type: String, default: "1.0.0" },
    author: { type: String, default: "" },
}, {
    timestamps: true,
    versionKey: false,
});
// Index for public queries
ThemeSchema.index({ isActive: 1, sortOrder: 1 });
exports.default = mongoose_1.default.model("Theme", ThemeSchema);
