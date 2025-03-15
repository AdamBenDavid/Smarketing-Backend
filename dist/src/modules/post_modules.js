"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = __importDefault(require("mongoose"));
const postSchema = new mongoose_1.default.Schema({
    senderId: {
        type: String,
        required: true,
    },
    postData: {
        type: String,
        required: true,
    },
    comments: {
        type: Array,
        required: false,
    },
    image: {
        type: String,
        required: false,
    },
    likes: {
        type: Array,
        required: false,
    },
});
const postModel = mongoose_1.default.model("Posts", postSchema);
exports.default = postModel;
//# sourceMappingURL=post_modules.js.map