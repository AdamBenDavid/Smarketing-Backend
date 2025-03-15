"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.httpServer = void 0;
//adam ben david 208298257
//aviv menahem 212292197
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const mongoose_1 = __importDefault(require("mongoose"));
const body_parser_1 = __importDefault(require("body-parser"));
const express_1 = __importDefault(require("express"));
const http_1 = require("http");
const posts_routes_1 = __importDefault(require("./routes/posts_routes"));
const comments_routes_1 = __importDefault(require("./routes/comments_routes"));
const users_routes_1 = __importDefault(require("./routes/users_routes"));
const auth_routes_1 = __importDefault(require("./routes/auth_routes"));
const chat_routes_1 = __importDefault(require("./routes/chat_routes"));
const gemini_routes_1 = __importDefault(require("./routes/gemini_routes"));
const swagger_jsdoc_1 = __importDefault(require("swagger-jsdoc"));
const swagger_ui_express_1 = __importDefault(require("swagger-ui-express"));
const cors_1 = __importDefault(require("cors"));
const path_1 = __importDefault(require("path"));
console.log("GOOGLE_CLIENT_ID:", process.env.GOOGLE_CLIENT_ID);
console.log("DB_CONNECT:", process.env.DB_CONNECT);
const socket_1 = require("./socket");
const app = (0, express_1.default)();
const httpServer = (0, http_1.createServer)(app);
exports.httpServer = httpServer;
app.use((0, cors_1.default)({
    origin: "http://localhost:5173",
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization"],
}));
//הגדלת הגודל שאפשר להעביר בבקשות (עשינו בשביל העברת התמונות לגימיני)
app.use(express_1.default.json({ limit: "10mb" }));
app.use(express_1.default.urlencoded({ limit: "10mb", extended: true }));
app.use(body_parser_1.default.json());
app.use(body_parser_1.default.urlencoded({ extended: true }));
app.use("/posts", posts_routes_1.default);
app.use("/comments", comments_routes_1.default);
app.use("/users", users_routes_1.default);
app.use("/auth", auth_routes_1.default);
app.use("/gemini", gemini_routes_1.default);
app.use("/uploads/profile_pictures", express_1.default.static(path_1.default.join(__dirname, "../uploads/profile_pictures")));
app.use("/uploads/post_images", express_1.default.static(path_1.default.join(__dirname, "../uploads/post_images")));
app.use("/images", express_1.default.static(path_1.default.join(__dirname, "../images")));
// example for a photo location:
// profile: http://localhost:3000/uploads/profile_pictures/your-profile.jpg
// posts: http://localhost:3000/uploads/post_images/your-post.jpg
app.use("/chat", chat_routes_1.default);
app.use("/uploads", express_1.default.static("uploads"));
app.use("/test", express_1.default.static("."));
const options = {
    definition: {
        openapi: "3.0.0",
        info: {
            title: "Web Dev 2025 REST API",
            version: "1.0.0",
            description: "REST server including authentication using JWT",
        },
        servers: [{ url: "http://localhost:3000" }],
    },
    apis: ["./src/routes/*.ts"],
};
const specs = (0, swagger_jsdoc_1.default)(options);
app.use("/api-docs", swagger_ui_express_1.default.serve, swagger_ui_express_1.default.setup(specs));
const db = mongoose_1.default.connection;
db.on("error", (error) => console.error(error));
db.once("open", () => console.log("Connected to MongoDB!"));
const initApp = () => {
    return new Promise((resolve, reject) => {
        if (!process.env.DB_CONNECT) {
            reject("DB_CONNECT is not defined in .env file");
        }
        else {
            mongoose_1.default
                .connect(process.env.DB_CONNECT)
                .then(() => {
                // Initialize Socket.IO
                (0, socket_1.initializeSocket)(httpServer);
                resolve(app);
            })
                .catch((error) => {
                reject(error);
            });
        }
    });
};
exports.default = initApp;
//# sourceMappingURL=server.js.map