const express = require('express');
const { check } = require('express-validator');

const recipesControllers = require('../controllers/recipes-controllers');
const fileUpload = require('../middleware/file-upload');

const router = express.Router();

router.get('/:pid', recipesControllers.getRecipeById);

router.get('/user/:uid', recipesControllers.getRecipesByUserId);

router.post(
  '/',
  fileUpload.single('image'),
  [
    check('title')
      .not()
      .isEmpty(),
    check('description').isLength({ min: 5 }),
    check('address')
      .not()
      .isEmpty()
  ],
  recipesControllers.createRecipe
);

router.patch(
  '/:pid',
  [
    check('title')
      .not()
      .isEmpty(),
    check('description').isLength({ min: 5 })
  ],
  recipesControllers.updateRecipe
);

router.delete('/:pid', recipesControllers.deleteRecipe);

module.exports = router;
