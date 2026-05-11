import userModel from "../../models/user.model";

type GetUsersParams = {
  page?: number;
  limit?: number;
  search?: string;
  role?: string;
  emailVerified?: string;
};

export const getUsersFromDB = async ({
  page = 1,
  limit = 10,
  search,
  role,
  emailVerified,
}: GetUsersParams) => {
  const query: any = {};

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
    userModel
      .find(query)
      .select("-password")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit),

    userModel.countDocuments(query),
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

export const getSingleUserFromDB = async (id: string) => {
  return userModel.findById(id).select("-password");
};

export const updateUserInDB = async (
  id: string,
  payload: Record<string, any>,
) => {
  return userModel
    .findByIdAndUpdate(id, payload, {
      new: true,
      runValidators: true,
    })
    .select("-password");
};

export const deleteUserFromDB = async (id: string) => {
  return userModel.findByIdAndDelete(id);
};
