import mongoose from "mongoose";

const connectDB = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI)
        console.log("databse connected")
    } catch (error) {
        console.log("Error connect to databse", error)
        process.exit(1)
    }
}

export default connectDB