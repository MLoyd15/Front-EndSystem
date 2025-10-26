import bcrypt from 'bcrypt'
import jwt from 'jsonwebtoken'
import User from '../models/user.js'
import { registerOwnerSession } from '../middleware/rateLimitMiddleware.js'


const login = async (req, res) => {
    try {
        const {email, password, role} = req.body

        // Enhanced logging for security monitoring
        const clientIP = req.ip || req.connection.remoteAddress || 'unknown';
        console.log(`🔐 Login attempt - Email: ${email}, Role: ${role}, IP: ${clientIP}`);

        const user = await User.findOne({email});
        if (!user) {
            console.log(`❌ Login failed - User not found: ${email}`);
            return res.status(401).json({success:false, message: "Invalid email or password"})
        }

        const isMatch = await bcrypt.compare(password, user.password)
        if (!isMatch) {
            console.log(`❌ Login failed - Invalid password for: ${email}`);
            return res.status(401).json({success:false, message: "Invalid credentials"})
        }

        // Check if this is a superadmin/owner login
        const isOwnerLogin = user.role === 'superadmin' || email.includes('superadmin');
        
        // Generate JWT token with enhanced security
        const tokenPayload = {
            id: user._id, 
            role: user.role,
            email: user.email,
            loginTime: Date.now(),
            ip: clientIP
        };
        
        const token = jwt.sign(tokenPayload, process.env.JWT_SECRET, {
            expiresIn: isOwnerLogin ? '1h' : '24h' // Shorter session for owner
        });

        // Register owner session if applicable
        if (isOwnerLogin && req.ownerSessionData) {
            registerOwnerSession(req.ownerSessionData);
            console.log(`👑 Owner login successful - IP: ${clientIP}`);
        } else {
            console.log(`✅ User login successful - Email: ${email}, Role: ${user.role}`);
        }

        // Enhanced response with security info
        const response = {
            success: true, 
            message: "Login successful", 
            token, 
            user: {
                id: user._id, 
                email: user.email, 
                role: user.role,
                name: user.name
            }
        };

        // Add session info for owner logins
        if (isOwnerLogin) {
            response.sessionInfo = {
                type: 'owner',
                expiresIn: '1 hour',
                restrictions: 'Single session only'
            };
        }

        return res.status(200).json(response);
        
    } catch (error) {
        console.error('❌ Login error:', error);
        return res.status(500).json({success:false, message: "Internal server error"})
    }
}

// Logout function to clear sessions
const logout = async (req, res) => {
    try {
        const { clearOwnerSession } = await import('../middleware/rateLimitMiddleware.js');
        
        // Get user info from token if available
        const authHeader = req.headers.authorization;
        let userRole = null;
        let userEmail = null;
        
        if (authHeader && authHeader.startsWith('Bearer ')) {
            try {
                const token = authHeader.split(' ')[1];
                const decoded = jwt.verify(token, process.env.JWT_SECRET);
                userRole = decoded.role;
                userEmail = decoded.email;
            } catch (error) {
                // Token might be expired or invalid, continue with logout
                console.log('Token verification failed during logout:', error.message);
            }
        }
        
        // Clear owner session if this was an owner logout
        if (userRole === 'superadmin' || (userEmail && userEmail.includes('superadmin'))) {
            clearOwnerSession();
            console.log(`👑 Owner session cleared - Email: ${userEmail}`);
        }
        
        console.log(`🔓 Logout successful - Role: ${userRole}, Email: ${userEmail}`);
        
        return res.status(200).json({
            success: true,
            message: "Logout successful",
            timestamp: new Date().toISOString()
        });
        
    } catch (error) {
        console.error('❌ Logout error:', error);
        return res.status(500).json({
            success: false,
            message: "Logout error"
        });
    }
};

// Validate owner access key
const validateAccessKey = async (req, res) => {
    try {
        const { accessKey } = req.body;
        const clientIP = req.ip || req.connection.remoteAddress || 'unknown';
        
        console.log(`🔑 Access key validation attempt from IP: ${clientIP}`);
        
        if (!accessKey) {
            console.log(`❌ Access key validation failed - No key provided from IP: ${clientIP}`);
            return res.status(400).json({
                success: false,
                message: "Access key is required"
            });
        }
        
        const validAccessKey = process.env.OWNER_ACCESS_KEY;
        
        if (accessKey !== validAccessKey) {
            console.log(`❌ Access key validation failed - Invalid key from IP: ${clientIP}`);
            return res.status(401).json({
                success: false,
                message: "Invalid access key"
            });
        }
        
        console.log(`✅ Access key validation successful from IP: ${clientIP}`);
        return res.status(200).json({
            success: true,
            message: "Access key validated successfully"
        });
        
    } catch (error) {
        console.error('❌ Access key validation error:', error);
        return res.status(500).json({
            success: false,
            message: "Internal server error"
        });
    }
}

export {login, logout, validateAccessKey};