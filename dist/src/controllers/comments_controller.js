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
const addComment = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const comment = new comments_modules_1.default(req.body);
        yield comment.save();
        res.send(comment);
    }
    catch (error) {
        res.status(400).send(error);
    }
});
const getAllComments = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const comments = yield comments_modules_1.default.find();
        res.send(comments);
    }
    catch (error) {
        res.status(400).send(error);
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
    const commentId = req.params.id;
    try {
        const comment = yield comments_modules_1.default.findByIdAndDelete(commentId);
        if (!comment) {
            return res.status(404).send("Comment not found");
        }
        res.status(200).send(comment);
    }
    catch (error) {
        res.status(400).send(error);
    }
});
exports.default = { addComment, getAllComments, getCommentById, updateCommentById, deleteCommentById };
//# sourceMappingURL=comments_controller.js.map