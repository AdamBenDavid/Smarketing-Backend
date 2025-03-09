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
const addPost = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    console.log("add post");
    try {
        const { postData, senderId } = req.body;
        const image = req.file ? `/uploads/${req.file.filename}` : null;
        const post = new post_modules_1.default({
            postData,
            senderId,
            image,
        });
        yield post.save();
        res.status(201).json(post);
    }
    catch (error) {
        res.status(400).json({ error: error.message });
    }
});
const getAllPosts = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        console.log("get all posts");
        const posts = yield post_modules_1.default.find();
        console.log("posts " + posts);
        res.send(posts);
    }
    catch (error) {
        res.status(400).send(error);
    }
});
const getPostById = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const postId = req.params.id;
    try {
        const post = yield post_modules_1.default.findById(postId);
        if (post != null) {
            res.status(200).json(post);
        }
        else {
            res.status(400).send("post not found");
        }
    }
    catch (error) {
        res.status(400).send(error);
    }
});
const deletePosts = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const posts = yield post_modules_1.default.deleteMany();
        res.send(posts);
    }
    catch (error) {
        res.status(400).send(error);
    }
});
const updatePostById = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const postId = req.params.id;
    const { postData, image } = req.body;
    try {
        const updatedPost = yield post_modules_1.default.findByIdAndUpdate(postId, { postData, image }, { new: true });
        if (!updatedPost) {
            return res.status(404).send("Post not found");
        }
        res.status(200).json(updatedPost);
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
            return res.status(404).json({ message: "No posts found for this user" });
        }
        res.status(200).json(posts);
    }
    catch (err) {
        console.error(" Error fetching user posts:", err);
        res.status(500).json({ error: "Internal Server Error" });
    }
});
const addLike = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const postId = req.params.id;
    try {
        const updatedPost = yield post_modules_1.default.findByIdAndUpdate(postId, { $inc: { likes: 1 } }, { new: true });
        if (!updatedPost) {
            return res.status(404).json({ message: "Post not found" });
        }
        res.status(200).json(updatedPost);
    }
    catch (error) {
        res.status(500).json({ message: "Internal Server Error", error });
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
};
//# sourceMappingURL=posts_controller.js.map