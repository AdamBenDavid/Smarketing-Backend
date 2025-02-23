import userModel,{ User }  from "../models/user_model";
import { Request, Response } from "express";

// Create user
const createUser = async (req:Request, res:Response) => {
    try {
        const user = new userModel(req.body);
        await user.save();
        res.status(200).send(user);
    } catch (error) {
        res.status(400).send(error);
    }
}

//Read (get) user by id
const getUserById = async (req:Request, res:Response) => {
    const userId = req.params.id; // returns mail instead of id
    try {
        const user = await userModel.findById(userId);
        if (user != null) res.send(user);
        else res.status(400).send("user not found");
    } catch (error) {
        res.status(400).send(error);
    }
}

// Update Password by id
const updatePasswordById = async (req:Request, res:Response) => {
    const id = req.params.id;
    const updatedData = req.body;

    try {
        const updatedUser = await userModel.findOneAndUpdate(
            { _id: id },
            updatedData,
            {
                new: true,
            }
        );
        if (!updatedUser) {
            return res.status(404).send("User not found");
        }
        res.status(200).send(updatedUser);
    } catch (error) {
        res.status(400)
    }
}

// Update fav' pat by id
const updateFavPatById = async (req:Request, res:Response) => {
    const id = req.params.id;
    const updatedData = req.body;

    try {
        const updatedUser = await userModel.findOneAndUpdate(
            { _id: id },
            updatedData,
            {
                new: true,
            }
        );
        if (!updatedUser) {
            return res.status(404).send("User not found");
        }
        res.status(200).send(updatedUser);
    } catch (error) {
        res.status(400).send(error);
    }
}

// Delete user by id
const deleteUserById = async (req:Request, res:Response) => {
    const id = req.params.id;

    try {
        const user = await userModel.findOneAndDelete({ _id: id });
        if (!user) {
            return res.status(404).send("User not found");
        }
        res.status(200).send(user);
    } catch (error) {
        res.status(400).send(error);
    }
}

//get all users
const getAllUsers = async (req:Request, res:Response) => {
    try {
        const users = await userModel.find();
        res.send(users);
    } catch (error) {
        res.status(400).send(error);
    }
}

const updateProfile = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.params.id;
    const { fullName } = req.body;
    const profilePicture = req.file;

    const updateData: any = { fullName };
    if (profilePicture) {
      // TODO: Upload image to cloud storage (e.g., AWS S3)
      // For now, just store the file path
      updateData.profilePicture = profilePicture.path;
    }

    const user = await userModel.findByIdAndUpdate(
      userId,
      updateData,
      { new: true }
    );

    if (!user) {
      res.status(404).json({ error: "User not found" });
      return;
    }

    res.status(200).json(user);
  } catch (error) {
    console.error('Error updating profile:', error);
    res.status(500).json({ error: "Failed to update profile" });
  }
};

export default { createUser, getUserById, updatePasswordById, updateFavPatById, deleteUserById, getAllUsers, updateProfile };