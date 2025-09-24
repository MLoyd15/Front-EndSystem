import bcrypt from "bcrypt";
import Driver from "./models/Driver.js";      // adjust path if needed
import connectDB from "./db/connection.js";   // same as your admin script

const register = async () => {
    try {
      connectDB();

      const hashPassword = await bcrypt.hash("driver123", 10);

      const newDriver = new Driver({
        name: "Sample Driver",
        email: "driver1@gmail.com",
        phone: "09171234567",
        password: hashPassword,
        role: "driver",
        active: true
      });

      await newDriver.save();
      console.log("Driver created successfully");
      process.exit(0);
    } catch (error) {
      console.error("Error creating driver:", error);
      process.exit(1);
    }
};

register();
