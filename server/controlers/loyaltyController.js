import User from "../models/user.js";
import { rewards } from "../config/loyaltyConfig.js";

export const getLoyaltyInfo = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select("loyaltyPoints loyaltyTier loyaltyHistory");
    res.json(user);
  } catch (err) {
    res.status(500).json({ message: "Error fetching loyalty info" });
  }
};

export const redeemReward = async (req, res) => {
  try {
    const { rewardName } = req.body;
    const user = await User.findById(req.user.id);

    const reward = rewards.find(r => r.name === rewardName);
    if (!reward) return res.status(400).json({ message: "Invalid reward" });

    if (user.loyaltyPoints < reward.cost) {
      return res.status(400).json({ message: "Not enough points" });
    }

    user.loyaltyPoints -= reward.cost;
    user.loyaltyHistory.push({ action: "redeemed", points: reward.cost });

    await user.save();

    res.json({ message: `Reward redeemed: ${rewardName}`, loyaltyPoints: user.loyaltyPoints });
  } catch (err) {
    res.status(500).json({ message: "Error redeeming reward" });
  }
};

export const getUserLoyaltyRewards = async (req, res) => {
  try {
    const userId = req.user?.userId || req.user?.id;
    
    if (!userId) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    // Access the loyaltyrewards collection
    const LoyaltyReward = mongoose.connection.collection('loyaltyrewards');
    
    const rewards = await LoyaltyReward.find({ userId: mongoose.Types.ObjectId(userId) })
      .sort({ createdAt: -1 })
      .toArray();

    res.json({ success: true, rewards });
  } catch (error) {
    console.error("Error fetching loyalty rewards:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};