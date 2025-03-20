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
exports.deletePostById = void 0;
const post_modules_1 = __importDefault(require("../modules/post_modules"));
const multer_1 = __importDefault(require("multer"));
("../modules/user_modules");
const comments_modules_1 = __importDefault(require("../modules/comments_modules"));
const mongoose_1 = __importDefault(require("mongoose"));
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const addPost = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { postData, senderId } = req.body;
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
            image: image ? `${process.env.BASE_URL}/${image}` : null,
        });
        return;
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
const getAllPosts = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 6;
        const skip = (page - 1) * limit;
        const posts = yield post_modules_1.default
            .find()
            .populate("comments")
            .skip(skip)
            .limit(limit);
        const totalPosts = yield post_modules_1.default.countDocuments();
        res.status(200).json({
            posts,
            hasMore: page * limit < totalPosts,
        });
    }
    catch (error) {
        res.status(500).json({ error: "Internal server error" });
    }
});
const getPostById = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const postId = req.params.id;
    if (!mongoose_1.default.Types.ObjectId.isValid(postId) || !postId) {
        return res.status(400).json({ error: "Invalid post ID" });
    }
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
        let image = existingPost.image;
        //delete previous image from db
        if (req.file) {
            const newImagePath = `uploads/post_images/${req.file.filename}`;
            const oldImagePath = existingPost.image
                ? path_1.default.join(__dirname, "../../", existingPost.image)
                : null;
            if (oldImagePath && fs_1.default.existsSync(oldImagePath)) {
                try {
                    yield fs_1.default.promises.unlink(oldImagePath);
                }
                catch (err) {
                    console.error("Error deleting old post image:", err);
                }
            }
            image = newImagePath;
        }
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
    const { postId } = req.params;
    const { userId } = req.body;
    if (!userId) {
        res.status(400).json({ message: "User ID is required" });
        return;
    }
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
        const allposts = yield post_modules_1.default.find();
        yield Promise.all(allposts.map((post) => {
            if (post.image) {
                const imagePath = path_1.default.join(__dirname, "../../uploads/post_images", post.image.split("/").pop());
                return new Promise((resolve, reject) => {
                    fs_1.default.unlink(imagePath, (err) => {
                        if (err) {
                            console.error(`Failed to delete image: ${post.image}`, err);
                            reject(err);
                        }
                        else {
                            resolve(true);
                        }
                    });
                });
            }
        }));
        const deletedPosts = yield post_modules_1.default.deleteMany();
        res.status(200).json({
            message: "All posts and images deleted successfully",
            deletedPosts,
        });
    }
    catch (error) {
        console.error("Error deleting posts and images:", error);
        res.status(500).json({ error: "Internal server error", details: error });
    }
});
const deletePostById = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const postId = req.params.id;
    try {
        const post = yield post_modules_1.default.findById(postId);
        if (!post) {
            res.status(404).json({ message: "Post not found" });
            return;
        }
        //delete image from db
        if (post.image) {
            const imagePath = path_1.default.join(__dirname, "../../uploads/post_images", post.image.split("/").pop());
            try {
                yield fs_1.default.promises.unlink(imagePath);
                console.log("Image deleted successfully:", post.image);
            }
            catch (err) {
                console.error("Failed to delete image:", err);
            }
        }
        const deletedPost = yield post_modules_1.default.findByIdAndDelete(postId);
        if (!deletedPost) {
            res.status(404).json({ message: "Post not found" });
            return;
        }
        res.status(200).json({ message: "✅ Post deleted successfully" });
    }
    catch (error) {
        console.error("❌ Error deleting post:", error);
        res.status(500).json({ error: "Internal Server Error" });
    }
});
exports.deletePostById = deletePostById;
exports.default = {
    addPost,
    getAllPosts,
    getPostById,
    deletePosts,
    updatePostById,
    getPostBySenderId,
    addLike,
    removeLike,
    deletePostById: exports.deletePostById,
};
//# sourceMappingURL=posts_controller.js.map