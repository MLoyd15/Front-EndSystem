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

// ✅ UPDATED: Fetch ALL loyalty rewards for admin dashboard
export const getUserLoyaltyRewards = async (req, res) => {
  try {
    // Access the loyaltyrewards collection directly
    const LoyaltyReward = mongoose.connection.collection('loyaltyrewards');
    
    // ✅ Get ALL rewards (remove userId filter for admin view)
    const rewards = await LoyaltyReward.find({})
      .sort({ createdAt: -1 })
      .toArray();

    // ✅ Populate user data manually
    const User = mongoose.connection.collection('users');
    
    const rewardsWithUsers = await Promise.all(
      rewards.map(async (reward) => {
        const user = await User.findOne({ _id: reward.userId });
        return {
          ...reward,
          userId: user ? {
            _id: user._id,
            name: user.name,
            email: user.email
          } : null
        };
      })
    );

    console.log('✅ Fetched loyalty rewards:', rewardsWithUsers.length);
    
    res.json({ success: true, rewards: rewardsWithUsers });
  } catch (error) {
    console.error("Error fetching loyalty rewards:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};