import User from "../models/user.model.js";
import Products from "../models/product.model.js";

export const getAnalyticsData = async () => {
    const totalUsers = await User.countDocuments();
    const totalProducts = await Products.countDocuments();

    const salesData = await Order.aggregate([
        {
            $group: {
                _id:null, // รวมทุกอย่างที่เป็นข้อมูล
                totalSales: {$sum:1}, // นับจำนวนการขายทั้งหมด
                totalRevenue: {$sum: "$totalAmount"} // รวมยอดขายทั้งหมด

            }
        }
    ])

    const {totalSales, totalRevenue} = salesData[0] || {totalSales: 0, totalRevenue: 0};

    return{
        users:totalUsers,
        products:totalProducts,
        totalSales,
        totalRevenue,
    }
};

export const getDailySalesData = async (startDate, endDate) => {
    const dailySalesData = await Order.aggregate([
        {
            $match: {
                createdAt: {
                    $gte: startDate,
                    $lte: endDate,
                },
            },
        },
        {
            $group: {
                _id: {
                    $dateToString: { format: "%Y-%m-%d", date: "$createdAt" },
                },
                sales: { $sum: 1 },
                revenue: { $sum: "$totalAmount" },
            },
        },
        {
            $sort: { _id: 1 }, // เรียงตามวันที่
        },
    ]);

    // ตัวอย่างข้อมูล
    // [
    //     {
    //         _id: "2023-10-01",
    //         sales: 10,
    //         revenue: 5000.25,
    //     },
    //     {
    //         _id: "2023-10-02",
    //         sales: 15,
    //         revenue: 750.75,
    //     },
    //     {
    //         _id: "2023-10-05",
    //         sales: 7,
    //         revenue: 510.75,
    //     },
    //     {
    //         _id: "2023-10-10",
    //         sales: 9,
    //         revenue: 1405.75,
    //     },
    // ]

    const dateArray = getDatesInRange(startDate, endDate);
    console.log(dateArray); // ตัวอย่าง: ["2023-10-01", "2023-10-02", "2023-10-03", ...]

    return dateArray.map[date => {
        const foundData = dailySalesData.find(item => item._id === date);

        return{
            date,
            sales: foundData?.sales || 0, // ถ้าไม่พบข้อมูล ให้ค่าเป็น 0
            revenue: foundData?.revenue || 0, // ถ้าไม่พบข้อมูล ให้ค่าเป็น 0  
        }
    }]
};

function getDatesInRange(startDate, endDate){
    const dates = [];
    let currentDate = new Date(startDate);

    while (currentDate <= endDate) {
        dates.push(currentDate.toISOString().split("T")[0]); // แปลงเป็นรูปแบบ YYYY-MM-DD
        currentDate.setDate(currentDate.getData() + 1); // เพิ่มวันทีละวัน
    }

    return dates;
}