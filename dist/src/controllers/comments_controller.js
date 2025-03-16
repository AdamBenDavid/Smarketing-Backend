"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const comments_modules_1 = __importDefault(require("../modules/comments_modules"));
const post_modules_1 = __importDefault(require("../modules/post_modules"));
const user_modules_1 = __importDefault(require("../modules/user_modules"));
const mongoose_1 = __importDefault(require("mongoose"));
const addComment = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { userId, commentData, postId } = req.body;
        if (!userId || !commentData || !postId) {
            res.status(400).json({ error: "Missing required fields" });
            return;
        }
        if (!mongoose_1.default.Types.ObjectId.isValid(userId)) {
            res.status(400).json({ error: "Invalid userId format" });
            return;
        }
        const user = yield user_modules_1.default.findById(userId);
        if (!user) {
            res.status(404).json({ error: "User not found" });
            return;
        }
        const comment = new comments_modules_1.default({
            userId: user._id,
            fullName: user.fullName,
            profilePicture: user.profilePicture || "https://i.pravatar.cc/50",
            commentData,
            postId,
        });
        yield comment.save();
        const updatedPost = yield post_modules_1.default.findByIdAndUpdate(postId, { $push: { comments: comment._id } }, { new: true });
        if (!updatedPost) {
            res.status(404).json({ error: "Post not found" });
            return;
        }
        res.status(201).json(comment);
    }
    catch (error) {
        console.error("Error adding comment:", error);
        res.status(500).json({ error: "Internal Server Error" });
    }
});
const getAllComments = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { postId } = req.query;
        const filter = postId ? { postId } : {};
        const comments = yield comments_modules_1.default.find(filter).lean();
        const commentsWithUserData = yield Promise.all(comments.map((comment) => __awaiter(void 0, void 0, void 0, function* () {
            const user = yield user_modules_1.default.findById(comment.userId).lean();
            return Object.assign(Object.assign({}, comment), { fullName: (user === null || user === void 0 ? void 0 : user.fullName) || "Unknown User", profilePicture: (user === null || user === void 0 ? void 0 : user.profilePicture) || "" });
        })));
        res.status(200).json(commentsWithUserData);
    }
    catch (error) {
        console.error("Error fetching comments:", error);
        res.status(500).json({ error: "Internal Server Error" });
    }
});
const getCommentById = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const commentId = req.params.id;
    try {
        const comment = yield comments_modules_1.default.findById(commentId);
        if (comment != null)
            res.send(comment);
        else
            res.status(400).send("comment not found");
    }
    catch (error) {
        res.status(400).send(error);
    }
});
const updateCommentById = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const commentId = req.params.id;
    const updatedData = req.body;
    try {
        const updatedPost = yield comments_modules_1.default.findByIdAndUpdate(commentId, updatedData, {
            new: true,
        });
        if (!updatedPost) {
            return res.status(404).send("Post not found");
        }
        res.status(200).send(updatedPost);
    }
    catch (error) {
        res.status(400).send(error);
    }
});
const deleteCommentById = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    console.log("Delete request received for ID:", req.params.id);
    try {
        const commentId = req.params.id;
        const comment = yield comments_modules_1.default.findById(commentId);
        if (!comment) {
            return res.status(404).json({ error: "Comment not found" });
        }
        const userId = req.params.userId;
        if (comment.userId.toString() !== userId) {
            return res
                .status(403)
                .json({ error: "Forbidden: You can only delete your own comments" });
        }
        yield comments_modules_1.default.findByIdAndDelete(commentId);
        res.status(200).json({ message: "Comment deleted successfully" });
    }
    catch (error) {
        console.error("Error deleting comment:", error);
        res.status(500).json({ error: "Internal Server Error" });
    }
});
exports.default = {
    addComment,
    getAllComments,
    getCommentById,
    updateCommentById,
    deleteCommentById,
};
//# sourceMappingURL=comments_controller.js.map