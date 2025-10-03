import bcrypt from 'bcrypt'
import User from './models/user.js'
import connectDB from './db/connection.js'

const register = async () => {
    try {
        await connectDB()
        
        const hashPassword = await bcrypt.hash("superadmin", 10)
        const newUser = new User({
            name: "superadmin",
            email: "superadmin@gmail.com",
            password: hashPassword,
            address: "superadmin address",
            role: "superadmin"
        })

        await newUser.save()
        console.log("Superadmin user created successfully")
        process.exit(0) // Exit after completion
    } catch (error) {
        console.log(error)
        process.exit(1) // Exit with error
    }
}

register();