const User = require("../models/Participant");

// @desc  Create new user
// @route POST /api/users
const createUser = async (req, res) => {
  try {
    const { wallet, username, email } = req.body;

    // check if user already exists
    let user = await User.findOne({ wallet });
    if (user) {
      return res.status(400).json({ message: "User already exists" });
    }

    // create user
    user = new User({ wallet, username, email });
    await user.save();

    res.status(201).json(user);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// @desc  Get all users
// @route GET /api/users
const getUsers = async (req, res) => {
  try {
    const users = await User.find();
    res.json(users);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

module.exports = {
  createUser,
  getUsers,
};
