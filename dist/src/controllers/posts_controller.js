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
const post_modules_1 = __importDefault(require("../modules/post_modules"));
const multer_1 = __importDefault(require("multer"));
("../modules/user_modules");
const comments_modules_1 = __importDefault(require("../modules/comments_modules"));
const addPost = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { postData, senderId } = req.body;
        console.log("add post postData " + postData + "senderId " + senderId);
        if (!senderId) {
            res.status(400).json({ error: "Sender ID is required" });
            return;
        }
        const image = req.file ? `uploads/post_images/${req.file.filename}` : null;
        const post = new post_modules_1.default({ postData, senderId, image });
        yield post.save();
        res.status(201).json({
            _id: post._id,
            postData: post.postData,
            sender: senderId,
            image: image ? `http://localhost:3000/${image}` : null,
        });
        return;
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
const getAllPosts = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const posts = yield post_modules_1.default.find().populate("comments");
        // Fetch comments for each post safely
        const postsWithComments = yield Promise.all(posts.map((post) => __awaiter(void 0, void 0, void 0, function* () {
            if (!post)
                return {};
            const comments = yield comments_modules_1.default.find({ postId: post._id });
            return Object.assign(Object.assign({}, post.toObject()), { comments });
        })));
        res
            .status(200)
            .json(postsWithComments.filter((p) => Object.keys(p).length > 0));
    }
    catch (error) {
        res.status(500).json({ error: "Internal server error" });
    }
});
const getPostById = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const postId = req.params.id;
    try {
        const post = yield post_modules_1.default.findById(postId).populate("comments");
        if (!post) {
            res.status(404).json({ error: "Post not found" });
            return;
        }
        const comments = yield comments_modules_1.default.find({ postId });
        res.status(200).json(Object.assign(Object.assign({}, post.toObject()), { comments }));
    }
    catch (error) {
        res.status(500).json({ error: "Internal server error" });
    }
});
const upload = (0, multer_1.default)({ dest: "uploads/post_images" });
const updatePostById = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const postId = req.params.id;
    const { postData } = req.body;
    try {
        const existingPost = yield post_modules_1.default.findById(postId);
        if (!existingPost) {
            return res.status(404).json({ error: "Post not found" });
        }
        const image = req.file
            ? `uploads/post_images/${req.file.filename}`
            : existingPost.image;
        // עדכון הפוסט
        const updatedPost = yield post_modules_1.default.findByIdAndUpdate(postId, { postData, image }, { new: true });
        if (!updatedPost) {
            return res.status(404).json({ error: "Post not found" });
        }
        res.status(200).json(updatedPost);
        return;
    }
    catch (error) {
        res.status(400).json({ error: error.message });
    }
});
// Controller to get posts by sender
//here
const getPostBySenderId = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { userId } = req.params; // Extract userId from the URL
    if (!userId) {
        return res.status(400).json({ error: "User ID is required" });
    }
    try {
        const posts = yield post_modules_1.default.find({ senderId: userId }); // Find posts by senderId
        if (posts.length === 0) {
            return res.status(200).json({ message: "No posts found for this user" });
        }
        res.status(200).json(posts);
        return;
    }
    catch (err) {
        res.status(500).json({ error: "Internal Server Error" });
    }
});
const addLike = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    console.log("🔹 req.params:", JSON.stringify(req.params, null, 2));
    const { postId } = req.params;
    const { userId } = req.body;
    if (!userId) {
        res.status(400).json({ message: "User ID is required" });
        return;
    }
    console.log("🔹 postId:", postId);
    console.log("🔹 userId:", userId);
    try {
        const post = yield post_modules_1.default.findById(postId);
        if (!post) {
            res.status(404).json({ message: "Post not found" });
            return;
        }
        if (!Array.isArray(post.likes))
            post.likes = [];
        if (!post.likes.includes(userId)) {
            post.likes.push(userId);
            yield post.save();
        }
        res.status(200).json({ message: "Post liked", likes: post.likes.length });
    }
    catch (error) {
        res.status(500).json({ message: "Server error", error });
    }
});
const removeLike = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { postId } = req.params;
        const { userId } = req.body;
        if (!userId) {
            res.status(400).json({ message: "User ID is required" });
            return;
        }
        const post = yield post_modules_1.default.findById(postId);
        if (!post) {
            res.status(404).json({ message: "Post not found" });
            return;
        }
        if (!Array.isArray(post.likes))
            post.likes = [];
        post.likes = post.likes.filter((like) => like.toString() !== userId.toString());
        yield post.save();
        res.status(200).json({ message: "Like removed", likes: post.likes.length });
        return;
    }
    catch (error) {
        res.status(500).json({ message: "Server error", error });
    }
});
const deletePosts = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const posts = yield post_modules_1.default.deleteMany();
        res.send(posts);
        return;
    }
    catch (error) {
        res.status(400).send(error);
    }
});
const deletePostById = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const postId = req.params.id;
    try {
        const deletedPost = yield post_modules_1.default.findByIdAndDelete(postId);
        if (!deletedPost) {
            res.status(404).json({ message: "Post not found" });
            return;
        }
        res.status(200).json({ message: "Post deleted successfully" });
        return;
    }
    catch (error) {
        res.status(500).json({ error: "Internal Server Error" });
    }
});
exports.default = {
    addPost,
    getAllPosts,
    getPostById,
    deletePosts,
    updatePostById,
    getPostBySenderId,
    addLike,
    removeLike,
    deletePostById,
};
//# sourceMappingURL=posts_controller.js.map