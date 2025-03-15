"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = __importDefault(require("mongoose"));
const userSchema = new mongoose_1.default.Schema({
    email: {
        type: String,
        required: true,
        unique: true,
    },
    password: {
        type: String,
        required: true, //GENERATE RANDOM PASSWORD FOR GOOGLE SIGN IN
    },
    fullName: {
        type: String,
        required: false,
    },
    role: {
        type: String,
        default: "user",
        enum: ["user", "expert", "admin"],
    },
    refreshToken: {
        type: [String],
        default: [],
    },
    profilePicture: {
        type: String,
        required: false,
    },
});
const userModel = mongoose_1.default.model("Users", userSchema);
exports.default = userModel;
//# sourceMappingURL=user_modules.js.map