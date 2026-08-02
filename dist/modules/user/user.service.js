"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteUserFromDB = exports.updateUserInDB = exports.getSingleUserFromDB = exports.getUsersFromDB = void 0;
const user_model_1 = __importDefault(require("../../models/user.model"));
const getUsersFromDB = async ({ page = 1, limit = 10, search, role, emailVerified, }) => {
    const query = {};
    // Search
    if (search) {
        query.$or = [
            {
                name: {
                    $regex: search,
                    $options: "i",
                },
            },
            {
                email: {
                    $regex: search,
                    $options: "i",
                },
            },
        ];
    }
    // Role filter
    if (role) {
        query.role = role;
    }
    // Verification filter
    if (emailVerified !== undefined) {
        query.emailVerified = emailVerified === "true";
    }
    const skip = (page - 1) * limit;
    const [users, total] = await Promise.all([
        user_model_1.default
            .find(query)
            .select("-password")
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit),
        user_model_1.default.countDocuments(query),
    ]);
    return {
        meta: {
            page,
            limit,
            total,
            totalPages: Math.ceil(total / limit),
        },
        data: users,
    };
};
exports.getUsersFromDB = getUsersFromDB;
const getSingleUserFromDB = async (id) => {
    return user_model_1.default.findById(id).select("-password");
};
exports.getSingleUserFromDB = getSingleUserFromDB;
const updateUserInDB = async (id, payload) => {
    return user_model_1.default
        .findByIdAndUpdate(id, payload, {
        new: true,
        runValidators: true,
    })
        .select("-password");
};
exports.updateUserInDB = updateUserInDB;
const deleteUserFromDB = async (id) => {
    return user_model_1.default.findByIdAndDelete(id);
};
exports.deleteUserFromDB = deleteUserFromDB;
