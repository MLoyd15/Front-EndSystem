
import jwt from "jsonwebtoken"
import User from "../models/user.js"


const authMiddleware = async (req, res, next) => {
    try {
        const token = req.headers.authorization.split(" ")[1]
        if(!token) {
            return res.status(401).json({ success: false, message: "No token provided "})
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET)

        if (!decoded) {
            return res.status(401).json({ success: false, message: "Invalid token "})
        }

        const user = await User.findById({_id: decoded.id})

        if (!user) {
            return res.status(401).json({ success: false, message: "user not found"})
        }

        req.user = user;
        next()
    } catch(error) {
        return res.status(500).json({ success: false, message: "internal server error"}) 
    }
}

export default authMiddleware