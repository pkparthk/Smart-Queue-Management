import { Request, Response } from "express";
import jwt from "jsonwebtoken";
import { validationResult } from "express-validator";
import User from "../models/User";
import { asyncHandler } from "../middleware/errorHandler";


const generateToken = (userId: string): string => {
  const jwtSecret = process.env.JWT_SECRET;
  if (!jwtSecret) {
    throw new Error("JWT_SECRET is not defined");
  }

  return jwt.sign({ userId }, jwtSecret, {
    expiresIn: process.env.JWT_EXPIRE || "7d",
  } as jwt.SignOptions);
};

export const register = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    // Check validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({
        success: false,
        message: "Validation failed",
        errors: errors.array(),
      });
      return;
    }

    const { email, password, name, role } = req.body;
    
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      res.status(400).json({
        success: false,
        message: "User already exists with this email",
      });
      return;
    }
    
    const user = await User.create({
      email,
      password,
      name,
      role: role || "manager",
    });
    
    const token = generateToken((user._id as string).toString());

    res.status(201).json({
      success: true,
      message: "User registered successfully",
      data: {
        user: {
          id: user._id,
          email: user.email,
          name: user.name,
          role: user.role,
        },
        token,
      },
    });
  }
);


export const login = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    // Check validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({
        success: false,
        message: "Validation failed",
        errors: errors.array(),
      });
      return;
    }

    const { email, password } = req.body;
    
    const user = await User.findOne({ email, isActive: true }).select(
      "+password"
    );
    if (!user) {
      res.status(401).json({
        success: false,
        message: "Invalid credentials",
      });
      return;
    }

    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      res.status(401).json({
        success: false,
        message: "Invalid credentials",
      });
      return;
    }

    const token = generateToken((user._id as string).toString());

    res.status(200).json({
      success: true,
      message: "Login successful",
      data: {
        user: {
          id: user._id,
          email: user.email,
          name: user.name,
          role: user.role,
        },
        token,
      },
    });
  }
);

export const getMe = asyncHandler(
  async (req: any, res: Response): Promise<void> => {
    const user = await User.findById(req.user._id);

    res.status(200).json({
      success: true,
      data: {
        user: {
          id: user!._id,
          email: user!.email,
          name: user!.name,
          role: user!.role,
          isActive: user!.isActive,
          createdAt: user!.createdAt,
        },
      },
    });
  }
);

export const updateProfile = asyncHandler(
  async (req: any, res: Response): Promise<void> => {
    
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({
        success: false,
        message: "Validation failed",
        errors: errors.array(),
      });
      return;
    }

    const { name, email } = req.body;
    
    if (email && email !== req.user.email) {
      const existingUser = await User.findOne({
        email,
        _id: { $ne: req.user._id },
      });
      if (existingUser) {
        res.status(400).json({
          success: false,
          message: "Email already in use",
        });
        return;
      }
    }

    const user = await User.findByIdAndUpdate(
      req.user._id,
      { name, email },
      { new: true, runValidators: true }
    );

    res.status(200).json({
      success: true,
      message: "Profile updated successfully",
      data: {
        user: {
          id: user!._id,
          email: user!.email,
          name: user!.name,
          role: user!.role,
        },
      },
    });
  }
);

export const changePassword = asyncHandler(
  async (req: any, res: Response): Promise<void> => {    
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({
        success: false,
        message: "Validation failed",
        errors: errors.array(),
      });
      return;
    }

    const { currentPassword, newPassword } = req.body;
    
    const user = await User.findById(req.user._id).select("+password");
    if (!user) {
      res.status(404).json({
        success: false,
        message: "User not found",
      });
      return;
    }
    
    const isCurrentPasswordValid = await user.comparePassword(currentPassword);
    if (!isCurrentPasswordValid) {
      res.status(400).json({
        success: false,
        message: "Current password is incorrect",
      });
      return;
    }
    
    user.password = newPassword;
    await user.save();

    res.status(200).json({
      success: true,
      message: "Password changed successfully",
    });
  }
);
