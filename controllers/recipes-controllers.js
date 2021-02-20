const fs = require('fs');

const { validationResult } = require('express-validator');
const mongoose = require('mongoose');

const HttpError = require('../models/http-error');
const Recipe = require('../models/recipe');
const User = require('../models/user');

const getRecipeById = async (req, res, next) => {
  const recipeId = req.params.pid;

  let recipe;
  try {
    recipe = await Recipe.findById(recipeId);
  } catch (err) {
    const error = new HttpError(
      'Something went wrong, could not find a recipe.',
      500
    );
    return next(error);
  }

  if (!recipe) {
    const error = new HttpError(
      'Could not find recipe for the provided id.',
      404
    );
    return next(error);
  }

  res.json({ recipe: recipe.toObject({ getters: true }) });
};

const getRecipesByUserId = async (req, res, next) => {
  const userId = req.params.uid;

  // let recipes;
  let userWithRecipes;
  try {
    userWithRecipes = await User.findById(userId).populate('recipes');
  } catch (err) {
    const error = new HttpError(
      'Fetching recipes failed, please try again later.',
      500
    );
    return next(error);
  }

  // if (!recipes || recipes.length === 0) {
  if (!userWithRecipes || userWithRecipes.recipes.length === 0) {
    return next(
      new HttpError('Could not find recipes for the provided user id.', 404)
    );
  }

  res.json({
    recipes: userWithRecipes.recipes.map(recipe =>
      recipe.toObject({ getters: true })
    )
  });
};

const createRecipe = async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return next(
      new HttpError('Invalid inputs passed, please check your data.', 422)
    );
  }

  const { title, description, address, creator } = req.body;

  const createdRecipe = new Recipe({
    title,
    description,
    address,
    image: req.file.path,
    creator: req.userData.userId
  });

  let user;
  try {
    user = await User.findById(req.userData.userId);
  } catch (err) {
    const error = new HttpError(
      'Creating recipe failed, please try again.',
      500
    );
    return next(error);
  }

  if (!user) {
    const error = new HttpError('Could not find user for provided id.', 404);
    return next(error);
  }

  console.log(user);

  try {
    const sess = await mongoose.startSession();
    sess.startTransaction();
    await createdRecipe.save({ session: sess });
    user.recipes.push(createdRecipe);
    await user.save({ session: sess });
    await sess.commitTransaction();
  } catch (err) {
    const error = new HttpError(
      'Creating recipe failed, please try again.',
      500
    );
    return next(error);
  }

  res.status(201).json({ recipe: createdRecipe });
};

const updateRecipe = async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return next(
      new HttpError('Invalid inputs passed, please check your data.', 422)
    );
  }

  const { title, description } = req.body;
  const recipeId = req.params.pid;

  let recipe;
  try {
    recipe = await Recipe.findById(recipeId);
  } catch (err) {
    const error = new HttpError(
      'Something went wrong, could not update recipe.',
      500
    );
    return next(error);
  }

  if (recipe.creator.toString() !== req.userData.userId) {
    const error = new HttpError(
      'You are not allowed to edit this recipe.',
      401
    );
    return next(error);
  }

  recipe.title = title;
  recipe.description = description;

  try {
    await recipe.save();
  } catch (err) {
    const error = new HttpError(
      'Something went wrong, could not update recipe.',
      500
    );
    return next(error);
  }

  res.status(200).json({ recipe: recipe.toObject({ getters: true }) });
};

const deleteRecipe = async (req, res, next) => {
  const recipeId = req.params.pid;

  let recipe;
  try {
    recipe = await Recipe.findById(recipeId).populate('creator');
  } catch (err) {
    const error = new HttpError(
      'Something went wrong, could not delete recipe.',
      500
    );
    return next(error);
  }

  if (!recipe) {
    const error = new HttpError('Could not find recipe for this id.', 404);
    return next(error);
  }

  if (recipe.creator.id !== req.userData.userId) {
    const error = new HttpError(
      'You are not allowed to delete this recipe.',
      401
    );
    return next(error);
  }

  const imagePath = recipe.image;

  try {
    const sess = await mongoose.startSession();
    sess.startTransaction();
    await recipe.remove({ session: sess });
    recipe.creator.recipes.pull(recipe);
    await recipe.creator.save({ session: sess });
    await sess.commitTransaction();
  } catch (err) {
    const error = new HttpError(
      'Something went wrong, could not delete recipe.',
      500
    );
    return next(error);
  }

  fs.unlink(imagePath, err => {
    console.log(err);
  });

  res.status(200).json({ message: 'Deleted recipe.' });
};

exports.getRecipeById = getRecipeById;
exports.getRecipesByUserId = getRecipesByUserId;
exports.createRecipe = createRecipe;
exports.updateRecipe = updateRecipe;
exports.deleteRecipe = deleteRecipe;
