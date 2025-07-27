import express from 'express';
import { addToCart, RemoveAllFromCart, updateQuantity, getCartProducts } from '../controllers/cart.controller.js';
import { protectRoute } from '../middleware/auth.middleware.js';

const router = express.Router();   

router.get("/" ,protectRoute, getCartProducts);
router.post("/" ,protectRoute, addToCart);
router.delete("/" ,protectRoute, RemoveAllFromCart);
router.put("/:id" ,protectRoute,updateQuantity);

export default router;