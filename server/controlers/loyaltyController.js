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