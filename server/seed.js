import bcrypt from 'bcrypt'
import User from './models/user.js'
import connectDB from './db/connection.js'

const register = async () => {
    try {
        connectDB()
        const hashPassword = await bcrypt.hash("admin", 10)
        const  newUser = new User({
            name: "admin",
            email: "admin@gmail.com",
            password: hashPassword,
            address: "admin address",
            role: "admin"
        })

        await newUser.save()
        console.log("Admin user created  successfuly")
    } catch (error) {
        console.log(error)
    }
}

register();
