import Product from '../models/product.model.js';

export const getCartProducts = async (req, res) => {
    try {
        const products = await Product.find({_id: {$in:req.user.cartItems}});

        // เพิ่มจำนวนสินคเ้าแต่ละรายการ
        const cartItems = products.map(product => {
            const item = req.user.cartItems.find(cartItems => cartItems.id === product.id);
            return{...product.toJSON(),quantity:item.quantity}
        })

        res.json(cartItems); // ส่งรายการสินค้าในตะกร้า
    } catch (error) {
        console.log("Error in getCartProducts controllers", error.message);
        res.status(500).json({message: "server error", error: error.message});
    }
};

export const addToCart = async (req, res) => {
    try {
        const {productId} = req.body;   
        const user = req.user; 

        const existingItem = user.cartItems.find(item => item.id === prodcutId);
        if(existingItem){
            existingItem.quantity += 1; // เพิ่มขึ้น 1 ถ้ามีสินค้าในตะกร้า
        } else{
            user.cartItems.push(productId); // ถ้าไม่มีสินค้าในตะกร้า ให้เพิ่มสินค้าใหม่
        }

        await user.save(); // บันทึกการเปลี่ยนแปลงในตะกร้า
        res.json(user.cartItems); // ส่งรายการสินค้าในตะกร้ากลับไปยังผู้ใช้

    } catch (error) {
        console.log ("Error in addToCart controller", error.message);
        res.status(500).json({message: "Server error", error: error.message});
    }
};

export const RemoveAllFromCart = async (req, res) => {
    try {
        const {productId} = req.body;   
        const user = req.user; 
        if(!productId){
            user.cartItems = []; // ลบสินค้าทั้งหมดในตะกร้า
        }else{
            user.cartItems = user.cartItems.filter(item => item.id !== productId); // ลบสินค้าที่ระบุออกจากตะกร้า
        }
        await user.save(); // บันทึกการเปลี่ยนแปลงในตะกร้า
        res.json(user.cartItems); // ส่งรายการสินค้าในตะกร้ากลับ
    } catch (error) {
        res.status(500).json({message: "Server error", error: error.message});
    }
};

export const updateQuantity = async (req, res) => {
    try {
        const {id: productId} = req.params;
        const {quantity} = req.body;
        const user = req.user;
        const existingItem = user.cartItems.find(item => item.id === productId);
        
        if(existingItem) {
           if(quantity === 0){
            user.cartItems = user.cartItems.filter((item) => item.id !== productId); // ถ้าสินค้าเป็น 0 ให้ลบออก
            await user.save();
            return res.json(user.cartItems); // ส่งรายการสินค้ากลบั
           }

           existingItem.quantity = quantity; // อัปเดตจำนวนสินค้าในตะกร้า
           await user.save();
        } else {
            res.status(404).json({message: "Product not found in cart"}); // ถ้าไม่พบสินค้าในตะกร้า
        }
    } catch (error) {
        console.log("Error in updateQuantity controller", error.message);
        res.status(500).json({message: "Server error", error : error.message});
    }
};

