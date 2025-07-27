import Coupon from "../models/coupon.model.js";
import { stripe } from "../lib/stripe.js";
import Order  from "../models/order.model.js";

export const createCheckoutSession = async (req, res) => {
  try {
    const { product, couponCode } = req.body;

    if (!Array.isArray(product) || product.length === 0) {
      return res.status(400).json({ error: "Invalid or emtry product array" }); // ตรวจสอบว่า product เป็น array และไม่ว่างเปล่า
    }

    let totalAmount = 0;

    const lineItems = product.map((product) => {
      const amount = Math.Round(product.price * 100); // แปลงเป็นหน่วยเซนต์ stripe ต้องการจำนวนเงินเป็นเซนต์]
      totalAmount += amount * product.quantity; // คำนวณยอดรวม

      return {
        price_data: {
          currency: "usd",
          product_data: {
            name: product.name,
            images: [product.image],
          },
          unit_amount: amount,
        },
      };
    });

    let coupon = null;
    if (couponCode) {
      coupon = await Coupon.findOne({
        code: couponCode,
        userId: req.user._id,
        isActive: true,
      });
      if (coupon) {
        totalAmount -= Math.round(
          (totalAmount * coupon.discountPercentage) / 100
        ); // คำนวณส่วนลด
      }
    }

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: lineItems,
      mode: "payment",
      success_url: `${process.env.CLIENT_URL}/purchase-success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.CLIENT_URL}/purchase-cancel`,
      discounts: coupon
        ? [
            {
              coupon: await createStripeCoupon(coupon.discountPercentage),
            },
          ]
        : [],
      metadata: {
        userId: req.user._id.toString(),
        couponCode: couponCode || "",
        products: JSON.stringify(
          product.map((p) => ({
            id: p.id,
            quantity: p.quantity,
            price: p.price,
          }))
        ),
      },
    });

    if (totalAmount >= 20000) {
      await createNewCoupon(req.user._id); // สร้างคูปองใหม่ให้ผู้ใช้หากยอดรวมมากกว่า 20000 เซนต์
    }
    res.status(200).json({ id: session.id, totalAmount: totalAmount / 100 }); // ส่ง ID ของ session และยอดรวมที่คำนวณแล้วกลับไปยังไคลเอนต์
  } catch (error) {
    console.error("Error processing payment checkout:", error);
    res.status(500).json({
      message: "Error processing payment checkout",
      error: error.message,
    });
  }
};

export const checkoutSuccess =  async (req, res) => {
    try {
        const { sessionId } = req.body;
        const session = await stripe.checkout.sessions.retrieve(session_id);

        if(session.payment_status === "paid"){

            if (session.metadata.couponCode){
                await Coupon.findOneAndUpdate({
                    code: session.metadata.couponCode, userId:session.metadata.userId
                },{
                    isActive: false
                })
            }

            // สร้างออเดอร์ใหม่
            const products = JSON.parse(session.metadata.products);
            const newOrder = new Order({
                userId: session.metadata.userId,
                products: products.map(product => ({
                    productId: product.id,
                    quantity: product.quantity,
                    price: product.price
                })),
                totalAmount: session.amount_total / 100, // แปลงจากเซนต์เป็นดอลลาร์
                stripeSessionId: sessionId
            })

            await newOrder.save();
            res.status(200).json({
                success: true,
                message: "Payment successful and Coupon deactivared if used.",
                orderId: newOrder._id,
            })
        }
    } catch (error) {
            console.error("Error processing payment checkout:", error);
            res.status(500).json({
                message: "Error processing payment checkout",
                error: error.message,
            });
    }
};

async function createStripeCoupon(discountPercentage) {
  const coupon = await stripe.coupons.create({
    percent_off: discountPercentage,
    duration: "once",
  });

  return coupon.id; // คืนค่า ID ของคูปองที่สร้างขึ้น
}

async function createNewCoupon(userId) {
  const newCoupon = new Coupon({
    code: "GIFT" + Math.random().toString(36).substring(2, 8).toUpperCase(),
    discountPercentage: 10,
    expirationDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // หมดอายุใน 30 วัน
    userId: userId,
  });

  await newCoupon.save();

  return newCoupon;
}
