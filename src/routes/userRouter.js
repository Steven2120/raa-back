const express = require("express");
const UserModel = require("../models/UserModel");
const bcrypt = require("bcrypt");
const saltRounds = 10;
const jwt = require("jsonwebtoken");

const cleanUser = (userDocument) => {
  return {
    id: userDocument._id,
    firstName: userDocument.firstName,
    lastName: userDocument.lastName,
    email: userDocument.email,
    profilePicture: userDocument.profilePicture,
    isAdmin: userDocument.isAdmin,
  };
};

const getToken = (userId) => {
  return jwt.sign({ userId, iat: Date.now() }, process.env.AUTH_SECRET_KEY);
};

const userRouter = express.Router();

userRouter.get("/sign-out", (req, res, next) => {
  res.clearCookie("session_token");
  res.send("Signed out successfully");
});

userRouter.get("/test-auth", async (req, res, next) => {
  //check if user is logged in ... they should have valid JWT

  try {
    if (!req.user) {
      return res.status(403).send("User not logged in");
    }

    res.send({ userFirstName: req.user.firstName });
  } catch (error) {
    next(error);
  }
});

userRouter.post("/register-user", async (req, res, next) => {
  try {
    // 1. need a way to uniquely identify users by email, name, phone, etc
    // 2. we get creds from front end and HASH (Bcrypt) and save user info in DB
    console.log("req.body: ", req.body);

    const { firstName, lastName, email, password, profilePicture } = req.body;

    // store password HASH not the actually password
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    const userDocument = new UserModel({
      firstName,
      lastName,
      email,
      hashedPassword,
      profilePicture,
    });

    await userDocument.save();

    const token = getToken(userDocument._id);
    res.cookie("session_token", token, { httpOnly: true, secure: false });

    res.send({
      user: cleanUser(userDocument),
    });
  } catch (error) {
    next(error);
  }
});

userRouter.post("/sign-in", async (req, res, next) => {
  try {
    //Get user credentials from request
    const { email, password } = req.body.credentials;

    // Check if the user exists in DB
    const foundUser = await UserModel.findOne({ email });

    //if user exists in DB verify password matches
    if (!foundUser) {
      return res.status(401).send("User not found or incorrect credentials");
    }

    // the user can be successfully authenticated
    const passwordMatch = await bcrypt.compare(
      password,
      foundUser.hashedPassword
    );

    if (!passwordMatch) {
      return res.status(401).send("User not found or incorrect credentials");
    }

    //The user can be successfully authenticated
    // Send user data back to client
    const token = getToken(foundUser._id);
    res.cookie("session_token", token, { httpOnly: true, secure: false });

    res.send({
      user: cleanUser(foundUser),
    });
  } catch (error) {
    next(error);
  }
});

module.exports = userRouter;
